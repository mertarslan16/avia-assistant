// services/userLearningService.js - Kullanıcı öğrenme ve tanıma servisi

const UserProfile = require('../models/UserProfile');
const axios = require('axios');

class UserLearningService {
  
  // Kullanıcı profilini al veya oluştur
  async getOrCreateUserProfile(userId) {
    try {
      let profile = await UserProfile.findOne({ userId });
      
      if (!profile) {
        profile = new UserProfile({
          userId,
          statistics: {
            joinDate: new Date(),
            lastActive: new Date()
          }
        });
        await profile.save();
        console.log(`✨ Yeni kullanıcı profili oluşturuldu: ${userId}`);
      }
      
      return profile;
    } catch (error) {
      console.error('Kullanıcı profili alma hatası:', error);
      throw error;
    }
  }
  
  // Mesaj gönderildiğinde kullanıcıyı analiz et
  async analyzeUserMessage(userId, message, chatContext = []) {
    try {
      const profile = await this.getOrCreateUserProfile(userId);
      
      // Mesaj istatistiklerini güncelle
      profile.statistics.totalMessages += 1;
      profile.statistics.lastActive = new Date();
      
      // Konuşma kalıplarını güncelle
      profile.updateConversationPattern(message);
      
      // Konuyu analiz et ve ilgi alanlarını güncelle
      const topics = await this.extractTopicsFromMessage(message);
      topics.forEach(topic => {
        profile.updateInterests(topic);
      });
      
      // Teknik seviyeyi değerlendir
      await this.assessTechnicalLevel(profile, message, chatContext);
      
      // Kişilik analizini güncelle
      await this.updatePersonalityAnalysis(profile, message);
      
      // Saat dilimi analizini güncelle
      this.updateTimePatterns(profile);
      
      await profile.save();
      
      return profile;
    } catch (error) {
      console.error('Kullanıcı mesaj analizi hatası:', error);
      throw error;
    }
  }
  
  // Geri bildirim alındığında analiz et
  async analyzeFeedback(userId, isHelpful, rating, feedbackText, aiResponse) {
    try {
      const profile = await this.getOrCreateUserProfile(userId);
      
      // Geri bildirim istatistiklerini güncelle
      profile.statistics.totalFeedback += 1;
      profile.updateFeedbackPattern(isHelpful, rating, feedbackText);
      
      // AI yanıtının kalitesi hakkında öğren
      if (!isHelpful && feedbackText) {
        await this.analyzeNegativeFeedback(profile, feedbackText, aiResponse);
      }
      
      await profile.save();
      
      return profile;
    } catch (error) {
      console.error('Geri bildirim analizi hatası:', error);
      throw error;
    }
  }
  
  // Mesajdan konuları çıkar
  async extractTopicsFromMessage(message) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        // Basit konu çıkarma (fallback)
        return this.simpleTopicExtraction(message);
      }
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Sen bir konu analizi uzmanısın. Verilen mesajdan 1-3 ana konuyu çıkar. Sadece konuları virgülle ayırarak yaz, başka bir şey ekleme.'
            },
            {
              role: 'user',
              content: `Bu mesajdaki ana konuları çıkar: "${message}"`
            }
          ],
          temperature: 0.1,
          max_tokens: 50
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      const topics = response.data.choices[0].message.content
        .split(',')
        .map(topic => topic.trim().toLowerCase())
        .filter(topic => topic.length > 2);
      
      return topics.slice(0, 3); // En fazla 3 konu
    } catch (error) {
      console.error('Konu çıkarma hatası:', error);
      return this.simpleTopicExtraction(message);
    }
  }
  
  // Basit konu çıkarma (OpenAI olmadan)
  simpleTopicExtraction(message) {
    const keywords = {
      'programming': ['kod', 'program', 'javascript', 'python', 'react', 'nodejs', 'api'],
      'web': ['web', 'html', 'css', 'website', 'internet', 'browser'],
      'database': ['veritabanı', 'mongodb', 'sql', 'database', 'veri'],
      'mobile': ['mobil', 'android', 'ios', 'uygulama', 'app'],
      'ai': ['yapay zeka', 'ai', 'machine learning', 'öğrenme'],
      'general': ['nasıl', 'nedir', 'neden', 'yardım', 'öğren']
    };
    
    const topics = [];
    const lowerMessage = message.toLowerCase();
    
    for (const [topic, words] of Object.entries(keywords)) {
      if (words.some(word => lowerMessage.includes(word))) {
        topics.push(topic);
      }
    }
    
    return topics.length > 0 ? topics : ['general'];
  }
  
  // Teknik seviyeyi değerlendir
  async assessTechnicalLevel(profile, message, chatContext) {
    const technicalIndicators = {
      programming: ['function', 'variable', 'loop', 'array', 'object', 'class', 'method', 'api'],
      technology: ['server', 'client', 'framework', 'library', 'deployment', 'cloud'],
      general: ['help', 'learn', 'understand', 'explain', 'tutorial']
    };
    
    const lowerMessage = message.toLowerCase();
    
    for (const [category, indicators] of Object.entries(technicalIndicators)) {
      const matchCount = indicators.filter(indicator => 
        lowerMessage.includes(indicator)
      ).length;
      
      if (matchCount > 0) {
        // Teknik seviyeyi artır (yavaş yavaş)
        const currentLevel = profile.interests.technicalLevel[category];
        const newLevel = Math.min(10, currentLevel + (matchCount * 0.1));
        profile.interests.technicalLevel[category] = newLevel;
      }
    }
  }
  
  // Kişilik analizini güncelle
  async updatePersonalityAnalysis(profile, message) {
    const messageLength = message.length;
    const lowerMessage = message.toLowerCase();
    
    // İletişim tarzını analiz et
    if (message.includes('?') && messageLength < 50) {
      // Kısa sorular → casual tarz
      this.updatePersonalityTrait(profile, 'communicationStyle', 'casual', 0.1);
    } else if (messageLength > 100 && !message.includes('?')) {
      // Uzun açıklamalar → formal tarz
      this.updatePersonalityTrait(profile, 'communicationStyle', 'formal', 0.1);
    }
    
    // Yanıt tercihi
    if (lowerMessage.includes('detay') || lowerMessage.includes('açıkla')) {
      this.updatePersonalityTrait(profile, 'responsePreference', 'detailed', 0.2);
    } else if (lowerMessage.includes('kısa') || lowerMessage.includes('özet')) {
      this.updatePersonalityTrait(profile, 'responsePreference', 'short', 0.2);
    } else if (lowerMessage.includes('örnek')) {
      this.updatePersonalityTrait(profile, 'responsePreference', 'examples', 0.2);
    }
  }
  
  // Kişilik özelliğini güncelle
  updatePersonalityTrait(profile, trait, value, weight) {
    // Basit bir ağırlıklı güncelleme sistemi
    if (!profile.personality[trait] || profile.personality[trait] === 'mixed') {
      profile.personality[trait] = value;
    } else if (profile.personality[trait] !== value) {
      // Conflict varsa mixed yap
      profile.personality[trait] = 'mixed';
    }
  }
  
  // Zaman kalıplarını güncelle
  updateTimePatterns(profile) {
    const currentHour = new Date().getHours();
    
    if (!profile.conversationPatterns.timePatterns.mostActiveHours.includes(currentHour)) {
      profile.conversationPatterns.timePatterns.mostActiveHours.push(currentHour);
    }
    
    // En fazla 6 saat tutulsun
    if (profile.conversationPatterns.timePatterns.mostActiveHours.length > 6) {
      profile.conversationPatterns.timePatterns.mostActiveHours = 
        profile.conversationPatterns.timePatterns.mostActiveHours.slice(-6);
    }
  }
  
  // Olumsuz geri bildirimi analiz et
  async analyzeNegativeFeedback(profile, feedbackText, aiResponse) {
    const lowerFeedback = feedbackText.toLowerCase();
    
    // Yaygın şikayetleri kategorize et
    if (lowerFeedback.includes('kısa') || lowerFeedback.includes('eksik')) {
      this.updatePersonalityTrait(profile, 'responsePreference', 'detailed', 0.3);
    } else if (lowerFeedback.includes('uzun') || lowerFeedback.includes('fazla')) {
      this.updatePersonalityTrait(profile, 'responsePreference', 'short', 0.3);
    } else if (lowerFeedback.includes('anlamadım') || lowerFeedback.includes('karmaşık')) {
      // Teknik seviyeyi azalt
      Object.keys(profile.interests.technicalLevel).forEach(key => {
        profile.interests.technicalLevel[key] = Math.max(1, 
          profile.interests.technicalLevel[key] - 0.5
        );
      });
    }
  }
  
  // Kişiselleştirilmiş AI prompt'u oluştur
  async generatePersonalizedPrompt(userId, basePrompt = '') {
    try {
      const profile = await this.getOrCreateUserProfile(userId);
      
      let personalizedPrompt = basePrompt || 'Sen yardımcı bir AI asistanısın. ';
      
      // Profil bilgilerini kullanarak prompt'u kişiselleştir
      personalizedPrompt += profile.getPersonalizedPrompt();
      
      // Son aktiviteye göre
      const daysSinceLastActive = Math.floor(
        (new Date() - profile.statistics.lastActive) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastActive > 7) {
        personalizedPrompt += "Kullanıcı uzun zamandır gelmemiş, hoş geldin mesajı verebilirsin. ";
      }
      
      // Özel durumlar
      if (profile.statistics.totalMessages < 5) {
        personalizedPrompt += "Bu yeni bir kullanıcı, biraz daha yardımcı ve açıklayıcı ol. ";
      }
      
      return personalizedPrompt;
    } catch (error) {
      console.error('Kişiselleştirilmiş prompt oluşturma hatası:', error);
      return basePrompt || 'Sen yardımcı bir AI asistanısın.';
    }
  }
  
  // Kullanıcı önerilerini oluştur
  async generateUserRecommendations(userId) {
    try {
      const profile = await this.getOrCreateUserProfile(userId);
      const recommendations = [];
      
      // İlgi alanlarına göre öneriler
      if (profile.interests.primaryTopics.length > 0) {
        const topTopic = profile.interests.primaryTopics[0];
        recommendations.push({
          type: 'topic_deepdive',
          title: `${topTopic.topic} konusunda derinleşme zamanı!`,
          description: `Bu konuda ${topTopic.count} soru sordunuz. Daha ileri seviye bilgiler öğrenmek ister misiniz?`,
          priority: 'high'
        });
      }
      
      // Teknik seviye önerileri
      const programmingLevel = profile.interests.technicalLevel.programming;
      if (programmingLevel < 5) {
        recommendations.push({
          type: 'skill_improvement',
          title: 'Programlama temellerini güçlendirelim',
          description: 'Temel programlama kavramlarını pekiştirmek ister misiniz?',
          priority: 'medium'
        });
      }
      
      // Geri bildirim kalıplarına göre
      if (profile.feedbackPatterns.helpfulnessRate < 0.6) {
        recommendations.push({
          type: 'feedback_improvement',
          title: 'Yanıtlarımızı iyileştirelim',
          description: 'Size daha iyi yardımcı olmak için tercihlerinizi belirtir misiniz?',
          priority: 'high'
        });
      }
      
      return recommendations;
    } catch (error) {
      console.error('Kullanıcı önerileri oluşturma hatası:', error);
      return [];
    }
  }
  
  // Kullanıcı istatistiklerini al
  async getUserStats(userId) {
    try {
      const profile = await this.getOrCreateUserProfile(userId);
      
      return {
        totalMessages: profile.statistics.totalMessages,
        totalSessions: profile.statistics.totalSessions,
        averageRating: profile.feedbackPatterns.averageRating,
        helpfulnessRate: profile.feedbackPatterns.helpfulnessRate,
        primaryInterests: profile.interests.primaryTopics.slice(0, 5),
        technicalLevels: profile.interests.technicalLevel,
        communicationStyle: profile.personality.communicationStyle,
        joinDate: profile.statistics.joinDate,
        lastActive: profile.statistics.lastActive,
        profileCompleteness: profile.autoGenerated.profileCompleteness
      };
    } catch (error) {
      console.error('Kullanıcı istatistikleri alma hatası:', error);
      return null;
    }
  }
  
  // Profil tamamlama yüzdesini hesapla
  async calculateProfileCompleteness(profile) {
    let score = 0;
    
    // Temel bilgiler (20 puan)
    if (profile.statistics.totalMessages > 10) score += 20;
    
    // İlgi alanları (25 puan)
    if (profile.interests.primaryTopics.length > 3) score += 25;
    
    // Kişilik profili (25 puan)
    if (profile.personality.communicationStyle !== 'mixed') score += 10;
    if (profile.personality.responsePreference !== 'detailed') score += 10;
    if (profile.personality.learningStyle !== 'mixed') score += 5;
    
    // Geri bildirim (20 puan)
    if (profile.statistics.totalFeedback > 5) score += 20;
    
    // Aktivite (10 puan)
    const daysSinceJoin = Math.floor(
      (new Date() - profile.statistics.joinDate) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceJoin > 7 && profile.statistics.totalMessages > 20) score += 10;
    
    profile.autoGenerated.profileCompleteness = Math.min(100, score);
    return score;
  }
}

module.exports = new UserLearningService();