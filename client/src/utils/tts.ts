import { create } from 'zustand';

// Basit konuşma durumu store'u
interface SpeechStore {
  isSpeaking: boolean;
  currentText: string;
  setSpeaking: (status: boolean) => void;
  setText: (text: string) => void;
}

export const useSpeechStore = create<SpeechStore>((set) => ({
  isSpeaking: false,
  currentText: '',
  setSpeaking: (status) => set({ isSpeaking: status }),
  setText: (text) => set({ currentText: text }),
}));

// Basit TTS fonksiyonu - sadece konuşma
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
    };
    
    utterance.onend = () => {
      speechStore.setSpeaking(false);
    };
    
    utterance.onerror = () => {
      speechStore.setSpeaking(false);
    };
    
    // Konuşmayı başlat
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn('Bu tarayıcı konuşma sentezini desteklemiyor.');
  }
};