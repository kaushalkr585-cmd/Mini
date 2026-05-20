import { create } from 'zustand';
import api from '@/lib/api';

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
  duration_ms: number;
  preview_url: string | null;
  uri: string;
}

interface MusicStore {
  currentTrack: SpotifyTrack | null;
  queue: SpotifyTrack[];
  contextQueue: SpotifyTrack[];
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  token: string | null;
  isTokenLoading: boolean;
  player: any | null;
  
  fetchToken: () => Promise<void>;
  playTrack: (track: SpotifyTrack, contextList?: SpotifyTrack[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setVolume: (v: number) => void;
  updateProgress: (p: number, d: number) => void;
  setQueue: (tracks: SpotifyTrack[]) => void;
  addToQueue: (track: SpotifyTrack) => void;
  removeFromQueue: (index: number) => void;
  setPlayer: (player: any) => void;
  seek: (position_ms: number) => void;
}

// We'll use a global audio element to play 30s previews for simplicity if Premium SDK isn't fully working,
// but since the user has Premium, we can attempt to play using the Web Playback SDK or just control the state here.
// For now, this store manages the state. The actual audio playback will be hooked up in `<MusicPlayer />`

export const useMusicStore = create<MusicStore>((set, get) => ({
  currentTrack: null,
  queue: [],
  contextQueue: [],
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 0.8,
  token: null,
  isTokenLoading: false,
  player: null,

  fetchToken: async () => {
    set({ isTokenLoading: true });
    try {
      const { data } = await api.get('/spotify/token');
      set({ token: data.accessToken, isTokenLoading: false });
    } catch {
      set({ isTokenLoading: false });
    }
  },

  playTrack: (track, contextList) => {
    const { currentTrack, togglePlay } = get();
    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }
    
    // Set contextQueue to contextList so we can auto-play next without destroying manual queue
    const newContextQueue = contextList && contextList.length > 0 ? [...contextList] : [];
    
    set({ currentTrack: track, contextQueue: newContextQueue, isPlaying: true, progress: 0 });
  },

  togglePlay: () => set((state) => {
    if (!state.currentTrack) return state;
    return { isPlaying: !state.isPlaying };
  }),

  nextTrack: () => set((state) => {
    // If there are manually queued items, pop the first one and play it
    if (state.queue.length > 0) {
      const nextTrack = state.queue[0];
      const newQueue = state.queue.slice(1);
      return { currentTrack: nextTrack, queue: newQueue, isPlaying: true, progress: 0 };
    }
    
    // Otherwise, play next from contextQueue
    if (!state.currentTrack || state.contextQueue.length === 0) return state;
    const idx = state.contextQueue.findIndex(t => t.id === state.currentTrack?.id);
    const nextIdx = (idx + 1) % state.contextQueue.length;
    return { currentTrack: state.contextQueue[nextIdx], isPlaying: true, progress: 0 };
  }),

  prevTrack: () => set((state) => {
    if (!state.currentTrack || state.contextQueue.length === 0) return state;
    const idx = state.contextQueue.findIndex(t => t.id === state.currentTrack?.id);
    const prevIdx = (idx - 1 + state.contextQueue.length) % state.contextQueue.length;
    return { currentTrack: state.contextQueue[prevIdx], isPlaying: true, progress: 0 };
  }),

  setVolume: (v) => set({ volume: v }),
  
  updateProgress: (p, d) => set({ progress: p, duration: d }),
  
  setQueue: (tracks) => set({ queue: tracks }),

  addToQueue: (track) => set(state => {
    // Don't add duplicates
    if (state.queue.find(t => t.id === track.id)) return state;
    return { queue: [...state.queue, track] };
  }),

  removeFromQueue: (index) => set(state => {
    const newQueue = [...state.queue];
    newQueue.splice(index, 1);
    return { queue: newQueue };
  }),

  setPlayer: (player) => set({ player }),

  seek: (position_ms) => {
    const { player } = get();
    if (player) {
      player.seek(position_ms);
      set({ progress: position_ms });
    }
  }
}));
