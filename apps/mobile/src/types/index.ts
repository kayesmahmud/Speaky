import type { NavigatorScreenParams } from '@react-navigation/native';

// User types
export interface User {
  id: number;
  email: string;
  name: string;
  native_language: string | null;
  learning_language: string | null;
  is_active: boolean;
  created_at: string;
  avatar_url?: string;
  bio?: string;
  timezone?: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  native_language?: string;
  learning_language?: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

// Connection types
export type ConnectionStatus = 'pending' | 'accepted' | 'blocked';

export interface Connection {
  id: number;
  user_a: number;
  user_b: number;
  status: ConnectionStatus;
  created_at: string;
  partner?: {
    id: number;
    name: string;
    avatar_url?: string;
    native_language?: string;
    learning_language?: string;
    is_online?: boolean;
  };
  last_message?: {
    id: number;
    content: string;
    sender_id: number;
    created_at: string;
    is_read: boolean;
  } | null;
  unread_count?: number;
}

// Message types
export type MessageType = 'text' | 'image' | 'voice';

export interface Message {
  id: number;
  connection_id: number;
  sender_id: number;
  content: string;
  type: MessageType;
  created_at: string;
  is_flagged: boolean;
  is_read: boolean;
  read_at: string | null;
}

// Correction types
export interface Correction {
  id: number;
  message_id: number;
  corrector_id: number;
  original_text: string;
  corrected_text: string;
  explanation?: string;
  created_at: string;
  corrector?: {
    id: number;
    name: string;
  };
}

// Translation types
export interface Translation {
  id: number;
  message_id: number;
  source_language: string;
  target_language: string;
  translated_text: string;
  created_at: string;
}

export interface Language {
  code: string;
  name: string;
}

// Partner types
export interface Partner {
  id: number;
  name: string;
  native_language: string | null;
  learning_language: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_online: boolean;
  last_active: string;
}

// Post types
export interface Post {
  id: number;
  content: string;
  image_url: string | null;
  language: string | null;
  created_at: string;
  author: {
    id: number;
    name: string;
    avatar_url: string | null;
    native_language: string | null;
    learning_language: string | null;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

export interface PostComment {
  id: number;
  content: string;
  created_at: string;
  user: {
    id: number;
    name: string;
    avatar_url: string | null;
  };
}

// Discovery types
export interface DiscoveryFilters {
  language?: string;
  level?: string;
}

export interface DiscoveryUser extends User {
  last_active?: string;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
};

export type MainTabParamList = {
  Feed: undefined;
  Partners: NavigatorScreenParams<PartnersStackParamList> | undefined;
  Messages: NavigatorScreenParams<MessagesStackParamList> | undefined;
  Profile: undefined;
};

export type MessagesStackParamList = {
  ConversationList: undefined;
  Chat: { connectionId: number; userName: string };
};

export type PartnersStackParamList = {
  PartnersList: undefined;
  UserProfile: { userId: number; userName: string };
};
