import { create } from 'zustand';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import toast from 'react-hot-toast';

export interface Milestone {
  _id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  images?: { url: string; publicId: string }[];
}

export interface Letter {
  _id: string;
  title: string;
  content: string;
  author?: any;
  isDraft: boolean;
  reactions: { user: string; emoji: string }[];
  createdAt: string;
  commentCount?: number;
  replyCount?: number;
}

export interface LetterComment {
  _id: string;
  letterId: string;
  author: any;
  text: string;
  parentId: string | null;
  reactions: { user: string; emoji: string }[];
  createdAt: string;
}

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
  duration?: number;
  resolution?: string;
  tags?: string[];
  categoryId: string | null;
  uploadedBy: { _id: string; name: string; role: string };
  likes: string[];
  reactions?: { userId: string; emoji: string }[];
  createdAt: string;
}

export interface Category {
  _id: string;
  name: string;
  emoji: string;
  color: string;
  coverImage: string;
  photoCount: number;
  videoCount: number;
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
  letterComments: Record<string, LetterComment[]>;
  messages: Message[];
  activity: Activity[];
  onlineUsers: { userId: string; name: string }[];
  loading: boolean;
  lovenote: any | null;
  fetchLoveNote: () => Promise<void>;
  updateLoveNote: (formData: FormData) => Promise<void>;
  fetchPartner: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  createCategory: (data: any) => Promise<void>;
  editCategory: (id: string, data: { name?: string; emoji?: string; color?: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  fetchMemories: (filter?: Record<string, string>) => Promise<void>;
  uploadMemory: (formData: FormData) => Promise<void>;
  uploadToCategory: (categoryId: string, formData: FormData) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  editMemory: (id: string, data: any) => Promise<void>;
  likeMemory: (id: string) => Promise<void>;
  reactToMemory: (id: string, emoji: string) => Promise<void>;
  fetchMilestones: () => Promise<void>;
  createMilestone: (formData: FormData) => Promise<void>;
  editMilestone: (id: string, formData: FormData) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;
  fetchLetters: () => Promise<void>;
  createLetter: (data: any) => Promise<void>;
  updateLetter: (id: string, data: any) => Promise<void>;
  deleteLetter: (id: string) => Promise<void>;
  reactToLetter: (id: string, emoji: string) => Promise<void>;
  fetchLetterComments: (letterId: string) => Promise<void>;
  addLetterComment: (letterId: string, text: string, parentId?: string) => Promise<void>;
  editLetterComment: (commentId: string, text: string) => Promise<void>;
  deleteLetterComment: (commentId: string) => Promise<void>;
  reactToLetterComment: (commentId: string, emoji: string) => Promise<void>;
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
  letterComments: {},
  messages: [],
  activity: [],
  onlineUsers: [],
  typingUser: null,
  loading: false,
  lovenote: null,

  fetchPartner: async () => {
    const { data } = await api.get('/auth/partner');
    set({ partner: data });
  },

  fetchLoveNote: async () => {
    try {
      const { data } = await api.get('/lovenote');
      set({ lovenote: data });
    } catch (err) {
      console.error('Failed to fetch LoveNote:', err);
    }
  },

  updateLoveNote: async (formData) => {
    set({ loading: true });
    try {
      const { data } = await api.put('/lovenote', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set({ lovenote: data });
      toast.success('Love Note updated successfully! ❤️');
    } catch (err: any) {
      console.error('Failed to update LoveNote:', err);
      toast.error('Failed to update Love Note');
      throw err;
    } finally {
      set({ loading: false });
    }
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

  uploadToCategory: async (categoryId, formData) => {
    set({ loading: true });
    try {
      formData.append('categoryId', categoryId);
      await api.post('/memories/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Refresh categories to get updated counts
      await get().fetchCategories();
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

  reactToMemory: async (id, emoji) => {
    try {
      const { data } = await api.post(`/memories/${id}/react`, { emoji });
      set((s) => ({
        memories: s.memories.map((m) => m._id === id ? { ...m, reactions: data } : m),
      }));
    } catch (err: any) {
      console.error("Failed to react to memory. Make sure backend is deployed!", err);
      alert("Reaction failed! Your backend is returning a 404 error because the new '/react' endpoint hasn't been deployed to Render yet. Please push your code to GitHub to deploy it!");
    }
  },

  editMemory: async (id, data) => {
    const res = await api.patch(`/memories/${id}`, data);
    set((s) => ({
      memories: s.memories.map((m) => m._id === id ? res.data : m),
    }));
  },

  createCategory: async (data) => {
    await api.post('/categories', data);
    // Socket will broadcast and update
  },

  editCategory: async (id, data) => {
    try {
      const { data: res } = await api.patch(`/categories/${id}`, data);
      set((s) => ({ categories: s.categories.map((c) => c._id === id ? res : c) }));
    } catch { throw new Error('Failed to update category'); }
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
      toast.success('Milestone created successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create milestone');
    } finally {
      set({ loading: false });
    }
  },

  editMilestone: async (id, formData) => {
    set({ loading: true });
    try {
      const { data } = await api.patch(`/timeline/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      set(s => ({ milestones: s.milestones.map(m => m._id === id ? data : m) }));
      toast.success('Milestone updated successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update milestone');
    } finally {
      set({ loading: false });
    }
  },

  deleteMilestone: async (id) => {
    try {
      await api.delete(`/timeline/${id}`);
      set(s => ({ milestones: s.milestones.filter(m => m._id !== id) }));
      toast.success('Milestone deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete milestone');
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
    set({ loading: true });
    try {
      const { data } = await api.post('/letters', letterData);
      set(s => ({ letters: [data, ...s.letters] }));
      toast.success('Letter saved!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save letter');
    } finally {
      set({ loading: false });
    }
  },

  updateLetter: async (id, letterData) => {
    set({ loading: true });
    try {
      const { data } = await api.patch(`/letters/${id}`, letterData);
      set(s => ({ letters: s.letters.map(l => l._id === id ? data : l) }));
      toast.success('Letter updated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update letter');
    } finally {
      set({ loading: false });
    }
  },

  deleteLetter: async (id) => {
    try {
      await api.delete(`/letters/${id}`);
      set(s => ({ letters: s.letters.filter(l => l._id !== id) }));
      toast.success('Letter deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete letter');
    }
  },

  reactToLetter: async (id, emoji) => {
    try {
      const { data } = await api.post(`/letters/${id}/react`, { emoji });
      set(s => ({ letters: s.letters.map(l => l._id === id ? data : l) }));
    } catch (err) {
      console.error(err);
      toast.error("Reaction failed! Your backend is returning a 404 error because the new '/react' endpoint hasn't been deployed to Render yet. Please push your code to GitHub to deploy it!");
    }
  },

  fetchLetterComments: async (letterId) => {
    try {
      const { data } = await api.get(`/letters/${letterId}/comments`);
      set(s => ({ letterComments: { ...s.letterComments, [letterId]: data } }));
    } catch (err) {
      console.error(err);
    }
  },

  addLetterComment: async (letterId, text, parentId) => {
    try {
      if (parentId) {
        await api.post(`/letters/comments/${parentId}/reply`, { text });
      } else {
        await api.post(`/letters/${letterId}/comments`, { text });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to post comment');
    }
  },

  editLetterComment: async (commentId, text) => {
    try {
      await api.patch(`/letters/comments/${commentId}`, { text });
    } catch (err) {
      console.error(err);
      toast.error('Failed to edit comment');
    }
  },

  deleteLetterComment: async (commentId) => {
    try {
      await api.delete(`/letters/comments/${commentId}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete comment');
    }
  },

  reactToLetterComment: async (commentId, emoji) => {
    try {
      await api.post(`/letters/comments/${commentId}/react`, { emoji });
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
    socket.on('lovenote:updated', (note: any) => {
      set({ lovenote: note });
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
    socket.on('memory:reacted', ({ memoryId, reactions }: { memoryId: string; reactions: any }) => {
      set((s) => ({ memories: s.memories.map((m) => m._id === memoryId ? { ...m, reactions } : m) }));
    });
    socket.on('category:new', (cat: Category) => {
      set((s) => {
        if (s.categories.some(c => c._id === cat._id)) return s;
        return { categories: [...s.categories, cat] };
      });
    });
    socket.on('category:updated', (cat: Category) => {
      set((s) => ({ categories: s.categories.map((c) => c._id === cat._id ? cat : c) }));
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

    socket.on('letter_commented', (comment: LetterComment) => {
      const { partner } = get();
      if (comment.author._id === partner?._id) {
        toast(`${partner?.name} commented on a letter 💌`, { icon: '💬' });
      }
      set((s) => {
        const existing = s.letterComments[comment.letterId] || [];
        if (existing.some(c => c._id === comment._id)) return s;
        return {
          letterComments: { ...s.letterComments, [comment.letterId]: [...existing, comment] },
          letters: s.letters.map(l => l._id === comment.letterId ? { ...l, commentCount: (l.commentCount || 0) + 1 } : l)
        };
      });
    });

    socket.on('letter_replied', (reply: LetterComment) => {
      const { partner } = get();
      if (reply.author._id === partner?._id) {
        toast(`${partner?.name} replied to a comment 💌`, { icon: '↩' });
      }
      set((s) => {
        const existing = s.letterComments[reply.letterId] || [];
        if (existing.some(c => c._id === reply._id)) return s;
        return {
          letterComments: { ...s.letterComments, [reply.letterId]: [...existing, reply] },
          letters: s.letters.map(l => l._id === reply.letterId ? { ...l, replyCount: (l.replyCount || 0) + 1 } : l)
        };
      });
    });

    socket.on('comment_updated', (comment: LetterComment) => {
      set((s) => {
        const existing = s.letterComments[comment.letterId] || [];
        return {
          letterComments: {
            ...s.letterComments,
            [comment.letterId]: existing.map(c => c._id === comment._id ? comment : c)
          }
        };
      });
    });

    socket.on('comment_deleted', ({ commentId, letterId }: { commentId: string, letterId: string }) => {
      set((s) => {
        const existing = s.letterComments[letterId] || [];
        // We might also need to delete child replies locally or refetch
        // For simplicity, refetching comments for that letter is safer
        get().fetchLetterComments(letterId);
        get().fetchLetters(); // Update counts
        return s;
      });
    });

    socket.on('comment_reacted', ({ commentId, reactions, letterId }: { commentId: string, reactions: any, letterId: string }) => {
      set((s) => {
        const existing = s.letterComments[letterId] || [];
        return {
          letterComments: {
            ...s.letterComments,
            [letterId]: existing.map(c => c._id === commentId ? { ...c, reactions } : c)
          }
        };
      });
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
