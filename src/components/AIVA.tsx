'use client';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { speakText, useSpeechStore, SPEECH_EVENTS } from '@/utils/tts';
import { AivaModel } from './AivaModal';
import ChatInterface from './ChatInterface';
import ChatBox from './ChatBox';
import { useConversationStore } from '@/utils/openai';

export default function AIVA() {
  const { name, interests, userMemory, conversationCount } = useUserStore();
  const [hasSpoken, setHasSpoken] = useState(false);
  const isSpeaking = useSpeechStore((state) => state.isSpeaking);
  const { audioAnalysis } = useSpeechStore();
  const { history } = useConversationStore();
  const [modelLoaded, setModelLoaded] = useState(false);
  
  // İlk açılışta kullanıcıyı karşıla
  useEffect(() => {
    if (name && interests && !hasSpoken) {
      // İlk veya yeni kullanıcı karşılama mesajı
      let welcomeText = '';
      
      if (conversationCount < 3) {
        welcomeText = `Merhaba ${name}! İlgi alanlarını çok seviyorum: ${interests}. Seninle tanışmak güzel!`;
      } else if (history.length > 0 && conversationCount > 10) {
        // Düzenli kullanıcı için daha kişisel karşılama
        welcomeText = `Tekrar merhaba ${name}! Seni yeniden görmek güzel. ${
          userMemory.favoriteTopic 
            ? `En son ${userMemory.favoriteTopic} hakkında konuşmuştuk, devam etmek ister misin?` 
            : `Bugün nasıl yardımcı olabilirim?`
        }`;
      } else {
        welcomeText = `Merhaba ${name}! Nasılsın bugün? İlgi alanların hakkında konuşmayı seviyorum.`;
      }
      
      // Biraz gecikme ile konuşmayı başlat (modelin yüklenmesi için)
      setTimeout(() => {
        speakText(welcomeText);
        setHasSpoken(true);
      }, 1000);
    }
  }, [name, interests, hasSpoken, conversationCount, history.length, userMemory.favoriteTopic]);
  
  // Konuşma durumunu takip eden efekt
  useEffect(() => {
    const handleSpeechStart = () => {
      console.log('Konuşma başladı');
    };
    
    const handleSpeechEnd = () => {
      console.log('Konuşma bitti');
    };
    
    const handleVolumeChange = (event: CustomEvent) => {
      console.log('Ses seviyesi:', event.detail.volume, 'Fonem:', event.detail.phoneme);
    };
    
    // Olay dinleyicileri ekle
    window.addEventListener(SPEECH_EVENTS.START, handleSpeechStart);
    window.addEventListener(SPEECH_EVENTS.END, handleSpeechEnd);
    window.addEventListener(SPEECH_EVENTS.VOLUME, handleVolumeChange as EventListener);
    
    return () => {
      // Temizlik
      window.removeEventListener(SPEECH_EVENTS.START, handleSpeechStart);
      window.removeEventListener(SPEECH_EVENTS.END, handleSpeechEnd);
      window.removeEventListener(SPEECH_EVENTS.VOLUME, handleVolumeChange as EventListener);
    };
  }, []);
  
  // Model yükleme durumunu izleme
  const handleModelLoading = (status: boolean) => {
    setModelLoaded(status);
    console.log("3D Model yükleme durumu:", status ? "Yüklendi" : "Yükleniyor");
  };
  
  // Hafıza bilgilerini görüntüle
  const getMemoryStats = () => {
    const topicCount = Object.keys(userMemory.topics || {}).length;
    const likedCount = userMemory.likedThings?.length || 0;
    const dislikedCount = userMemory.dislikedThings?.length || 0;
    const peopleCount = userMemory.mentionedNames?.length || 0;
    
    return {
      topicCount,
      likedCount,
      dislikedCount,
      peopleCount,
      totalMemories: topicCount + likedCount + dislikedCount + peopleCount
    };
  };
  
  const memoryStats = getMemoryStats();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-white">
        AIVA - Kişiselleştirilmiş Yapay Zeka Asistanınız
      </h1>
      
      {!name && <ChatBox />}
      
      {name && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 3D Model */}
          <div className="w-full h-[500px] bg-gray-900 rounded-xl overflow-hidden relative">
            <Canvas 
              camera={{ 
                position: [0, 0, 5],
                fov: 10
              }}
            >
              {/* Temel ışıklandırma */}
              <ambientLight intensity={1.0} />
              <directionalLight position={[5, 5, 5]} intensity={1.0} />
              
              <Suspense fallback={
                  <mesh>
                      <boxGeometry args={[1, 1, 1]} />
                      <meshStandardMaterial color="hotpink" />
                  </mesh>
              }>
                  <AivaModel 
                    speaking={isSpeaking} 
                    mouthOpenness={audioAnalysis.volume}
                    onLoaded={() => handleModelLoading(true)} 
                  />
                  <Environment preset="city" />
                  <OrbitControls 
                    enableZoom={true} 
                    enablePan={false} 
                    minPolarAngle={Math.PI/4} 
                    maxPolarAngle={Math.PI/1.5}
                  />
              </Suspense>
            </Canvas>
            
            <div className="absolute bottom-4 left-4 right-4 text-white p-2 bg-black bg-opacity-50 rounded">
              {isSpeaking ? (
                <p className="animate-pulse">
                  Konuşuyor... 🔊 <span className="text-sm">Fonem: {audioAnalysis.phoneme}</span>
                </p>
              ) : (
                <div>
                  <p className="text-lg">
                    Merhaba {name}! {interests} hakkında konuşmayı seviyorum.
                  </p>
                  <div className="mt-1 flex items-center text-xs text-gray-300">
                    <span className="mr-3">Konuşma sayısı: {conversationCount}</span>
                    {memoryStats.totalMemories > 0 && (
                      <span className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                        Bellek: {memoryStats.totalMemories} anı
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Model yükleme göstergesi */}
            {!modelLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p>3D Model Yükleniyor...</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Sohbet Arayüzü */}
          <div>
            <ChatInterface />
          </div>
        </div>
      )}
    </div>
  );
}