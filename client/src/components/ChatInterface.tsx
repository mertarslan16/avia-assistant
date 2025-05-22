'use client';

import { useState, useEffect, useRef } from 'react';
import { useUserStore } from '@/store/userStore';
import { useChatStore } from '@/store/chatStore';
import { speakText, useSpeechStore } from '@/utils/tts';

export default function ChatInterface() {
  const [message, setMessage] = useState<string>('');
  
  // Store'lardan veriler
  const { username } = useUserStore();
  const { 
    currentChat, 
    chats, 
    isLoading, 
    error,
    fetchChats, 
    fetchChatById,
    createChat,
    updateChat,
    deleteChat,
    sendMessage,
    clearError
  } = useChatStore();
  
  const isSpeaking = useSpeechStore((state) => state.isSpeaking);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sohbetleri yükle
  useEffect(() => {
    loadChats();
  }, []);

  // Mesajları otomatik kaydır
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);

  // Yeni bir mesaj geldiğinde seslendir
  useEffect(() => {
    if (currentChat?.messages && currentChat.messages.length > 0) {
      const lastMessage = currentChat.messages[currentChat.messages.length - 1];
      
      // Eğer son mesaj asistandan geldiyse ve yükleme işlemi bittiyse seslendir
      if (lastMessage.role === 'assistant' && !isLoading) {
        setTimeout(() => {
          speakText(lastMessage.content);
        }, 300);
      }
    }
  }, [currentChat?.messages, isLoading]);

  // Tüm sohbetleri yükle
  const loadChats = async (): Promise<void> => {
    try {
      await fetchChats();
      
      if (!currentChat && chats.length > 0) {
        await fetchChatById(chats[0]._id);
      }
    } catch (err) {
      console.error("Sohbetleri yükleme hatası:", err);
    }
  };

  // Yeni sohbet oluştur
  const handleCreateNewChat = async (): Promise<void> => {
    try {
      await createChat(`Sohbet ${chats.length + 1}`);
    } catch (err) {
      console.error("Sohbet oluşturma hatası:", err);
    }
  };

  // Sohbet değiştir
  const handleSwitchChat = async (chatId: string): Promise<void> => {
    try {
      await fetchChatById(chatId);
    } catch (err) {
      console.error("Sohbet detayı alma hatası:", err);
    }
  };

  // Sohbet sil
  const handleDeleteChat = async (chatId: string): Promise<void> => {
    if (!window.confirm(`Bu sohbeti silmek istediğinize emin misiniz?`)) {
      return;
    }
    
    try {
      await deleteChat(chatId);
    } catch (err) {
      console.error("Sohbet silme hatası:", err);
    }
  };

  // Mesaj gönder
  const handleSubmit = async (): Promise<void> => {
    if (!message.trim()) return;
    
    try {
      if (!currentChat) {
        await handleCreateNewChat();
        setTimeout(() => {
          handleSubmit();
        }, 500);
        return;
      }
      
      await sendMessage(message.trim());
      setMessage('');
      
    } catch (err) {
      console.error('Mesaj gönderme hatası:', err);
      speakText('Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  // Enter tuşuna basıldığında mesaj gönder
  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Sohbeti yeniden adlandır
  const handleRenameChat = async (chatId: string): Promise<void> => {
    const chat = chats.find(c => c._id === chatId);
    if (!chat) return;
    
    const newTitle = prompt("Sohbet başlığını düzenle:", chat.title);
    if (!newTitle || newTitle === chat.title) return;
    
    try {
      await updateChat(chatId, { title: newTitle });
    } catch (err) {
      console.error("Sohbet yeniden adlandırma hatası:", err);
    }
  };

  // Hata mesajlarını göster/gizle
  const ErrorMessage = () => {
    if (!error) return null;
    
    return (
      <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-100 px-4 py-2 rounded-lg mb-4 text-sm">
        {error}
        <button 
          className="ml-2 text-red-300 hover:text-white" 
          onClick={clearError}
        >
          ✕
        </button>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full max-w-6xl mx-auto bg-gray-800 rounded-xl overflow-hidden">
      {/* Sohbet Listesi */}
      <div className="p-4 bg-gray-900 md:col-span-1 order-2 md:order-1">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-semibold">Sohbetler</h2>
          <button 
            onClick={handleCreateNewChat}
            disabled={isLoading}
            className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            title="Yeni sohbet oluştur"
          >
            {isLoading ? '...' : '+ Yeni'}
          </button>
        </div>
        
        <ErrorMessage />
        
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {chats.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              Henüz sohbet yok. Yeni bir sohbet başlatın!
            </p>
          ) : (
            chats.map(chat => (
              <div 
                key={chat._id} 
                className={`p-2 rounded cursor-pointer flex justify-between items-center ${
                  currentChat?._id === chat._id ? 'bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'
                }`}
                onClick={() => handleSwitchChat(chat._id)}
              >
                <div className="truncate">{chat.title}</div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(chat._id);
                  }}
                  className="text-gray-400 hover:text-white"
                  title="Sohbeti sil"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Sohbet Alanı */}
      <div className="md:col-span-3 p-0 flex flex-col h-[600px] order-1 md:order-2">
        {/* Mesaj Geçmişi */}
        <div className="flex-grow overflow-y-auto p-4 bg-gray-800">
          {!currentChat ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-400 mb-4">
                  Aktif sohbet yok. Yeni bir sohbet başlatın!
                </p>
                <button
                  onClick={handleCreateNewChat}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Yeni Sohbet Başlat
                </button>
              </div>
            </div>
          ) : currentChat.messages.length === 0 ? (
            <p className="text-gray-400 text-center mt-10">
              Henüz mesaj yok. {username ? `Merhaba ${username}, sohbete başlayalım!` : 'Sohbete başlayalım!'}
            </p>
          ) : (
            currentChat.messages.map((msg, index) => (
              <div
                key={msg._id || index}
                className={`mb-4 ${
                  msg.role === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block px-4 py-2 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  {msg.content}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  <span>{msg.role === 'user' ? username || 'Sen' : 'AIVA'}</span>
                  {msg.timestamp && (
                    <span className="ml-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Mesaj Girişi */}
        <div className="p-4 border-t border-gray-700 bg-gray-900">
          <ErrorMessage />
          
          <div className="flex gap-2">
            <textarea
              className="flex-1 px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white resize-none"
              placeholder={currentChat ? "Mesajınızı yazın..." : "Yeni bir sohbet başlatmak için mesaj yazın..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading || isSpeaking}
              rows={2}
            />
            <button
              className={`px-4 py-2 rounded-lg ${
                isLoading || isSpeaking
                  ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } transition-colors`}
              onClick={handleSubmit}
              disabled={isLoading || isSpeaking}
            >
              {isLoading ? 'Yanıt Bekleniyor...' : isSpeaking ? 'Konuşuyor...' : 'Gönder'}
            </button>
          </div>
          
          {/* Sohbet bilgileri */}
          {currentChat && (
            <div className="mt-2 flex justify-between text-xs text-gray-400">
              <div>
                <span className="mr-2">Sohbet:</span>
                <span className="font-medium">{currentChat.title}</span>
                <button
                  className="ml-2 text-blue-400 hover:text-blue-300"
                  onClick={() => handleRenameChat(currentChat._id)}
                  title="Sohbet başlığını düzenle"
                >
                  ✏️
                </button>
              </div>
              <div className="flex items-center">
                <span className="mr-2">Toplam mesaj: {currentChat.messages.length}</span>
                <span>{new Date(currentChat.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}