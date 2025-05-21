// ModelDebugger.tsx - Geliştirilmiş Kemik Testi
import { useState, useEffect, useRef } from 'react';
import { useSpeechStore, SPEECH_EVENTS } from '@/utils/tts';

// Global tip tanımları
declare global {
  interface Window {
    testModelBone: (boneName: string, amount: number, axis: 'x' | 'y' | 'z') => void;
    modelBones: any[]; // Tüm kemikleri global olarak tutacağız
    selectedBoneIndex: number;
  }
}

export default function ModelDebugger() {
  const { isSpeaking, audioAnalysis } = useSpeechStore();
  const [jawRotation, setJawRotation] = useState<number | null>(null);
  const [eventsLog, setEventsLog] = useState<string[]>([]);
  const [modelStatus, setModelStatus] = useState("Model Durumu Bilinmiyor");
  
  // Kemik testi için state
  const [selectedBone, setSelectedBone] = useState<number>(0);
  const [rotationAmount, setRotationAmount] = useState<number>(0.1);
  const [rotationAxis, setRotationAxis] = useState<'x' | 'y' | 'z'>('x');
  const [modelBones, setModelBones] = useState<any[]>([]);
  const [selectedBoneName, setSelectedBoneName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const boneListRef = useRef<HTMLDivElement>(null);
  
  // Debug ayarları
  const [manualControl, setManualControl] = useState(false);
  const [manualMouthOpen, setManualMouthOpen] = useState(0.5);
  const [showBoneList, setShowBoneList] = useState(false);
  
  useEffect(() => {
    // Global kemik test fonksiyonunu oluştur
    window.testModelBone = (boneName: string, amount: number, axis: 'x' | 'y' | 'z') => {
      if (!window.modelBones) {
        console.warn("Model kemikleri bulunamadı");
        return;
      }
      
      const boneIndex = window.modelBones.findIndex(bone => bone.name === boneName);
      if (boneIndex === -1) {
        console.warn(`"${boneName}" isimli kemik bulunamadı`);
        return;
      }
      
      const bone = window.modelBones[boneIndex];
      if (!bone.userData) bone.userData = {};
      const originalRotation = bone.userData.originalRotation || bone.rotation.clone();
      bone.userData.originalRotation = originalRotation;
      
      // Test için sadece belirtilen ekseni döndür
      if (axis === 'x') {
        bone.rotation.x = originalRotation.x + amount;
      } else if (axis === 'y') {
        bone.rotation.y = originalRotation.y + amount;
      } else if (axis === 'z') {
        bone.rotation.z = originalRotation.z + amount;
      }
      
      window.selectedBoneIndex = boneIndex;
      setSelectedBone(boneIndex);
      
      console.log(`Kemik test ediliyor: ${bone.name}, Eksen: ${axis}, Miktar: ${amount}`);
      setEventsLog(prev => {
        const logEntry = `${new Date().toLocaleTimeString()}: Kemik test: ${bone.name} (${axis}: ${amount})`;
        return [logEntry, ...prev.slice(0, 9)];
      });
    };
    
    // Her 1 saniyede bir kemik listesini güncelle
    const interval = setInterval(() => {
      if (window.modelBones && window.modelBones.length > 0) {
        setModelBones([...window.modelBones]);
        
        // Seçili kemiğin adını güncelle
        if (selectedBone >= 0 && selectedBone < window.modelBones.length) {
          setSelectedBoneName(window.modelBones[selectedBone].name);
        }
      }
    }, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, [selectedBone]);
  
  // Event loglarını takip et
  useEffect(() => {
    const logEvent = (name: string, detail?: any) => {
      const timestamp = new Date().toLocaleTimeString();
      const detailStr = detail ? JSON.stringify(detail) : '';
      const logEntry = `${timestamp}: ${name} ${detailStr}`;
      
      setEventsLog(prev => {
        const newLog = [logEntry, ...prev];
        return newLog.slice(0, 10);
      });
    };
    
    const handleStart = () => {
      logEvent('START');
      setModelStatus("Konuşma Başladı");
    };
    
    const handleEnd = () => {
      logEvent('END');
      setModelStatus("Konuşma Bitti");
    };
    
    const handleVolume = (event: CustomEvent) => {
      const detail = {
        volume: event.detail.volume.toFixed(2),
        phoneme: event.detail.phoneme
      };
      logEvent('VOLUME', detail);
      setModelStatus(`Konuşuyor: ${event.detail.phoneme} (${event.detail.volume.toFixed(2)})`);
    };
    
    window.addEventListener(SPEECH_EVENTS.START, handleStart);
    window.addEventListener(SPEECH_EVENTS.END, handleEnd);
    window.addEventListener(SPEECH_EVENTS.VOLUME, handleVolume as EventListener);
    
    return () => {
      window.removeEventListener(SPEECH_EVENTS.START, handleStart);
      window.removeEventListener(SPEECH_EVENTS.END, handleEnd);
      window.removeEventListener(SPEECH_EVENTS.VOLUME, handleVolume as EventListener);
    };
  }, []);
  
  // Çene rotasyonunu simüle et
  useEffect(() => {
    if (isSpeaking && audioAnalysis.volume > 0) {
      const simulatedRotation = -0.8 * audioAnalysis.volume;
      setJawRotation(simulatedRotation);
    } else {
      setJawRotation(0);
    }
  }, [isSpeaking, audioAnalysis]);
  
  // Manuel test butonları
  const triggerTestAnimation = (level: number) => {
    const testEvent = new CustomEvent(SPEECH_EVENTS.VOLUME, {
      detail: { volume: level, phoneme: level > 0.5 ? 'a' : 'i' }
    });
    window.dispatchEvent(testEvent);
    console.log('Test animasyonu tetiklendi:', level);
  };
  
  // Konuşma testleri
  const testSpeechEvents = () => {
    window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.START));
    
    setTimeout(() => triggerTestAnimation(0.5), 300);
    setTimeout(() => triggerTestAnimation(0.8), 600);
    setTimeout(() => triggerTestAnimation(0.9), 900);
    
    setTimeout(() => {
      triggerTestAnimation(0.2);
      window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.END));
    }, 1200);
  };
  
  // Seçili kemiği test et
  const testSelectedBone = () => {
    if (selectedBone >= 0 && selectedBone < modelBones.length) {
      const boneName = modelBones[selectedBone].name;
      if (window.testModelBone) {
        window.testModelBone(boneName, rotationAmount, rotationAxis);
      } else {
        console.warn("Kemik test fonksiyonu bulunamadı");
      }
    }
  };
  
  // Kemiği sıfırla
  const resetBone = () => {
    if (selectedBone >= 0 && selectedBone < modelBones.length) {
      const boneName = modelBones[selectedBone].name;
      if (window.testModelBone) {
        window.testModelBone(boneName, 0, rotationAxis);
      }
    }
  };
  
  // Kemikleri filtrele
  const filteredBones = modelBones.filter(bone => 
    searchQuery === "" || 
    bone.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Özel kemik grupları için hızlı testler
  const testJawBones = () => {
    // Çene ile ilgili kemikleri ara ve test et
    const jawBones = modelBones.filter(bone => 
      bone.name.toLowerCase().includes('jaw') || 
      bone.name.toLowerCase().includes('çene')
    );
    
    if (jawBones.length > 0) {
      // Her bir çene kemiğini test et
      jawBones.forEach(bone => {
        if (window.testModelBone) {
          // X ekseni için negatif değer çeneyi açar
          window.testModelBone(bone.name, -0.2, 'x');
          
          setEventsLog(prev => {
            const logEntry = `${new Date().toLocaleTimeString()}: Çene kemiği test: ${bone.name}`;
            return [logEntry, ...prev.slice(0, 9)];
          });
        }
      });
    } else {
      setEventsLog(prev => {
        const logEntry = `${new Date().toLocaleTimeString()}: Hiç çene kemiği bulunamadı!`;
        return [logEntry, ...prev.slice(0, 9)];
      });
    }
  };
  
  const testLipBones = () => {
    // Dudak ile ilgili kemikleri ara ve test et
    const lipBones = modelBones.filter(bone => 
      bone.name.toLowerCase().includes('lip') || 
      bone.name.toLowerCase().includes('mouth') ||
      bone.name.toLowerCase().includes('dudak')
    );
    
    if (lipBones.length > 0) {
      // Her bir dudak kemiğini test et
      lipBones.forEach(bone => {
        if (window.testModelBone) {
          // Dudak türüne göre farklı eksenlerde test et
          const axis = bone.name.toLowerCase().includes('upper') ? 'x' : 'z';
          const amount = bone.name.toLowerCase().includes('upper') ? -0.1 : 0.1;
          
          window.testModelBone(bone.name, amount, axis);
          
          setEventsLog(prev => {
            const logEntry = `${new Date().toLocaleTimeString()}: Dudak kemiği test: ${bone.name}`;
            return [logEntry, ...prev.slice(0, 9)];
          });
        }
      });
    } else {
      setEventsLog(prev => {
        const logEntry = `${new Date().toLocaleTimeString()}: Hiç dudak kemiği bulunamadı!`;
        return [logEntry, ...prev.slice(0, 9)];
      });
    }
  };
  
  // Kemikleri sıfırla
  const resetAllBones = () => {
    modelBones.forEach(bone => {
      if (window.testModelBone) {
        window.testModelBone(bone.name, 0, 'x');
        window.testModelBone(bone.name, 0, 'y');
        window.testModelBone(bone.name, 0, 'z');
      }
    });
    
    setEventsLog(prev => {
      const logEntry = `${new Date().toLocaleTimeString()}: Tüm kemikler sıfırlandı`;
      return [logEntry, ...prev.slice(0, 9)];
    });
  };
  
  return (
    <div className="fixed bottom-4 left-4 bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-lg text-white text-sm overflow-auto max-h-96 z-50" style={{ maxWidth: showBoneList ? '400px' : '280px' }}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-blue-400">Model Debugger</h3>
        <div className="flex gap-1">
          <button 
            onClick={() => setShowBoneList(!showBoneList)}
            className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
          >
            {showBoneList ? 'Kemikleri Gizle' : 'Kemikleri Göster'}
          </button>
        </div>
      </div>
      
      <div className="mb-2 p-1 bg-gray-800 rounded">
        <div className="text-green-500 font-bold text-xs">{modelStatus}</div>
      </div>
      
      {/* Hızlı Test Butonları */}
      <div className="mb-3 flex flex-wrap gap-1">
        <button onClick={testJawBones} className="flex-1 bg-green-700 hover:bg-green-600 px-2 py-1 rounded text-xs">
          Çene Test
        </button>
        <button onClick={testLipBones} className="flex-1 bg-green-700 hover:bg-green-600 px-2 py-1 rounded text-xs">
          Dudak Test
        </button>
        <button onClick={resetAllBones} className="flex-1 bg-red-700 hover:bg-red-600 px-2 py-1 rounded text-xs">
          Tümünü Sıfırla
        </button>
      </div>
      
      {/* Kemik testi UI */}
      <div className="mb-3 p-2 bg-gray-800 rounded">
        <h4 className="font-bold text-xs mb-2">Kemik Testi</h4>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs">Seçili Kemik:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedBone(Math.max(0, selectedBone - 1))}
              className="px-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              max={modelBones.length - 1}
              value={selectedBone}
              onChange={(e) => setSelectedBone(parseInt(e.target.value) || 0)}
              className="w-12 bg-gray-700 text-white text-center rounded"
            />
            <button
              onClick={() => setSelectedBone(Math.min((modelBones.length - 1) || 10, selectedBone + 1))}
              className="px-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
            >
              +
            </button>
          </div>
        </div>
        
        <div className="text-xs mb-2 truncate">
          {modelBones[selectedBone] ? (
            <span className="font-bold text-yellow-400">{modelBones[selectedBone].name}</span>
          ) : (
            <span className="text-gray-400">Kemik seçilmedi</span>
          )}
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs">Rotasyon:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setRotationAxis('x')}
              className={`px-2 py-0.5 rounded text-xs ${rotationAxis === 'x' ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              X
            </button>
            <button
              onClick={() => setRotationAxis('y')}
              className={`px-2 py-0.5 rounded text-xs ${rotationAxis === 'y' ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              Y
            </button>
            <button
              onClick={() => setRotationAxis('z')}
              className={`px-2 py-0.5 rounded text-xs ${rotationAxis === 'z' ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              Z
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs">Miktar: {rotationAmount.toFixed(2)}</span>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.05"
            value={rotationAmount}
            onChange={(e) => setRotationAmount(parseFloat(e.target.value))}
            className="w-32"
          />
        </div>
        
        <div className="flex gap-1">
          <button 
            onClick={testSelectedBone}
            className="flex-1 bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded text-xs"
          >
            Test Et
          </button>
          <button 
            onClick={resetBone}
            className="flex-1 bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs"
          >
            Sıfırla
          </button>
        </div>
      </div>
      
      {/* Ağız hareketlerini hızlı test etme butonları */}
      <div className="flex flex-wrap gap-1 mb-2">
        <button onClick={() => triggerTestAnimation(0.3)} className="flex-1 bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded text-xs">
          Küçük Ağız
        </button>
        <button onClick={() => triggerTestAnimation(0.6)} className="flex-1 bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded text-xs">
          Orta Ağız
        </button>
        <button onClick={() => triggerTestAnimation(0.9)} className="flex-1 bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded text-xs">
          Büyük Ağız
        </button>
        <button onClick={testSpeechEvents} className="w-full bg-green-700 hover:bg-green-600 px-2 py-1 rounded text-xs">
          Konuşma Testi
        </button>
      </div>
      
      {/* Kemik listesi */}
      {showBoneList && (
        <div className="border-t border-gray-700 pt-2 mb-2">
          <h4 className="font-bold text-xs mb-1">Kemik Listesi ({filteredBones.length})</h4>
          
          {/* Kemik arama */}
          <div className="mb-2">
            <input
              type="text"
              placeholder="Kemik ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-700 text-white text-xs p-1 rounded"
            />
          </div>
          
          <div ref={boneListRef} className="max-h-40 overflow-auto bg-gray-800 rounded p-1">
            {filteredBones.length === 0 ? (
              <div className="text-gray-400 text-xs p-2">
                {searchQuery ? "Aranan kemik bulunamadı" : "Henüz kemik bulunamadı..."}
              </div>
            ) : (
              filteredBones.map((bone, index) => {
                const boneIndex = modelBones.indexOf(bone);
                const highlightType = bone.name.toLowerCase().includes('jaw') 
                  ? 'bg-green-900 hover:bg-green-800' 
                  : bone.name.toLowerCase().includes('lip') || bone.name.toLowerCase().includes('mouth')
                    ? 'bg-blue-900 hover:bg-blue-800'
                    : 'hover:bg-gray-700';
                    
                return (
                  <div 
                    key={index} 
                    id={`bone-${boneIndex}`}
                    className={`text-xs py-1 px-1 cursor-pointer ${highlightType} ${selectedBone === boneIndex ? 'border border-yellow-500' : ''}`}
                    onClick={() => setSelectedBone(boneIndex)}
                  >
                    <div className="font-bold">{boneIndex}: {bone.name}</div>
                    <div className="text-gray-400">{bone.type}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      
      {/* Event log */}
      <div className="border-t border-gray-700 pt-2">
        <h4 className="font-bold text-xs mb-1">Event Logları</h4>
        <div className="text-xs bg-gray-800 p-1 rounded max-h-24 overflow-auto">
          {eventsLog.length === 0 ? (
            <div className="text-gray-500">Henüz log yok...</div>
          ) : (
            eventsLog.map((log, index) => (
              <div key={index} className="text-gray-300 border-b border-gray-700 pb-1 mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};