// utils/scheduledTasks.js - Zamanlanmış öğrenme görevleri (İyileştirilmiş)

const cron = require('node-cron');
const axios = require('axios');

const { 
  Feedback, 
  ImprovementData, 
  KnowledgeBase, 
  ResponseTemplate, 
  LearningMetrics 
} = require('../models/LearningModels');
const Chat = require('../models/Chat');

// Her gece saat 02:00'da çalışacak ana öğrenme görevi
cron.schedule('0 2 * * *', async () => {
  console.log('🧠 Otomatik öğrenme sistemi başlatılıyor...');
  
  try {
    // 1. İyileştirme işlemlerini çalıştır
    await processAutomaticImprovements();
    
    // 2. Günlük metrikleri hesapla ve kaydet
    await calculateDailyMetrics();
    
    // 3. Kullanılmayan bilgi tabanı girdilerini temizle
    await cleanupUnusedKnowledge();
    
    // 4. Başarılı şablonları optimize et
    await optimizeResponseTemplates();
    
    console.log('✅ Otomatik öğrenme sistemi başarıyla tamamlandı');
  } catch (error) {
    console.error('❌ Otomatik öğrenme sistemi hatası:', error);
  }
}, {
  scheduled: true,
  timezone: "Europe/Istanbul"
});

// Her saat başında hafif görevler
cron.schedule('0 * * * *', async () => {
  try {
    // Acil iyileştirme gereksinimi olan verileri işle
    await processUrgentImprovements();
    
    // Popüler konuları güncelle
    await updateTrendingTopics();
    
    console.log('⚡ Saatlik öğrenme görevleri tamamlandı');
  } catch (error) {
    console.error('❌ Saatlik görev hatası:', error);
  }
});

// Haftalık büyük temizlik (Pazar günleri saat 03:00)
cron.schedule('0 3 * * 0', async () => {
  console.log('🧹 Haftalık büyük temizlik başlatılıyor...');
  
  try {
    // Eski geri bildirimleri arşivle
    await archiveOldFeedback();
    
    // Başarısız şablonları devre dışı bırak
    await deactivateFailedTemplates();
    
    // Detaylı performans raporu oluştur
    await generateWeeklyReport();
    
    console.log('✅ Haftalık temizlik tamamlandı');
  } catch (error) {
    console.error('❌ Haftalık temizlik hatası:', error);
  }
});

// Otomatik iyileştirme işlemleri
async function processAutomaticImprovements() {
  try {
    console.log('🔧 İyileştirme işlemleri başlatılıyor...');
    
    // Yüksek öncelikli ve işlenmemiş verileri al
    const improvementData = await ImprovementData.find({
      isProcessed: false,
      $or: [
        { priority: 'critical' },
        { priority: 'high' },
        { feedbackCount: { $gte: 5 } }
      ]
    }).sort({ priority: -1, feedbackCount: -1 }).limit(20);
    
    let processedCount = 0;
    
    for (const data of improvementData) {
      try {
        // İyileştirilmiş yanıt oluştur
        const improvedResponse = await generateImprovedResponse(data);
        
        if (improvedResponse) {
          // Yanıt şablonu oluştur veya güncelle
          await createOrUpdateResponseTemplate(data.queryPattern, improvedResponse);
          
          // İyileştirme verilerini güncelle
          data.improvedResponse = improvedResponse;
          data.isProcessed = true;
          data.updatedAt = new Date();
          
          await data.save();
          processedCount++;
        }
      } catch (error) {
        console.error(`İyileştirme hatası (${data._id}):`, error.message);
      }
    }
    
    console.log(`✅ ${processedCount} iyileştirme işlendi`);
  } catch (error) {
    console.error('İyileştirme işlemi hatası:', error);
  }
}

// Günlük metrikleri hesaplama
async function calculateDailyMetrics() {
  try {
    console.log('📊 Günlük metrikler hesaplanıyor...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Bugünün verilerini topla
    const [messageStats, feedbackStats, improvementsProcessed, knowledgeBaseUpdates] = await Promise.all([
      // Toplam mesaj sayısı
      Chat.aggregate([
        { $unwind: '$messages' },
        { 
          $match: { 
            'messages.timestamp': { $gte: today, $lt: tomorrow },
            'messages.role': 'assistant'
          } 
        },
        { $count: 'totalMessages' }
      ]),
      
      // Geri bildirim istatistikleri
      Feedback.aggregate([
        { $match: { createdAt: { $gte: today, $lt: tomorrow } } },
        {
          $group: {
            _id: null,
            totalFeedback: { $sum: 1 },
            positiveFeedback: { $sum: { $cond: ['$isHelpful', 1, 0] } },
            negativeFeedback: { $sum: { $cond: ['$isHelpful', 0, 1] } },
            averageRating: { $avg: '$rating' },
            categories: { $push: '$category' }
          }
        }
      ]),
      
      // İyileştirme sayısı
      ImprovementData.countDocuments({
        updatedAt: { $gte: today, $lt: tomorrow },
        isProcessed: true
      }),
      
      // Bilgi tabanı güncellemeleri
      KnowledgeBase.countDocuments({
        updatedAt: { $gte: today, $lt: tomorrow }
      })
    ]);
    
    // Mevcut metrik var mı kontrol et
    const existingMetric = await LearningMetrics.findOne({ date: today });
    
    const metricsData = {
      date: today,
      totalMessages: messageStats[0]?.totalMessages || 0,
      positiveFeedback: feedbackStats[0]?.positiveFeedback || 0,
      negativeFeedback: feedbackStats[0]?.negativeFeedback || 0,
      averageRating: feedbackStats[0]?.averageRating || 0,
      improvementsProcessed,
      knowledgeBaseUpdates,
      mostCommonCategories: calculateCategoryFrequency(feedbackStats[0]?.categories || [])
    };
    
    if (existingMetric) {
      // Mevcut metriği güncelle
      Object.assign(existingMetric, metricsData);
      await existingMetric.save();
    } else {
      // Yeni metrik oluştur
      const metrics = new LearningMetrics(metricsData);
      await metrics.save();
    }
    
    console.log('✅ Günlük metrikler kaydedildi');
  } catch (error) {
    console.error('Metrik hesaplama hatası:', error);
  }
}

// Acil iyileştirmeler
async function processUrgentImprovements() {
  try {
    // Critical öncelikli verileri işle
    const urgentData = await ImprovementData.find({
      priority: 'critical',
      isProcessed: false
    }).limit(5);
    
    let processedCount = 0;
    
    for (const data of urgentData) {
      try {
        // Acil iyileştirme işlemleri
        const improvedResponse = await generateImprovedResponse(data);
        
        if (improvedResponse) {
          await createOrUpdateResponseTemplate(data.queryPattern, improvedResponse);
          
          data.improvedResponse = improvedResponse;
          data.isProcessed = true;
          data.updatedAt = new Date();
          
          await data.save();
          processedCount++;
        }
      } catch (error) {
        console.error(`Acil iyileştirme hatası (${data._id}):`, error.message);
      }
    }
    
    if (processedCount > 0) {
      console.log(`🚨 ${processedCount} acil iyileştirme işlendi`);
    }
  } catch (error) {
    console.error('Acil iyileştirme hatası:', error);
  }
}

// Trend konuları güncelleme
async function updateTrendingTopics() {
  try {
    // Son 24 saatte en çok kullanılan konuları bul
    const trending = await KnowledgeBase.find({
      lastUsed: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      isActive: true
    }).sort({ usageCount: -1 }).limit(10);
    
    // Trend konularını işle - önceliklerini artır
    if (trending.length > 0) {
      const trendingIds = trending.map(t => t._id);
      
      await KnowledgeBase.updateMany(
        { _id: { $in: trendingIds } },
        { $inc: { priority: 1 } }
      );
      
      console.log(`📈 ${trending.length} trend konu güncellendi`);
    }
  } catch (error) {
    console.error('Trend güncelleme hatası:', error);
  }
}

// Kullanılmayan bilgi temizleme
async function cleanupUnusedKnowledge() {
  try {
    console.log('🧹 Kullanılmayan bilgiler temizleniyor...');
    
    // 30 gün boyunca kullanılmayan ve düşük kullanım sayısına sahip bilgileri devre dışı bırak
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await KnowledgeBase.updateMany({
      $or: [
        { lastUsed: { $lt: thirtyDaysAgo }, usageCount: { $lt: 5 } },
        { lastUsed: null, usageCount: 0, createdAt: { $lt: thirtyDaysAgo } }
      ],
      isActive: true
    }, {
      isActive: false
    });
    
    console.log(`✅ ${result.modifiedCount} kullanılmayan bilgi devre dışı bırakıldı`);
  } catch (error) {
    console.error('Bilgi temizleme hatası:', error);
  }
}

// Yanıt şablonları optimizasyonu
async function optimizeResponseTemplates() {
  try {
    console.log('⚡ Yanıt şablonları optimize ediliyor...');
    
    // Başarılı şablonları bul ve önceliklerini artır
    const successfulResult = await ResponseTemplate.updateMany({
      successRate: { $gt: 0.8 },
      usageCount: { $gt: 10 }
    }, {
      $inc: { priority: 1 }
    });
    
    // Başarısız şablonları düşük önceliğe al
    const failedResult = await ResponseTemplate.updateMany({
      successRate: { $lt: 0.3 },
      usageCount: { $gt: 5 }
    }, {
      $set: { priority: 1 }
    });
    
    console.log(`✅ Şablon optimizasyonu tamamlandı: ${successfulResult.modifiedCount} başarılı, ${failedResult.modifiedCount} başarısız`);
  } catch (error) {
    console.error('Şablon optimizasyon hatası:', error);
  }
}

// Eski geri bildirimleri arşivleme
async function archiveOldFeedback() {
  try {
    console.log('📦 Eski geri bildirimler arşivleniyor...');
    
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
    
    // 6 ay önce olan geri bildirimleri işaretle
    const result = await Feedback.updateMany({
      createdAt: { $lt: sixMonthsAgo },
      archived: { $ne: true }
    }, {
      $set: { archived: true }
    });
    
    console.log(`📦 ${result.modifiedCount} geri bildirim arşivlendi`);
  } catch (error) {
    console.error('Arşivleme hatası:', error);
  }
}

// Başarısız şablonları devre dışı bırakma
async function deactivateFailedTemplates() {
  try {
    console.log('❌ Başarısız şablonlar devre dışı bırakılıyor...');
    
    const result = await ResponseTemplate.updateMany({
      successRate: { $lt: 0.2 },
      usageCount: { $gt: 20 },
      isActive: true
    }, {
      isActive: false
    });
    
    console.log(`❌ ${result.modifiedCount} başarısız şablon devre dışı bırakıldı`);
  } catch (error) {
    console.error('Şablon devre dışı bırakma hatası:', error);
  }
}

// Haftalık rapor oluşturma
async function generateWeeklyReport() {
  try {
    console.log('📊 Haftalık rapor oluşturuluyor...');
    
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklyStats = await LearningMetrics.aggregate([
      { $match: { date: { $gte: weekAgo } } },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: '$totalMessages' },
          totalPositive: { $sum: '$positiveFeedback' },
          totalNegative: { $sum: '$negativeFeedback' },
          avgRating: { $avg: '$averageRating' },
          totalImprovements: { $sum: '$improvementsProcessed' }
        }
      }
    ]);
    
    if (weeklyStats.length > 0) {
      const stats = weeklyStats[0];
      const successRate = stats.totalPositive + stats.totalNegative > 0 
        ? (stats.totalPositive / (stats.totalPositive + stats.totalNegative) * 100)
        : 0;
      
      console.log('📈 Haftalık Performans Raporu:');
      console.log(`   📝 Toplam mesaj: ${stats.totalMessages || 0}`);
      console.log(`   👍 Olumlu geri bildirim: ${stats.totalPositive || 0}`);
      console.log(`   👎 Olumsuz geri bildirim: ${stats.totalNegative || 0}`);
      console.log(`   ⭐ Ortalama puanlama: ${(stats.avgRating || 0).toFixed(2)}/5`);
      console.log(`   🔧 İşlenen iyileştirme: ${stats.totalImprovements || 0}`);
      console.log(`   📊 Başarı oranı: %${successRate.toFixed(1)}`);
    } else {
      console.log('📊 Bu hafta için rapor verisi bulunamadı');
    }
  } catch (error) {
    console.error('Rapor oluşturma hatası:', error);
  }
}

// İyileştirilmiş yanıt oluşturma
async function generateImprovedResponse(improvementData) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.log('OpenAI API key bulunamadı, iyileştirme atlanıyor');
      return null;
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Sen bir AI asistan iyileştirme uzmanısın. Kullanıcı geri bildirimlerine dayanarak daha iyi yanıtlar oluşturacaksın.'
          },
          {
            role: 'user',
            content: `Soru: "${improvementData.originalQuery}"

Önceki yanıt: "${improvementData.originalResponse}"

Kullanıcı geri bildirimi: "${improvementData.lastFeedback}"

Geri bildirim sayısı: ${improvementData.feedbackCount}

Bu geri bildirimlere dayanarak çok daha iyi, detaylı ve yardımcı bir yanıt oluştur:`
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('İyileştirilmiş yanıt oluşturma hatası:', error.message);
    return null;
  }
}

// Yanıt şablonu oluşturma/güncelleme
async function createOrUpdateResponseTemplate(pattern, improvedResponse) {
  try {
    const existingTemplate = await ResponseTemplate.findOne({ queryPattern: pattern });
    
    if (existingTemplate) {
      existingTemplate.template = improvedResponse;
      existingTemplate.updatedAt = new Date();
      await existingTemplate.save();
      console.log(`🔄 Şablon güncellendi: ${pattern}`);
    } else {
      const template = new ResponseTemplate({
        queryPattern: pattern,
        template: improvedResponse,
        category: 'auto_generated',
        priority: 5
      });
      await template.save();
      console.log(`✨ Yeni şablon oluşturuldu: ${pattern}`);
    }
  } catch (error) {
    console.error('Şablon oluşturma hatası:', error);
  }
}

// Kategori frekansı hesaplama
function calculateCategoryFrequency(categories) {
  const frequency = {};
  
  categories.forEach(category => {
    if (category) {
      frequency[category] = (frequency[category] || 0) + 1;
    }
  });
  
  return Object.entries(frequency)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 kategori
}

// Manuel olarak öğrenme görevlerini çalıştırma fonksiyonları
const learningTasks = {
  // Manuel iyileştirme çalıştırma
  runImprovements: async () => {
    console.log('🔧 Manuel iyileştirme başlatılıyor...');
    try {
      await processAutomaticImprovements();
      console.log('✅ Manuel iyileştirme tamamlandı');
    } catch (error) {
      console.error('❌ Manuel iyileştirme hatası:', error);
    }
  },
  
  // Manuel metrik hesaplama
  calculateMetrics: async () => {
    console.log('📊 Manuel metrik hesaplama başlatılıyor...');
    try {
      await calculateDailyMetrics();
      console.log('✅ Manuel metrik hesaplama tamamlandı');
    } catch (error) {
      console.error('❌ Manuel metrik hesaplama hatası:', error);
    }
  },
  
  // Manuel temizlik
  cleanup: async () => {
    console.log('🧹 Manuel temizlik başlatılıyor...');
    try {
      await cleanupUnusedKnowledge();
      await optimizeResponseTemplates();
      console.log('✅ Manuel temizlik tamamlandı');
    } catch (error) {
      console.error('❌ Manuel temizlik hatası:', error);
    }
  },
  
  // Tam sistem kontrolü
  fullSystemCheck: async () => {
    console.log('🔍 Tam sistem kontrolü başlatılıyor...');
    try {
      await processAutomaticImprovements();
      await calculateDailyMetrics();
      await cleanupUnusedKnowledge();
      await optimizeResponseTemplates();
      console.log('✅ Tam sistem kontrolü tamamlandı');
    } catch (error) {
      console.error('❌ Tam sistem kontrolü hatası:', error);
    }
  },
  
  // Haftalık rapor manuel çalıştırma
  generateReport: async () => {
    console.log('📊 Manuel rapor oluşturuluyor...');
    try {
      await generateWeeklyReport();
      console.log('✅ Manuel rapor tamamlandı');
    } catch (error) {
      console.error('❌ Manuel rapor hatası:', error);
    }
  },
  
  // Sistem durumu kontrolü
  healthCheck: async () => {
    console.log('🏥 Sistem sağlık kontrolü başlatılıyor...');
    try {
      const stats = await Promise.all([
        Feedback.countDocuments(),
        ImprovementData.countDocuments({ isProcessed: false }),
        KnowledgeBase.countDocuments({ isActive: true }),
        ResponseTemplate.countDocuments({ isActive: true }),
        LearningMetrics.countDocuments()
      ]);
      
      console.log('📊 Sistem İstatistikleri:');
      console.log(`   📝 Toplam geri bildirim: ${stats[0]}`);
      console.log(`   ⏳ İşlenmemiş iyileştirme: ${stats[1]}`);
      console.log(`   📚 Aktif bilgi tabanı: ${stats[2]}`);
      console.log(`   🎯 Aktif şablon: ${stats[3]}`);
      console.log(`   📈 Metrik kayıtları: ${stats[4]}`);
      
      // Sistem sağlığı değerlendirmesi
      if (stats[1] > 100) {
        console.log('⚠️  Uyarı: Çok fazla işlenmemiş iyileştirme var!');
      }
      
      if (stats[2] < 10) {
        console.log('⚠️  Uyarı: Bilgi tabanı çok az!');
      }
      
      console.log('✅ Sistem sağlık kontrolü tamamlandı');
    } catch (error) {
      console.error('❌ Sistem sağlık kontrolü hatası:', error);
    }
  }
};

// Sistem başlatıldığında çalışacak başlangıç kontrolleri
async function initializeLearningSystem() {
  console.log('🚀 Öğrenme sistemi başlatılıyor...');
  
  try {
    // Sistem sağlık kontrolü
    await learningTasks.healthCheck();
    
    // Bugünün metriği var mı kontrol et
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayMetrics = await LearningMetrics.findOne({ date: today });
    
    if (!todayMetrics) {
      console.log('📊 Bugünün metrikleri bulunamadı, hesaplanıyor...');
      await calculateDailyMetrics();
    }
    
    console.log('✅ Öğrenme sistemi başarıyla başlatıldı');
  } catch (error) {
    console.error('❌ Öğrenme sistemi başlatma hatası:', error);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Öğrenme sistemi kapatılıyor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Öğrenme sistemi kapatılıyor...');
  process.exit(0);
});

// Sistem başlatıldığında çalıştır
initializeLearningSystem();

module.exports = {
  learningTasks,
  processAutomaticImprovements,
  calculateDailyMetrics,
  cleanupUnusedKnowledge,
  optimizeResponseTemplates,
  generateWeeklyReport,
  initializeLearningSystem
};