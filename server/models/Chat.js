// models/Chat.js - Güncellenmiş sohbet modeli
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  // Öğrenme için eklenen yeni alanlar
  feedback: {
    isHelpful: {
      type: Boolean
    },
    feedbackText: {
      type: String
    },
    feedbackGiven: {
      type: Boolean,
      default: false
    }
  },
  tokenUsage: {
    type: Number,
    default: 0
  },
  responseTime: {
    type: Number, // Milisaniye cinsinden
    default: 0
  },
  improvedVersion: {
    type: String // Eğer bu mesaj iyileştirilmişse, iyileştirilmiş versiyonu
  }
});

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: 'Yeni Sohbet'
  },
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Öğrenme için eklenen yeni alanlar
  category: {
    type: String,
    default: 'general' // general, technical, support, etc.
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy'
  },
  overallRating: {
    type: Number,
    min: 1,
    max: 5
  },
  tags: [{
    type: String,
    trim: true
  }]
});

// Update updatedAt tarihini otomatik güncelleme
chatSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Sohbet istatistikleri hesaplama metodu
chatSchema.methods.getStatistics = function() {
  const userMessages = this.messages.filter(m => m.role === 'user').length;
  const assistantMessages = this.messages.filter(m => m.role === 'assistant').length;
  const feedbackCount = this.messages.filter(m => m.feedback && m.feedback.feedbackGiven).length;
  const positiveCount = this.messages.filter(m => m.feedback && m.feedback.isHelpful === true).length;
  
  return {
    userMessages,
    assistantMessages,
    feedbackCount,
    positiveCount,
    feedbackRate: feedbackCount > 0 ? (positiveCount / feedbackCount * 100).toFixed(2) : 0
  };
};

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;