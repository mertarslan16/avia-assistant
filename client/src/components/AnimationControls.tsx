// src/components/AnimationControls.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSpeechStore, SPEECH_EVENTS } from '@/utils/tts';

interface AnimationControlsProps {
  onTest?: () => void;
}

export default function AnimationControls({ onTest }: AnimationControlsProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [animationList, setAnimationList] = useState<string[]>([]);
  const [selectedAnimation, setSelectedAnimation] = useState<string>('');
  const [weight, setWeight] = useState(0.5);
  const [audioAnalysis, setAudioAnalysis] = useState({ volume: 0, phoneme: '' });
  
  const { isSpeaking, setSpeaking } = useSpeechStore();
  
  // Konuşma olaylarını dinle
  useEffect(() => {
    const handleVolumeChange = (event: CustomEvent) => {
      setAudioAnalysis({
        volume: event.detail.volume || 0,
        phoneme: event.detail.phoneme || ''
      });
    };
    
    // Konuşma olaylarını dinle
    window.addEventListener(SPEECH_EVENTS.VOLUME, handleVolumeChange as EventListener);
    
    return () => {
      window.removeEventListener(SPEECH_EVENTS.VOLUME, handleVolumeChange as EventListener);
    };
  }, []);
  
  // Modelden animasyon listesini al
  useEffect(() => {
    // Bu genellikle modelden gelir, ama şimdilik varsayılan değerler kullanıyoruz
    const dummyAnimations = [
      'talk',
      'jaw_open',
      'blink',
      'head_turn',
      'smile',
      'frown'
    ];
    
    setAnimationList(dummyAnimations);
  }, []);
  
  // Test konuşması oluştur
  const handleTestSpeech = () => {
    // Konuşma durumunu değiştir
    setSpeaking(true);
    
    // Fonem dizisi
    const phonemes = 'merhaba, nasılsın? ben bir yapay zeka asistanıyım.'.split('');
    let index = 0;
    
    // START olayını tetikle
    window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.START));
    
    // Fonem simülasyonu
    const interval = setInterval(() => {
      if (index >= phonemes.length) {
        clearInterval(interval);
        setSpeaking(false);
        window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.END));
        return;
      }
      
      const phoneme = phonemes[index];
      const isVowel = 'aeıioöuü'.includes(phoneme);
      
      // Ses seviyesi ve fonem olayını tetikle
      window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.VOLUME, { 
        detail: { 
          volume: isVowel ? 0.8 : 0.3, 
          phoneme 
        } 
      }));
      
      index++;
    }, 100);
    
    // Ek test fonksiyonu varsa çağır
    if (onTest) onTest();
  };
  
  // Ek bilgi verileri
  const stats = [
    { label: 'Konuşma Durumu', value: isSpeaking ? 'Aktif' : 'Pasif' },
    { label: 'Ses Seviyesi', value: audioAnalysis.volume.toFixed(2) },
    { label: 'Fonem', value: audioAnalysis.phoneme || '-' }
  ];
  
  if (!isVisible) {
    return (
      <button 
        className="fixed bottom-4 left-4 bg-blue-600 text-white px-3 py-1 rounded z-50"
        onClick={() => setIsVisible(true)}
      >
        Animasyon Kontrolü
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-4 left-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg z-50 w-80">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold">Animasyon Kontrolü</h3>
        <button 
          className="text-gray-400 hover:text-white"
          onClick={() => setIsVisible(false)}
        >
          ✕
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-gray-800 p-2 rounded">
            <div className="text-xs text-gray-400">{stat.label}</div>
            <div className={`font-medium ${stat.label === 'Konuşma Durumu' && isSpeaking ? 'text-green-400' : ''}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-gray-800 p-3 rounded mb-3">
        <div className="text-sm font-semibold mb-2">Fonem Testi</div>
        <div className="grid grid-cols-4 gap-1">
          {['a', 'e', 'i', 'o', 'u', 'm', 'b', 's'].map(phoneme => (
            <button
              key={phoneme}
              className="bg-blue-600 hover:bg-blue-500 p-1 rounded text-sm"
              onClick={() => {
                window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.VOLUME, { 
                  detail: { volume: 0.8, phoneme } 
                }));
              }}
            >
              {phoneme}
            </button>
          ))}
        </div>
      </div>
      
      <div className="bg-gray-800 p-3 rounded mb-3">
        <div className="text-sm font-semibold mb-2">Animasyon Seçimi</div>
        <select 
          className="w-full bg-gray-700 text-white p-2 rounded mb-2"
          value={selectedAnimation}
          onChange={(e) => setSelectedAnimation(e.target.value)}
        >
          <option value="">Seçiniz...</option>
          {animationList.map(anim => (
            <option key={anim} value={anim}>{anim}</option>
          ))}
        </select>
        
        <div className="text-xs mb-1">Ağırlık: {weight}</div>
        <input 
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={weight}
          onChange={(e) => setWeight(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>
      
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleTestSpeech}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded flex-1"
        >
          Test Konuşması
        </button>
        
        <button
          onClick={() => {
            setSpeaking(false);
            window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.END));
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded flex-1"
          disabled={!isSpeaking}
        >
          Durdur
        </button>
      </div>
    </div>
  );
}