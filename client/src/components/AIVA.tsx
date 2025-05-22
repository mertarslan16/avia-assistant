// src/components/AIVA.tsx - Basit versiyon (debugger'lar olmadan)
'use client';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { useChatStore } from '@/store/chatStore';
import { speakText, useSpeechStore } from '@/utils/tts';
import { AivaModel } from './AivaModal'; 
import ChatInterface from './ChatInterface';

export default function AIVA() {
  const { username, interests, conversationCount, isLoggedIn, logout } = useUserStore();
  const { chats, fetchChats, isLoading } = useChatStore();
  const [hasSpoken, setHasSpoken] = useState(false);
  const isSpeaking = useSpeechStore((state) => state.isSpeaking);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
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
  
  // İlk açılışta kullanıcıyı karşıla
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
        
        // Biraz gecikme ile konuşmayı başlat
        setTimeout(() => {
          if (!isSpeaking) {
            speakText(welcomeText);
            setHasSpoken(true);
          }
        }, 2000);
      }
    };
    
    // Model yüklendikten sonra karşılama mesajını seslendir
    if (modelLoaded) {
      welcomeUser();
    }
  }, [username, interests, hasSpoken, conversationCount, chats.length, initialLoading, modelLoaded, isSpeaking]);
  
  // Model yükleme durumunu izleme
  const handleModelLoading = (status: boolean) => {
    setModelLoaded(status);
    console.log("3D Model yükleme durumu:", status ? "Yüklendi" : "Yükleniyor");
  };
  
  // Çıkış işlemi
  const handleLogout = () => {
    logout();
    window.location.reload();
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
        </div>
      </div>
      
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
                  onLoaded={() => handleModelLoading(true)} 
                />
                <Environment preset="studio"/>
                <OrbitControls 
                  enableZoom={false}
                  enablePan={false}
                  enableRotate={true}
                  minPolarAngle={Math.PI/3}
                  maxPolarAngle={Math.PI/1.5}
                />
              </Suspense>
            </Canvas>
            
            <div className="absolute bottom-2 left-2 right-2 text-white p-2 bg-black bg-opacity-50 rounded text-sm">
              {isSpeaking ? (
                <p className="animate-pulse">
                  Konuşuyor... 🔊
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

      
      {/* Yükleme mesajı */}
      {isLoading && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          İşleniyor...
        </div>
      )}
    </div>
  );
}