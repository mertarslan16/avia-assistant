// src/utils/apiClient.ts - Axios tiplemesi düzeltilmiş API istemcisi
import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// API URL
const API_URL = 'http://localhost:8000/api';

// API istemci arayüzü
interface ApiClient {
  setToken: (token: string) => ApiClient;
  get: <T>(url: string, params?: Record<string, unknown>) => Promise<T>;
  post: <T>(url: string, data?: unknown) => Promise<T>;
  put: <T>(url: string, data?: unknown) => Promise<T>;
  delete: <T>(url: string) => Promise<T>;
}

// Authorization header'ını ayarlar
const setAuthHeader = (token: string): void => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

// API istemcisi
const apiClient: ApiClient = {
  // Token ayarla
  setToken: (token: string): ApiClient => {
    setAuthHeader(token);
    return apiClient;
  },
  
  // GET isteği
  get: async <T>(url: string, params: Record<string, unknown> = {}): Promise<T> => {
    try {
      const response: AxiosResponse<T> = await axios.get(`${API_URL}${url}`, { params });
      return response.data;
    } catch (error) {
      console.error(`GET ${url} hatası:`, error);
      throw error;
    }
  },
  
  // POST isteği
  post: async <T>(url: string, data: unknown = {}): Promise<T> => {
    try {
      const response: AxiosResponse<T> = await axios.post(`${API_URL}${url}`, data);
      return response.data;
    } catch (error) {
      console.error(`POST ${url} hatası:`, error);
      throw error;
    }
  },
  
  // PUT isteği
  put: async <T>(url: string, data: unknown = {}): Promise<T> => {
    try {
      const response: AxiosResponse<T> = await axios.put(`${API_URL}${url}`, data);
      return response.data;
    } catch (error) {
      console.error(`PUT ${url} hatası:`, error);
      throw error;
    }
  },
  
  // DELETE isteği
  delete: async <T>(url: string): Promise<T> => {
    try {
      const response: AxiosResponse<T> = await axios.delete(`${API_URL}${url}`);
      return response.data;
    } catch (error) {
      console.error(`DELETE ${url} hatası:`, error);
      throw error;
    }
  }
};

// Token kontrolü interceptor'ları
axios.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  }
);

// Token süresi bitme kontrolü
axios.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // Axios hata objesi kontrolü
    if (
      axios.isAxiosError(error) && 
      error.response?.status === 401
    ) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;