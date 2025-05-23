import { create } from 'zustand';

// Geliştirilmiş Türkçe Viseme Mapping'i
const TURKISH_VISEME_MAP: { [key: string]: number } = {
  // Sessiz harfler - Dudak pozisyonları
  'b': 0, 'm': 0, 'p': 0,           // Kapalı dudaklar
  'f': 1, 'v': 1,                   // Üst diş alt dudağa değer 
  'w': 1,                           // İngilizce w sesi
  'h': 2, 's': 2, 'z': 2,          // Hafif açık, nefes sesi
  'ş': 3, 'c': 3, 'ç': 3, 'j': 3,  // Orta açıklık, yumuşak sessizler
  'd': 4, 'l': 4, 'n': 4, 'r': 4, 't': 4,  // Dil pozisyonu, sert sessizler
  'g': 5, 'ğ': 5, 'k': 5, 'y': 5,  // Arka boğaz, yumuşak damak
  
  // Sesli harfler - Ağız açıklığı ve şekli
  'a': 6,                           // En geniş açıklık
  'e': 7,                           // Orta açıklık
  'ı': 8, 'i': 8,                  // Dar açıklık, düz dudaklar
  'o': 9, 'ö': 9,                  // Orta yuvarlak
  'u': 10, 'ü': 10,                // En yuvarlak, dar açıklık
  
  // Özel karakterler ve boşluklar
  ' ': 0,                           // Boşluk - dudaklar kapalı
  '.': 0, ',': 0, '!': 0, '?': 0, ';': 0, ':': 0,  // Noktalama - kısa duraklama
  '-': 0, '(': 0, ')': 0, '"': 0, "'": 0,
};

// Viseme yoğunluk değerleri (hangi harflerin daha belirgin olacağı)
const VISEME_INTENSITY_MAP: { [key: number]: number } = {
  0: 0.3,   // Kapalı dudaklar - düşük yoğunluk
  1: 0.6,   // f, v - orta yoğunluk
  2: 0.4,   // s, z, h - düşük yoğunluk
  3: 0.7,   // ş, ç, c, j - yüksek yoğunluk
  4: 0.5,   // d, l, n, r, t - orta yoğunluk
  5: 0.4,   // g, k, ğ - düşük yoğunluk
  6: 1.0,   // a - maksimum yoğunluk
  7: 0.8,   // e - yüksek yoğunluk
  8: 0.6,   // ı, i - orta yoğunluk
  9: 0.9,   // o, ö - yüksek yoğunluk
  10: 0.8,  // u, ü - yüksek yoğunluk
};

interface SpeechStore {
  isSpeaking: boolean;
  currentText: string;
  currentViseme: number;
  visemeIntensity: number;
  currentCharIndex: number;
  userInteracted: boolean;
  setSpeaking: (status: boolean) => void;
  setText: (text: string) => void;
  setViseme: (viseme: number, intensity: number) => void;
  setCharIndex: (index: number) => void;
  setUserInteracted: (interacted: boolean) => void;
  reset: () => void;
}

export const useSpeechStore = create<SpeechStore>((set) => ({
  isSpeaking: false,
  currentText: '',
  currentViseme: 0,
  visemeIntensity: 0,
  currentCharIndex: 0,
  userInteracted: false,
  setSpeaking: (status) => set({ isSpeaking: status }),
  setText: (text) => set({ currentText: text }),
  setViseme: (viseme, intensity) => set({ currentViseme: viseme, visemeIntensity: intensity }),
  setCharIndex: (index) => set({ currentCharIndex: index }),
  setUserInteracted: (interacted) => set({ userInteracted: interacted }),
  reset: () => set({ 
    isSpeaking: false, 
    currentText: '', 
    currentViseme: 0, 
    visemeIntensity: 0, 
    currentCharIndex: 0 
  }),
}));

// Animasyon timeout'larını yönet
let animationTimeouts: NodeJS.Timeout[] = [];

// Geliştirilmiş viseme animasyon sistemi
const animateVisemes = (text: string, speechRate: number = 0.8) => {
  const speechStore = useSpeechStore.getState();
  
  // Önceki animasyonları temizle
  animationTimeouts.forEach(timeout => clearTimeout(timeout));
  animationTimeouts = [];
  
  // Türkçe karakterleri normalize et
  const normalizedText = text.toLowerCase()
    .replace(/[çÇ]/g, 'ç')
    .replace(/[ğĞ]/g, 'ğ')
    .replace(/[ıI]/g, 'ı')
    .replace(/[İi]/g, 'i')
    .replace(/[öÖ]/g, 'ö')
    .replace(/[şŞ]/g, 'ş')
    .replace(/[üÜ]/g, 'ü');
  
  const chars = normalizedText.split('');
  
  // Konuşma hızına göre timing ayarla
  const baseCharDuration = 150; // ms
  const charDuration = baseCharDuration / speechRate;
  
  console.log(`🎬 Viseme animasyonu başlıyor: "${text}"`);
  console.log(`⏱️ Karakter süresi: ${charDuration}ms, Toplam süre: ${(chars.length * charDuration)}ms`);
  
  chars.forEach((char, index) => {
    const timeout = setTimeout(() => {
      const visemeValue = TURKISH_VISEME_MAP[char] || 0;
      const baseIntensity = VISEME_INTENSITY_MAP[visemeValue] || 0.5;
      
      // Rastgele varyasyon ekle (%±20)
      const randomVariation = 0.8 + Math.random() * 0.4; // 0.8-1.2 arası
      const finalIntensity = baseIntensity * randomVariation;
      
      // Sesli harfler için ek vurgu
      if (visemeValue >= 6) {
        const vowelBoost = 1.1 + Math.random() * 0.3; // 1.1-1.4 arası
        speechStore.setViseme(visemeValue, Math.min(finalIntensity * vowelBoost, 1.0));
      } else {
        speechStore.setViseme(visemeValue, finalIntensity);
      }
      
      speechStore.setCharIndex(index);
      
      // Debug log (sadece önemli karakterler için)
      if (visemeValue > 0) {
        console.log(`📝 [${index}/${chars.length}] "${char}" → V:${visemeValue} I:${finalIntensity.toFixed(2)}`);
      }
      
    }, index * charDuration);
    
    animationTimeouts.push(timeout);
  });
  
  // Animasyon bitişi
  const finalTimeout = setTimeout(() => {
    speechStore.setViseme(0, 0);
    speechStore.setCharIndex(chars.length);
    console.log("🔚 Viseme animasyonu tamamlandı");
  }, chars.length * charDuration + 300);
  
  animationTimeouts.push(finalTimeout);
};

// Kullanıcı etkileşimi yönetimi
let isInitialized = false;

const initializeSpeech = () => {
  if (isInitialized) return;
  
  const handleUserInteraction = () => {
    const speechStore = useSpeechStore.getState();
    speechStore.setUserInteracted(true);
    console.log("✅ Kullanıcı etkileşimi algılandı - TTS aktif");
    
    // Event listener'ları kaldır
    document.removeEventListener('click', handleUserInteraction);
    document.removeEventListener('keydown', handleUserInteraction);
    document.removeEventListener('touchstart', handleUserInteraction);
  };
  
  document.addEventListener('click', handleUserInteraction);
  document.addEventListener('keydown', handleUserInteraction);
  document.addEventListener('touchstart', handleUserInteraction);
  
  isInitialized = true;
};

// Sayfa yüklendiğinde initialize et
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSpeech);
  } else {
    initializeSpeech();
  }
}

// Ana konuşma fonksiyonu
export const speakText = (text: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!text || text.trim() === '') {
      resolve();
      return;
    }
    
    const speechStore = useSpeechStore.getState();
    
    // Kullanıcı etkileşimi kontrolü
    if (!speechStore.userInteracted) {
      console.warn("⚠️ Kullanıcı etkileşimi gerekli - sadece animasyon yapılıyor");
      
      speechStore.setText(text);
      speechStore.setSpeaking(true);
      animateVisemes(text, 0.8);
      
      setTimeout(() => {
        speechStore.setSpeaking(false);
        speechStore.setViseme(0, 0);
        resolve();
      }, text.length * 150 + 500);
      
      return;
    }
    
    console.log("🎙️ TTS Başlatılıyor:", text);
    speechStore.setText(text);
    
    // Web Speech API kontrolü
    if (!('speechSynthesis' in window)) {
      console.warn('⚠️ Bu tarayıcı konuşma sentezini desteklemiyor - sadece animasyon');
      
      speechStore.setSpeaking(true);
      animateVisemes(text, 0.8);
      
      setTimeout(() => {
        speechStore.setSpeaking(false);
        speechStore.setViseme(0, 0);
        resolve();
      }, text.length * 150 + 500);
      
      return;
    }
    
    // Önceki konuşmaları durdur
    try {
      window.speechSynthesis.cancel();
    } catch (error) {
      console.warn("⚠️ SpeechSynthesis cancel hatası:", error);
    }
    
    // Kısa bekleme
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Türkçe ses ayarları
      utterance.lang = 'tr-TR';
      utterance.pitch = 1.0;
      utterance.rate = 0.9; // Biraz daha yavaş viseme senkronizasyonu için
      utterance.volume = 1.0;
      
      let hasStarted = false;
      
      // Konuşma olayları
      utterance.onstart = () => {
        hasStarted = true;
        speechStore.setSpeaking(true);
        console.log("🚀 Konuşma başladı - viseme animasyonu başlatılıyor");
        
        // Viseme animasyonunu başlat
        animateVisemes(text, utterance.rate);
      };
      
      utterance.onend = () => {
        speechStore.setSpeaking(false);
        speechStore.setViseme(0, 0);
        console.log("✅ Konuşma tamamlandı");
        resolve();
      };
      
      utterance.onerror = (event) => {
        console.error("❌ Konuşma hatası:", event.error);
        
        // Hata durumunda sadece animasyon yap
        if (!hasStarted) {
          speechStore.setSpeaking(true);
          animateVisemes(text, 0.8);
          
          setTimeout(() => {
            speechStore.setSpeaking(false);
            speechStore.setViseme(0, 0);
            resolve();
          }, text.length * 150 + 500);
        } else {
          speechStore.setSpeaking(false);
          speechStore.setViseme(0, 0);
          reject(new Error(`Speech synthesis error: ${event.error}`));
        }
      };
      
      // Konuşmayı başlat
      try {
        window.speechSynthesis.speak(utterance);
        
        // Güvenlik timeout'u - eğer 1 saniye içinde başlamazsa sadece animasyon yap
        const timeoutId = setTimeout(() => {
          if (!hasStarted) {
            console.log("⏰ Konuşma başlamadı, sadece animasyon yapılıyor");
            speechStore.setSpeaking(true);
            animateVisemes(text, 0.8);
            
            setTimeout(() => {
              speechStore.setSpeaking(false);
              speechStore.setViseme(0, 0);
              resolve();
            }, text.length * 150 + 500);
          }
        }, 1000);
        
        // Eğer konuşma başlarsa timeout'u temizle
        utterance.onstart = () => {
          clearTimeout(timeoutId);
          hasStarted = true;
          speechStore.setSpeaking(true);
          console.log("🚀 Konuşma başladı - viseme animasyonu başlatılıyor");
          animateVisemes(text, utterance.rate);
        };
        
      } catch (error) {
        console.error("❌ Konuşma başlatma hatası:", error);
        
        speechStore.setSpeaking(true);
        animateVisemes(text, 0.8);
        
        setTimeout(() => {
          speechStore.setSpeaking(false);
          speechStore.setViseme(0, 0);
          resolve();
        }, text.length * 150 + 500);
      }
      
    }, 100);
  });
};

// Konuşmayı durdur
export const stopSpeaking = (): void => {
  console.log("🛑 Konuşma durduruluyor");
  
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch (error) {
    console.warn("⚠️ Stop speaking hatası:", error);
  }
  
  // Tüm animasyon timeout'larını temizle
  animationTimeouts.forEach(timeout => clearTimeout(timeout));
  animationTimeouts = [];
  
  // Store'u sıfırla
  const speechStore = useSpeechStore.getState();
  speechStore.reset();
};

// Son mesajı oku
export const speakLastMessage = async (): Promise<void> => {
  try {
    const lastChatData = localStorage.getItem('lastChatMessage');
    if (lastChatData) {
      const messageData = JSON.parse(lastChatData);
      if (messageData.content && messageData.role === 'assistant') {
        console.log("📖 Son asistan mesajı okunuyor...");
        await speakText(messageData.content);
      } else {
        console.log("ℹ️ Okunacak son asistan mesajı bulunamadı");
      }
    } else {
      console.log("ℹ️ LocalStorage'da mesaj bulunamadı");
    }
  } catch (error) {
    console.error("❌ Son mesaj okuma hatası:", error);
  }
};

// Debug ve test fonksiyonları
export const testVisemes = (): void => {
  const testWords = [
    'merhaba',     // Çeşitli sessizler
    'günaydın',    // Sesli harfler
    'teşekkürler', // Karma
    'ağız',        // Özel karakterler
    'çok güzel'    // Uzun cümle
  ];
  
  console.log("🧪 Viseme test başlatılıyor...");
  
  testWords.forEach((word, index) => {
    setTimeout(() => {
      console.log(`🧪 Test kelimesi: ${word}`);
      speakText(word);
    }, index * 4000);
  });
};

// Manuel TTS etkinleştirme
export const enableSpeech = (): void => {
  const speechStore = useSpeechStore.getState();
  speechStore.setUserInteracted(true);
  console.log("🔓 TTS manuel olarak etkinleştirildi");
};

// Viseme debug bilgisi
export const getVisemeInfo = () => {
  return {
    visemeMap: TURKISH_VISEME_MAP,
    intensityMap: VISEME_INTENSITY_MAP,
    totalVisemes: Object.keys(VISEME_INTENSITY_MAP).length
  };
};