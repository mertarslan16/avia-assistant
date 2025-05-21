// src/utils/chatService.js - Backend entegrasyonu için JS servis
import axios from 'axios';

// API temel URL'i
const API_URL = 'http://localhost:8000/api';

// Token'ı localStorage'dan alma
const getAuthToken = () => localStorage.getItem('auth_token');

// API istek yapılandırması
const getConfig = () => {
  const token = getAuthToken();
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    }
  };
};

// Chat servisi
const chatService = {
  // Tüm sohbetleri getir
  getAllChats: async () => {
    try {
      const response = await axios.get(`${API_URL}/chats`, getConfig());
      return response.data;
    } catch (error) {
      console.error('Sohbetleri getirme hatası:', error);
      throw error;
    }
  },
  
  // Belirli bir sohbeti getir
  getChatById: async (chatId) => {
    try {
      const response = await axios.get(`${API_URL}/chats/${chatId}`, getConfig());
      return response.data;
    } catch (error) {
      console.error('Sohbet detayı getirme hatası:', error);
      throw error;
    }
  },
  
  // Yeni sohbet oluştur
  createChat: async (title = 'Yeni Sohbet') => {
    try {
      const response = await axios.post(`${API_URL}/chats`, { title }, getConfig());
      return response.data.chat;
    } catch (error) {
      console.error('Sohbet oluşturma hatası:', error);
      throw error;
    }
  },
  
  // Sohbeti güncelle
  updateChat: async (chatId, data) => {
    try {
      const response = await axios.put(`${API_URL}/chats/${chatId}`, data, getConfig());
      return response.data.chat;
    } catch (error) {
      console.error('Sohbet güncelleme hatası:', error);
      throw error;
    }
  },
  
  // Sohbeti sil
  deleteChat: async (chatId) => {
    try {
      const response = await axios.delete(`${API_URL}/chats/${chatId}`, getConfig());
      return response.data;
    } catch (error) {
      console.error('Sohbet silme hatası:', error);
      throw error;
    }
  },
  
  // Sohbete mesaj gönder ve AI yanıtı al
  sendMessage: async (chatId, message) => {
    try {
      const response = await axios.post(
        `${API_URL}/ai/process-message`, 
        { chatId, message }, 
        getConfig()
      );
      return response.data;
    } catch (error) {
      console.error('Mesaj işleme hatası:', error);
      throw error;
    }
  },
  
  // Doğrudan AI yanıtı al (sohbete kaydetmeden)
  generateAIResponse: async (messages) => {
    try {
      const response = await axios.post(
        `${API_URL}/ai/generate-response`, 
        { messages }, 
        getConfig()
      );
      return response.data.response;
    } catch (error) {
      console.error('AI yanıtı üretme hatası:', error);
      throw error;
    }
  }
};

export default chatService;