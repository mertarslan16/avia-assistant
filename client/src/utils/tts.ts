// src/utils/tts.ts - Gelişmiş konuşma senkronizasyon sistemi
import { create } from 'zustand';

// Konuşma durumunu saklamak için store
interface SpeechStore {
  isSpeaking: boolean;
  currentText: string;
  audioAnalysis: {
    volume: number;
    pitch: number;
    phoneme: string;
  };
  setSpeaking: (status: boolean) => void;
  setText: (text: string) => void;
  setAudioAnalysis: (analysis: { volume: number; pitch: number; phoneme: string }) => void;
}

export const useSpeechStore = create<SpeechStore>((set) => ({
  isSpeaking: false,
  currentText: '',
  audioAnalysis: {
    volume: 0,
    pitch: 0,
    phoneme: '',
  },
  setSpeaking: (status) => set({ isSpeaking: status }),
  setText: (text) => set({ currentText: text }),
  setAudioAnalysis: (analysis) => set({ audioAnalysis: analysis }),
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
    utterance.rate = 1.0;
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

// Ağız hareketlerini simüle etmek için basit fonem analizi
let simulationInterval: number | null = null;

function startMouthSimulation(text: string) {
  // Türkçe fonemlere göre ağız şekilleri
  const phoneticMap: Record<string, number> = {
    'a': 0.8,  // Açık ağız
    'e': 0.6,  // Orta açık ağız
    'i': 0.3,  // Hafif açık ağız
    'o': 0.7,  // Yuvarlak açık ağız
    'ö': 0.7,  // Yuvarlak açık ağız
    'u': 0.4,  // Yuvarlak küçük açık ağız
    'ü': 0.4,  // Yuvarlak küçük açık ağız
    'b': 0.2,  // Dudaklar kapalı
    'p': 0.2,  // Dudaklar kapalı
    'm': 0.2,  // Dudaklar kapalı
    'f': 0.3,  // Alt dudak üst dişlere değer
    'v': 0.3,  // Alt dudak üst dişlere değer
    's': 0.3,  // Diş arası
    'z': 0.3,  // Diş arası
    'ş': 0.3,  // Diş arası
    'ç': 0.4,  // Diş arası
    'c': 0.4,  // Diş arası
    't': 0.5,  // Dil ucu
    'd': 0.5,  // Dil ucu
    'n': 0.5,  // Dil ucu
    'r': 0.4,  // Dil ucu titreşim
    'l': 0.4,  // Dil ucu
    'k': 0.6,  // Gırtlak
    'g': 0.6,  // Gırtlak
    'h': 0.3,  // Nefes
    'y': 0.3,  // Dil ortası
    'j': 0.3,  // Dil ortası
    ' ': 0.1,  // Boşluk - ağız hafif açık
  };
  
  const speechStore = useSpeechStore.getState();
  const textLower = text.toLowerCase();
  let charIndex = 0;
  
  // Her 50 ms'de bir karakter ilerlet (konuşma hızına yaklaşık)
  simulationInterval = window.setInterval(() => {
    if (charIndex >= textLower.length) {
      // Metni bitirince simülasyonu durdur
      stopMouthSimulation();
      return;
    }
    
    const char = textLower[charIndex];
    const volume = phoneticMap[char] || 0.2; // Harfe göre ağız açıklığı
    
    // Ses analizi bilgisini güncelle
    speechStore.setAudioAnalysis({
      volume,
      pitch: Math.random() * 0.3 + 0.7, // Rastgele bir ton değişimi
      phoneme: char,
    });
    
    // Ağız hareketini bildir
    window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.VOLUME, { 
      detail: { volume, phoneme: char } 
    }));
    
    charIndex++;
  }, 50); // Ortalama bir karakter okuma hızı
}

function stopMouthSimulation() {
  if (simulationInterval !== null) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  
  const speechStore = useSpeechStore.getState();
  speechStore.setAudioAnalysis({ volume: 0, pitch: 0, phoneme: '' });
}