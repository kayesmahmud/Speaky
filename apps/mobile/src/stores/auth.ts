import { create } from 'zustand';
import { api } from '../services/api';
import type { User, LoginRequest, RegisterRequest } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initialize: async () => {
    try {
      await api.init();
      if (api.getToken()) {
        const user = await api.getMe();
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      // Token expired or invalid
      await api.setToken(null);
      set({ isLoading: false });
    }
  },

  login: async (data: LoginRequest) => {
    set({ isLoading: true, error: null });
    try {
      await api.login(data);
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false
      });
      throw error;
    }
  },

  register: async (data: RegisterRequest) => {
    set({ isLoading: true, error: null });
    try {
      await api.register(data);
      // Auto-login after registration
      await get().login({ email: data.email, password: data.password });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Registration failed',
        isLoading: false
      });
      throw error;
    }
  },

  logout: async () => {
    await api.logout();
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (userData: Partial<User>) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, ...userData } });
    }
  },

  clearError: () => set({ error: null }),
}));
