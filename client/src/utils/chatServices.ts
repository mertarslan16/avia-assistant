// src/utils/chatService.ts - UserStore ile entegre edilmiş
import { useUserStore } from '@/store/userStore';
import { useApiStore } from '@/store/useApiStore';

// Mesaj tipi
export interface Message {
  _id?: string;
  content: string;
  role: 'system' | 'user' | 'assistant';
  timestamp?: Date;
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

// Chat API yanıt tipleri
interface ChatResponse {
  message: string;
  chat: Chat;
}

interface ProcessMessageResponse {
  message: string;
  userMessage: Message;
  aiMessage: Message;
}

// chatService sınıfı - useApiStore'u kullanarak API istekleri yapar
const chatService = {
  // Tüm sohbetleri getir
  getAllChats: async (): Promise<Chat[]> => {
    const apiStore = useApiStore.getState();
    return apiStore.get<Chat[]>('/chats');
  },
  
  // Belirli bir sohbeti getir
  getChatById: async (chatId: string): Promise<Chat> => {
    const apiStore = useApiStore.getState();
    return apiStore.get<Chat>(`/chats/${chatId}`);
  },
  
  // Yeni sohbet oluştur
  createChat: async (title: string = 'Yeni Sohbet'): Promise<Chat> => {
    const apiStore = useApiStore.getState();
    const response = await apiStore.post<ChatResponse>('/chats', { title });
    return response.chat;
  },
  
  // Sohbeti güncelle
  updateChat: async (chatId: string, data: { title?: string; isActive?: boolean }): Promise<Chat> => {
    const apiStore = useApiStore.getState();
    const response = await apiStore.put<ChatResponse>(`/chats/${chatId}`, data);
    return response.chat;
  },
  
  // Sohbeti sil
  deleteChat: async (chatId: string): Promise<{ message: string; chatId: string }> => {
    const apiStore = useApiStore.getState();
    return apiStore.delete<{ message: string; chatId: string }>(`/chats/${chatId}`);
  },
  
  // Sohbete mesaj ekle
  addMessage: async (chatId: string, content: string, role: 'user' | 'assistant'): Promise<Message> => {
    const apiStore = useApiStore.getState();
    const response = await apiStore.post<{ message: string; chatMessage: Message }>(
      `/chats/${chatId}/messages`, 
      { content, role }
    );
    
    // Mesaj gönderildiğinde conversationCount'u artır
    if (role === 'user') {
      const userStore = useUserStore.getState();
      userStore.updateConversationStyle(content);
    }
    
    return response.chatMessage;
  },
  
  // Sohbete mesaj gönder ve AI yanıtı al
  sendMessage: async (chatId: string, message: string): Promise<ProcessMessageResponse> => {
    const apiStore = useApiStore.getState();
    
    // İçeriği analiz et (konu, beğeni, vs)
    analyzeMessageContent(message);
    
    // API isteği gönder
    const response = await apiStore.post<ProcessMessageResponse>(
      '/ai/message', 
      { chatId, message }
    );
    
    return response;
  },
  
  // Doğrudan AI yanıtı al (sohbete kaydetmeden)
  generateAIResponse: async (messages: Array<{ role: string; content: string }>): Promise<string> => {
    const apiStore = useApiStore.getState();
    const response = await apiStore.post<{ response: string }>(
      '/ai/generate-response', 
      { messages }
    );
    
    return response.response;
  }
};

// Mesaj içeriğini analiz et - UserStore'u güncellemek için
function analyzeMessageContent(message: string): void {
  const userStore = useUserStore.getState();
  
  // Konuları tespit et
  const topics = detectTopics(message);
  for (const topic of topics) {
    userStore.addTopic(topic);
  }
  
  // Sevilen şeyleri tespit et
  const likedThings = detectLikedThings(message);
  for (const thing of likedThings) {
    userStore.addLikedThing(thing);
  }
  
  // Sevilmeyen şeyleri tespit et
  const dislikedThings = detectDislikedThings(message);
  for (const thing of dislikedThings) {
    userStore.addDislikedThing(thing);
  }
  
  // Bahsedilen isimleri tespit et
  const mentionedNames = detectMentionedNames(message);
  for (const name of mentionedNames) {
    userStore.addMentionedName(name);
  }
  
  // Konuşma tarzını güncelle
  userStore.updateConversationStyle(message);
}

// Basit konu tespiti
function detectTopics(message: string): string[] {
  const topics: string[] = [];
  const lowercaseMessage = message.toLowerCase();
  
  // Basit anahtar kelime tespiti
  const topicKeywords: Record<string, string[]> = {
    'teknoloji': ['bilgisayar', 'yazılım', 'kod', 'program', 'uygulama', 'teknoloji', 'internet', 'web', 'mobil'],
    'spor': ['futbol', 'basketbol', 'voleybol', 'koşu', 'antrenman', 'maç', 'spor', 'fitness'],
    'müzik': ['şarkı', 'müzik', 'konser', 'melodi', 'nota', 'enstrüman', 'gitar', 'piyano'],
    'seyahat': ['seyahat', 'gezi', 'tatil', 'tur', 'otel', 'uçak', 'bilet', 'rezervasyon'],
    'film': ['film', 'sinema', 'dizi', 'televizyon', 'aktör', 'aktris', 'yönetmen', 'senaryo'],
    'yemek': ['yemek', 'tarif', 'pişirmek', 'restaurant', 'kafeterya', 'lokanta', 'aşçı', 'şef'],
  };
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => lowercaseMessage.includes(keyword))) {
      topics.push(topic);
    }
  }
  
  return topics;
}

// Basit sevilen şey tespiti
function detectLikedThings(message: string): string[] {
  const likedThings: string[] = [];
  const lowercaseMessage = message.toLowerCase();
  
  // "seviyorum", "beğeniyorum" gibi kalıpları ara
  const patterns = [
    /(?:sev(?:iyor|dim|erim)|hoşlan(?:ıyor|dım|ırım)) ([^\.,:;!?]+)/g,
    /([^\.,:;!?]+) (?:çok güzel|harika|muhteşem|mükemmel)/g
  ];
  
  for (const pattern of patterns) {
    const matches = lowercaseMessage.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        likedThings.push(match[1].trim());
      }
    }
  }
  
  return likedThings;
}

// Basit sevilmeyen şey tespiti
function detectDislikedThings(message: string): string[] {
  const dislikedThings: string[] = [];
  const lowercaseMessage = message.toLowerCase();
  
  // "sevmiyorum", "beğenmiyorum" gibi kalıpları ara
  const patterns = [
    /(?:sev(?:mi(?:yor|dim|em))|hoşlan(?:mıyor|madım|mam)) ([^\.,:;!?]+)/g,
    /([^\.,:;!?]+) (?:kötü|berbat|çirkin|korkunç|hiç iyi değil)/g
  ];
  
  for (const pattern of patterns) {
    const matches = lowercaseMessage.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        dislikedThings.push(match[1].trim());
      }
    }
  }
  
  return dislikedThings;
}

// Basit isim tespiti
function detectMentionedNames(message: string): string[] {
  const names: string[] = [];
  const matches = message.match(/(?:arkadaşım|dostum|abim|ablam|kardeşim) ([A-Z][a-zğüşıöçİĞÜŞÖÇ]+)/g) || [];
  
  for (const match of matches) {
    const parts = match.split(' ');
    names.push(parts[parts.length - 1]);
  }
  
  return names;
}

export default chatService;