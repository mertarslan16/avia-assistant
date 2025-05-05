import { useUserStore } from '@/store/userStore';
import { generatePersonalizedSystemMessage, analyzeUserMessage } from './analysisUtils';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  id?: string;
  feedback?: 'positive' | 'negative' | null;
};

interface ConversationStore {
  history: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateMessageFeedback: (index: number, feedback: 'positive' | 'negative' | null) => void;
  clearHistory: () => void;
  getRecentMessages: (count?: number) => ChatMessage[];
}

const CONVERSATION_STORAGE_KEY = 'aiva_conversation_history';

export const useConversationStore = create<ConversationStore>()(
  persist(
    (set, get) => ({
      history: [],
      addMessage: (message) => set((state) => ({ 
        history: [...state.history, {...message, id: crypto.randomUUID()}] 
      })),
      updateMessageFeedback: (index, feedback) => set((state) => {
        const newHistory = [...state.history];
        if (index >= 0 && index < newHistory.length) {
          newHistory[index] = {...newHistory[index], feedback};
        }
        return { history: newHistory };
      }),
      clearHistory: () => set({ history: [] }),
      getRecentMessages: (count = 10) => {
        const { history } = get();
        return history.slice(-count);
      }
    }),
    {
      name: CONVERSATION_STORAGE_KEY,
    }
  )
);

// Demo yanıtları - API sorunu olduğunda
const demoReplies = [
  "Merhaba! Size nasıl yardımcı olabilirim?",
  "Bu konuda daha fazla bilgi verebilir misiniz?",
  "İlginç bir bakış açısı. Bunu daha önce düşünmemiştim.",
  "Tabii, bunu araştıralım beraber.",
  "Sorunuzu anlıyorum. Size yardımcı olmaktan memnuniyet duyarım.",
  "Bu konuda uzman değilim ama elimden geleni yapacağım.",
  "İlgi alanlarınız gerçekten çok ilginç!",
  "Daha önce bunun hakkında konuşmuştuk, hatırlıyor musunuz?",
  "Bu konu hakkında bir makale okumuştum, çok enteresan bulgular vardı.",
  "Belki de bu duruma farklı bir açıdan bakmalıyız.",
  "Evet, kesinlikle katılıyorum. Çok iyi bir nokta.",
  "Hayır, bence burada bir yanlış anlaşılma var."
];

// İstek sınırlaması için gecikme fonksiyonu
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// API yedeği olarak kullanılacak fonksiyon
async function getFallbackResponse(userMessage: string, userName: string = ""): Promise<string> {
  // Basit kelime eşleştirme tabanlı cevaplar
  if (userMessage.toLowerCase().includes("merhaba") || userMessage.toLowerCase().includes("selam")) {
    return `Merhaba ${userName || "dostum"}! Nasılsın bugün?`;
  }
  
  if (userMessage.toLowerCase().includes("nasılsın")) {
    return "Ben iyiyim, teşekkür ederim! Seninle konuşmak güzel.";
  }
  
  if (userMessage.toLowerCase().includes("teşekkür")) {
    return "Rica ederim! Başka bir konuda yardıma ihtiyacın olursa buradayım.";
  }
  
  if (userMessage.includes("?")) {
    return "İlginç bir soru. Bunu biraz düşünmem gerekiyor.";
  }
  
  // Rastgele cevap ver
  const randomIndex = Math.floor(Math.random() * demoReplies.length);
  return demoReplies[randomIndex];
}

// OpenAI API ile konuşma fonksiyonu
export async function chatWithAI(
  userMessage: string,
  apiKey: string,
  includeHistory = true,
  temperature = 0.7,
  model = 'gpt-3.5-turbo',
  maxHistoryLength = 10
): Promise<string> {
  try {
    // Kullanıcı bilgilerini al
    const userStore = useUserStore.getState();
    const { name, interests, userMemory } = userStore;
    const conversationStore = useConversationStore.getState();
    
    // Kullanıcı mesajını analiz et
    analyzeUserMessage(userMessage, {
      addTopic: userStore.addTopic,
      addLikedThing: userStore.addLikedThing,
      addDislikedThing: userStore.addDislikedThing,
      addMentionedName: userStore.addMentionedName,
      updateConversationStyle: userStore.updateConversationStyle
    });
    
    // Kullanıcı mesajını geçmişe ekle
    const userChatMessage: ChatMessage = {
      role: 'user',
      content: userMessage
    };
    
    conversationStore.addMessage(userChatMessage);
    
    // Konuşma sayısını artır
    userStore.updateConversationCount();
    
    // API key boşsa veya "demo" ise arka plan yanıtını kullan
    if (!apiKey || apiKey.trim() === "" || apiKey === "demo") {
      console.log("Demo mod aktif, demo yanıt kullanılıyor");
      
      // Demo cevap ver
      const fallbackResponse = await getFallbackResponse(userMessage, name);
      
      // AI yanıtını geçmişe ekle
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: fallbackResponse
      };
      
      conversationStore.addMessage(assistantMessage);
      
      return fallbackResponse;
    }
    
    // Geçmiş mesajları al
    const recentMessages = includeHistory 
      ? conversationStore.getRecentMessages(maxHistoryLength) 
      : [];
    
    // Kişiselleştirilmiş sistem mesajı
    const systemMessage: ChatMessage = {
      role: 'system',
      content: generatePersonalizedSystemMessage(name, interests, userMemory, recentMessages)
    };
    
    // Mesajları hazırla
    let messages: ChatMessage[] = [systemMessage];
    
    // Geçmiş mesajları ekle (isteğe bağlı)
    if (includeHistory) {
      messages = [...messages, ...recentMessages];
    }
    
    // API isteği göndermeden önce biraz bekle (hız sınırı önlemi)
    await delay(800);
    
    // API isteği gönder
    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model, // gpt-3.5-turbo veya gpt-4
          messages: messages.map(m => ({role: m.role, content: m.content})),
          temperature: temperature,
          max_tokens: 200,
          top_p: 1,
          frequency_penalty: 0.3,
          presence_penalty: 0.3
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.warn("API hatası:", response.status, errorData);
        
        // Herhangi bir hata durumunda yedeğe geç - hata fırlatma (throw) kullanmıyoruz
        // throw yerine console.log kullanarak günlüğe kaydediyoruz
        console.log(`API Hatası: ${errorData.error?.message || 'Bilinmeyen hata'}`);
        
        // Hata durumunda doğrudan yedek yanıt kullanıyoruz
        const fallbackResponse = await getFallbackResponse(userMessage, name);
        
        // AI yanıtını geçmişe ekle
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: fallbackResponse
        };
        
        conversationStore.addMessage(assistantMessage);
        
        return fallbackResponse;
      }
      
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      // AI yanıtını geçmişe ekle
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: aiResponse
      };
      
      conversationStore.addMessage(assistantMessage);
      
      return aiResponse;
    } catch (error) {
      console.error('OpenAI API hatası (try/catch):', error);
      
      // API hatası durumunda yedeğe geç
      const fallbackResponse = await getFallbackResponse(userMessage, name);
      
      // AI yanıtını geçmişe ekle
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: fallbackResponse
      };
      
      conversationStore.addMessage(assistantMessage);
      
      return fallbackResponse;
    }
  } catch (error) {
    console.error('Genel chatWithAI hatası:', error);
    
    // Yedek cevap ver - herhangi bir durumda çalışması için
    try {
      const { name } = useUserStore.getState();
      const fallbackResponse = await getFallbackResponse(userMessage, name);
      
      // AI yanıtını geçmişe ekle
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: fallbackResponse
      };
      
      useConversationStore.getState().addMessage(assistantMessage);
      
      return fallbackResponse;
    } catch (innerError) {
      console.error('Kritik hata - yedek cevap bile verilemedi:', innerError);
      return 'Üzgünüm, bir hata oluştu. Lütfen sayfayı yenileyip tekrar deneyin.';
    }
  }
}