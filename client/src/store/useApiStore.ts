// src/store/useApiStore.ts
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import axios from 'axios';

interface ApiState {
  isLoading: boolean;
  error: string | null;
  token: string | null;
  apiUrl: string;
  
  // API istekleri
  get: <T>(endpoint: string, params?: Record<string, unknown>) => Promise<T>;
  post: <T>(endpoint: string, data?: unknown) => Promise<T>;
  put: <T>(endpoint: string, data?: unknown) => Promise<T>;
  delete: <T>(endpoint: string) => Promise<T>;
  
  // Token yönetimi
  setToken: (token: string) => void;
  clearToken: () => void;
  
  // Durum yönetimi
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  resetState: () => void;
}

// API URL'i ortam değişkeninden veya varsayılan değerden al
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const useApiStore = create<ApiState>()(
  persist(
    (set, get) => ({
      // Başlangıç durumu
      isLoading: false,
      error: null,
      token: null,
      apiUrl: API_URL,
      
      // Token yönetimi
      setToken: (token: string) => {
        set({ token });
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },
      
      clearToken: () => {
        set({ token: null });
        delete axios.defaults.headers.common['Authorization'];
      },
      
      // Durum yönetimi
      setLoading: (isLoading: boolean) => set({ isLoading }),
      setError: (error: string | null) => set({ error }),
      resetState: () => set({ isLoading: false, error: null }),
      
      // API istekleri
      get: async <T>(endpoint: string, params: Record<string, unknown> = {}): Promise<T> => {
        try {
          set({ isLoading: true, error: null });
          const { apiUrl, token } = get();
          
          const headers: Record<string, string> = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await axios.get<T>(`${apiUrl}${endpoint}`, { 
            params,
            headers
          });
          
          return response.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const message = error.response?.data?.message || error.message;
            set({ error: message });
          } else {
            set({ error: 'Bilinmeyen bir hata oluştu' });
          }
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
      
      post: async <T>(endpoint: string, data: unknown = {}): Promise<T> => {
        try {
          set({ isLoading: true, error: null });
          const { apiUrl, token } = get();
          
          const headers: Record<string, string> = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await axios.post<T>(`${apiUrl}${endpoint}`, data, {
            headers
          });
          
          return response.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const message = error.response?.data?.message || error.message;
            set({ error: message });
          } else {
            set({ error: 'Bilinmeyen bir hata oluştu' });
          }
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
      
      put: async <T>(endpoint: string, data: unknown = {}): Promise<T> => {
        try {
          set({ isLoading: true, error: null });
          const { apiUrl, token } = get();
          
          const headers: Record<string, string> = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await axios.put<T>(`${apiUrl}${endpoint}`, data, {
            headers
          });
          
          return response.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const message = error.response?.data?.message || error.message;
            set({ error: message });
          } else {
            set({ error: 'Bilinmeyen bir hata oluştu' });
          }
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
      
      delete: async <T>(endpoint: string): Promise<T> => {
        try {
          set({ isLoading: true, error: null });
          const { apiUrl, token } = get();
          
          const headers: Record<string, string> = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await axios.delete<T>(`${apiUrl}${endpoint}`, {
            headers
          });
          
          return response.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const message = error.response?.data?.message || error.message;
            set({ error: message });
          } else {
            set({ error: 'Bilinmeyen bir hata oluştu' });
          }
          throw error;
        } finally {
          set({ isLoading: false });
        }
      }
    }),
    {
      name: 'api-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
      })
    }
  )
);