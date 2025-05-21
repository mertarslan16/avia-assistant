// src/utils/authService.js - Kimlik doğrulama servisi (JavaScript)
import axios from 'axios';

// API temel URL'i
const API_URL = 'http://localhost:8000/api';

// Kimlik doğrulama servisi
const authService = {
  // Kullanıcı kaydı
  register: async (username, email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        username,
        email,
        password
      });

      // Token'ı localStorage'a kaydet
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user_info', JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error) {
      console.error('Kayıt hatası:', error);
      throw error;
    }
  },

  // Kullanıcı girişi
  login: async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      // Token'ı localStorage'a kaydet
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user_info', JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error) {
      console.error('Giriş hatası:', error);
      throw error;
    }
  },

  // Çıkış yap
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
  },

  // Mevcut kullanıcı bilgilerini getir
  getCurrentUser: () => {
    const userJson = localStorage.getItem('user_info');
    return userJson ? JSON.parse(userJson) : null;
  },

  // Kullanıcı giriş yapmış mı kontrol et
  isLoggedIn: () => {
    return !!localStorage.getItem('auth_token');
  },

  // Kullanıcı profilini getir
  getProfile: async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Token bulunamadı');

      const response = await axios.get(`${API_URL}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Profil bilgisi alma hatası:', error);
      throw error;
    }
  },

  // Kullanıcı profilini güncelle
  updateProfile: async (userData) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Token bulunamadı');

      const response = await axios.put(`${API_URL}/users/profile`, userData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Yerel kullanıcı bilgilerini güncelle
      if (response.data.user) {
        localStorage.setItem('user_info', JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      throw error;
    }
  },

  // Şifre değiştir
  changePassword: async (currentPassword, newPassword) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Token bulunamadı');

      const response = await axios.put(
        `${API_URL}/users/password`,
        { currentPassword, newPassword },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Şifre değiştirme hatası:', error);
      throw error;
    }
  }
};

export default authService;