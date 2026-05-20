import { create } from 'zustand';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';

export interface Memory {
  _id: string;
  title: string;
  sub: string;
  notes: string;
  location: string;
  tag: string;
  type: 'photo' | 'video' | 'voice';
  url: string;
  publicId: string;
  urls: string[];
  publicIds: string[];
  thumbnail: string;
  categoryId: string | null;
  uploadedBy: { _id: string; name: string; role: string };
  likes: string[];
  createdAt: string;
}

export interface Category {
  _id: string;
  name: string;
  emoji: string;
  color: string;
  createdBy: { _id: string; name: string; role: string };
  createdAt: string;
}

export interface Activity {
  userId: string;
  userName: string;
  action: string;
  target: string;
  at: string;
}

export interface Message {
  _id: string;
  text?: string;
  image?: { url: string; publicId: string };
  gifUrl?: string;
  from: any;
  replyTo?: any;
  status?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  reactions: { userId: string; emoji: string }[];
  createdAt: string;
}

interface CoupleState {
  partner: any | null;
  categories: Category[];
  memories: Memory[];
  milestones: Milestone[];
  letters: Letter[];
  messages: Message[];
  activity: Activity[];
  onlineUsers: { userId: string; name: string }[];
  loading: boolean;
  fetchPartner: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  createCategory: (data: any) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  fetchMemories: (filter?: Record<string, string>) => Promise<void>;
  uploadMemory: (formData: FormData) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  likeMemory: (id: string) => Promise<void>;
  fetchMilestones: () => Promise<void>;
  createMilestone: (formData: FormData) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;
  fetchLetters: () => Promise<void>;
  createLetter: (data: any) => Promise<void>;
  updateLetter: (id: string, data: any) => Promise<void>;
  deleteLetter: (id: string) => Promise<void>;
  reactToLetter: (id: string, emoji: string) => Promise<void>;
  fetchMessages: () => Promise<void>;
  sendMessage: (formData: FormData | Record<string, any>) => Promise<void>;
  editMessage: (id: string, text: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  reactToMessage: (id: string, emoji: string) => Promise<void>;
  clearChat: () => Promise<void>;
  markMessagesSeen: () => Promise<void>;
  emitTyping: () => void;
  typingUser: { name: string } | null;
  initSocketListeners: () => void;
}

export const useCoupleStore = create<CoupleState>((set, get) => ({
  partner: null,
  categories: [],
  memories: [],
  milestones: [],
  letters: [],
  messages: [],
  activity: [],
  onlineUsers: [],
  typingUser: null,
  loading: false,

  fetchPartner: async () => {
    const { data } = await api.get('/auth/partner');
    set({ partner: data });
  },

  uploadMemory: async (formData) => {
    set({ loading: true });
    try {
      await api.post('/memories/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set({ loading: false });
    } catch {
      set({ loading: false });
      throw new Error('Upload failed');
    }
  },

  fetchMemories: async (filter = {}) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams(filter).toString();
      const { data } = await api.get(`/memories${params ? '?' + params : ''}`);
      set({ memories: data, loading: false });
    } catch { set({ loading: false }); }
  },

  fetchCategories: async () => {
    try {
      const { data } = await api.get('/categories');
      set({ categories: data });
    } catch {}
  },

  deleteMemory: async (id) => {
    await api.delete(`/memories/${id}`);
    set((s) => ({ memories: s.memories.filter((m) => m._id !== id) }));
  },

  likeMemory: async (id) => {
    const { data } = await api.patch(`/memories/${id}/like`);
    set((s) => ({
      memories: s.memories.map((m) => m._id === id ? { ...m, likes: data.likes } : m),
    }));
  },

  createCategory: async (data) => {
    await api.post('/categories', data);
    // Socket will broadcast and update
  },

  deleteCategory: async (id) => {
    await api.delete(`/categories/${id}`);
  },

  fetchMilestones: async () => {
    try {
      const { data } = await api.get('/timeline');
      set({ milestones: data });
    } catch (err) {
      console.error(err);
    }
  },

  createMilestone: async (formData) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/timeline', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      set(s => ({ milestones: [data, ...s.milestones] }));
    } catch (err) {
      console.error(err);
    } finally {
      set({ loading: false });
    }
  },

  deleteMilestone: async (id) => {
    try {
      await api.delete(`/timeline/${id}`);
      set(s => ({ milestones: s.milestones.filter(m => m._id !== id) }));
    } catch (err) {
      console.error(err);
    }
  },

  fetchLetters: async () => {
    try {
      const { data } = await api.get('/letters');
      set({ letters: data });
    } catch (err) {
      console.error(err);
    }
  },

  createLetter: async (letterData) => {
    try {
      const { data } = await api.post('/letters', letterData);
      set(s => ({ letters: [data, ...s.letters] }));
    } catch (err) {
      console.error(err);
    }
  },

  updateLetter: async (id, letterData) => {
    try {
      const { data } = await api.patch(`/letters/${id}`, letterData);
      set(s => ({ letters: s.letters.map(l => l._id === id ? data : l) }));
    } catch (err) {
      console.error(err);
    }
  },

  deleteLetter: async (id) => {
    try {
      await api.delete(`/letters/${id}`);
      set(s => ({ letters: s.letters.filter(l => l._id !== id) }));
    } catch (err) {
      console.error(err);
    }
  },

  reactToLetter: async (id, emoji) => {
    try {
      const { data } = await api.post(`/letters/${id}/react`, { emoji });
      set(s => ({ letters: s.letters.map(l => l._id === id ? data : l) }));
    } catch (err) {
      console.error(err);
    }
  },

  fetchMessages: async () => {
    try {
      const { data } = await api.get('/messages');
      set({ messages: data });
    } catch (err) {
      console.error(err);
    }
  },

  sendMessage: async (payload) => {
    try {
      const { data } = await api.post('/messages', payload);
      set((s) => {
        if (s.messages.some(m => m._id === data._id)) return s;
        return { messages: [...s.messages, data] };
      });
    } catch (err) {
      console.error(err);
    }
  },

  editMessage: async (id, text) => {
    try {
      await api.patch(`/messages/${id}`, { text });
    } catch (err) { console.error(err); }
  },

  deleteMessage: async (id) => {
    try {
      await api.delete(`/messages/${id}`);
    } catch (err) { console.error(err); }
  },

  reactToMessage: async (id, emoji) => {
    try {
      await api.patch(`/messages/${id}/react`, { emoji });
    } catch (err) { console.error(err); }
  },

  clearChat: async () => {
    try {
      await api.delete('/messages/all');
    } catch (err) { console.error(err); }
  },

  markMessagesSeen: async () => {
    try {
      await api.patch('/messages/status/seen');
    } catch (err) { console.error(err); }
  },

  emitTyping: () => {
    const socket = getSocket();
    const { partner } = get();
    // Assuming authStore has our user details but we just emit typing here
    if (socket) socket.emit('user:typing', { isTyping: true });
  },

  initSocketListeners: () => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('memory:new', (memory: Memory) => {
      set((s) => {
        if (s.memories.some(m => m._id === memory._id)) return s;
        return { memories: [memory, ...s.memories] };
      });
    });
    socket.on('memory:deleted', ({ id }: { id: string }) => {
      set((s) => ({ memories: s.memories.filter((m) => m._id !== id) }));
    });
    socket.on('memory:liked', ({ id, likes }: { id: string; likes: string[] }) => {
      set((s) => ({ memories: s.memories.map((m) => m._id === id ? { ...m, likes } : m) }));
    });
    socket.on('memory:updated', (memory: Memory) => {
      set((s) => ({ memories: s.memories.map((m) => m._id === memory._id ? memory : m) }));
    });
    socket.on('category:new', (cat: Category) => {
      set((s) => {
        if (s.categories.some(c => c._id === cat._id)) return s;
        return { categories: [...s.categories, cat] };
      });
    });
    socket.on('category:deleted', ({ id }: { id: string }) => {
      set((s) => ({ categories: s.categories.filter((c) => c._id !== id) }));
    });
    socket.on('activity:update', (act: Activity) => {
      set((s) => ({ activity: [act, ...s.activity].slice(0, 20) }));
    });

    socket.on('timeline_created', (milestone: Milestone) => {
      set((s) => {
        if (s.milestones.some(m => m._id === milestone._id)) return s;
        return { milestones: [milestone, ...s.milestones] };
      });
    });

    socket.on('timeline_deleted', (id: string) => {
      set((s) => ({ milestones: s.milestones.filter(m => m._id !== id) }));
    });

    socket.on('letter_created', (letter: Letter) => {
      set((s) => {
        if (s.letters.some(l => l._id === letter._id)) return s;
        return { letters: [letter, ...s.letters] };
      });
    });

    socket.on('letter_updated', (letter: Letter) => {
      set((s) => ({ letters: s.letters.map(l => l._id === letter._id ? letter : l) }));
    });

    socket.on('letter_deleted', (id: string) => {
      set((s) => ({ letters: s.letters.filter(l => l._id !== id) }));
    });

    socket.on('letter_reacted', ({ letterId, reactions }: { letterId: string, reactions: any }) => {
      set((s) => ({
        letters: s.letters.map(l => l._id === letterId ? { ...l, reactions } : l)
      }));
    });

    socket.on('message:new', (msg: Message) => {
      set((s) => {
        if (s.messages.some(m => m._id === msg._id)) return s;
        // Mark as seen immediately if we are in chat? For now just append.
        return { messages: [...s.messages, msg] };
      });
    });

    socket.on('message:update', (msg: Message) => {
      set((s) => ({
        messages: s.messages.map(m => m._id === msg._id ? msg : m)
      }));
    });

    socket.on('messages:seen', ({ byUser }) => {
      set((s) => ({
        messages: s.messages.map(m => {
          if (m.from?._id !== byUser && m.status !== 'seen') {
            return { ...m, status: 'seen' };
          }
          return m;
        })
      }));
    });

    socket.on('messages:cleared', () => {
      set({ messages: [] });
    });

    socket.on('user:typing', (data) => {
      set({ typingUser: data.isTyping ? { name: 'Partner' } : null });
      if (data.isTyping) {
        setTimeout(() => set({ typingUser: null }), 3000);
      }
    });

    socket.on('users:online', (users: { userId: string; name: string }[]) => {
      set({ onlineUsers: users });
    });
  },
}));
