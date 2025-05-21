// src/store/chatStore.ts - Eski modüllere bağımlılıklar kaldırıldı
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useApiStore } from './useApiStore';

// Mesaj tipi
export interface Message {
  _id?: string;
  content: string;
  role: 'system' | 'user' | 'assistant';
  timestamp?: Date;
  feedback?: 'positive' | 'negative' | null;
}

// Sohbet tipi
export interface Chat {
  _id: string;
  userId?: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Store tipi
interface ChatStoreState {
  // Durum
  currentChat: Chat | null;
  chats: Chat[];
  isLoading: boolean;
  error: string | null;
  
  // Eylemler
  setCurrentChat: (chat: Chat | null) => void;
  setChats: (chats: Chat[]) => void;
  
  // API işlemleri
  fetchChats: () => Promise<void>;
  fetchChatById: (id: string) => Promise<void>;
  createChat: (title?: string) => Promise<Chat>;
  updateChat: (id: string, updates: Partial<Chat>) => Promise<Chat>;
  deleteChat: (id: string) => Promise<void>;
  addMessage: (chatId: string, content: string, role: 'user' | 'assistant') => Promise<Message>;
  
  // AI işlemleri
  sendMessage: (content: string) => Promise<void>;
  
  // Yardımcı fonksiyonlar
  reset: () => void;
  clearError: () => void;
}

// API yanıt tipleri
interface ChatResponse {
  message: string;
  chat: Chat;
}

interface MessageResponse {
  message: string;
  chatMessage: Message;
}

interface ProcessMessageResponse {
  message: string;
  userMessage: Message;
  aiMessage: Message;
}

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set, get) => ({
      // Başlangıç durumu
      currentChat: null,
      chats: [],
      isLoading: false,
      error: null,
      
      // Durum güncelleyicileri
      setCurrentChat: (chat) => set({ currentChat: chat }),
      setChats: (chats) => set({ chats }),
      
      // API işlemleri
      fetchChats: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.get<Chat[]>('/chats');
          
          set({ chats: response, isLoading: false });
        } catch (error) {
          console.error('Sohbetleri getirme hatası:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Sohbetleri getirme hatası', 
            isLoading: false 
          });
        }
      },
      
      fetchChatById: async (id) => {
        try {
          set({ isLoading: true, error: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.get<Chat>(`/chats/${id}`);
          
          set({ currentChat: response, isLoading: false });
        } catch (error) {
          console.error('Sohbet detayını getirme hatası:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Sohbet detayını getirme hatası', 
            isLoading: false 
          });
        }
      },
      
      createChat: async (title = 'Yeni Sohbet') => {
        try {
          set({ isLoading: true, error: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.post<ChatResponse>('/chats', { title });
          
          // Sohbetleri güncelle
          const { chats } = get();
          set({ 
            chats: [response.chat, ...chats], 
            currentChat: response.chat,
            isLoading: false 
          });
          
          return response.chat;
        } catch (error) {
          console.error('Sohbet oluşturma hatası:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Sohbet oluşturma hatası', 
            isLoading: false 
          });
          throw error;
        }
      },
      
      updateChat: async (id, updates) => {
        try {
          set({ isLoading: true, error: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.put<ChatResponse>(`/chats/${id}`, updates);
          
          // Güncellenmiş sohbeti state'e ekle
          const { chats, currentChat } = get();
          const updatedChats = chats.map(chat => 
            chat._id === id ? response.chat : chat
          );
          
          set({ 
            chats: updatedChats,
            currentChat: currentChat?._id === id ? response.chat : currentChat,
            isLoading: false 
          });
          
          return response.chat;
        } catch (error) {
          console.error('Sohbet güncelleme hatası:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Sohbet güncelleme hatası', 
            isLoading: false 
          });
          throw error;
        }
      },
      
      deleteChat: async (id) => {
        try {
          set({ isLoading: true, error: null });
          
          const apiStore = useApiStore.getState();
          await apiStore.delete<{ message: string; chatId: string }>(`/chats/${id}`);
          
          // Silinmiş sohbeti state'den kaldır
          const { chats, currentChat } = get();
          const filteredChats = chats.filter(chat => chat._id !== id);
          
          set({ 
            chats: filteredChats,
            // Eğer şu anki sohbet silindiyse, başka bir sohbete geç
            currentChat: currentChat?._id === id 
              ? (filteredChats.length > 0 ? filteredChats[0] : null) 
              : currentChat,
            isLoading: false 
          });
        } catch (error) {
          console.error('Sohbet silme hatası:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Sohbet silme hatası', 
            isLoading: false 
          });
          throw error;
        }
      },
      
      addMessage: async (chatId, content, role) => {
        try {
          set({ isLoading: true, error: null });
          
          const apiStore = useApiStore.getState();
          const response = await apiStore.post<MessageResponse>(
            `/chats/${chatId}/messages`, 
            { content, role }
          );
          
          set({ isLoading: false });
          return response.chatMessage;
        } catch (error) {
          console.error('Mesaj ekleme hatası:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Mesaj ekleme hatası', 
            isLoading: false 
          });
          throw error;
        }
      },
      
      sendMessage: async (content) => {
        try {
          set({ isLoading: true, error: null });
          
          const { currentChat } = get();
          
          // Eğer aktif sohbet yoksa, yeni bir sohbet oluştur
          if (!currentChat) {
            const newChat = await get().createChat();
            // Kullanıcı mesajını gönder
            await get().addMessage(newChat._id, content, 'user');
            // Güncel sohbeti getir
            await get().fetchChatById(newChat._id);
            set({ isLoading: false });
            return;
          }
          
          // AI yanıtı işle
          const apiStore = useApiStore.getState();
          const response = await apiStore.post<ProcessMessageResponse>(
            '/ai/message', 
            { chatId: currentChat._id, message: content }
          );
          console.log("AI yanıtı:", response);
          
          // Güncel sohbeti getir
          await get().fetchChatById(currentChat._id);
          
          set({ isLoading: false });
        } catch (error) {
          console.error('Mesaj gönderme hatası:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Mesaj gönderme hatası', 
            isLoading: false 
          });
          throw error;
        }
      },
      
      reset: () => set({ 
        currentChat: null, 
        chats: [], 
        isLoading: false, 
        error: null 
      }),
      
      clearError: () => set({ error: null })
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        chats: state.chats
      })
    }
  )
);