// src/components/RegisterPage.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useUserStore } from '@/store/userStore';
import { useApiStore } from '@/store/useApiStore';
import { useChatStore } from '@/store/chatStore';
import { useRouter } from 'next/navigation';
import { Text, Float, MeshDistortMaterial, MeshWobbleMaterial, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Link from 'next/link';

// Robot kafa modeli
const RobotHead = () => {
  const headRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.2;
      headRef.current.position.y = Math.sin(clock.getElapsedTime()) * 0.1 + 0.1;
    }
  });
  
  return (
    <group ref={headRef} position={[0, 0, -4]} scale={1.2}>
      {/* Kafa */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <MeshWobbleMaterial color="#3b82f6" factor={0.1} speed={1} />
      </mesh>
      
      {/* Gözler */}
      <mesh position={[-0.5, 0.3, 1]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
      
      <mesh position={[0.5, 0.3, 1]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Ağız */}
      <mesh position={[0, -0.5, 1]}>
        <boxGeometry args={[1, 0.2, 0.1]} />
        <meshStandardMaterial color="#1e3a8a" />
      </mesh>
      
      {/* Antenler */}
      <mesh position={[-0.8, 1.2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
        <meshStandardMaterial color="#60a5fa" />
      </mesh>
      
      <mesh position={[0.8, 1.2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
        <meshStandardMaterial color="#60a5fa" />
      </mesh>
      
      {/* Anten başlıkları */}
      <mesh position={[-0.8, 1.7, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#f87171" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      
      <mesh position={[0.8, 1.7, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#f87171" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
};

// Animasyonlu uçan küreler
const FloatingSpheres = () => {
  return (
    <>
      <Float speed={1.5} rotationIntensity={1} floatIntensity={1} position={[-3, -1, -5]}>
        <mesh>
          <sphereGeometry args={[0.6, 32, 32]} />
          <MeshDistortMaterial color="#60a5fa" speed={1.5} distort={0.4} />
        </mesh>
      </Float>
      
      <Float speed={2} rotationIntensity={1.2} floatIntensity={1.2} position={[3, 1, -4]}>
        <mesh>
          <sphereGeometry args={[0.4, 32, 32]} />
          <MeshDistortMaterial color="#818cf8" speed={1.2} distort={0.3} />
        </mesh>
      </Float>
      
      <Float speed={1.8} rotationIntensity={0.8} floatIntensity={0.8} position={[2, -2, -3]}>
        <mesh>
          <sphereGeometry args={[0.3, 32, 32]} />
          <MeshDistortMaterial color="#93c5fd" speed={1} distort={0.2} />
        </mesh>
      </Float>
      
      <Float speed={1.3} rotationIntensity={1.5} floatIntensity={1.5} position={[-2, 2, -5]}>
        <mesh>
          <sphereGeometry args={[0.5, 32, 32]} />
          <MeshDistortMaterial color="#2563eb" speed={2} distort={0.5} />
        </mesh>
      </Float>
    </>
  );
};

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [interests, setInterests] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  const userStore = useUserStore();
  const { setToken } = useApiStore();
  const { fetchChats } = useChatStore();
  const { isLoading } = useApiStore();
  
  // Başarılı kayıtta ana sayfaya yönlendir
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [success, router]);
  
  // Kayıt işlemi
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form doğrulama
    if (!username.trim()) {
      setError('Lütfen kullanıcı adınızı girin.');
      return;
    }
    
    if (!email.trim()) {
      setError('Lütfen email adresinizi girin.');
      return;
    }
    
    if (!password.trim() || password.length < 6) {
      setError('Şifreniz en az 6 karakter olmalıdır.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    
    if (!interests.trim()) {
      setError('Lütfen en az bir ilgi alanı belirtin.');
      return;
    }
    
    try {
      // Kullanıcı kaydı
      const success = await userStore.register(username, email, password);
      
      if (success) {
        // Kullanıcı tercihlerini güncelle
        await userStore.updatePreferences({
          language: 'tr',
          theme: 'dark',
          notifications: true
        });
        
        // Token'ı localStorage'dan al ve apiStore'a kaydet
        const token = localStorage.getItem('token');
        if (token) {
          setToken(token);
        }
        
        // Sohbetleri getir
        await fetchChats();
        
        setError(null);
        setSuccess(true);
      } else {
        setError('Kayıt başarısız. Lütfen farklı bir kullanıcı adı veya email deneyin.');
      }
    } catch (err) {
      console.error('Kayıt hatası:', err);
      setError('Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };
  
  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* 3D Arka Plan */}
      <div className="fixed inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <directionalLight position={[0, 10, 5]} intensity={1} />
          
          <RobotHead />
          <FloatingSpheres />
          
          <Text 
            position={[0, 4, 0]}
            rotation={[0, 0, 0]}
            color="#ffffff"
            fontSize={1.2}
            font="/fonts/inter-bold.woff"
            textAlign="center"
          >
            AIVAya Hoş Geldiniz
            <meshStandardMaterial color="#ffffff" />
          </Text>
          
          <OrbitControls enableZoom={false} enablePan={false} />
        </Canvas>
      </div>
      
      {/* Kayıt Formu */}
      <div className="relative z-10 flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-lg p-8 bg-gray-800 bg-opacity-80 backdrop-blur-md rounded-xl shadow-xl">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Hesap Oluştur</h2>
          
          {error && (
            <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-500 bg-opacity-20 border border-green-500 text-green-100 px-4 py-3 rounded-lg mb-6">
              Hesabınız başarıyla oluşturuldu! Yönlendiriliyorsunuz...
            </div>
          )}
          
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-white mb-2 font-medium">Ad Soyad</label>
              <input
                id="username"
                type="text"
                className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Adınız Soyadınız"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading || success}
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-white mb-2 font-medium">Email</label>
              <input
                id="email"
                type="email"
                className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ornek@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || success}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-white mb-2 font-medium">Şifre</label>
                <input
                  id="password"
                  type="password"
                  className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="En az 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || success}
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-white mb-2 font-medium">Şifre Tekrar</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Şifrenizi tekrarlayın"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading || success}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="interests" className="block text-white mb-2 font-medium">İlgi Alanlarınız</label>
              <textarea
                id="interests"
                className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Örnek: Yapay zeka, müzik, spor, seyahat..."
                rows={3}
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                disabled={isLoading || success}
              />
            </div>
            
            <button
              type="submit"
              className={`w-full px-4 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors 
                ${(isLoading || success) ? 'bg-blue-800 opacity-70 cursor-not-allowed' : ''}`}
              disabled={isLoading || success}
            >
              {isLoading ? 'Hesap Oluşturuluyor...' : success ? 'Hesap Oluşturuldu!' : 'Hesap Oluştur'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-gray-300">
              Zaten bir hesabınız var mı?{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                Giriş Yap
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}