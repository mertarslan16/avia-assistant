import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { useApiStore } from './useApiStore';

// User modeline uygun arayüzler
export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

export interface UserMemory {
  topics: Record<string, number>;
  lastInteractions: string[];
  likedThings: string[];
  dislikedThings: string[];
  mentionedNames: string[];
  conversationStyle: {
    avgLength: number;
    usesEmoji: boolean;
    formal: boolean;
  };
}

interface UserState {
  id: string | null;
  username: string;
  email: string;
  role: 'user' | 'admin';
  preferences: UserPreferences;
  chatHistory: string[]; // Chat ID'leri
  createdAt: Date | null;
  updatedAt: Date | null;
  isLoggedIn: boolean;
  conversationCount: number;
  userMemory: UserMemory;
  interests: string;
  // API işlemleri
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (userData: Partial<Omit<UserState, 'userMemory' | 'login' | 'register' | 'logout' | 'updateProfile' | 'updatePreferences' | 'updatePassword' | 'updateMemory' | 'addTopic' | 'addLikedThing' | 'addDislikedThing' | 'addMentionedName' | 'updateConversationStyle'>>) => Promise<boolean>;
  updatePreferences: (newPreferences: Partial<UserPreferences>) => Promise<boolean>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;

  // Bellek fonksiyonları
  updateMemory: (newInfo: Partial<UserMemory>) => void;
  addTopic: (topic: string) => void;
  addLikedThing: (thing: string) => void;
  addDislikedThing: (thing: string) => void;
  addMentionedName: (name: string) => void;
  updateConversationStyle: (message: string) => void;
}

const USER_STORAGE_KEY = 'aiva_user_info';
const API_URL = process.env.NEXT_APP_API_URL || 'http://localhost:8000/api';

// Başlangıç kullanıcı belleği
const initialMemory: UserMemory = {
  topics: {},
  lastInteractions: [],
  likedThings: [],
  dislikedThings: [],
  mentionedNames: [],
  conversationStyle: {
    avgLength: 0,
    usesEmoji: false,
    formal: false
  }
};

// Başlangıç kullanıcı tercihleri
const initialPreferences: UserPreferences = {
  theme: 'light',
  language: 'tr',
  notifications: true
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      id: null,
      username: '',
      email: '',
      role: 'user',
      preferences: initialPreferences,
      chatHistory: [],
      createdAt: null,
      updatedAt: null,
      isLoggedIn: false,
      conversationCount: 0,
      userMemory: initialMemory,
      interests: '',
      login: async (email: string, password: string) => {
        try {
          const apiStore = useApiStore.getState();

          const response = await apiStore.post(`/users/login`, {
            email,
            password
          });
          console.log("Login response:", response);
          const userData = response?.user;
          if (response?.token) {
            useApiStore.getState().setToken(response.token);
          }
          set({
            id: userData.id,
            username: userData.username,
            email: userData.email,
            role: userData.role,
            preferences: userData.preferences,
            chatHistory: userData.chatHistory,
            createdAt: new Date(userData.createdAt),
            updatedAt: new Date(userData.updatedAt),
            isLoggedIn: true
          });
          
          return true;
        } catch (error) {
          console.error('Login failed:', error);
          return false;
        }
      },
      
      // Kullanıcı kaydı
      register: async (username: string, email: string, password: string) => {
        try {
          const response = await axios.post(`${API_URL}/auth/register`, {
            username,
            email,
            password
          });
          
          const userData = response.data.user;
          
          set({
            id: userData.id,
            username: userData.username,
            email: userData.email,
            role: userData.role,
            preferences: userData.preferences,
            chatHistory: userData.chatHistory,
            createdAt: new Date(userData.createdAt),
            updatedAt: new Date(userData.updatedAt),
            isLoggedIn: true
          });
          
          return true;
        } catch (error) {
          console.error('Registration failed:', error);
          return false;
        }
      },
      
      // Çıkış yap
      logout: () => {
        set({
          id: null,
          username: '',
          email: '',
          role: 'user',
          preferences: initialPreferences,
          chatHistory: [],
          createdAt: null,
          updatedAt: null,
          isLoggedIn: false
        });
      },
      
      // Profil güncelleme
      updateProfile: async (userData) => {
        try {
          const { id } = get();
          
          if (!id) return false;
          
          const response = await axios.put(
            `${API_URL}/users/${id}`,
            userData,
            {
              headers: {
                Authorization: `Bearer ${useApiStore.getState().token}`
              }
            }
          );
          
          const updatedUser = response.data.user;
          
          set({
            username: updatedUser.username,
            email: updatedUser.email,
            updatedAt: new Date(updatedUser.updatedAt)
          });
          
          return true;
        } catch (error) {
          console.error('Profile update failed:', error);
          return false;
        }
      },
      
      // Tercihleri güncelleme
      updatePreferences: async (newPreferences) => {
        try {
          const { id, preferences } = get();
          
          if (!id) return false;
          
          const updatedPreferences = { ...preferences, ...newPreferences };
          
          const response = await axios.put(
            `${API_URL}/users/${id}/preferences`,
            { preferences: updatedPreferences },
            {
              headers: {
                Authorization: `Bearer ${useApiStore.getState().token}`
              }
            }
          );
          
          set({
            preferences: response.data.preferences,
            updatedAt: new Date()
          });
          
          return true;
        } catch (error) {
          console.error('Preferences update failed:', error);
          return false;
        }
      },
      
      // Şifre güncelleme
      updatePassword: async (currentPassword, newPassword) => {
        try {
          const { id } = get();
          
          if (!id) return false;
          
          await axios.put(
            `${API_URL}/users/${id}/password`,
            {
              currentPassword,
              newPassword
            },
            {
              headers: {
                Authorization: `Bearer ${useApiStore.getState().token}`
              }
            }
          );
          
          return true;
        } catch (error) {
          console.error('Password update failed:', error);
          return false;
        }
      },
      
      // Belleği güncelleme
      updateMemory: (newInfo) => set((state) => ({
        userMemory: {
          ...state.userMemory,
          ...newInfo
        }
      })),
      
      // Konu ekleme
      addTopic: (topic) => set((state) => {
        const topics = {...state.userMemory.topics};
        topics[topic] = (topics[topic] || 0) + 1;
        
        return {
          userMemory: {
            ...state.userMemory,
            topics,
            lastInteractions: [
              ...state.userMemory.lastInteractions, 
              new Date().toISOString()
            ].slice(-10) // Son 10 etkileşimi sakla
          }
        };
      }),
      
      // Sevilen şey ekleme
      addLikedThing: (thing) => set((state) => {
        if (state.userMemory.likedThings.includes(thing)) {
          return state; // Zaten varsa değişiklik yapma
        }
        
        return {
          userMemory: {
            ...state.userMemory,
            likedThings: [...state.userMemory.likedThings, thing]
          }
        };
      }),
      
      // Sevilmeyen şey ekleme
      addDislikedThing: (thing) => set((state) => {
        if (state.userMemory.dislikedThings.includes(thing)) {
          return state; // Zaten varsa değişiklik yapma
        }
        
        return {
          userMemory: {
            ...state.userMemory,
            dislikedThings: [...state.userMemory.dislikedThings, thing]
          }
        };
      }),
      
      // Bahsedilen isim ekleme
      addMentionedName: (name) => set((state) => {
        if (state.userMemory.mentionedNames.includes(name)) {
          return state; // Zaten varsa değişiklik yapma
        }
        
        return {
          userMemory: {
            ...state.userMemory,
            mentionedNames: [...state.userMemory.mentionedNames, name]
          }
        };
      }),
      
      // Konuşma tarzını güncelleme
      updateConversationStyle: (message) => set((state) => {
        const currentStyle = state.userMemory.conversationStyle;
        const messageLength = message.length;
        
        // Mevcut ortalama uzunluğu güncelle
        const prevTotal = currentStyle.avgLength * state.conversationCount;
        const newAvgLength = state.conversationCount > 0 
          ? (prevTotal + messageLength) / (state.conversationCount + 1)
          : messageLength;
        
        // Emoji kullanımını kontrol et
        const containsEmoji = /[\u{1F300}-\u{1F6FF}]/u.test(message);
        
        // Resmi dil kullanımını kontrol et
        const isFormal = message.includes('rica ederim') || 
                          message.includes('teşekkür ederim') ||
                          message.includes('memnun oldum') ||
                          message.includes('saygılarımla');
        
        return {
          conversationCount: state.conversationCount + 1,
          userMemory: {
            ...state.userMemory,
            conversationStyle: {
              avgLength: newAvgLength,
              usesEmoji: currentStyle.usesEmoji || containsEmoji,
              formal: currentStyle.formal || isFormal
            }
          }
        };
      })
    }),
    {
      name: USER_STORAGE_KEY,
      // Local storage'da saklanacak alanları belirleme
      partialize: (state) => ({
        id: state.id,
        username: state.username,
        email: state.email,
        role: state.role,
        preferences: state.preferences,
        isLoggedIn: state.isLoggedIn,
        userMemory: state.userMemory,
        conversationCount: state.conversationCount
      })
    }
  )
);