// src/utils/demoAI.ts - OpenAI API olmadan basit yanıtlar üretmek için
import { useUserStore } from '@/store/userStore';
import { ChatMessage } from './openai';

// Demo AI - OpenAI yerine temel yanıtlar
export async function getDemoResponse(userMessage: string): Promise<string> {
  const { name, interests } = useUserStore.getState();
  const lowerCaseMessage = userMessage.toLowerCase();
  
  // Temel selamlaşma yanıtları
  if (lowerCaseMessage.includes('merhaba') || 
      lowerCaseMessage.includes('selam') || 
      lowerCaseMessage.includes('sa')) {
    return `Merhaba ${name || 'dostum'}! Nasılsın bugün?`;
  }
  
  // İlgi alanlarıyla ilgili yanıtlar
  if (interests) {
    const interestList = interests.split(',').map(item => item.trim().toLowerCase());
    
    for (const interest of interestList) {
      if (lowerCaseMessage.includes(interest)) {
        return `${interest.charAt(0).toUpperCase() + interest.slice(1)} hakkında konuşmayı ben de çok seviyorum ${name || 'dostum'}! Bu konuda daha çok sohbet etmek isterim.`;
      }
    }
  }
  
  // Nasılsın sorusu
  if (lowerCaseMessage.includes('nasılsın') || 
      lowerCaseMessage.includes('naber') || 
      lowerCaseMessage.includes('ne haber')) {
    return `Ben iyiyim ${name || 'dostum'}, teşekkür ederim! Sen nasılsın?`;
  }
  
  // Teşekkür mesajı
  if (lowerCaseMessage.includes('teşekkür') || 
      lowerCaseMessage.includes('sağol')) {
    return `Rica ederim ${name || 'dostum'}! Yardımcı olabildiysem ne mutlu bana.`;
  }
  
  // Ne yapabilirsin sorusu
  if (lowerCaseMessage.includes('ne yapabilirsin') || 
      lowerCaseMessage.includes('neler yapabilirsin') || 
      lowerCaseMessage.includes('özellik')) {
    return `Seninle sohbet edebilir, sorularını yanıtlayabilirim. İlgi alanların hakkında konuşmayı özellikle seviyorum ${name || 'dostum'}.`;
  }
  
  // Kimsin sorusu
  if (lowerCaseMessage.includes('kimsin') || 
      lowerCaseMessage.includes('adın ne') || 
      lowerCaseMessage.includes('sen nesin')) {
    return `Ben AIVA, senin kişisel dijital asistanınım ${name || 'dostum'}. Seninle sohbet etmek için buradayım!`;
  }
  
  // Hava durumu
  if (lowerCaseMessage.includes('hava') && 
     (lowerCaseMessage.includes('nasıl') || lowerCaseMessage.includes('durumu'))) {
    return `Üzgünüm ${name || 'dostum'}, şu anda hava durumu verilerine erişemiyorum. Ama umarım havan güzeldir!`;
  }
  
  // Şaka isteği
  if (lowerCaseMessage.includes('şaka') || 
      lowerCaseMessage.includes('fıkra') || 
      lowerCaseMessage.includes('espri')) {
    const jokes = [
      "İngilizler çay içer, Japonlar sakura toplar, Türkler: ÇAYKUR RIZESPOR!",
      "Yazın söylediğim şarkılar tutmuyor, çünkü mevsim geçiyor...",
      "Geçen gün bir matematik problemi çözüyordum, birden ayıya çarptım!",
      "Bu öküzü niye aldın? - Bakkala GİTMESİN diye!"
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  
  // Duygular hakkında
  if (lowerCaseMessage.includes('üzgün') || 
      lowerCaseMessage.includes('mutsuz') || 
      lowerCaseMessage.includes('kötü hissediyorum')) {
    return `Bunu duyduğuma üzüldüm ${name || 'dostum'}. Kendine iyi bakmayı unutma. Belki sevdiğin bir şey yaparak moralini yükseltebilirsin?`;
  }
  
  if (lowerCaseMessage.includes('mutlu') || 
      lowerCaseMessage.includes('sevinçli') || 
      lowerCaseMessage.includes('iyi hissediyorum')) {
    return `Bunu duymak harika ${name || 'dostum'}! Bu güzel duyguyu gün boyu yaşamanı dilerim.`;
  }
  
  // Rastgele yanıtlar
  const responses = [
    `Hmm, ilginç bir konu ${name || 'dostum'}. Daha fazla anlatır mısın?`,
    `Seninle sohbet etmek çok keyifli ${name || 'dostum'}.`,
    `Bu konuda düşünmem gerek. Sen ne düşünüyorsun ${name || 'dostum'}?`,
    `Anladım ${name || 'dostum'}. Başka nelerden bahsetmek istersin?`,
    `Bunu bilmiyordum. Teşekkür ederim paylaştığın için ${name || 'dostum'}.`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

// Demoyu simüle et (gecikme ekleyerek gerçekçi hissi ver)
export async function chatWithDemoAI(
  userMessage: string,
  addToHistory: (message: ChatMessage) => void
): Promise<string> {
  // Kullanıcı mesajını ekle
  const userChatMessage: ChatMessage = {
    role: 'user',
    content: userMessage
  };
  addToHistory(userChatMessage);
  
  // Yanıt için gerçekçi gecikme (500ms - 2sn arası)
  const delay = Math.floor(Math.random() * 1500) + 500;
  
  return new Promise(resolve => {
    setTimeout(async () => {
      // Demo yanıtı al
      const response = await getDemoResponse(userMessage);
      
      // AI yanıtını geçmişe ekle
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response
      };
      addToHistory(assistantMessage);
      
      resolve(response);
    }, delay);
  });
}