'use client';

import { useState, useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { useApiStore } from '@/store/useApiStore';
import { useChatStore } from '@/store/chatStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  const userStore = useUserStore();
  const { fetchChats } = useChatStore();
  const { isLoading } = useApiStore();
  
  // Başarılı girişte ana sayfaya yönlendir
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [success, router]);
  
  // Giriş işlemi
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form doğrulama
    if (!email.trim()) {
      setError('Lütfen email adresinizi girin.');
      return;
    }
    
    if (!password.trim()) {
      setError('Lütfen şifrenizi girin.');
      return;
    }
    
    try {
      const success = await userStore.login(email, password);
      
      if (success) {
       await fetchChats();
        
        setError(null);
        setSuccess(true);
      } else {
        setError('Giriş başarısız. Email veya şifre hatalı.');
      }
    } catch (err) {
      console.error('Giriş hatası:', err);
      setError('Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-blue-900">
      {/* Giriş Formu */}
      <div className="w-full max-w-md p-8 bg-gray-800 bg-opacity-80 backdrop-blur-md rounded-xl shadow-xl">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">AIVA</h2>
        <h3 className="text-xl text-gray-300 mb-8 text-center">Kişiselleştirilmiş Yapay Zeka Asistanı</h3>
        
        {error && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-500 bg-opacity-20 border border-green-500 text-green-100 px-4 py-3 rounded-lg mb-6">
            Giriş başarılı! Yönlendiriliyorsunuz...
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-6">
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
          
          <div>
            <label htmlFor="password" className="block text-white mb-2 font-medium">Şifre</label>
            <input
              id="password"
              type="password"
              className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Şifreniz"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading || success}
            />
          </div>
          
          <button
            type="submit"
            className={`w-full px-4 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors 
              ${(isLoading || success) ? 'bg-blue-800 opacity-70 cursor-not-allowed' : ''}`}
            disabled={isLoading || success}
          >
            {isLoading ? 'Giriş Yapılıyor...' : success ? 'Giriş Başarılı!' : 'Giriş Yap'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-gray-300">
            Hesabınız yok mu?{' '}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">
              Kayıt Ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}