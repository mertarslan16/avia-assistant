// src/components/AIVA.tsx - Hata düzeltmesi ile
'use client';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { useChatStore } from '@/store/chatStore';
import { speakText, useSpeechStore, SPEECH_EVENTS } from '@/utils/tts';
import { AivaModel } from './AivaModal'; // İmport ismini kontrol et!
import ChatInterface from './ChatInterface';
import ChatBox from './ChatBox';
import ModelDebugger from './ModelDebugger'; // Debug aracı import'u
import { ModelInspectorButton } from './ModelInspector';
import MouthAnimationDebugger from './MouthAnimationDebugger';

export default function AIVA() {
  const { username, interests, userMemory, conversationCount, isLoggedIn, logout } = useUserStore();
  const { chats, fetchChats, isLoading } = useChatStore();
  const [hasSpoken, setHasSpoken] = useState(false);
  const isSpeaking = useSpeechStore((state) => state.isSpeaking);
  const { audioAnalysis } = useSpeechStore();
  const [modelLoaded, setModelLoaded] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showMouthDebugger, setShowMouthDebugger] = useState(false);

  // Debug modu (geliştirme sırasında açık tutun, üretimde kapatın)
  const [debugMode, setDebugMode] = useState(true);
  
  // Sayfa yüklendiğinde yapılacak işlemler
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setInitialLoading(true);
        
        // Kullanıcı giriş yapmışsa sohbetleri getir
        if (isLoggedIn) {
          await fetchChats();
        }
      } catch (error) {
        console.error("Başlatma hatası:", error);
      } finally {
        setInitialLoading(false);
      }
    };
    
    initializeApp();
  }, [isLoggedIn, fetchChats]);
  
  // İlk açılışta kullanıcıyı karşıla - ChatInterface'den bağımsız
  useEffect(() => {
    const welcomeUser = () => {
      if (username && interests && !hasSpoken && !initialLoading && !isSpeaking) {
        // İlk veya yeni kullanıcı karşılama mesajı
        let welcomeText = '';
        
        if (conversationCount < 3) {
          welcomeText = `Merhaba ${username}! İlgi alanlarını çok seviyorum: ${interests}. Seninle tanışmak güzel!`;
        } else if (chats.length > 0 && conversationCount > 10) {
          // Düzenli kullanıcı için daha kişisel karşılama
          welcomeText = `Tekrar merhaba ${username}! Seni yeniden görmek güzel. Bugün nasıl yardımcı olabilirim?`;
        } else {
          welcomeText = `Merhaba ${username}! Nasılsın bugün? İlgi alanların hakkında konuşmayı seviyorum.`;
        }
        
        // Biraz gecikme ile konuşmayı başlat (modelin yüklenmesi için)
        setTimeout(() => {
          // Eğer başka bir konuşma yoksa karşılama mesajını seslendir
          if (!isSpeaking) {
            speakText(welcomeText);
            setHasSpoken(true);
          }
        }, 2000); // Biraz daha uzun bir bekleme süresi
      }
    };
    
    // Model ve sayfa yüklendikten sonra karşılama mesajını seslendir
    if (modelLoaded) {
      welcomeUser();
    }
  }, [username, interests, hasSpoken, conversationCount, chats.length, initialLoading, modelLoaded, isSpeaking]);
  
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
  
  // Çıkış işlemi
  const handleLogout = () => {
    logout();
    window.location.reload(); // Sayfayı yenile
  };
  
  // Yükleme göstergesi
  if (initialLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold mb-6 text-center text-white">
          AIVA - Kişiselleştirilmiş Yapay Zeka Asistanınız
        </h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">
          AIVA - Kişiselleştirilmiş Yapay Zeka Asistanınız
        </h1>
        <ModelInspectorButton />
        <div className="flex items-center space-x-4">
          {isLoggedIn && (
            <>
              <span className="text-white">{username || 'Kullanıcı'}</span>
              <button 
                onClick={handleLogout}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Çıkış Yap
              </button>
            </>
          )}
          
          {/* Debug modu düğmesi */}
          <button
          onClick={() => setDebugMode(!debugMode)}
          className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm mr-2"
          title="Debug modunu aç/kapa"
        >
          {debugMode ? 'Debug: Açık' : 'Debug: Kapalı'}
        </button>
        <button
          onClick={() => setShowMouthDebugger(!showMouthDebugger)}
          className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
          title="Ağız animasyonu ayarlarını aç/kapa"
        >
          {showMouthDebugger ? 'Ağız Debugger: Açık' : 'Ağız Debugger: Kapalı'}
        </button>
        </div>
      </div>
      
      {!isLoggedIn && !username ? <ChatBox /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 3D Model */}
          <div className="w-full h-[500px] bg-gray-900 rounded-xl overflow-hidden relative">
            <Canvas 
              camera={{ 
                position: [0, 0, 2], 
                fov: 20,
                near: 0.1,
                far: 1000
              }}
            >
              {/* Temel ışıklandırma */}
              <ambientLight intensity={0.8} />
              <directionalLight position={[5, 5, 5]} intensity={0.8} />
              
              {/* Yüze doğrultulmuş ek ışık */}
              <spotLight 
                position={[0, 1, 4]} 
                angle={0.3} 
                penumbra={0.5} 
                intensity={1.0} 
                color="#ffffff" 
              />
              
              <Suspense fallback={
                <mesh>
                  <boxGeometry args={[1, 1, 1]} />
                  <meshStandardMaterial color="hotpink" />
                </mesh>
              }>
                <AivaModel 
                  speaking={isSpeaking} 
                  mouthOpenness={audioAnalysis.volume > 0 ? audioAnalysis.volume : 0.3} // Konuşurken minimum değer
                  onLoaded={() => handleModelLoading(true)} 
                />
                <Environment preset="studio" intensity={0.5} />
                <OrbitControls 
                  enableZoom={false}
                  enablePan={false}
                  enableRotate={true} // Debug için rotasyonu etkinleştir
                  minPolarAngle={Math.PI/3}  // Daha fazla rotasyon izni
                  maxPolarAngle={Math.PI/1.5}
                />
              </Suspense>
            </Canvas>
            
              <div className="absolute bottom-2 left-2 right-2 text-white p-2 bg-black bg-opacity-50 rounded text-sm">
                {isSpeaking ? (
                  <p className="animate-pulse">
                    Konuşuyor... 🔊 <span className="text-xs">Fonem: {audioAnalysis.phoneme}</span>
                  </p>
                ) : (
                  <div>
                    <p>
                      Merhaba {username}!
                    </p>
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
      
      {/* Hata durumunda veya yükleme sırasında genel bilgi mesajı */}
      {isLoading && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          İşleniyor...
        </div>
      )}
      {showMouthDebugger && (
      <MouthAnimationDebugger 
        onClose={() => setShowMouthDebugger(false)}
        />
    )}
      {/* Debug paneli (sadece debug modu açık olduğunda göster) */}
      {debugMode && <ModelDebugger />}
    </div>
  );
}