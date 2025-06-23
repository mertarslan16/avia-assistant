// controllers/chatController.js - Sohbet kontrolleri

const Chat = require('../models/Chat');
const User = require('../models/User');

// Tüm sohbetleri getir
exports.getAllChats = async (req, res) => {
  try {
    const userId = req.userId;
    
    const chats = await Chat.find({ userId })
      .sort({ updatedAt: -1 })
      .select('title messages.role messages.timestamp updatedAt');
    
    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
};

// Yeni sohbet oluştur
exports.createChat = async (req, res) => {
  try {
    const { title } = req.body;
    const userId = req.userId;
    
    const newChat = new Chat({
      userId,
      title: title || 'Yeni Sohbet',
      messages: []
    });
    
    await newChat.save();
    
    // Kullanıcının chatHistory alanını güncelle
    await User.findByIdAndUpdate(
      userId,
      { $push: { chatHistory: newChat._id } }
    );
    
    res.status(201).json({
      message: 'Sohbet başarıyla oluşturuldu',
      chat: newChat
    });
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
};

// ID'ye göre sohbet getir
exports.getChatById = async (req, res) => {
  try {
    const chatId = req.params.id;
    const userId = req.userId;
    
    const chat = await Chat.findOne({ _id: chatId, userId });
    
    if (!chat) {
      return res.status(404).json({ message: 'Sohbet bulunamadı' });
    }
    
    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
};

// Sohbeti güncelle
exports.updateChat = async (req, res) => {
  try {
    const chatId = req.params.id;
    const userId = req.userId;
    const { title, isActive } = req.body;
    
    const updateFields = {};
    
    if (title !== undefined) updateFields.title = title;
    if (isActive !== undefined) updateFields.isActive = isActive;
    
    const updatedChat = await Chat.findOneAndUpdate(
      { _id: chatId, userId },
      { $set: updateFields },
      { new: true }
    );
    
    if (!updatedChat) {
      return res.status(404).json({ message: 'Sohbet bulunamadı' });
    }
    
    res.json({
      message: 'Sohbet başarıyla güncellendi',
      chat: updatedChat
    });
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
};

// Sohbeti sil
exports.deleteChat = async (req, res) => {
  try {
    const chatId = req.params.id;
    const userId = req.userId;
    
    // Sohbeti kontrol et ve sil
    const deletedChat = await Chat.findOneAndDelete({ _id: chatId, userId });
    
    if (!deletedChat) {
      return res.status(404).json({ message: 'Sohbet bulunamadı' });
    }
    
    // Kullanıcının chatHistory alanından kaldır
    await User.findByIdAndUpdate(
      userId,
      { $pull: { chatHistory: chatId } }
    );
    
    res.json({ 
      message: 'Sohbet başarıyla silindi', 
      chatId 
    });
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
};

// Sohbete mesaj ekle
exports.addMessage = async (req, res) => {
  try {
    const chatId = req.params.id;
    const userId = req.userId;
    const { content, role } = req.body;
    
    if (!content || !role) {
      return res.status(400).json({ message: 'Mesaj içeriği ve rolü gereklidir' });
    }
    
    if (!['user', 'assistant'].includes(role)) {
      return res.status(400).json({ message: 'Geçersiz rol, "user" veya "assistant" olmalıdır' });
    }
    
    const chat = await Chat.findOne({ _id: chatId, userId });
    
    if (!chat) {
      return res.status(404).json({ message: 'Sohbet bulunamadı' });
    }
    
    // Kullanıcının toplam mesaj sayısını kontrol et
    const userMessages = chat.messages.filter(msg => msg.role === 'user').length;
    
    // Eğer kullanıcı mesajı ise ve limit aşıldıysa hata döndür
    if (role === 'user' && userMessages >= 10) {
      return res.status(403).json({ 
        message: 'Mesaj limiti aşıldı', 
        error: 'Bir sohbette en fazla 10 mesaj gönderebilirsiniz' 
      });
    }
    
    const newMessage = {
      content,
      role,
      timestamp: new Date()
    };
    
    chat.messages.push(newMessage);
    chat.updatedAt = new Date();
    
    await chat.save();
    
    res.status(201).json({
      message: 'Mesaj başarıyla eklendi',
      chatMessage: newMessage,
      remainingMessages: role === 'user' ? 10 - (userMessages + 1) : null
    });
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
};
