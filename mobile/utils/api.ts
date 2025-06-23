import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API temel URL'i - Mobil cihazlarda localhost çalışmaz, IP adresi kullanılmalı
const API_URL = 'http://10.0.2.2:8000/api'; // Kendi IP adresinizle değiştirin

// Axios instance oluştur
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// İstek interceptor'ı - her istekte token ekle
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Yanıt interceptor'ı - token süresi dolmuşsa işle
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response && error.response.status === 401) {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_info');
      // Router kullanımı burada sorun çıkarabilir, bu yüzden kaldırıldı
    }
    return Promise.reject(error);
  }
);

// API servisleri
export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/users/login', { email, password });
    return response.data;
  },
  
  register: async (username: string, email: string, password: string) => {
    const response = await api.post('/users/register', { username, email, password });
    return response.data;
  },
  
  getCurrentUser: async () => {
    try {
      const userInfo = await AsyncStorage.getItem('user_info');
      return userInfo ? JSON.parse(userInfo) : null;
    } catch (error) {
      console.error('Kullanıcı bilgisi alma hatası:', error);
      return null;
    }
  },
};

// Çıkış işlemi
export const logout = async () => {
  await AsyncStorage.removeItem('auth_token');
  await AsyncStorage.removeItem('user_info');
  return true;
};

export default api;

