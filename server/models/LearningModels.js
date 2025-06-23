// models/Feedback.js - Kullanıcı geri bildirim modeli
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  isHelpful: {
    type: Boolean,
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  feedbackText: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['accuracy', 'helpfulness', 'clarity', 'completeness', 'tone', 'other'],
    default: 'other'
  },
  userQuery: {
    type: String,
    required: true
  },
  aiResponse: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// models/ImprovementData.js - İyileştirme verisi modeli
const improvementSchema = new mongoose.Schema({
  queryPattern: {
    type: String,
    required: true
  },
  originalQuery: {
    type: String,
    required: true
  },
  originalResponse: {
    type: String,
    required: true
  },
  improvedResponse: {
    type: String,
    default: ''
  },
  feedbackCount: {
    type: Number,
    default: 1
  },
  lastFeedback: {
    type: String,
    default: ''
  },
  isProcessed: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  tags: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// models/KnowledgeBase.js - Bilgi tabanı modeli
const knowledgeSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
    unique: true
  },
  content: {
    type: String,
    required: true
  },
  keywords: [{
    type: String
  }],
  category: {
    type: String,
    required: true
  },
  source: {
    type: String,
    default: 'user_input'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// models/ResponseTemplate.js - Özel yanıt şablonları
const responseTemplateSchema = new mongoose.Schema({
  queryPattern: {
    type: String,
    required: true,
    unique: true
  },
  template: {
    type: String,
    required: true
  },
  variables: [{
    name: String,
    type: {
      type: String,
      enum: ['string', 'number', 'date', 'array'],
      default: 'string'
    },
    required: {
      type: Boolean,
      default: false
    }
  }],
  category: {
    type: String,
    required: true
  },
  priority: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  successRate: {
    type: Number,
    default: 0
  },
  usageCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// models/LearningMetrics.js - Öğrenme metrikleri
const learningMetricsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  totalMessages: {
    type: Number,
    default: 0
  },
  positiveFeedback: {
    type: Number,
    default: 0
  },
  negativeFeedback: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0
  },
  improvementsProcessed: {
    type: Number,
    default: 0
  },
  knowledgeBaseUpdates: {
    type: Number,
    default: 0
  },
  mostCommonCategories: [{
    category: String,
    count: Number
  }],
  problemPatterns: [{
    pattern: String,
    frequency: Number
  }]
});

const Feedback = mongoose.model('Feedback', feedbackSchema);
const ImprovementData = mongoose.model('ImprovementData', improvementSchema);
const KnowledgeBase = mongoose.model('KnowledgeBase', knowledgeSchema);
const ResponseTemplate = mongoose.model('ResponseTemplate', responseTemplateSchema);
const LearningMetrics = mongoose.model('LearningMetrics', learningMetricsSchema);

module.exports = {
  Feedback,
  ImprovementData,
  KnowledgeBase,
  ResponseTemplate,
  LearningMetrics
};