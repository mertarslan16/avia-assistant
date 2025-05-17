// controllers/aiController.js - AI kontrolleri

const Chat = require('../models/Chat');
const axios = require('axios');

// AI asistanı için mesaj işleme
exports.processMessage = async (req, res) => {
  try {
    const { chatId, message } = req.body;
    const userId = req.userId;
    
    if (!chatId || !message) {
      return res.status(400).json({ message: 'Sohbet ID ve mesaj gereklidir' });
    }
    
    // Sohbeti bul
    const chat = await Chat.findOne({ _id: chatId, userId });
    
    if (!chat) {
      return res.status(404).json({ message: 'Sohbet bulunamadı' });
    }
    
    // Kullanıcı mesajını sohbete ekle
    const userMessage = {
      content: message,
      role: 'user',
      timestamp: new Date()
    };
    
    chat.messages.push(userMessage);
    
    // AI yanıtını al
    const aiResponseText = await generateAIResponse(chat.messages);
    
    // AI yanıtını sohbete ekle
    const aiMessage = {
      content: aiResponseText,
      role: 'assistant',
      timestamp: new Date()
    };
    
    chat.messages.push(aiMessage);
    chat.updatedAt = new Date();
    
    await chat.save();
    
    res.json({
      message: 'Mesaj başarıyla işlendi',
      userMessage,
      aiMessage
    });
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
};

// AI yanıtı üret
exports.generateResponse = async (req, res) => {
  try {
    const { messages, chatId } = req.body;
    const userId = req.userId;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Geçerli bir mesaj dizisi gereklidir' });
    }
    
    // Opsiyonel: Mesajları bir sohbete kaydet
    if (chatId) {
      const chat = await Chat.findOne({ _id: chatId, userId });
      
      if (!chat) {
        return res.status(404).json({ message: 'Sohbet bulunamadı' });
      }
    }
    
    // AI yanıtını al
    const aiResponseText = await generateAIResponse(messages);
    
    res.json({
      response: aiResponseText
    });
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
};

// AI yanıtı üretme fonksiyonu (istediğiniz AI API'ına göre entegre edilebilir)
async function generateAIResponse(messages) {
  try {
    // Burada mesajları formatlayıp AI servisi API'sine gönderiyoruz
    // Örnek olarak OpenAI API kullanımı:
    
    // Mesajları OpenAI formatına dönüştür
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // API yapılandırması
    const config = {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    // API isteği gönder
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 1000
      },
      config
    );
    
    // Yanıtı döndür
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('AI yanıtı üretme hatası:', error);
    // Hata durumunda varsayılan bir yanıt döndür
    return 'Üzgünüm, yanıtınızı işlerken bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
  }
}