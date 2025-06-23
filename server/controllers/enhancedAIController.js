// controllers/enhancedAIController.js - Kişiselleştirilmiş AI kontrolörü

const Chat = require('../models/Chat');
const { KnowledgeBase, ResponseTemplate } = require('../models/LearningModels');
const userLearningService = require('../services/userLearningService');
const axios = require('axios');

// Kişiselleştirilmiş mesaj işleme
exports.processMessage = async (req, res) => {
  try {
    const { chatId, message } = req.body;
    const userId = req.userId;
    
    if (!chatId || !message || !message.trim()) {
      return res.status(400).json({ message: 'Sohbet ID ve mesaj gereklidir' });
    }
    
    // Sohbeti bul
    const chat = await Chat.findOne({ _id: chatId, userId });
    
    if (!chat) {
      return res.status(404).json({ message: 'Sohbet bulunamadı' });
    }
    
    // Kullanıcının toplam mesaj sayısını kontrol et
    const userMessages = chat.messages.filter(msg => msg.role === 'user').length;
    
    // Eğer limit aşıldıysa hata döndür
    if (userMessages >= 10) {
      return res.status(403).json({ 
        message: 'Mesaj limiti aşıldı', 
        error: 'Bir sohbette en fazla 10 mesaj gönderebilirsiniz' 
      });
    }
    
    const startTime = Date.now();
    
    // 🧠 Kullanıcıyı analiz et ve öğren
    const userProfile = await userLearningService.analyzeUserMessage(
      userId, 
      message.trim(), 
      chat.messages.slice(-5) // Son 5 mesajı context olarak ver
    );
    
    // Kullanıcı mesajını sohbete ekle
    const userMessage = {
      content: message.trim(),
      role: 'user',
      timestamp: new Date()
    };
    
    chat.messages.push(userMessage);
    
    // 🎯 Kişiselleştirilmiş AI yanıtını al
    const aiResponseData = await generatePersonalizedAIResponse(
      chat.messages, 
      message.trim(), 
      userId,
      userProfile
    );
    
    const responseTime = Date.now() - startTime;
    
    // AI yanıtını sohbete ekle
    const aiMessage = {
      content: aiResponseData.response,
      role: 'assistant',
      timestamp: new Date(),
      responseTime,
      tokenUsage: aiResponseData.tokenUsage || 0
    };
    
    chat.messages.push(aiMessage);
    chat.updatedAt = new Date();
    
    await chat.save();
    
    // 📊 Kullanıcı önerilerini al
    const recommendations = await userLearningService.generateUserRecommendations(userId);
    
    res.json({
      message: 'Mesaj başarıyla işlendi',
      userMessage,
      aiMessage,
      remainingMessages: 10 - (userMessages + 1),
      metadata: {
        usedKnowledgeBase: aiResponseData.usedKnowledgeBase,
        usedTemplate: aiResponseData.usedTemplate,
        confidence: aiResponseData.confidence,
        responseTime,
        knowledgeCount: aiResponseData.knowledgeCount || 0,
        personalized: true,
        userPersonality: {
          communicationStyle: userProfile.personality.communicationStyle,
          responsePreference: userProfile.personality.responsePreference,
          technicalLevel: userProfile.interests.technicalLevel
        }
      },
      recommendations: recommendations.slice(0, 2) // En fazla 2 öneri
    });
  } catch (err) {
    console.error('Kişiselleştirilmiş mesaj işleme hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası', error: err?.message || 'Bilinmeyen hata' });
  }
};

// Kişiselleştirilmiş AI yanıtı üretme
async function generatePersonalizedAIResponse(messages, currentQuery, userId, userProfile) {
  try {
    // 1. Bilgi tabanında kullanıcının ilgi alanlarına göre ara
    const relevantKnowledge = await findPersonalizedKnowledge(currentQuery, userProfile);
    
    // 2. Kullanıcıya özel yanıt şablonu ara
    const responseTemplate = await findPersonalizedTemplate(currentQuery, userProfile);
    
    // 3. Mesajları formatla (kullanıcı tercihine göre)
    const messageLimit = userProfile.personality.responsePreference === 'short' ? 5 : 10;
    const limitedMessages = messages.slice(-messageLimit);
    const formattedMessages = limitedMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // 4. Kişiselleştirilmiş system prompt oluştur
    const personalizedPrompt = await userLearningService.generatePersonalizedPrompt(userId);
    const systemPrompt = await buildPersonalizedSystemPrompt(
      personalizedPrompt,
      relevantKnowledge,
      responseTemplate,
      userProfile
    );
    
    // 5. OpenAI API çağrısı (kişiselleştirilmiş parametreler)
    const response = await callPersonalizedOpenAI(formattedMessages, systemPrompt, userProfile);
    
    // 6. Kullanım sayaçlarını güncelle
    await updateUsageCounters(relevantKnowledge, responseTemplate);
    
    return {
      response: response.content,
      tokenUsage: response.tokenUsage,
      usedKnowledgeBase: relevantKnowledge.length > 0,
      usedTemplate: !!responseTemplate,
      confidence: calculatePersonalizedConfidence(relevantKnowledge, responseTemplate, userProfile),
      knowledgeCount: relevantKnowledge.length,
      personalizedFactors: {
        userInterests: userProfile.interests.primaryTopics.slice(0, 3),
        communicationStyle: userProfile.personality.communicationStyle,
        technicalAdjustment: getTechnicalAdjustment(userProfile)
      }
    };
  } catch (error) {
    console.error('Kişiselleştirilmiş AI yanıtı üretme hatası:', error);
    
    // Fallback: Normal AI yanıtı
    try {
      const fallbackResponse = await generateBasicAIResponse(messages.slice(-5));
      return {
        response: fallbackResponse,
        tokenUsage: 0,
        usedKnowledgeBase: false,
        usedTemplate: false,
        confidence: 0.5,
        knowledgeCount: 0,
        personalizedFactors: { fallback: true }
      };
    } catch (fallbackError) {
      console.error('Fallback AI yanıtı hatası:', fallbackError);
      return {
        response: 'Üzgünüm, şu anda yanıt veremiyorum. Lütfen daha sonra tekrar deneyin.',
        tokenUsage: 0,
        usedKnowledgeBase: false,
        usedTemplate: false,
        confidence: 0,
        knowledgeCount: 0,
        personalizedFactors: { error: true }
      };
    }
  }
}

// Kullanıcının ilgi alanlarına göre bilgi ara
async function findPersonalizedKnowledge(query, userProfile) {
  try {
    // Anahtar kelimeleri çıkar
    const keywords = extractKeywords(query);
    
    // Kullanıcının ilgi alanlarını dahil et
    const userTopics = userProfile.interests.primaryTopics.map(t => t.topic);
    const allKeywords = [...keywords, ...userTopics].slice(0, 8);
    
    if (allKeywords.length === 0) return [];
    
    // Bilgi tabanında ara (kullanıcı tercihlerine göre önceliklendir)
    const knowledge = await KnowledgeBase.find({
      isActive: true,
      $or: [
        { keywords: { $in: allKeywords } },
        { topic: { $regex: allKeywords.join('|'), $options: 'i' } },
        { content: { $regex: allKeywords.join('|'), $options: 'i' } },
        { category: { $in: userTopics } } // Kullanıcının ilgi alanlarındaki kategoriler
      ]
    }).sort({ 
      usageCount: -1, 
      priority: -1 
    }).limit(userProfile.personality.responsePreference === 'detailed' ? 4 : 2);
    
    return knowledge;
  } catch (error) {
    console.error('Kişiselleştirilmiş bilgi arama hatası:', error);
    return [];
  }
}

// Kullanıcıya özel şablon ara
async function findPersonalizedTemplate(query, userProfile) {
  try {
    const queryPattern = await generateQueryPattern(query);
    
    if (!queryPattern) return null;
    
    // Kullanıcının iletişim tarzına uygun şablonları öncelikle ara
    const template = await ResponseTemplate.findOne({
      $or: [
        { queryPattern: { $regex: queryPattern, $options: 'i' } },
        { queryPattern: queryPattern }
      ],
      isActive: true,
      // Kullanıcının tercih ettiği tarzda şablonları öncelikle
      category: { 
        $in: [
          'auto_generated', 
          userProfile.personality.communicationStyle,
          userProfile.personality.responsePreference
        ] 
      }
    }).sort({ 
      priority: -1, 
      successRate: -1,
      usageCount: -1 
    });
    
    return template;
  } catch (error) {
    console.error('Kişiselleştirilmiş şablon arama hatası:', error);
    return null;
  }
}

// Kişiselleştirilmiş system prompt oluştur
async function buildPersonalizedSystemPrompt(basePrompt, knowledgeBase, template, userProfile) {
  let systemPrompt = basePrompt;
  
  // Kullanıcının teknik seviyesine göre ayarla
  const avgTechLevel = Object.values(userProfile.interests.technicalLevel)
    .reduce((a, b) => a + b, 0) / 3;
  
  if (avgTechLevel <= 3) {
    systemPrompt += "\n🎯 ÖNEMLI: Bu kullanıcı başlangıç seviyesinde. Teknik terimleri basit açıkla, bol örnek ver, adım adım anlat.";
  } else if (avgTechLevel >= 8) {
    systemPrompt += "\n🎯 ÖNEMLI: Bu kullanıcı ileri seviyede. Teknik detaylara girebilir, jargon kullanabilirsin.";
  }
  
  // Yanıt uzunluğu tercihi
  switch (userProfile.personality.responsePreference) {
    case 'short':
      systemPrompt += "\n📏 Kısa ve öz yanıt ver. 2-3 cümle yeterli.";
      break;
    case 'detailed':
      systemPrompt += "\n📏 Detaylı ve kapsamlı açıklama yap. Arka plan bilgisi de ver.";
      break;
    case 'examples':
      systemPrompt += "\n📏 Bol örnek kullan. Kod örnekleri, gerçek hayat senaryoları ekle.";
      break;
    case 'step-by-step':
      systemPrompt += "\n📏 Adım adım açıklama yap. Numaralı liste kullan.";
      break;
  }
  
  // İletişim tarzı
  switch (userProfile.personality.communicationStyle) {
    case 'formal':
      systemPrompt += "\n🗣️ Resmi ve profesyonel dil kullan.";
      break;
    case 'casual':
      systemPrompt += "\n🗣️ Rahat ve samimi dil kullan. 'Sen' diye hitap et.";
      break;
    case 'friendly':
      systemPrompt += "\n🗣️ Arkadaşça ve sıcak yaklaş. Pozitif ol.";
      break;
    case 'technical':
      systemPrompt += "\n🗣️ Teknik ve hassas dil kullan.";
      break;
  }
  
  // Bilgi tabanı bilgilerini ekle
  if (knowledgeBase.length > 0) {
    systemPrompt += '\n\n📚 KULLANICININ İLGİ ALANLARINDAN BİLGİLER:\n';
    knowledgeBase.forEach((knowledge, index) => {
      systemPrompt += `${index + 1}. ${knowledge.topic}: ${knowledge.content}\n`;
    });
  }
  
  // Şablon varsa ekle
  if (template) {
    systemPrompt += '\n\n🎯 BU KULLANICI İÇİN BAŞARILI YANIT ŞABLONu:\n';
    systemPrompt += template.template;
    systemPrompt += '\n\nBu şablonu rehber al ama kendi yorumunu kat.';
  }
  
  // Kullanıcının geçmiş geri bildirimlerine göre
  if (userProfile.feedbackPatterns.helpfulnessRate < 0.6) {
    systemPrompt += '\n\n⚠️ DİKKAT: Bu kullanıcı sık sık yanıtları yetersiz buluyor. Ekstra dikkatli ol, daha fazla detay ver.';
  }
  
  // Son kullanım zamanına göre
  const daysSinceLastActive = Math.floor(
    (new Date() - userProfile.statistics.lastActive) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceLastActive > 7) {
    systemPrompt += '\n\n👋 Bu kullanıcı uzun zamandır gelmemiş. Hoş geldin diyebilir, neler yaptığını sorabilirsin.';
  }
  
  return systemPrompt;
}

// Kişiselleştirilmiş OpenAI çağrısı
async function callPersonalizedOpenAI(messages, systemPrompt, userProfile) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key tanımlanmamış');
    }

    // Kullanıcı tercihine göre parametreleri ayarla
    const maxTokens = userProfile.personality.responsePreference === 'short' ? 150 : 400;
    const temperature = userProfile.personality.communicationStyle === 'technical' ? 0.3 : 0.7;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: temperature,
        max_tokens: maxTokens,
        presence_penalty: 0.1, // Tekrar azaltmak için
        frequency_penalty: 0.1 // Çeşitlilik için
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    return {
      content: response.data.choices[0].message.content,
      tokenUsage: response.data.usage?.total_tokens || 0
    };
  } catch (error) {
console.error('OpenAI API hatası:', error?.response?.data || error?.message || error);

    throw error;
  }
}

// Kişiselleştirilmiş güven skoru
function calculatePersonalizedConfidence(knowledgeBase, template, userProfile) {
  let confidence = 0.5; // Temel güven skoru
  
  // Bilgi tabanı kullanımı
  if (knowledgeBase.length > 0) {
    confidence += 0.2;
    
    // Kullanıcının ilgi alanındaki bilgi varsa ekstra puan
    const userTopics = userProfile.interests.primaryTopics.map(t => t.topic);
    const relevantKnowledge = knowledgeBase.filter(kb => 
      userTopics.some(topic => kb.topic.toLowerCase().includes(topic.toLowerCase()))
    );
    
    if (relevantKnowledge.length > 0) {
      confidence += 0.1;
    }
  }
  
  // Şablon kullanımı
  if (template) {
    confidence += 0.2;
    confidence += (template.successRate || 0) * 0.1;
  }
  
  // Kullanıcı profil olgunluğu
  const profileCompleteness = userProfile.autoGenerated.profileCompleteness || 0;
  confidence += (profileCompleteness / 100) * 0.1;
  
  // Kullanıcının geri bildirim kalitesi
  if (userProfile.feedbackPatterns.helpfulnessRate > 0.8) {
    confidence += 0.05; // Memnun kullanıcı
  }
  
  return Math.min(confidence, 1.0);
}

// Teknik seviye ayarlaması
function getTechnicalAdjustment(userProfile) {
  const levels = userProfile.interests.technicalLevel;
  const avgLevel = Object.values(levels).reduce((a, b) => a + b, 0) / 3;
  
  if (avgLevel <= 3) return 'beginner';
  if (avgLevel <= 6) return 'intermediate';
  if (avgLevel <= 8) return 'advanced';
  return 'expert';
}

// Geri bildirim işlemede kullanıcı öğrenmesi
exports.submitPersonalizedFeedback = async (req, res) => {
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

    // Normal geri bildirim işlemi
    const feedbackResponse = await require('./learningController').submitFeedback(req, res);
    
    // Kullanıcı öğrenmesi için analiz
    await userLearningService.analyzeFeedback(
      userId, 
      isHelpful, 
      rating, 
      feedbackText, 
      req.body.aiResponse
    );
    
    return feedbackResponse;
  } catch (err) {
    console.error('Kişiselleştirilmiş geri bildirim hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası', error: err?.message || 'Bilinmeyen hata' });

  }
};

// Kullanıcı profil endpoint'i
exports.getUserPersonalityProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const stats = await userLearningService.getUserStats(userId);
    const recommendations = await userLearningService.generateUserRecommendations(userId);
    
    res.json({
      profile: stats,
      recommendations,
      message: 'Kullanıcı profili başarıyla alındı'
    });
  } catch (err) {
    console.error('Kullanıcı profili alma hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası', error: err?.message || 'Bilinmeyen hata' });

  }
};

// Kullanıcı özelliklerini güncelleme
exports.updateUserPreferences = async (req, res) => {
  try {
    const userId = req.userId;
    const { communicationStyle, responsePreference, learningStyle } = req.body;
    
    const profile = await userLearningService.getOrCreateUserProfile(userId);
    
    if (communicationStyle) profile.personality.communicationStyle = communicationStyle;
    if (responsePreference) profile.personality.responsePreference = responsePreference;
    if (learningStyle) profile.personality.learningStyle = learningStyle;
    
    await profile.save();
    
    res.json({
      message: 'Kullanıcı tercihleri güncellendi',
      preferences: profile.personality
    });
  } catch (err) {
    console.error('Kullanıcı tercihleri güncelleme hatası:', err);
   res.status(500).json({ message: 'Sunucu hatası', error: err?.message || 'Bilinmeyen hata' });

  }
};

// Doğrudan AI yanıtı üretme (sohbete kaydetmeden)
exports.generateResponse = async (req, res) => {
  try {
    const { messages } = req.body;
    const userId = req.userId;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: 'Geçerli mesaj dizisi gereklidir' });
    }
    
    // Kullanıcı profilini al
    const userProfile = await userLearningService.getOrCreateUserProfile(userId);
    
    // AI yanıtını al
    const aiResponseData = await generatePersonalizedAIResponse(
      messages, 
      messages[messages.length - 1].content, 
      userId,
      userProfile
    );
    
    res.json({
      response: aiResponseData.response,
      metadata: {
        usedKnowledgeBase: aiResponseData.usedKnowledgeBase,
        usedTemplate: aiResponseData.usedTemplate,
        confidence: aiResponseData.confidence,
        knowledgeCount: aiResponseData.knowledgeCount || 0,
        personalized: true
      }
    });
  } catch (err) {
    console.error('AI yanıtı üretme hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası', error: err?.message || 'Bilinmeyen hata' });
  }
};

// Yardımcı fonksiyonlar (önceki koddan)
function extractKeywords(text) {
  const stopWords = [
    've', 'ile', 'bir', 'bu', 'şu', 'o', 'ben', 'sen', 'biz', 'siz', 'onlar', 
    'ne', 'nasıl', 'neden', 'nerede', 'kim', 'hangi', 'için', 'gibi', 'kadar',
    'da', 'de', 'ta', 'te', 'la', 'le', 'mi', 'mı', 'mu', 'mü', 'ya', 'ye'
  ];
  
  return text
    .toLowerCase()
    .replace(/[^\w\sığüşöçĞÜŞÖÇ]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
    .slice(0, 5);
}

async function generateQueryPattern(query) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return extractKeywords(query).slice(0, 2).join(' ');
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Sen bir sorgu pattern uzmanısın. Verilen sorguyu 2-4 kelimelik kısa bir pattern ile özetle.'
          },
          {
            role: 'user',
            content: `Bu sorguyu pattern haline getir: "${query}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 15
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Sorgu pattern üretme hatası:', error);
    return extractKeywords(query).slice(0, 2).join(' ');
  }
}


async function updateUsageCounters(knowledgeBase, template) {
  try {
    if (knowledgeBase.length > 0) {
      const knowledgeIds = knowledgeBase.map(k => k._id);
      await KnowledgeBase.updateMany(
        { _id: { $in: knowledgeIds } },
        { 
          $inc: { usageCount: 1 },
          $set: { lastUsed: new Date() }
        }
      );
    }
    
    if (template) {
      await ResponseTemplate.findByIdAndUpdate(
        template._id,
        { 
          $inc: { usageCount: 1 },
          $set: { updatedAt: new Date() }
        }
      );
    }
  } catch (error) {
    console.error('Kullanım sayacı güncelleme hatası:', error);
  }
}

async function generateBasicAIResponse(messages) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return 'Üzgünüm, şu anda OpenAI servisi kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
    }

    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Sen yardımcı bir AI asistanısın. Türkçe olarak samimi ve anlaşılır yanıtlar veriyorsun.'
          },
          ...formattedMessages
        ],
        temperature: 0.7,
        max_tokens: 200
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Temel AI yanıtı hatası:', error);
    return 'Üzgünüm, şu anda yanıt veremiyorum. Lütfen daha sonra tekrar deneyin.';
  }
}

module.exports = exports;
