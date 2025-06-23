// routes/index.js - Kişiselleştirme özellikleri ile güncellenmiş routes

const express = require('express');
const router = express.Router();

// Controller'ları import et
const userController = require('../controllers/userController');
const chatController = require('../controllers/chatController');
const enhancedAIController = require('../controllers/enhancedAIController');
const learningController = require('../controllers/learningController');
const userLearningService = require('../services/userLearningService');

// Auth middleware
const authMiddleware = require('../middleware/auth');

// ==================== USER ROUTES ====================
// Kullanıcı kaydı ve girişi (auth gerektirmez)
router.post('/users/register', userController.register);
router.post('/users/login', userController.login);

// Kullanıcı profil işlemleri (auth gerektirir)
router.get('/users/profile', authMiddleware, userController.getProfile);
router.put('/users/profile', authMiddleware, userController.updateProfile);
router.put('/users/change-password', authMiddleware, userController.changePassword);

// ==================== CHAT ROUTES ====================
// Sohbet işlemleri (hepsi auth gerektirir)
router.get('/chats', authMiddleware, chatController.getAllChats);
router.post('/chats', authMiddleware, chatController.createChat);
router.get('/chats/:id', authMiddleware, chatController.getChatById);
router.put('/chats/:id', authMiddleware, chatController.updateChat);
router.delete('/chats/:id', authMiddleware, chatController.deleteChat);
router.post('/chats/:id/messages', authMiddleware, chatController.addMessage);

// ==================== AI ROUTES (KİŞİSELLEŞTİRİLMİŞ) ====================
// Kişiselleştirilmiş AI mesaj işleme
router.post('/ai/message', authMiddleware, enhancedAIController.processMessage);
router.post('/ai/generate', authMiddleware, enhancedAIController.generateResponse);

// ==================== LEARNING ROUTES ====================
// Öğrenme sistemi (hepsi auth gerektirir)
router.post('/learning/feedback', authMiddleware, enhancedAIController.submitPersonalizedFeedback);
router.post('/learning/process-improvements', authMiddleware, learningController.processImprovements);
router.post('/learning/knowledge-base', authMiddleware, learningController.addToKnowledgeBase);
router.get('/learning/knowledge-base/search', authMiddleware, learningController.searchKnowledgeBase);
router.get('/learning/metrics', authMiddleware, learningController.getLearningMetrics);
router.get('/learning/suggestions', authMiddleware, learningController.getImprovementSuggestions);
router.get('/learning/feedback', authMiddleware, learningController.getFeedbackList);

// ==================== USER PERSONALIZATION ROUTES ====================
// Kullanıcı kişiselleştirme ve profil routes
router.get('/users/personality-profile', authMiddleware, enhancedAIController.getUserPersonalityProfile);
router.put('/users/preferences', authMiddleware, enhancedAIController.updateUserPreferences);

// Kullanıcı istatistikleri
router.get('/users/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const stats = await userLearningService.getUserStats(userId);
    
    if (!stats) {
      return res.status(404).json({ message: 'Kullanıcı istatistikleri bulunamadı' });
    }
    
    res.json({
      message: 'Kullanıcı istatistikleri başarıyla alındı',
      stats
    });
  } catch (error) {
    console.error('Kullanıcı istatistikleri hatası:', error);
    res.status(500).json({ message: 'İstatistikler alınamadı', error: error.message });
  }
});

// Kullanıcı önerileri
router.get('/users/recommendations', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const recommendations = await userLearningService.generateUserRecommendations(userId);
    
    res.json({
      message: 'Kullanıcı önerileri başarıyla alındı',
      recommendations
    });
  } catch (error) {
    console.error('Kullanıcı önerileri hatası:', error);
    res.status(500).json({ message: 'Öneriler alınamadı', error: error.message });
  }
});

// Kullanıcı profil tamamlama durumu
router.get('/users/profile-completeness', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const profile = await userLearningService.getOrCreateUserProfile(userId);
    
    // Profil tamamlanma yüzdesini hesapla
    const completeness = await userLearningService.calculateProfileCompleteness(profile);
    
    res.json({
      message: 'Profil tamamlanma durumu alındı',
      completeness: completeness,
      suggestions: {
        needsMoreMessages: profile.statistics.totalMessages < 10,
        needsMoreFeedback: profile.statistics.totalFeedback < 5,
        needsPreferenceUpdate: profile.personality.communicationStyle === 'mixed'
      }
    });
  } catch (error) {
    console.error('Profil tamamlanma hatası:', error);
    res.status(500).json({ message: 'Profil durumu alınamadı', error: error.message });
  }
});

// Kullanıcı ilgi alanlarını manuel güncelleme
router.post('/users/interests', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { topics, technicalLevels } = req.body;
    
    const profile = await userLearningService.getOrCreateUserProfile(userId);
    
    // Manuel ilgi alanı ekleme
    if (topics && Array.isArray(topics)) {
      topics.forEach(topic => {
        profile.updateInterests(topic);
      });
    }
    
    // Teknik seviyeleri güncelleme
    if (technicalLevels) {
      Object.keys(technicalLevels).forEach(key => {
        if (profile.interests.technicalLevel[key] !== undefined) {
          profile.interests.technicalLevel[key] = Math.min(10, Math.max(1, technicalLevels[key]));
        }
      });
    }
    
    await profile.save();
    
    res.json({
      message: 'İlgi alanları güncellendi',
      updatedTopics: profile.interests.primaryTopics.slice(0, 5),
      technicalLevels: profile.interests.technicalLevel
    });
  } catch (error) {
    console.error('İlgi alanları güncelleme hatası:', error);
    res.status(500).json({ message: 'İlgi alanları güncellenemedi', error: error.message });
  }
});

// Kullanıcı hedefleri
router.get('/users/goals', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const profile = await userLearningService.getOrCreateUserProfile(userId);
    
    res.json({
      message: 'Kullanıcı hedefleri alındı',
      goals: profile.learningProgress.goals,
      skillDevelopment: profile.learningProgress.skillDevelopment
    });
  } catch (error) {
    console.error('Hedefler alma hatası:', error);
    res.status(500).json({ message: 'Hedefler alınamadı', error: error.message });
  }
});

router.post('/users/goals', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { goal, targetDate } = req.body;
    
    if (!goal) {
      return res.status(400).json({ message: 'Hedef belirtilmelidir' });
    }
    
    const profile = await userLearningService.getOrCreateUserProfile(userId);
    
    profile.learningProgress.goals.push({
      goal,
      targetDate: targetDate ? new Date(targetDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 gün sonra
      progress: 0,
      isAchieved: false
    });
    
    await profile.save();
    
    res.json({
      message: 'Hedef eklendi',
      goal: profile.learningProgress.goals[profile.learningProgress.goals.length - 1]
    });
  } catch (error) {
    console.error('Hedef ekleme hatası:', error);
    res.status(500).json({ message: 'Hedef eklenemedi', error: error.message });
  }
});

// ==================== HEALTH CHECK ====================
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'AI Learning System with Personalization',
    features: {
      basicAI: true,
      learning: true,
      personalization: true,
      userProfiling: true
    }
  });
});

// ==================== SYSTEM INFO ====================
router.get('/system/info', authMiddleware, async (req, res) => {
  try {
    const { learningTasks } = require('../utils/scheduledTasks');
    
    // Sistem sağlık kontrolü çalıştır
    await learningTasks.healthCheck();
    
    res.json({
      message: 'Sistem bilgileri başarıyla alındı',
      timestamp: new Date().toISOString(),
      features: {
        learning: true,
        feedback: true,
        knowledgeBase: true,
        improvements: true,
        scheduledTasks: true,
        personalization: true,
        userProfiling: true,
        behaviorAnalysis: true,
        adaptiveResponses: true
      },
      personalizationInfo: {
        description: 'Sistem kullanıcıları tanır ve kişiselleştirilmiş yanıtlar verir',
        capabilities: [
          'İletişim tarzı öğrenme',
          'Teknik seviye adaptasyonu', 
          'İlgi alanı takibi',
          'Yanıt tercihi öğrenme',
          'Geri bildirim analizi',
          'Kişiselleştirilmiş öneriler'
        ]
      }
    });
  } catch (error) {
    console.error('Sistem bilgisi hatası:', error);
    res.status(500).json({ message: 'Sistem bilgisi alınamadı', error: error.message });
  }
});

// ==================== ERROR HANDLING ====================
// 404 handler
router.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Bu endpoint bulunamadı',
    path: req.originalUrl,
    method: req.method,
    suggestion: 'API dokümantasyonunu kontrol edin'
  });
});

module.exports = router;