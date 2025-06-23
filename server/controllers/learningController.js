// controllers/learningController.js - Öğrenme sistemi kontrolleri (Düzeltilmiş)

const { 
  Feedback, 
  ImprovementData, 
  KnowledgeBase, 
  ResponseTemplate, 
  LearningMetrics 
} = require('../models/LearningModels');
const Chat = require('../models/Chat');
const axios = require('axios');

// Kullanıcı geri bildirimi kaydetme
exports.submitFeedback = async (req, res) => {
  try {
    const { 
      chatId, 
      messageId, 
      isHelpful, 
      rating, 
      feedbackText, 
      category 
    } = req.body;
    const userId = req.userId;

    // Gerekli alanları kontrol et
    if (!chatId || !messageId || isHelpful === undefined) {
      return res.status(400).json({ 
        message: 'Geri bildirim hatası', 
        error: 'Sohbet ID, mesaj ID ve yararlılık durumu gereklidir' 
      });
    }

    // Sohbeti ve mesajı kontrol et
    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) {
      return res.status(404).json({ message: 'Sohbet bulunamadı' });
    }

    // Mesajı bul (ObjectId string karşılaştırması düzeltmesi)
    const message = chat.messages.find(m => m._id.toString() === messageId.toString());
    if (!message || message.role !== 'assistant') {
      return res.status(404).json({ message: 'AI mesajı bulunamadı' });
    }

    // Kullanıcının önceki mesajını bul
    const messageIndex = chat.messages.findIndex(m => m._id.toString() === messageId.toString());
    const userQuery = messageIndex > 0 ? chat.messages[messageIndex - 1].content : '';

    // Geri bildirim zaten var mı kontrol et
    const existingFeedback = await Feedback.findOne({ 
      userId, 
      chatId, 
      messageId: messageId.toString() 
    });

    if (existingFeedback) {
      // Mevcut geri bildirimi güncelle
      existingFeedback.isHelpful = isHelpful;
      existingFeedback.rating = rating || existingFeedback.rating;
      existingFeedback.feedbackText = feedbackText || existingFeedback.feedbackText;
      existingFeedback.category = category || existingFeedback.category;
      existingFeedback.updatedAt = new Date();
      
      await existingFeedback.save();

      res.json({
        message: 'Geri bildirim başarıyla güncellendi',
        feedbackId: existingFeedback._id
      });
    } else {
      // Yeni geri bildirimi kaydet
      const feedback = new Feedback({
        userId,
        chatId,
        messageId: messageId.toString(),
        isHelpful,
        rating: rating || null,
        feedbackText: feedbackText || '',
        category: category || 'other',
        userQuery,
        aiResponse: message.content
      });

      await feedback.save();

      res.status(201).json({
        message: 'Geri bildirim başarıyla kaydedildi',
        feedbackId: feedback._id
      });
    }

    // Eğer olumsuz geri bildirimse, iyileştirme verisi oluştur
    if (!isHelpful) {
      await createImprovementData(userQuery, message.content, feedbackText || '', category || 'other');
    }

  } catch (err) {
    console.error('Geri bildirim kaydetme hatası:', err);
    res.status(500).json({ message: 'Geri bildirim kaydedilemedi', error: err.message });
  }
};

// İyileştirme verisi oluşturma
async function createImprovementData(query, response, feedback, category) {
  try {
    if (!query || !response) return;

    // Benzer sorgu pattern'ini bul
    const queryPattern = await generateQueryPattern(query);
    
    // Mevcut iyileştirme verisi var mı kontrol et
    const existingData = await ImprovementData.findOne({ queryPattern });
    
    if (existingData) {
      // Mevcut veriye ekle
      existingData.feedbackCount += 1;
      existingData.lastFeedback = feedback;
      existingData.updatedAt = new Date();
      
      // Öncelik seviyesini artır
      if (existingData.feedbackCount >= 10) {
        existingData.priority = 'critical';
      } else if (existingData.feedbackCount >= 5) {
        existingData.priority = 'high';
      } else if (existingData.feedbackCount >= 3) {
        existingData.priority = 'medium';
      }
      
      await existingData.save();
    } else {
      // Yeni iyileştirme verisi oluştur
      const improvementData = new ImprovementData({
        queryPattern,
        originalQuery: query,
        originalResponse: response,
        lastFeedback: feedback,
        tags: [category],
        priority: 'low'
      });
      
      await improvementData.save();
    }
  } catch (error) {
    console.error('İyileştirme verisi oluşturma hatası:', error);
  }
}

// Sorgu pattern'i oluşturma (OpenAI ile)
async function generateQueryPattern(query) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // Fallback pattern (basit)
      return query.split(' ').slice(0, 3).join(' ').toLowerCase().trim();
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Sen bir AI eğitim uzmanısın. Kullanıcı sorgularını analiz ederek benzer soruları gruplamak için pattern oluşturacaksın. Çok kısa ve öz olmalı.'
          },
          {
            role: 'user',
            content: `Bu sorguyu 2-4 kelimelik bir pattern ile özetle: "${query}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 20
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 saniye timeout
      }
    );
    
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Pattern oluşturma hatası:', error);
    // Basit fallback pattern
    return query.split(' ').slice(0, 3).join(' ').toLowerCase().trim();
  }
}

// İyileştirme işlemlerini çalıştır
exports.processImprovements = async (req, res) => {
  try {
    // İşlenmemiş ve yüksek öncelikli verileri al
    const improvementData = await ImprovementData.find({
      isProcessed: false,
      $or: [
        { priority: 'high' },
        { priority: 'critical' },
        { feedbackCount: { $gte: 3 } }
      ]
    }).sort({ priority: -1, feedbackCount: -1 }).limit(10);

    const processedImprovements = [];

    for (const data of improvementData) {
      try {
        // İyileştirilmiş yanıt oluştur
        const improvedResponse = await generateImprovedResponse(data);
        
        if (improvedResponse) {
          // Yanıt şablonu oluştur
          await createResponseTemplate(data.queryPattern, improvedResponse);
          
          // İyileştirme verilerini güncelle
          data.improvedResponse = improvedResponse;
          data.isProcessed = true;
          data.updatedAt = new Date();
          
          await data.save();
          
          processedImprovements.push({
            pattern: data.queryPattern,
            improved: true
          });
        } else {
          processedImprovements.push({
            pattern: data.queryPattern,
            improved: false,
            error: 'İyileştirilmiş yanıt oluşturulamadı'
          });
        }
      } catch (error) {
        console.error(`İyileştirme hatası (${data._id}):`, error);
        processedImprovements.push({
          pattern: data.queryPattern,
          improved: false,
          error: error.message
        });
      }
    }

    res.json({
      message: 'İyileştirme işlemi tamamlandı',
      processed: processedImprovements.length,
      results: processedImprovements
    });
  } catch (err) {
    console.error('İyileştirme işlemi hatası:', err);
    res.status(500).json({ message: 'İyileştirme işlemi hatası', error: err.message });
  }
};

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
        timeout: 15000 // 15 saniye timeout
      }
    );
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('İyileştirilmiş yanıt oluşturma hatası:', error);
    return null;
  }
}

// Yanıt şablonu oluşturma
async function createResponseTemplate(pattern, improvedResponse) {
  try {
    const existingTemplate = await ResponseTemplate.findOne({ queryPattern: pattern });
    
    if (existingTemplate) {
      // Mevcut şablonu güncelle
      existingTemplate.template = improvedResponse;
      existingTemplate.updatedAt = new Date();
      await existingTemplate.save();
    } else {
      // Yeni şablon oluştur
      const template = new ResponseTemplate({
        queryPattern: pattern,
        template: improvedResponse,
        category: 'auto_generated'
      });
      await template.save();
    }
  } catch (error) {
    console.error('Şablon oluşturma hatası:', error);
  }
}

// Bilgi tabanına ekleme
exports.addToKnowledgeBase = async (req, res) => {
  try {
    const { topic, content, keywords, category } = req.body;
    const userId = req.userId;

    // Gerekli alanları kontrol et
    if (!topic || !content || !category) {
      return res.status(400).json({ 
        message: 'Bilgi tabanı hatası', 
        error: 'Konu, içerik ve kategori gereklidir' 
      });
    }

    // Mevcut konu var mı kontrol et
    const existingKnowledge = await KnowledgeBase.findOne({ topic });
    
    if (existingKnowledge) {
      // Mevcut bilgiyi güncelle
      existingKnowledge.content = content;
      existingKnowledge.keywords = keywords || [];
      existingKnowledge.category = category;
      existingKnowledge.updatedAt = new Date();
      
      await existingKnowledge.save();
      
      res.json({
        message: 'Bilgi tabanı başarıyla güncellendi',
        knowledge: existingKnowledge
      });
    } else {
      // Yeni bilgi ekle
      const knowledge = new KnowledgeBase({
        topic,
        content,
        keywords: keywords || [],
        category,
        createdBy: userId
      });
      
      await knowledge.save();
      
      res.status(201).json({
        message: 'Bilgi tabanına başarıyla eklendi',
        knowledge
      });
    }
  } catch (err) {
    console.error('Bilgi tabanı güncelleme hatası:', err);
    res.status(500).json({ message: 'Bilgi tabanı güncelleme hatası', error: err.message });
  }
};

// Öğrenme metriklerini getir
exports.getLearningMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Varsayılan olarak son 30 gün
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Geri bildirim istatistikleri
    const feedbackStats = await Feedback.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          positiveFeedback: {
            $sum: { $cond: ['$isHelpful', 1, 0] }
          },
          negativeFeedback: {
            $sum: { $cond: ['$isHelpful', 0, 1] }
          },
          averageRating: { $avg: '$rating' },
          categories: { $push: '$category' }
        }
      }
    ]);

    // İyileştirme istatistikleri
    const improvementStats = await ImprovementData.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalImprovements: { $sum: 1 },
          processedImprovements: {
            $sum: { $cond: ['$isProcessed', 1, 0] }
          },
          priorityDistribution: {
            $push: '$priority'
          }
        }
      }
    ]);

    // Bilgi tabanı istatistikleri
    const knowledgeStats = await KnowledgeBase.aggregate([
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          activeEntries: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          totalUsage: { $sum: '$usageCount' },
          categories: { $push: '$category' }
        }
      }
    ]);

    res.json({
      period: { start, end },
      feedback: feedbackStats[0] || { totalFeedback: 0, positiveFeedback: 0, negativeFeedback: 0, averageRating: 0 },
      improvements: improvementStats[0] || { totalImprovements: 0, processedImprovements: 0 },
      knowledgeBase: knowledgeStats[0] || { totalEntries: 0, activeEntries: 0, totalUsage: 0 }
    });
  } catch (err) {
    console.error('Metrik alma hatası:', err);
    res.status(500).json({ message: 'Metrik alma hatası', error: err.message });
  }
};

// İyileştirme önerilerini getir
exports.getImprovementSuggestions = async (req, res) => {
  try {
    // En çok sorun yaşanan alanlar
    const problemAreas = await ImprovementData.aggregate([
      {
        $match: { isProcessed: false }
      },
      {
        $group: {
          _id: '$queryPattern',
          count: { $sum: '$feedbackCount' },
          priority: { $first: '$priority' },
          lastFeedback: { $first: '$lastFeedback' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // En az kullanılan bilgi tabanı girdileri
    const underusedKnowledge = await KnowledgeBase.find({
      isActive: true,
      usageCount: { $lt: 5 }
    }).sort({ usageCount: 1 }).limit(10);

    // Son geri bildirimler
    const recentFeedback = await Feedback.find({
      isHelpful: false
    }).sort({ createdAt: -1 }).limit(5);

    res.json({
      problemAreas,
      underusedKnowledge,
      recentNegativeFeedback: recentFeedback
    });
  } catch (err) {
    console.error('Öneri alma hatası:', err);
    res.status(500).json({ message: 'Öneri alma hatası', error: err.message });
  }
};

// Bilgi tabanından arama
exports.searchKnowledgeBase = async (req, res) => {
  try {
    const { query, category, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({ 
        message: 'Arama hatası', 
        error: 'Arama sorgusu gereklidir' 
      });
    }

    // Anahtar kelimeleri çıkar
    const keywords = query.toLowerCase().split(' ').filter(word => word.length > 2);
    
    // Arama kriterleri
    const searchCriteria = {
      isActive: true,
      $or: [
        { keywords: { $in: keywords } },
        { topic: { $regex: keywords.join('|'), $options: 'i' } },
        { content: { $regex: keywords.join('|'), $options: 'i' } }
      ]
    };

    if (category) {
      searchCriteria.category = category;
    }

    const results = await KnowledgeBase.find(searchCriteria)
      .sort({ usageCount: -1 })
      .limit(parseInt(limit));

    res.json({
      query,
      results,
      count: results.length
    });
  } catch (err) {
    console.error('Bilgi tabanı arama hatası:', err);
    res.status(500).json({ message: 'Arama hatası', error: err.message });
  }
};

// Geri bildirim listesini getir
exports.getFeedbackList = async (req, res) => {
  try {
    const { page = 1, limit = 20, isHelpful, category } = req.query;
    const userId = req.userId;
    
    // Filtre kriterleri
    const filter = { userId };
    
    if (isHelpful !== undefined) {
      filter.isHelpful = isHelpful === 'true';
    }
    
    if (category) {
      filter.category = category;
    }

    const feedbacks = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('chatId', 'title');

    const total = await Feedback.countDocuments(filter);

    res.json({
      feedbacks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Geri bildirim listesi hatası:', err);
    res.status(500).json({ message: 'Geri bildirim listesi alınamadı', error: err.message });
  }
};

module.exports = exports;