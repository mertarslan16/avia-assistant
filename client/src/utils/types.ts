// src/utils/types.ts - Backend entegrasyonu için type tanımlamaları
// User ve Kimlik Doğrulama İlgili Tipler
export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  preferences: UserPreferences;
  chatHistory: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

// Sohbet İlgili Tipler
export interface Message {
  _id?: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp?: Date;
}

export interface Chat {
  _id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface ChatListResponse extends Array<Chat> {
  totalCount: number;
}

export interface ChatResponse {
  message: string;
  chat: Chat;
}

export interface CreateChatRequest {
  title?: string;
}

export interface UpdateChatRequest {
  title?: string;
  isActive?: boolean;
}

export interface ProcessMessageRequest {
  chatId: string;
  message: string;
}

export interface ProcessMessageResponse {
  message: string;
  userMessage: Message;
  aiMessage: Message;
}

export interface GenerateResponseRequest {
  messages: Message[];
  chatId?: string;
}

export interface GenerateResponseResponse {
  response: string;
}

// API İstemcisi İçin Tipler
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export type ApiError = {
  message: string;
  code?: string;
  status?: number;
};