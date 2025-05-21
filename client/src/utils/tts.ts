// src/utils/tts.ts - Gelişmiş konuşma senkronizasyon sistemi
import { create } from 'zustand';

// Konuşma durumunu saklamak için geliştirilmiş store
interface SpeechStore {
  isSpeaking: boolean;
  currentText: string;
  audioAnalysis: {
    volume: number;
    pitch: number;
    phoneme: string;
    mouthShape: string; // Daha ayrıntılı ağız şekli bilgisi
  };
  setSpeaking: (status: boolean) => void;
  setText: (text: string) => void;
  setAudioAnalysis: (analysis: { 
    volume: number; 
    pitch: number; 
    phoneme: string;
    mouthShape?: string;
  }) => void;
}

export const useSpeechStore = create<SpeechStore>((set) => ({
  isSpeaking: false,
  currentText: '',
  audioAnalysis: {
    volume: 0,
    pitch: 0,
    phoneme: '',
    mouthShape: 'rest',
  },
  setSpeaking: (status) => set({ isSpeaking: status }),
  setText: (text) => set({ currentText: text }),
  setAudioAnalysis: (analysis) => set({ 
    audioAnalysis: {
      ...analysis,
      mouthShape: analysis.mouthShape || 'default'
    } 
  }),
}));

// Ses analizi sonuçlarını paylaşmak için eventler
export const SPEECH_EVENTS = {
  START: 'speech-start',
  END: 'speech-end',
  PHONEME: 'speech-phoneme',
  VOLUME: 'speech-volume',
};

// Gelişmiş TTS fonksiyonu - konuşma olaylarını tetikler
export const speakText = (text: string): void => {
  if (!text) return;
  
  const speechStore = useSpeechStore.getState();
  
  // Konuşma durumunu güncelleyelim
  speechStore.setText(text);
  
  // Browser Web Speech API kullanımı
  if ('speechSynthesis' in window) {
    // Önceki konuşmaları durdur
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Türkçe dil desteği
    utterance.lang = 'tr-TR';
    
    // Ses tonunu ve hızını ayarlama
    utterance.pitch = 1.0;
    utterance.rate = 0.9; // Biraz daha yavaş konuşsun
    utterance.volume = 1.0;
    
    // Konuşma olayları
    utterance.onstart = () => {
      speechStore.setSpeaking(true);
      // Konuşma başladı olayını yayınla
      window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.START));
      
      // Ağız hareketleri için ses analizi simülasyonu
      startMouthSimulation(text);
    };
    
    utterance.onend = () => {
      speechStore.setSpeaking(false);
      // Konuşma bitti olayını yayınla
      window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.END));
      
      // Simülasyonu durdur
      stopMouthSimulation();
    };
    
    utterance.onerror = () => {
      // console.error('Konuşma hatası:', event);
      speechStore.setSpeaking(false);
      window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.END));
      stopMouthSimulation();
    };
    
    // Konuşmayı başlat
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn('Bu tarayıcı konuşma sentezini desteklemiyor.');
  }
};

// Türkçe için viseme (ağız şekli) tablosu
// Türkçe fonemlere göre ağız şekilleri ve değerleri
interface PhonemeSettings {
  volume: number;       // Ağız açıklığı (0-1)
  roundness: number;    // Dudak yuvarlaklığı (0-1)
  jaw: number;          // Çene açıklığı (0-1)
  type: string;         // Fonem tipi (vowel, consonant)
  mouthShape: string;   // Ağız şekli ismi (viseme)
}

const PHONEME_MAP: Record<string, PhonemeSettings> = {
  // Ünlüler (şekil ve ses açısından gruplandırılmış)
  'a': { volume: 0.5, roundness: 0.1, jaw: 0.6, type: 'vowel', mouthShape: 'ah' },
  'e': { volume: 0.4, roundness: 0.2, jaw: 0.4, type: 'vowel', mouthShape: 'eh' },
  'i': { volume: 0.3, roundness: 0.1, jaw: 0.3, type: 'vowel', mouthShape: 'ih' },
  'ı': { volume: 0.3, roundness: 0.1, jaw: 0.3, type: 'vowel', mouthShape: 'ih' },
  'o': { volume: 0.4, roundness: 0.8, jaw: 0.4, type: 'vowel', mouthShape: 'oh' },
  'ö': { volume: 0.4, roundness: 0.8, jaw: 0.4, type: 'vowel', mouthShape: 'oh' },
  'u': { volume: 0.3, roundness: 0.9, jaw: 0.3, type: 'vowel', mouthShape: 'oo' },
  'ü': { volume: 0.3, roundness: 0.9, jaw: 0.3, type: 'vowel', mouthShape: 'oo' },
  
  // Ünsüzler
  'b': { volume: 0.1, roundness: 0.7, jaw: 0.1, type: 'consonant', mouthShape: 'b' },
  'p': { volume: 0.1, roundness: 0.7, jaw: 0.1, type: 'consonant', mouthShape: 'p' },
  'm': { volume: 0.1, roundness: 0.7, jaw: 0.1, type: 'consonant', mouthShape: 'm' },
  'f': { volume: 0.2, roundness: 0.3, jaw: 0.2, type: 'consonant', mouthShape: 'f' },
  'v': { volume: 0.2, roundness: 0.3, jaw: 0.2, type: 'consonant', mouthShape: 'v' },
  's': { volume: 0.2, roundness: 0.2, jaw: 0.2, type: 'consonant', mouthShape: 's' },
  'z': { volume: 0.2, roundness: 0.2, jaw: 0.2, type: 'consonant', mouthShape: 'z' },
  'ş': { volume: 0.2, roundness: 0.2, jaw: 0.2, type: 'consonant', mouthShape: 'sh' },
  'j': { volume: 0.2, roundness: 0.2, jaw: 0.2, type: 'consonant', mouthShape: 'zh' },
  'ç': { volume: 0.2, roundness: 0.2, jaw: 0.2, type: 'consonant', mouthShape: 'ch' },
  'c': { volume: 0.2, roundness: 0.2, jaw: 0.2, type: 'consonant', mouthShape: 'j' },
  't': { volume: 0.2, roundness: 0.1, jaw: 0.3, type: 'consonant', mouthShape: 't' },
  'd': { volume: 0.2, roundness: 0.1, jaw: 0.3, type: 'consonant', mouthShape: 'd' },
  'n': { volume: 0.2, roundness: 0.1, jaw: 0.3, type: 'consonant', mouthShape: 'n' },
  'l': { volume: 0.3, roundness: 0.1, jaw: 0.3, type: 'consonant', mouthShape: 'l' },
  'r': { volume: 0.3, roundness: 0.1, jaw: 0.3, type: 'consonant', mouthShape: 'r' },
  'k': { volume: 0.3, roundness: 0.1, jaw: 0.4, type: 'consonant', mouthShape: 'k' },
  'g': { volume: 0.3, roundness: 0.1, jaw: 0.4, type: 'consonant', mouthShape: 'g' },
  'ğ': { volume: 0.3, roundness: 0.1, jaw: 0.3, type: 'consonant', mouthShape: 'g' },
  'h': { volume: 0.2, roundness: 0.2, jaw: 0.3, type: 'consonant', mouthShape: 'h' },
  'y': { volume: 0.2, roundness: 0.2, jaw: 0.2, type: 'consonant', mouthShape: 'y' },
  
  // Özel karakterler
  ' ': { volume: 0.1, roundness: 0.1, jaw: 0.1, type: 'special', mouthShape: 'rest' },
  '.': { volume: 0.05, roundness: 0.1, jaw: 0.05, type: 'special', mouthShape: 'rest' },
  ',': { volume: 0.08, roundness: 0.1, jaw: 0.08, type: 'special', mouthShape: 'rest' },
  '!': { volume: 0.05, roundness: 0.1, jaw: 0.05, type: 'special', mouthShape: 'rest' },
  '?': { volume: 0.1, roundness: 0.1, jaw: 0.1, type: 'special', mouthShape: 'rest' },
  
  // Varsayılan (herhangi bir karakter eşleşmezse)
  'default': { volume: 0.3, roundness: 0.3, jaw: 0.3, type: 'default', mouthShape: 'default' }
};

// Ağız hareketlerini simüle etmek için gelişmiş fonem analizi
let simulationInterval: number | null = null;

function startMouthSimulation(text: string) {
  const speechStore = useSpeechStore.getState();
  const textLower = text.toLowerCase();
  let charIndex = 0;
  
  // Ses animasyonu başladığında başlangıç ağız durumu
  // İlk karakterin ağız açıklığını hemen göster
  if (textLower.length > 0) {
    const firstChar = textLower[0];
    const phonemeSettings = PHONEME_MAP[firstChar] || PHONEME_MAP['default'];
    
    speechStore.setAudioAnalysis({
      volume: phonemeSettings.volume,
      pitch: Math.random() * 0.2 + 0.7,
      phoneme: firstChar,
      mouthShape: phonemeSettings.mouthShape
    });
    
    window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.VOLUME, { 
      detail: { 
        volume: phonemeSettings.volume, 
        phoneme: firstChar,
        mouthShape: phonemeSettings.mouthShape,
        roundness: phonemeSettings.roundness,
        jaw: phonemeSettings.jaw
      } 
    }));
  }
  
  // Fonem geçişlerini daha doğal hale getirmek için yardımcı fonksiyon
  const createTransition = (
    fromValue: number, 
    toValue: number, 
    steps: number
  ): number[] => {
    const step = (toValue - fromValue) / steps;
    return Array.from({ length: steps }, (_, i) => fromValue + step * (i + 1));
  };
  
  // Geçiş için değerler
  const transitionFrames = 3;
  let currentTransition: {
    volume: number[];
    roundness: number[];
    jaw: number[];
    currentIndex: number;
    currentPhoneme: string;
    targetPhoneme: string;
    mouthShape: string;
  } | null = null;
  
  // Son değerleri takip etmek için
  let lastValues = {
    volume: 0,
    roundness: 0,
    jaw: 0,
    phoneme: ''
  };
  
  // Her 80 ms'de bir karakter ilerlet (konuşma hızına yaklaşık)
  simulationInterval = window.setInterval(() => {
    // Eğer geçiş animasyonu varsa, önce onu tamamla
    if (currentTransition && currentTransition.currentIndex < currentTransition.volume.length) {
      const index = currentTransition.currentIndex;
      
      // Geçiş değerlerini al
      const volume = currentTransition.volume[index];
      const roundness = currentTransition.roundness[index];
      const jaw = currentTransition.jaw[index];
      
      // Geçiş animasyonunu güncelle
      speechStore.setAudioAnalysis({
        volume,
        pitch: Math.random() * 0.2 + 0.7,
        phoneme: currentTransition.currentPhoneme,
        mouthShape: currentTransition.mouthShape
      });
      
      // Event gönder
      window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.VOLUME, { 
        detail: { 
          volume, 
          phoneme: currentTransition.currentPhoneme,
          mouthShape: currentTransition.mouthShape,
          roundness,
          jaw,
          isTransition: true
        } 
      }));
      
      // Geçiş indeksini arttır
      currentTransition.currentIndex++;
      
      // Son değerleri güncelle
      lastValues = {
        volume,
        roundness,
        jaw,
        phoneme: currentTransition.currentPhoneme
      };
      
      return;
    }
    
    // Metni bitirince simülasyonu durdur
    if (charIndex >= textLower.length) {
      stopMouthSimulation();
      return;
    }
    
    // Mevcut karakteri al
    const char = textLower[charIndex];
    
    // Fonem ayarlarını al
    const phonemeSettings = PHONEME_MAP[char] || PHONEME_MAP['default'];
    
    // Ağız açıklık değerlerini al
    let volume = phonemeSettings.volume;
    let roundness = phonemeSettings.roundness;
    let jaw = phonemeSettings.jaw;
    
    // Sesli harflerde hafif varyasyon ekleyelim
    if (phonemeSettings.type === 'vowel') {
      // Daha az varyasyon (±5%)
      const variation = (Math.random() * 0.1) - 0.05;
      volume = Math.max(0.1, Math.min(0.7, volume + variation));
      
      // Çene açıklığında da hafif varyasyon
      const jawVariation = (Math.random() * 0.1) - 0.05;
      jaw = Math.max(0.1, Math.min(0.7, jaw + jawVariation));
    }
    
    // Daha inandırıcı konuşma için bazı durumlarda ağzı daha fazla aç
    if (charIndex > 0) {
      const prevChar = textLower[charIndex - 1];
      // Nokta, virgül, ünlem veya soru işaretinden sonra gelen karakterler
      if ('.!?,;:'.includes(prevChar) && char !== ' ') {
        volume *= 1.1; // Daha az vurgulama (1.2 yerine 1.1)
        jaw *= 1.1;
      }
      
      // Geçiş animasyonu oluştur (mevcut değerlerden yeni değerlere)
      // Sadece belirli bir eşik değerden fazla değişiklik olursa geçiş yap
      const volumeDiff = Math.abs(volume - lastValues.volume);
      const roundnessDiff = Math.abs(roundness - lastValues.roundness);
      const jawDiff = Math.abs(jaw - lastValues.jaw);
      
      // Eğer önemli bir değişiklik varsa, yumuşak geçiş oluştur
      if (volumeDiff > 0.1 || roundnessDiff > 0.1 || jawDiff > 0.1) {
        currentTransition = {
          volume: createTransition(lastValues.volume, volume, transitionFrames),
          roundness: createTransition(lastValues.roundness, roundness, transitionFrames),
          jaw: createTransition(lastValues.jaw, jaw, transitionFrames),
          currentIndex: 0,
          currentPhoneme: lastValues.phoneme || char,
          targetPhoneme: char,
          mouthShape: phonemeSettings.mouthShape
        };
        
        // Bir sonraki sefere geçiş oluştur
        charIndex++;
        
        // Son değerleri güncelle
        lastValues = {
          volume,
          roundness,
          jaw,
          phoneme: char
        };
        
        return;
      }
    }
    
    // Ses analizi bilgisini güncelle
    speechStore.setAudioAnalysis({
      volume,
      pitch: Math.random() * 0.2 + 0.7,
      phoneme: char,
      mouthShape: phonemeSettings.mouthShape
    });
    
    // Ağız hareketini bildir
    window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.VOLUME, { 
      detail: { 
        volume, 
        phoneme: char,
        mouthShape: phonemeSettings.mouthShape,
        roundness,
        jaw
      } 
    }));
    
    // Son değerleri güncelle
    lastValues = {
      volume,
      roundness,
      jaw,
      phoneme: char
    };
    
    charIndex++;
  }, 80); // Daha yavaş, daha doğal konuşma
}

function stopMouthSimulation() {
  if (simulationInterval !== null) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  
  const speechStore = useSpeechStore.getState();
  
  // Ağız kapanma animasyonu için kademeli geçiş
  let closeSteps = 5;
  let currentStep = 0;
  let initialVolume = speechStore.audioAnalysis.volume;
  let initialRoundness = 0.1; // Son kapanma durumunda dudaklar hafif yuvarlak
  let initialJaw = speechStore.audioAnalysis.volume; // Çene açıklığı
  
  const closeInterval = setInterval(() => {
    currentStep++;
    const ratio = 1 - (currentStep / closeSteps);
    const volume = initialVolume * ratio;
    const roundness = initialRoundness + (0.1 * ratio); // Dudak yuvarlaklığı azalır
    const jaw = initialJaw * ratio; // Çene kapanır
    
    // Ağız kapanma durumunu güncelle
    speechStore.setAudioAnalysis({ 
      volume, 
      pitch: 0, 
      phoneme: '',
      mouthShape: 'rest'
    });
    
    // Kapanma olayını yayınla
    window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.VOLUME, { 
      detail: { 
        volume, 
        phoneme: '',
        mouthShape: 'rest',
        roundness,
        jaw,
        isClosing: true
      } 
    }));
    
    if (currentStep >= closeSteps) {
      clearInterval(closeInterval);
      speechStore.setAudioAnalysis({ 
        volume: 0, 
        pitch: 0, 
        phoneme: '',
        mouthShape: 'rest'
      });
      window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.VOLUME, { 
        detail: { 
          volume: 0, 
          phoneme: '',
          mouthShape: 'rest',
          roundness: 0,
          jaw: 0
        } 
      }));
    }
  }, 30);
}