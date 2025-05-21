// src/components/ChatBox.tsx - Tip hataları düzeltildi
'use client';

import { useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { useApiStore } from '@/store/useApiStore';
import { useChatStore } from '@/store/chatStore';
import { speakText } from '@/utils/tts'; 


export default function ChatBox() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [interests, setInterests] = useState('');
  const [age, setAge] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  
  // Stores
  const userStore = useUserStore();
  const { setToken } = useApiStore();
  const { fetchChats } = useChatStore();
  const { isLoading, error, setError } = useApiStore();
  
  const handleSubmit = async () => {
    if (!name.trim() && !isLogin) {
      setError('Lütfen adınızı girin.');
      speakText('Lütfen adınızı girin.');
      return;
    }

    if (!email.trim()) {
      setError('Lütfen email adresinizi girin.');
      speakText('Lütfen email adresinizi girin.');
      return;
    }

    if (!password.trim() || password.length < 6) {
      setError('Lütfen en az 6 karakterli bir şifre girin.');
      speakText('Lütfen güvenli bir şifre girin.');
      return;
    }

    if (!interests.trim() && !isLogin) {
      setError('Lütfen en az bir ilgi alanı belirtin.');
      speakText('Lütfen ilgi alanlarınızı belirtin.');
      return;
    }

    try {
      let success = false;
      let token = '';
      let username = '';
      
      if (isLogin) {
        // Kullanıcı girişi
        success = await userStore.login(email, password);
        // Token ve kullanıcı bilgilerini localStorage'dan al
        token = localStorage.getItem('token') || '';
        const userInfo = localStorage.getItem('user_info');
        if (userInfo) {
          try {
            const parsedUser = JSON.parse(userInfo);
            username = parsedUser.username || '';
          } catch (e) {
            console.error('User info parsing error:', e);
          }
        }
      } else {
        // Kullanıcı kaydı
        success = await userStore.register(name, email, password);
        // Token ve kullanıcı bilgilerini localStorage'dan al
        token = localStorage.getItem('token') || '';
        username = name;
        
        if (success) {
          // Kullanıcı tercihlerini güncelle
          await userStore.updatePreferences({
            language: 'tr',
            theme: 'dark',
            notifications: true
          });
        }
      }
      
      if (success) {
        // Token'ı apiStore'a kaydet - backend API istekleri için
        if (token) {
          setToken(token);
        }
        
        // Sohbetleri getir
        await fetchChats();
        
        setSubmitted(true);
        setError(null);
        
        // Karşılama mesajı
        const welcomeMessage = isLogin 
          ? `Tekrar hoş geldiniz ${username || name || 'değerli kullanıcı'}!` 
          : `Teşekkürler ${name}! Kaydınız tamamlandı. İlgi alanlarınız: ${interests}`;
        
        speakText(welcomeMessage);
      } else {
        setError(isLogin ? 'Giriş başarısız. Email veya şifre hatalı.' : 'Kayıt başarısız. Lütfen tekrar deneyin.');
      }
    } catch (err) {
      console.error('İşlem hatası:', err);
      setError('Bir sorun oluştu. Lütfen tekrar deneyin.');
      speakText('Üzgünüm, bir sorun oluştu. Lütfen tekrar deneyin.');
    }
  };

  // Formu sıfırla
  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setInterests('');
    setAge('');
    setSubmitted(false);
    setError(null);
  };

  // Login/Register modu değiştir
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-4 p-6 bg-gray-800 rounded-xl">
      {error && (
        <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-100 px-4 py-2 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {submitted ? (
        <div className="text-center">
          <p className="text-white text-lg mb-4">
            {isLogin ? 'Başarıyla giriş yaptınız!' : 'Teşekkürler! Kaydınız tamamlandı.'}
          </p>
          <p className="text-white mb-6">
            Şimdi benimle sohbet edebilirsiniz. {interests && `İlgi alanlarınız hakkında konuşmayı seviyorum: ${interests}`}
          </p>
          <div className="flex justify-center">
            <button
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              onClick={resetForm}
            >
              {isLogin ? 'Farklı Hesapla Giriş Yap' : 'Bilgileri Güncelle'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              className="text-sm text-blue-400 hover:text-blue-300"
              onClick={toggleMode}
            >
              {isLogin ? 'Hesabınız yok mu? Kayıt olun' : 'Zaten hesabınız var mı? Giriş yapın'}
            </button>
          </div>
          
          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-white mb-1">Ad Soyad</label>
              <input
                id="name"
                className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white"
                placeholder="Ad Soyad"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-white mb-1">Email</label>
            <input
              id="email"
              type="email"
              className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white"
              placeholder="ornek@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-white mb-1">Şifre</label>
            <input
              id="password"
              type="password"
              className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white"
              placeholder="Şifre (en az 6 karakter)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          {!isLogin && (
            <>
              <div>
                <label htmlFor="age" className="block text-white mb-1">Yaşınız (İsteğe bağlı)</label>
                <input
                  id="age"
                  className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white"
                  placeholder="Yaşınız"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="interests" className="block text-white mb-1">İlgi Alanlarınız</label>
                <textarea
                  id="interests"
                  className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white"
                  placeholder="Örnek: Yapay zeka, 3D, müzik, spor..."
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}
          
          <button
            className={`w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:bg-blue-800 disabled:opacity-50`}
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'İşleniyor...' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </div>
      )}
    </div>
  );
}