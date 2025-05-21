// src/components/MouthAnimationDebugger.tsx
import { useState, useEffect } from 'react';
import { useSpeechStore, SPEECH_EVENTS } from '@/utils/tts';

interface MouthAnimationDebuggerProps {
  onClose?: () => void;
}

export default function MouthAnimationDebugger({ onClose }: MouthAnimationDebuggerProps) {
  const [phoneticSettings, setPhoneticSettings] = useState<Record<string, {
    volume: number;
    roundness: number;
    jaw: number;
  }>>({
    'a': { volume: 0.5, roundness: 0.1, jaw: 0.6 },
    'e': { volume: 0.4, roundness: 0.2, jaw: 0.4 },
    'i': { volume: 0.3, roundness: 0.1, jaw: 0.3 },
    'o': { volume: 0.4, roundness: 0.8, jaw: 0.4 },
    'u': { volume: 0.3, roundness: 0.9, jaw: 0.3 },
  });
  
  const [selectedPhoneme, setSelectedPhoneme] = useState<string>('a');
  const [testWord, setTestWord] = useState<string>('merhaba');
  const [presets, setPresets] = useState<string[]>([
    'merhaba', 'nasılsın', 'selam', 'teşekkürler', 'hoşgeldiniz'
  ]);
  
  const { isSpeaking, audioAnalysis } = useSpeechStore();
  
  // Paneldeki değerleri güncelle
  const handleSettingChange = (property: 'volume' | 'roundness' | 'jaw', value: number) => {
    setPhoneticSettings(prev => ({
      ...prev,
      [selectedPhoneme]: {
        ...prev[selectedPhoneme],
        [property]: value
      }
    }));
  };
  
  // Fonemi test et
  const testPhoneme = (phoneme: string) => {
    const settings = phoneticSettings[phoneme] || { volume: 0.4, roundness: 0.3, jaw: 0.4 };
    
    window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.VOLUME, { 
      detail: { 
        volume: settings.volume, 
        phoneme,
        mouthShape: phoneme,
        roundness: settings.roundness,
        jaw: settings.jaw
      } 
    }));
  };
  
  // Seçili fonemi test et
  const testCurrentPhoneme = () => {
    testPhoneme(selectedPhoneme);
  };
  
  // Kelimeyi test et
  const testWordAnimation = (word: string) => {
    // Konuşma başladı olayını tetikle
    window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.START));
    
    // Kelimedeki her karakteri sırayla test et
    const chars = word.toLowerCase().split('');
    let index = 0;
    
    const interval = setInterval(() => {
      if (index >= chars.length) {
        clearInterval(interval);
        // Konuşma bitti olayını tetikle
        window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.END));
        return;
      }
      
      const char = chars[index];
      // Özel fonetik ayarları veya varsayılanları kullan
      const settings = phoneticSettings[char] || { volume: 0.3, roundness: 0.3, jaw: 0.3 };
      
      window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.VOLUME, { 
        detail: { 
          volume: settings.volume, 
          phoneme: char,
          mouthShape: char,
          roundness: settings.roundness,
          jaw: settings.jaw
        } 
      }));
      
      index++;
    }, 150); // Daha yavaş animasyon için
  };
  
  // Tüm değerleri sıfırla
  const resetSettings = () => {
    setPhoneticSettings({
      'a': { volume: 0.5, roundness: 0.1, jaw: 0.6 },
      'e': { volume: 0.4, roundness: 0.2, jaw: 0.4 },
      'i': { volume: 0.3, roundness: 0.1, jaw: 0.3 },
      'o': { volume: 0.4, roundness: 0.8, jaw: 0.4 },
      'u': { volume: 0.3, roundness: 0.9, jaw: 0.3 },
    });
  };
  
  // Türkçe karakter setleri
  const vowels = ['a', 'e', 'i', 'ı', 'o', 'ö', 'u', 'ü'];
  const consonants = ['b', 'c', 'ç', 'd', 'f', 'g', 'ğ', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 'ş', 't', 'v', 'y', 'z'];
  
  return (
    <div className="fixed top-20 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg z-40 w-80">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">Ağız Animasyonu Ayarları</h2>
        {onClose && (
          <button 
            className="text-gray-400 hover:text-white"
            onClick={onClose}
          >
            ✕
          </button>
        )}
      </div>
      
      <div className="bg-gray-800 p-3 rounded mb-4">
        <h3 className="text-sm font-bold mb-2">Mevcut Durum</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-700 p-2 rounded">
            <div className="text-xs text-gray-400">Konuşma Durumu</div>
            <div className={`font-medium ${isSpeaking ? 'text-green-400' : 'text-gray-300'}`}>
              {isSpeaking ? 'Konuşuyor' : 'Sessiz'}
            </div>
          </div>
          <div className="bg-gray-700 p-2 rounded">
            <div className="text-xs text-gray-400">Aktif Fonem</div>
            <div className="font-medium text-yellow-400">
              {audioAnalysis.phoneme || '-'}
            </div>
          </div>
          <div className="bg-gray-700 p-2 rounded">
            <div className="text-xs text-gray-400">Ağız Açıklığı</div>
            <div className="font-medium text-blue-400">
              {audioAnalysis.volume.toFixed(2)}
            </div>
          </div>
          <div className="bg-gray-700 p-2 rounded">
            <div className="text-xs text-gray-400">Vizualizasyon</div>
            <div className="h-4 bg-gray-600 rounded overflow-hidden">
              <div 
                className="h-full bg-blue-500"
                style={{ width: `${audioAnalysis.volume * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="text-sm font-bold mb-1">Fonemleri Test Et</h3>
        
        <div className="mb-2">
          <div className="text-xs text-gray-400 mb-1">Ünlüler</div>
          <div className="flex flex-wrap gap-1">
            {vowels.map(vowel => (
              <button
                key={vowel}
                className={`px-3 py-1 rounded text-sm ${selectedPhoneme === vowel ? 'bg-blue-600' : 'bg-gray-700'}`}
                onClick={() => {
                  setSelectedPhoneme(vowel);
                  testPhoneme(vowel);
                }}
              >
                {vowel}
              </button>
            ))}
          </div>
        </div>
        
        <div className="mb-2">
          <div className="text-xs text-gray-400 mb-1">Ünsüzler</div>
          <div className="flex flex-wrap gap-1">
            {consonants.map(consonant => (
              <button
                key={consonant}
                className={`px-2 py-1 rounded text-xs ${selectedPhoneme === consonant ? 'bg-blue-600' : 'bg-gray-700'}`}
                onClick={() => {
                  setSelectedPhoneme(consonant);
                  testPhoneme(consonant);
                }}
              >
                {consonant}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="bg-gray-800 p-3 rounded mb-4">
        <h3 className="text-sm font-bold mb-2">
          Fonem Ayarları: <span className="text-yellow-400">{selectedPhoneme}</span>
        </h3>
        
        {phoneticSettings[selectedPhoneme] ? (
          <>
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs">Ağız Açıklığı: {phoneticSettings[selectedPhoneme].volume.toFixed(2)}</span>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={phoneticSettings[selectedPhoneme].volume}
                  onChange={(e) => handleSettingChange('volume', Number(e.target.value))}
                  className="w-16 bg-gray-700 text-white text-center rounded px-1 py-0.5 text-xs"
                />
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={phoneticSettings[selectedPhoneme].volume}
                onChange={(e) => handleSettingChange('volume', Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs">Dudak Yuvarlaklığı: {phoneticSettings[selectedPhoneme].roundness.toFixed(2)}</span>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={phoneticSettings[selectedPhoneme].roundness}
                  onChange={(e) => handleSettingChange('roundness', Number(e.target.value))}
                  className="w-16 bg-gray-700 text-white text-center rounded px-1 py-0.5 text-xs"
                />
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={phoneticSettings[selectedPhoneme].roundness}
                onChange={(e) => handleSettingChange('roundness', Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs">Çene Açıklığı: {phoneticSettings[selectedPhoneme].jaw.toFixed(2)}</span>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={phoneticSettings[selectedPhoneme].jaw}
                  onChange={(e) => handleSettingChange('jaw', Number(e.target.value))}
                  className="w-16 bg-gray-700 text-white text-center rounded px-1 py-0.5 text-xs"
                />
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={phoneticSettings[selectedPhoneme].jaw}
                onChange={(e) => handleSettingChange('jaw', Number(e.target.value))}
                className="w-full"
              />
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-400 mb-2">
            Önce bir fonem seçin.
          </div>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={testCurrentPhoneme}
            className="flex-1 bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
            disabled={!phoneticSettings[selectedPhoneme]}
          >
            Test Et
          </button>
          <button
            onClick={() => {
              // Yeni bir fonem ekle veya güncelle
              if (!phoneticSettings[selectedPhoneme]) {
                setPhoneticSettings(prev => ({
                  ...prev,
                  [selectedPhoneme]: { volume: 0.3, roundness: 0.3, jaw: 0.3 }
                }));
              }
            }}
            className="flex-1 bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
            disabled={!!phoneticSettings[selectedPhoneme]}
          >
            {phoneticSettings[selectedPhoneme] ? 'Kaydedildi' : 'Yeni Ekle'}
          </button>
        </div>
      </div>
      
      <div className="bg-gray-800 p-3 rounded mb-4">
        <h3 className="text-sm font-bold mb-2">Kelime Testi</h3>
        
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={testWord}
            onChange={(e) => setTestWord(e.target.value)}
            className="flex-1 bg-gray-700 text-white px-2 py-1 rounded"
            placeholder="Test edilecek kelime"
          />
          <button
            onClick={() => testWordAnimation(testWord)}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
          >
            Test
          </button>
        </div>
        
        <div className="text-xs text-gray-400 mb-1">Hazır Kelimeler</div>
        <div className="flex flex-wrap gap-1">
          {presets.map((word, index) => (
            <button
              key={index}
              className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs"
              onClick={() => {
                setTestWord(word);
                testWordAnimation(word);
              }}
            >
              {word}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={resetSettings}
          className="flex-1 bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm"
        >
          Tüm Ayarları Sıfırla
        </button>
        
        <button
          onClick={() => {
            // Değerleri kaydet
            // LocalStorage veya console.log ile değerleri göster
            console.log('Mevcut Ayarlar:', JSON.stringify(phoneticSettings, null, 2));
          }}
          className="flex-1 bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm"
        >
          Ayarları Logla
        </button>
      </div>
      
      <div className="text-xs text-gray-400 mt-4">
        <p>Bu panel ile fonem bazlı ağız hareketlerini ayarlayabilirsiniz. Her ses için ağız açıklığı, dudak yuvarlaklığı ve çene açıklığı değerlerini ayarlayın.</p>
        <p className="mt-1">Yapılan değişiklikler tarayıcı oturumunuzda geçici olarak saklanır.</p>
      </div>
    </div>
  );
}