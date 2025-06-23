// src/components/AIVA.tsx - İyileştirilmiş versiyon
'use client';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { useChatStore } from '@/store/chatStore';
import { speakText, useSpeechStore} from '@/utils/tts';
import { AivaModel } from './AivaModal'; 
import ChatInterface from './ChatInterface';

export default function AIVA() {
  const { username, interests, conversationCount, isLoggedIn, logout } = useUserStore();
  const { chats, fetchChats, isLoading } = useChatStore();
  const [hasSpoken, setHasSpoken] = useState(false);
  const { isSpeaking, currentViseme, visemeIntensity } = useSpeechStore();
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
      if (username && interests && !hasSpoken && !initialLoading && !isSpeaking && modelLoaded) {
        let welcomeText = '';
        
        if (conversationCount < 3) {
          welcomeText = `Merhaba ${username}! Ben AIVA, senin kişisel yapay zeka asistanın. İlgi alanların gerçekten çok güzel: ${interests}. Seninle tanışmak harika!`;
        } else if (chats.length > 0 && conversationCount > 10) {
          welcomeText = `Tekrar merhaba ${username}! Seni yeniden görmek ne güzel. Bugün sana nasıl yardımcı olabilirim?`;
        } else {
          welcomeText = `Merhaba ${username}! Bugün nasılsın? İlgi alanların hakkında konuşmayı çok seviyorum.`;
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
    
    if (modelLoaded) {
      welcomeUser();
    }
  }, [username, interests, hasSpoken, conversationCount, chats.length, initialLoading, modelLoaded, isSpeaking]);
  
  // Model yükleme durumunu izleme
  const handleModelLoading = (status: boolean) => {
    setModelLoaded(status);
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
    <div className="container mx-auto px-4 py-8 text-center">
      <div className="flex justify-end items-center mb-6">
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
            {/* Geliştirilmiş ışıklandırma */}
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 5, 5]} intensity={0.8} />
            <directionalLight position={[-5, 5, 5]} intensity={0.4} />
            
            {/* Yüze odaklı ışık */}
            <spotLight 
              position={[0, 1, 4]} 
              angle={0.3} 
              penumbra={0.5} 
              intensity={1.2} 
              color="#ffffff" 
            />
            
            {/* Alt aydınlatma */}
            <pointLight position={[0, -2, 2]} intensity={0.3} color="#4fc3f7" />
            
            <Suspense fallback={
              <mesh>
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshStandardMaterial color="#4fc3f7" />
              </mesh>
            }>
              <AivaModel 
                speaking={isSpeaking} 
                onLoaded={() => handleModelLoading(true)} 
              />
              <Environment preset="studio"/>
              <OrbitControls 
                enableZoom={true}
                enablePan={false}
                enableRotate={true}
                minDistance={1}
                maxDistance={5}
                minPolarAngle={Math.PI/4}
                maxPolarAngle={Math.PI/1.2}
              />
            </Suspense>
          </Canvas>
          
          {/* Durum Göstergesi */}
          <div className="absolute bottom-2 left-2 right-2 text-white p-3 bg-black bg-opacity-70 rounded text-sm">
            {isSpeaking ? (
              <div className="flex items-center justify-between">
                <p className="animate-pulse flex items-center">
                  🔊 Konuşuyor... 
                  <span className="ml-2 text-xs">
                    V{currentViseme} ({visemeIntensity.toFixed(1)})
                  </span>
                </p>
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className={`w-1 h-4 bg-blue-400 rounded animate-pulse`}
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        opacity: visemeIntensity > i * 0.2 ? 1 : 0.3
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p>
                  {username ? `Merhaba ${username}! 👋` : 'Merhaba! 👋'}
                </p>
              </div>
            )}
          </div>
          
          {/* Model yükleme göstergesi */}
          {!modelLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p>3D Model Yükleniyor...</p>
                <p className="text-xs text-gray-300 mt-1">Facial rigging sistemi hazırlanıyor</p>
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
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
            İşleniyor...
          </div>
        </div>
      )}
    </div>
  );
}