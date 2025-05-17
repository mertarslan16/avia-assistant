// routes/api.js - API rotaları

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');
const chatController = require('../controllers/chatController');
const aiController = require('../controllers/aiController');


// Kullanıcı rotaları
router.post('/users/register', userController.register);
router.post('/users/login', userController.login);
router.get('/users/profile', auth, userController.getProfile);
router.put('/users/profile', auth, userController.updateProfile);

// Sohbet rotaları
router.get('/chats', auth, chatController.getAllChats);
router.post('/chats', auth, chatController.createChat);
router.get('/chats/:id', auth, chatController.getChatById);
router.put('/chats/:id', auth, chatController.updateChat);
router.delete('/chats/:id', auth, chatController.deleteChat);
router.post('/chats/:id/messages', auth, chatController.addMessage);

// AI asistanı rotaları
router.post('/ai/message', auth, aiController.processMessage);
router.post('/ai/generate-response', auth, aiController.generateResponse);

module.exports = router;