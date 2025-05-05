// src/store/userStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Kullanıcı belleği için arayüz
export interface UserMemory {
  topics: Record<string, number>; // Konular ve konuşma sayıları
  lastInteractions: string[];     // Son etkileşimler
  likedThings: string[];          // Kullanıcının sevdiği şeyler
  dislikedThings: string[];       // Kullanıcının sevmediği şeyler
  mentionedNames: string[];       // Bahsedilen kişiler
  conversationStyle: {            // Konuşma tarzı
    avgLength: number;
    usesEmoji: boolean;
    formal: boolean;
  };
  preferences: Record<string, boolean>; // Tercihler
}

interface UserState {
  name: string;
  interests: string;
  age: string;
  lastLogin: Date | null;
  conversationCount: number;
  favoriteTopic: string;
  userMemory: UserMemory;
  setUserInfo: (name: string, interests: string, age?: string) => void;
  updateConversationCount: () => void;
  setFavoriteTopic: (topic: string) => void;
  updateMemory: (newInfo: Partial<UserMemory>) => void;
  addTopic: (topic: string) => void;
  addLikedThing: (thing: string) => void;
  addDislikedThing: (thing: string) => void;
  addMentionedName: (name: string) => void;
  updateConversationStyle: (message: string) => void;
}

const USER_STORAGE_KEY = 'aiva_user_info';

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
  },
  preferences: {}
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      name: '',
      interests: '',
      age: '',
      lastLogin: null,
      conversationCount: 0,
      favoriteTopic: '',
      userMemory: initialMemory,
      
      setUserInfo: (name, interests, age = '') => set({ 
        name, 
        interests, 
        age,
        lastLogin: new Date() 
      }),
      
      updateConversationCount: () => set((state) => ({ 
        conversationCount: state.conversationCount + 1 
      })),
      
      setFavoriteTopic: (topic) => set({ 
        favoriteTopic: topic 
      }),
      
      // Belleği güncellemek için yeni fonksiyonlar
      updateMemory: (newInfo) => set((state) => ({
        userMemory: {
          ...state.userMemory,
          ...newInfo
        }
      })),
      
      // Yeni bir konu ekle veya var olan konunun sayısını artır
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
      
      // Kullanıcının sevdiği şeyleri ekle
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
      
      // Kullanıcının sevmediği şeyleri ekle
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
      
      // Bahsedilen isimleri ekle
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
      
      // Kullanıcının konuşma tarzını analiz et ve güncelle
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
    }
  )
);