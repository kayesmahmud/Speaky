import * as SecureStore from 'expo-secure-store';
import type { AuthToken, LoginRequest, RegisterRequest, User, DiscoveryUser, Connection, Message, Correction, Translation, Language } from '../types';

import { Platform } from 'react-native';

// Get the correct API URL based on platform
function getApiUrl(): string {
  if (!__DEV__) {
    return 'https://your-production-url.com/api';
  }

  // For development:
  // - iOS Simulator: localhost works
  // - Android Emulator: use 10.0.2.2
  // - Physical device: use your computer's local IP
  // Physical device - use your computer's local IP
  return 'http://192.168.1.153:8000/api';
}

const API_BASE_URL = getApiUrl();

class ApiClient {
  private accessToken: string | null = null;

  async init() {
    this.accessToken = await SecureStore.getItemAsync('access_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  async setToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      await SecureStore.setItemAsync('access_token', token);
    } else {
      await SecureStore.deleteItemAsync('access_token');
    }
  }

  getToken() {
    return this.accessToken;
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<AuthToken> {
    const result = await this.request<AuthToken>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await this.setToken(result.access_token);
    return result;
  }

  async register(data: RegisterRequest): Promise<User> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout() {
    await this.setToken(null);
  }

  // User endpoints
  async getMe(): Promise<User> {
    return this.request<User>('/users/me');
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return this.request<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Discovery endpoints
  async getDiscoveryFeed(filters?: { language?: string; level?: string }): Promise<DiscoveryUser[]> {
    const params = new URLSearchParams();
    if (filters?.language) params.append('language', filters.language);
    if (filters?.level) params.append('level', filters.level);
    const query = params.toString();
    return this.request<DiscoveryUser[]>(`/discovery${query ? `?${query}` : ''}`);
  }

  // Connection endpoints
  async sendConnectionRequest(userId: number): Promise<Connection> {
    return this.request<Connection>('/connections', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async getConnections(): Promise<Connection[]> {
    return this.request<Connection[]>('/connections');
  }

  async updateConnection(connectionId: number, status: 'accepted' | 'blocked'): Promise<Connection> {
    return this.request<Connection>(`/connections/${connectionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Messages endpoints
  async getMessages(connectionId: number): Promise<Message[]> {
    return this.request<Message[]>(`/connections/${connectionId}/messages`);
  }

  async sendMessage(connectionId: number, content: string, type: 'text' | 'image' = 'text'): Promise<Message> {
    return this.request<Message>(`/connections/${connectionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    });
  }

  async markMessagesAsRead(connectionId: number): Promise<{ marked_read: number }> {
    return this.request<{ marked_read: number }>(`/connections/${connectionId}/messages/read`, {
      method: 'POST',
    });
  }

  async getUnreadCount(connectionId: number): Promise<{ unread_count: number }> {
    return this.request<{ unread_count: number }>(`/connections/${connectionId}/messages/unread`);
  }

  async getTotalUnreadCount(): Promise<{ total_unread_count: number }> {
    return this.request<{ total_unread_count: number }>('/messages/unread');
  }

  // Correction endpoints
  async createCorrection(messageId: number, correctedText: string, explanation?: string): Promise<Correction> {
    return this.request<Correction>('/corrections', {
      method: 'POST',
      body: JSON.stringify({
        message_id: messageId,
        corrected_text: correctedText,
        explanation,
      }),
    });
  }

  async getCorrectionsForMessage(messageId: number): Promise<Correction[]> {
    return this.request<Correction[]>(`/corrections/message/${messageId}`);
  }

  async getMyCorrections(): Promise<Correction[]> {
    return this.request<Correction[]>('/corrections/my');
  }

  async deleteCorrection(correctionId: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/corrections/${correctionId}`, {
      method: 'DELETE',
    });
  }

  // Translation endpoints
  async translateMessage(messageId: number, targetLanguage: string, sourceLanguage?: string): Promise<Translation> {
    return this.request<Translation>('/translations/message', {
      method: 'POST',
      body: JSON.stringify({
        message_id: messageId,
        target_language: targetLanguage,
        source_language: sourceLanguage,
      }),
    });
  }

  async translateText(text: string, targetLanguage: string, sourceLanguage?: string): Promise<{ original_text: string; translated_text: string; source_language: string; target_language: string }> {
    return this.request('/translations/text', {
      method: 'POST',
      body: JSON.stringify({
        text,
        target_language: targetLanguage,
        source_language: sourceLanguage,
      }),
    });
  }

  async getSupportedLanguages(): Promise<Language[]> {
    return this.request<Language[]>('/translations/languages');
  }

  // Upload endpoints
  async uploadAvatar(file: { uri: string; type: string; name: string }): Promise<{ avatar_url: string }> {
    const formData = new FormData();
    formData.append('file', file as any);

    const response = await fetch(`${API_BASE_URL}/uploads/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  }

  async deleteAvatar(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/uploads/avatar', {
      method: 'DELETE',
    });
  }

  async uploadMessageImage(connectionId: number, file: { uri: string; type: string; name: string }): Promise<{ image_url: string }> {
    const formData = new FormData();
    formData.append('file', file as any);

    const response = await fetch(`${API_BASE_URL}/uploads/message/${connectionId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  }

  // Health check
  async health(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health');
  }
}

export const api = new ApiClient();
