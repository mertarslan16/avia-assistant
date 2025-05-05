// src/components/ChatBox.tsx
'use client';

import { useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { speakText } from '@/utils/tts'; 

export default function ChatBox() {
  const [name, setName] = useState('');
  const [interests, setInterests] = useState('');
  const [age, setAge] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { setUserInfo } = useUserStore();

  const handleSubmit = () => {
    // Boş isim kontrolü
    if (!name.trim()) {
      speakText('Lütfen adınızı girin.');
      return;
    }

    // İlgi alanları kontrolü
    if (!interests.trim()) {
      speakText('Lütfen ilgi alanlarınızı belirtin.');
      return;
    }

    // Kullanıcı bilgilerini store'a kaydet
    setUserInfo(name.trim(), interests.trim(), age.trim());
    setSubmitted(true);
    
    // Onay mesajını sesli oku
    speakText(`Teşekkürler ${name.trim()}! Bilgileriniz kaydedildi. İlgi alanlarınız: ${interests.trim()}`);
  };

  // Formu sıfırla
  const resetForm = () => {
    setName('');
    setInterests('');
    setAge('');
    setSubmitted(false);
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-4 p-6 bg-gray-800 rounded-xl">
      <h2 className="text-white text-xl mb-4 font-bold">👋 Merhaba! Seni tanımak isterim.</h2>
      
      {submitted ? (
        <div className="text-center">
          <p className="text-white text-lg mb-4">
            Teşekkürler {name}! Bilgileriniz kaydedildi.
          </p>
          <p className="text-white mb-6">
            Şimdi benimle sohbet edebilirsin. Senin ilgi alanların hakkında konuşmayı seviyorum: {interests}
          </p>
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={resetForm}
          >
            Bilgileri Güncelle
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-white mb-1">Adın</label>
            <input
              id="name"
              className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white"
              placeholder="Adınız"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="age" className="block text-white mb-1">Yaşın (İsteğe bağlı)</label>
            <input
              id="age"
              className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white"
              placeholder="Yaşınız"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="interests" className="block text-white mb-1">İlgi Alanların</label>
            <textarea
              id="interests"
              className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white"
              placeholder="Örnek: Yapay zeka, 3D, müzik, spor..."
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              rows={3}
            />
          </div>
          
          <button
            className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={handleSubmit}
          >
            Kaydet ve Devam Et
          </button>
        </div>
      )}
    </div>
  );
}