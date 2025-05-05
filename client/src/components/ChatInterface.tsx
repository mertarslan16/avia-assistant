// src/components/ChatInterface.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useUserStore } from '@/store/userStore';
import { chatWithAI, useConversationStore, ChatMessage } from '@/utils/openai';
import { speakText, useSpeechStore } from '@/utils/tts';
import { extractTopics } from '@/utils/analysisUtils';

export default function ChatInterface() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { name, interests, userMemory } = useUserStore();
  const isSpeaking = useSpeechStore((state) => state.isSpeaking);
  const [apiKey, setApiKey] = useState<string>('');
  const [useDemo, setUseDemo] = useState<boolean>(true); // Demo mod varsayılan olarak açık
  const [detectedTopics, setDetectedTopics] = useState<string[]>([]);
  
  // Mesaj geçmişini al
  const { history } = useConversationStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // API anahtarını localStorage'dan al
  useEffect(() => {
    const storedApiKey = localStorage.getItem('openai_api_key') || '';
    setApiKey(storedApiKey);
    
    // Demo modu durumunu kontrol et
    const demoModeStorage = localStorage.getItem('use_demo_mode');
    const forceDemo = new URLSearchParams(window.location.search).get('forcedemo') !== null;
    
    if (forceDemo) {
      setUseDemo(true);
      localStorage.setItem('use_demo_mode', 'true');
    } else if (demoModeStorage !== null) {
      setUseDemo(demoModeStorage === 'true');
    }
  }, []);

  // Mesajları otomatik kaydır
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Mesaj yazıldıkça konuları tespit et
  useEffect(() => {
    if (message.length > 5) {
      const topics = extractTopics(message);
      setDetectedTopics(topics);
    } else {
      setDetectedTopics([]);
    }
  }, [message]);

  const handleSubmit = async () => {
    // Boş mesaj kontrolü
    if (!message.trim()) return;
    
    setIsLoading(true);
    setDetectedTopics([]);
    
    try {
      // Demo mod aktifse veya API anahtarı boşsa demo kullan
      const effectiveApiKey = useDemo ? 'demo' : apiKey;
      
      console.log("API isteği gönderiliyor, mod:", useDemo ? "Demo" : "API", 
        "Demo aktif mi:", useDemo, 
        "Key tipi:", typeof effectiveApiKey);
      
      const response = await chatWithAI(
        message, 
        effectiveApiKey,
        true, // geçmiş mesajları dahil et
        0.7,  // temperature
        'gpt-3.5-turbo',
        10 // maksimum geçmiş mesaj sayısı
      );
      
      // AI cevabını seslendir
      speakText(response);
      
    } catch (error) {
      console.error('Sohbet hatası:', error);
      speakText('Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
      setMessage('');
    }
  };

  // Enter tuşuna basıldığında mesaj gönder
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // API key ve demo mod ayarlarını kaydet
  const saveApiSettings = () => {
    localStorage.setItem('openai_api_key', apiKey);
    localStorage.setItem('use_demo_mode', String(useDemo));
    
    const message = useDemo 
      ? 'Demo mod aktif edildi. Önceden hazırlanmış yanıtlar kullanılacak.'
      : 'API anahtarınız kaydedildi. OpenAI API kullanılacak.';
    
    speakText(message);
  };

  // Sohbet geçmişini temizle
  const clearHistory = () => {
    if (window.confirm("Sohbet geçmişini temizlemek istediğinize emin misiniz?")) {
      useConversationStore.getState().clearHistory();
      speakText('Sohbet geçmişi temizlendi.');
    }
  };

  // Yanıt geri bildirimi
  const handleFeedback = (index: number, feedback: 'positive' | 'negative') => {
    useConversationStore.getState().updateMessageFeedback(index, feedback);
    const message = feedback === 'positive' 
      ? 'Geri bildiriminiz için teşekkürler! Bu yanıtı beğendiğinizi not ettim.'
      : 'Geri bildiriminiz için teşekkürler! Bu yanıtı geliştirmek için çalışacağım.';
    
    // Sessiz bildirim (konuşmadan)
    console.log(message);
  };

  // Kullanıcı belleğini göster/gizle
  const [showMemory, setShowMemory] = useState(false);

  // Popüler konuları bul (en çok konuşulan 5 konu)
  const popularTopics = Object.entries(userMemory.topics || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="w-full max-w-2xl mx-auto bg-gray-800 rounded-xl overflow-hidden">
      {/* API Ayarları */}
      <div className="p-4 bg-gray-700">
        <div className="flex items-center mb-3">
          <label className="flex items-center text-white cursor-pointer">
            <input 
              type="checkbox" 
              checked={useDemo}
              onChange={() => setUseDemo(!useDemo)}
              className="mr-2 w-4 h-4"
            />
            <span className="font-medium">Demo mod kullan</span>
          </label>
          
          <div className={`ml-2 px-2 py-0.5 text-xs rounded ${useDemo ? 'bg-green-600' : 'bg-blue-600'}`}>
            {useDemo ? 'Aktif' : 'Kapalı'}
          </div>
          
          <button 
            className="ml-auto text-xs text-gray-300 hover:text-white"
            onClick={() => setShowMemory(!showMemory)}
          >
            {showMemory ? 'Belleği Gizle' : 'Belleği Göster'}
          </button>
        </div>
        
        <div className="flex gap-2 mb-2">
          <input
            type="password"
            className={`flex-1 px-3 py-2 rounded-lg border ${useDemo ? 'border-gray-500 bg-gray-700 text-gray-400' : 'border-gray-600 bg-gray-800 text-white'}`}
            placeholder="OpenAI API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={useDemo}
          />
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={saveApiSettings}
          >
            Kaydet
          </button>
        </div>
        
        <div className="text-xs text-gray-400">
          {useDemo ? (
            <div className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-green-500 mr-1"></span>
              Demo mod aktif: Basit ve önceden hazırlanmış yanıtlar kullanılır. API hatası almazsınız.
            </div>
          ) : (
            <div className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-blue-500 mr-1"></span>
              OpenAI API modu aktif: Gerçek yapay zeka yanıtları için geçerli bir API anahtarı gereklidir.
            </div>
          )}
        </div>
        
        {/* Kullanıcı Belleği - Genişletilebilir Panel */}
        {showMemory && (
          <div className="mt-3 p-3 bg-gray-800 rounded-lg text-sm text-gray-300">
            <h3 className="font-bold text-white mb-2">Kullanıcı Belleği</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-semibold text-gray-400">Popüler Konular:</p>
                <ul className="text-xs">
                  {popularTopics.length > 0 ? (
                    popularTopics.map(([topic, count]) => (
                      <li key={topic} className="flex justify-between">
                        <span>{topic}</span>
                        <span className="text-gray-500">{count}x</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500">Henüz konu tespit edilmedi</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400">Tercihler:</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div>
                    <p className="text-green-400">Sevilen:</p>
                    <ul className="text-xs">
                      {userMemory.likedThings.length > 0 ? (
                        userMemory.likedThings.slice(0, 3).map((thing) => (
                          <li key={thing}>{thing}</li>
                        ))
                      ) : (
                        <li className="text-gray-500">Henüz tespit edilmedi</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="text-red-400">Sevilmeyen:</p>
                    <ul className="text-xs">
                      {userMemory.dislikedThings.length > 0 ? (
                        userMemory.dislikedThings.slice(0, 3).map((thing) => (
                          <li key={thing}>{thing}</li>
                        ))
                      ) : (
                        <li className="text-gray-500">Henüz tespit edilmedi</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mesaj Geçmişi */}
      <div className="h-96 overflow-y-auto p-4 bg-gray-900">
        {history.length === 0 ? (
          <p className="text-gray-400 text-center mt-10">
            Henüz mesaj yok. {name ? `Merhaba ${name}, sohbete başlayalım!` : 'Sohbete başlayalım!'}
          </p>
        ) : (
          history.map((msg, index) => (
            <div
              key={index}
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
              <div className="text-xs text-gray-400 mt-1 flex items-center">
                <span>{msg.role === 'user' ? name || 'Sen' : 'AIVA'}</span>
                {msg.role === 'assistant' && useDemo && (
                  <span className="ml-2 text-xs bg-green-800 px-1 rounded">Demo</span>
                )}
                
                {/* Geri bildirim butonları */}
                {msg.role === 'assistant' && (
                  <div className="ml-2 flex space-x-1">
                    <button 
                      onClick={() => handleFeedback(index, 'positive')}
                      className={`text-xs px-1 rounded ${msg.feedback === 'positive' ? 'bg-green-700 text-white' : 'text-green-400 hover:bg-gray-600'}`}
                    >
                      👍
                    </button>
                    <button 
                      onClick={() => handleFeedback(index, 'negative')}
                      className={`text-xs px-1 rounded ${msg.feedback === 'negative' ? 'bg-red-700 text-white' : 'text-red-400 hover:bg-gray-600'}`}
                    >
                      👎
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Mesaj Girişi */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        {/* Tespit edilen konular */}
        {detectedTopics.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {detectedTopics.map((topic) => (
              <span 
                key={topic} 
                className="text-xs bg-blue-900 text-blue-200 px-2 py-0.5 rounded-full"
              >
                {topic}
              </span>
            ))}
          </div>
        )}
        
        <div className="flex gap-2">
          <textarea
            className="flex-1 px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white resize-none"
            placeholder="Mesajınızı yazın..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading || isSpeaking}
            rows={2}
          />
          <button
            className={`px-4 py-2 rounded-lg ${
              isLoading || isSpeaking
                ? 'bg-gray-600 text-gray-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } transition-colors`}
            onClick={handleSubmit}
            disabled={isLoading || isSpeaking}
          >
            {isLoading ? 'Yanıt Bekleniyor...' : isSpeaking ? 'Konuşuyor...' : 'Gönder'}
          </button>
        </div>
        
        {/* Sohbet geçmişini temizleme butonu */}
        {history.length > 0 && (
          <div className="mt-2 text-right">
            <button
              className="text-xs text-gray-400 hover:text-white"
              onClick={clearHistory}
            >
              Sohbet geçmişini temizle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}