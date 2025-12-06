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
}

// Message types
export type MessageType = 'text' | 'image';

export interface Message {
  id: number;
  connection_id: number;
  sender_id: number;
  content: string;
  type: MessageType;
  created_at: string;
  is_flagged: boolean;
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
  Discovery: undefined;
  Connections: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type MessagesStackParamList = {
  ConversationList: undefined;
  Chat: { connectionId: number; userName: string };
};
