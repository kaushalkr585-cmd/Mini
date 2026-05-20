import { create } from 'zustand';
import api from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'partner';
  avatar: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
  updateProfile: (formData: FormData) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  loading: false,

  loadFromStorage: () => {
    const token = localStorage.getItem('nishy_token');
    const user = localStorage.getItem('nishy_user');
    if (token && user) {
      const u = JSON.parse(user);
      set({ token, user: u });
      connectSocket(u.id, u.name);
    }
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('nishy_token', data.token);
      localStorage.setItem('nishy_user', JSON.stringify(data.user));
      set({ token: data.token, user: data.user, loading: false });
      connectSocket(data.user.id, data.user.name);
    } catch (err: any) {
      set({ loading: false });
      throw new Error(err.response?.data?.error || 'Login failed');
    }
  },

  signup: async (name, email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      localStorage.setItem('nishy_token', data.token);
      localStorage.setItem('nishy_user', JSON.stringify(data.user));
      set({ token: data.token, user: data.user, loading: false });
      connectSocket(data.user.id, data.user.name);
    } catch (err: any) {
      set({ loading: false });
      throw new Error(err.response?.data?.error || 'Signup failed');
    }
  },

  logout: () => {
    localStorage.removeItem('nishy_token');
    localStorage.removeItem('nishy_user');
    disconnectSocket();
    set({ user: null, token: null });
    window.location.href = '/login';
  },

  updateProfile: async (formData: FormData) => {
    try {
      const { data } = await api.patch('/auth/me', formData);
      localStorage.setItem('nishy_user', JSON.stringify(data));
      set({ user: data });
    } catch (err: any) {
      console.error('Profile update failed', err);
      throw new Error(err.response?.data?.error || 'Update failed');
    }
  },
}));
