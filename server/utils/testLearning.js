// utils/testLearning.js - Öğrenme sistemi test dosyası

const axios = require('axios');
const { learningTasks } = require('./scheduledTasks');

// Test konfigürasyonu
const BASE_URL = 'http://localhost:8000';
let authToken = '';
let testChatId = '';
let testMessageId = '';

// Test kullanıcısı için login
async function loginTestUser() {
  try {
    console.log('👤 Test kullanıcısı ile giriş yapılıyor...');
    
    // Test kullanıcısı kaydet (zaten varsa hata vermez)
    try {
      await axios.post(`${BASE_URL}/api/users/register`, {
        username: 'testuser',
        email: 'test@example.com',
        password: 'test123456'
      });
      console.log('✅ Test kullanıcısı oluşturuldu');
    } catch (error) {
      console.log('ℹ️  Test kullanıcısı zaten mevcut');
    }
    
    // Giriş yap
    const response = await axios.post(`${BASE_URL}/api/users/login`, {
      email: 'test@example.com',
      password: 'test123456'
    });
    
    authToken = response.data.token;
    console.log('✅ Test kullanıcısı girişi başarılı');
    return true;
  } catch (error) {
    console.error('❌ Test kullanıcısı girişi hatası:', error.response?.data || error.message);
    return false;
  }
}

// Test sohbeti oluştur
async function createTestChat() {
  try {
    console.log('💬 Test sohbeti oluşturuluyor...');
    
    const response = await axios.post(
      `${BASE_URL}/api/chats`,
      { title: 'Öğrenme Testi Sohbeti' },
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );
    
    testChatId = response.data.chat._id;
    console.log('✅ Test sohbeti oluşturuldu:', testChatId);
    return true;
  } catch (error) {
    console.error('❌ Test sohbeti oluşturma hatası:', error.response?.data || error.message);
    return false;
  }
}

// AI'ya test mesajları gönder
async function sendTestMessages() {
  try {
    console.log('🤖 AI\'ya test mesajları gönderiliyor...');
    
    const testQueries = [
      'React hooks nedir?',
      'JavaScript\'te array metodları nelerdir?',
      'MongoDB\'de aggregation nasıl kullanılır?',
      'Node.js\'te middleware nedir?',
      'CSS flexbox nasıl çalışır?'
    ];
    
    for (let i = 0; i < testQueries.length; i++) {
      console.log(`📝 Mesaj ${i + 1}: ${testQueries[i]}`);
      
      const response = await axios.post(
        `${BASE_URL}/api/ai/message`,
        {
          chatId: testChatId,
          message: testQueries[i]
        },
        { headers: { 'Authorization': `Bearer ${authToken}` } }
      );
      
      if (i === 0) {
        // İlk mesajın ID'sini kaydet (geri bildirim için)
        testMessageId = response.data.aiMessage._id || response.data.aiMessage.timestamp;
      }
      
      console.log(`✅ AI Yanıtı ${i + 1}: ${response.data.aiMessage.content.substring(0, 100)}...`);
      
      // Istekler arası kısa bekleme
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return true;
  } catch (error) {
    console.error('❌ Test mesajları gönderme hatası:', error.response?.data || error.message);
    return false;
  }
}

// Test geri bildirimleri gönder
async function sendTestFeedbacks() {
  try {
    console.log('👍👎 Test geri bildirimleri gönderiliyor...');
    
    // Sohbetteki mesajları al
    const chatResponse = await axios.get(
      `${BASE_URL}/api/chats/${testChatId}`,
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );
    
    const messages = chatResponse.data.messages;
    const aiMessages = messages.filter(msg => msg.role === 'assistant');
    
    if (aiMessages.length === 0) {
      console.log('⚠️ AI mesajı bulunamadı');
      return false;
    }
    
    const feedbacks = [
      {
        messageId: aiMessages[0]._id,
        isHelpful: false,
        rating: 2,
        feedbackText: 'Çok kısa ve eksik bilgi',
        category: 'completeness',
        userQuery: 'React hooks nedir?',
        aiResponse: aiMessages[0].content
      },
      {
        messageId: aiMessages[1]._id,
        isHelpful: false,
        rating: 3,
        feedbackText: 'Örnekler eksik',
        category: 'clarity',
        userQuery: 'JavaScript\'te array metodları nelerdir?',
        aiResponse: aiMessages[1].content
      },
      {
        messageId: aiMessages[2]._id,
        isHelpful: true,
        rating: 4,
        feedbackText: 'Güzel açıklama',
        category: 'helpfulness',
        userQuery: 'MongoDB\'de aggregation nasıl kullanılır?',
        aiResponse: aiMessages[2].content
      }
    ];
    
    for (let i = 0; i < Math.min(feedbacks.length, aiMessages.length); i++) {
      const feedback = feedbacks[i];
      
      try {
        await axios.post(
          `${BASE_URL}/api/learning/feedback`,
          {
            chatId: testChatId,
            messageId: feedback.messageId,
            isHelpful: feedback.isHelpful,
            rating: feedback.rating,
            feedbackText: feedback.feedbackText,
            category: feedback.category
          },
          { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        
        console.log(`✅ Geri bildirim ${i + 1} gönderildi: ${feedback.isHelpful ? '👍' : '👎'}`);
      } catch (error) {
        console.error(`❌ Geri bildirim ${i + 1} hatası:`, error.response?.data || error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return true;
  } catch (error) {
    console.error('❌ Test geri bildirimleri hatası:', error.response?.data || error.message);
    return false;
  }
}

// Bilgi tabanına test verileri ekle
async function addTestKnowledge() {
  try {
    console.log('📚 Bilgi tabanına test verileri ekleniyor...');
    
    const knowledgeItems = [
      {
        topic: 'React Hooks Detaylı',
        content: 'React Hooks, fonksiyonel bileşenlerde state ve lifecycle özelliklerini kullanmanızı sağlar. useState state yönetimi, useEffect yan etkiler, useContext context api, useReducer karmaşık state yönetimi için kullanılır. Custom hooklar oluşturarak kendi hook\'larınızı yazabilirsiniz.',
        keywords: ['react', 'hooks', 'useState', 'useEffect', 'useContext', 'useReducer'],
        category: 'programming'
      },
      {
        topic: 'JavaScript Array Metodları',
        content: 'JavaScript array metodları: map() (dönüştürme), filter() (filtreleme), reduce() (biriktirme), forEach() (döngü), find() (bulma), some() (bazıları), every() (hepsi), sort() (sıralama), splice() (ekleme/çıkarma), slice() (kesme) gibi güçlü metodlar sunar.',
        keywords: ['javascript', 'array', 'map', 'filter', 'reduce', 'forEach'],
        category: 'programming'
      },
      {
        topic: 'MongoDB Aggregation',
        content: 'MongoDB Aggregation Framework, verileri işlemek ve analiz etmek için güçlü bir araçtır. $match (filtreleme), $group (gruplama), $sort (sıralama), $project (alan seçimi), $lookup (join), $unwind (array açma) gibi operatörler kullanılır.',
        keywords: ['mongodb', 'aggregation', 'match', 'group', 'sort', 'project'],
        category: 'database'
      }
    ];
    
    for (let i = 0; i < knowledgeItems.length; i++) {
      try {
        await axios.post(
          `${BASE_URL}/api/learning/knowledge-base`,
          knowledgeItems[i],
          { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        
        console.log(`✅ Bilgi ${i + 1} eklendi: ${knowledgeItems[i].topic}`);
      } catch (error) {
        console.error(`❌ Bilgi ${i + 1} ekleme hatası:`, error.response?.data || error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return true;
  } catch (error) {
    console.error('❌ Bilgi tabanı test hatası:', error);
    return false;
  }
}

// İyileştirme işlemlerini test et
async function testImprovements() {
  try {
    console.log('🔧 İyileştirme sistemi test ediliyor...');
    
    // Manuel iyileştirme çalıştır
    await learningTasks.runImprovements();
    
    // İyileştirme verilerini kontrol et
    const response = await axios.get(
      `${BASE_URL}/api/improvements?isProcessed=false`,
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );
    
    console.log(`📊 İşlenmemiş iyileştirme sayısı: ${response.data.improvements.length}`);
    
    if (response.data.improvements.length > 0) {
      console.log('✅ İyileştirme verileri oluşturuldu');
      
      // İyileştirmeleri işle
      await axios.post(
        `${BASE_URL}/api/learning/process-improvements`,
        {},
        { headers: { 'Authorization': `Bearer ${authToken}` } }
      );
      
      console.log('✅ İyileştirmeler işlendi');
    }
    
    return true;
  } catch (error) {
    console.error('❌ İyileştirme test hatası:', error.response?.data || error.message);
    return false;
  }
}

// Öğrenme sonrası AI yanıtını test et
async function testImprovedAI() {
  try {
    console.log('🧠 Öğrenme sonrası AI test ediliyor...');
    
    const response = await axios.post(
      `${BASE_URL}/api/ai/message`,
      {
        chatId: testChatId,
        message: 'React hooks hakkında detaylı bilgi verir misin?'
      },
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );
    
    console.log('🤖 Öğrenme sonrası AI yanıtı:');
    console.log(response.data.aiMessage.content);
    console.log('\n📊 Metadata:');
    console.log('- Bilgi tabanı kullanıldı mı?', response.data.metadata?.usedKnowledgeBase || false);
    console.log('- Şablon kullanıldı mı?', response.data.metadata?.usedTemplate || false);
    console.log('- Güven skoru:', response.data.metadata?.confidence || 'Bilinmiyor');
    
    return true;
  } catch (error) {
    console.error('❌ Öğrenme sonrası AI test hatası:', error.response?.data || error.message);
    return false;
  }
}

// İstatistikleri görüntüle
async function showStats() {
  try {
    console.log('\n📊 Sistem İstatistikleri:');
    
    // Admin stats
    const statsResponse = await axios.get(
      `${BASE_URL}/api/admin/stats`,
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );
    
    console.log('📈 Genel İstatistikler:');
    console.log(`- Kullanıcılar: ${statsResponse.data.users || 0}`);
    console.log(`- Sohbetler: ${statsResponse.data.chats || 0}`);
    console.log(`- Mesajlar: ${statsResponse.data.messages[0]?.totalMessages || 0}`);
    console.log(`- Geri bildirimler: ${statsResponse.data.feedback || 0}`);
    console.log(`- Bilgi tabanı: ${statsResponse.data.knowledgeBase || 0}`);
    console.log(`- İyileştirmeler: ${statsResponse.data.improvements || 0}`);
    console.log(`- Şablonlar: ${statsResponse.data.templates || 0}`);
    
    // Learning metrics
    const metricsResponse = await axios.get(
      `${BASE_URL}/api/learning/metrics`,
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );
    
    console.log('\n📊 Öğrenme Metrikleri:');
    console.log(`- Toplam geri bildirim: ${metricsResponse.data.feedback?.totalFeedback || 0}`);
    console.log(`- Olumlu: ${metricsResponse.data.feedback?.positiveFeedback || 0}`);
    console.log(`- Olumsuz: ${metricsResponse.data.feedback?.negativeFeedback || 0}`);
    console.log(`- Ortalama puan: ${metricsResponse.data.feedback?.averageRating || 0}`);
    
    return true;
  } catch (error) {
    console.error('❌ İstatistik alma hatası:', error.response?.data || error.message);
    return false;
  }
}

// Ana test fonksiyonu
async function runFullTest() {
  console.log('🧪 ÖĞRENME SİSTEMİ FULL TEST BAŞLATILIYOR...\n');
  
  const testResults = {
    login: false,
    createChat: false,
    sendMessages: false,
    sendFeedbacks: false,
    addKnowledge: false,
    testImprovements: false,
    testImprovedAI: false,
    showStats: false
  };
  
  try {
    // 1. Test kullanıcısı girişi
    testResults.login = await loginTestUser();
    if (!testResults.login) return;
    
    // 2. Test sohbeti oluştur
    testResults.createChat = await createTestChat();
    if (!testResults.createChat) return;
    
    // 3. AI'ya mesajlar gönder
    testResults.sendMessages = await sendTestMessages();
    if (!testResults.sendMessages) return;
    
    // 4. Geri bildirimler gönder
    testResults.sendFeedbacks = await sendTestFeedbacks();
    
    // 5. Bilgi tabanına veri ekle
    testResults.addKnowledge = await addTestKnowledge();
    
    // 6. İyileştirmeleri test et
    testResults.testImprovements = await testImprovements();
    
    // 7. Öğrenme sonrası AI'yı test et
    testResults.testImprovedAI = await testImprovedAI();
    
    // 8. İstatistikleri göster
    testResults.showStats = await showStats();
    
    // Sonuçları özetle
    console.log('\n🏆 TEST SONUÇLARI:');
    Object.entries(testResults).forEach(([test, result]) => {
      console.log(`${result ? '✅' : '❌'} ${test}: ${result ? 'BAŞARILI' : 'BAŞARISIZ'}`);
    });
    
    const successCount = Object.values(testResults).filter(r => r).length;
    const totalCount = Object.keys(testResults).length;
    
    console.log(`\n🎯 Başarı Oranı: ${successCount}/${totalCount} (%${Math.round(successCount/totalCount*100)})`);
    
    if (successCount === totalCount) {
      console.log('🎉 TÜM TESTLER BAŞARILI! Öğrenme sistemi mükemmel çalışıyor!');
    } else {
      console.log('⚠️ Bazı testler başarısız. Lütfen hataları kontrol edin.');
    }
    
  } catch (error) {
    console.error('❌ Test süreci genel hatası:', error);
  }
}

// Kısa test (sadece sistem kontrolü)
async function runQuickTest() {
  console.log('⚡ HIZLI TEST BAŞLATILIYOR...\n');
  
  try {
    // Sistem sağlık kontrolü
    await learningTasks.healthCheck();
    
    // Metrik hesaplama
    await learningTasks.calculateMetrics();
    
    // Manuel iyileştirme
    await learningTasks.runImprovements();
    
    console.log('\n✅ Hızlı test tamamlandı!');
  } catch (error) {
    console.error('❌ Hızlı test hatası:', error);
  }
}

// Export fonksiyonlar
module.exports = {
  runFullTest,
  runQuickTest,
  loginTestUser,
  createTestChat,
  sendTestMessages,
  sendTestFeedbacks,
  addTestKnowledge,
  testImprovements,
  testImprovedAI,
  showStats
};

// Eğer doğrudan çalıştırılıyorsa
if (require.main === module) {
  const testType = process.argv[2] || 'full';
  
  if (testType === 'quick') {
    runQuickTest();
  } else {
    runFullTest();
  }
}