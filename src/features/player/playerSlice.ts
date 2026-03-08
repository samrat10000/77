import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { Track } from '@/types';

interface PlayerState {
  isPlaying: boolean;
  currentTrack: Track | null;
  volume: number;
  progress: number;
  duration: number;
  isShuffle: boolean;
  isRepeat: boolean;
}

const initialState: PlayerState = {
  isPlaying: false,
  currentTrack: null,
  volume: 1,
  progress: 0,
  duration: 0,
  isShuffle: false,
  isRepeat: false,
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    play: (state) => {
      state.isPlaying = true;
    },
    pause: (state) => {
      state.isPlaying = false;
    },
    togglePlay: (state) => {
      state.isPlaying = !state.isPlaying;
    },
    setCurrentTrack: (state, action: PayloadAction<Track>) => {
      state.currentTrack = action.payload;
    },
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = action.payload;
    },
    setProgress: (state, action: PayloadAction<number>) => {
      state.progress = action.payload;
    },
    setDuration: (state, action: PayloadAction<number>) => {
      state.duration = action.payload;
    },
    toggleShuffle: (state) => {
      state.isShuffle = !state.isShuffle;
    },
    toggleRepeat: (state) => {
      state.isRepeat = !state.isRepeat;
    },
    syncState: (state, action: PayloadAction<Partial<PlayerState>>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const {
  play,
  pause,
  togglePlay,
  setCurrentTrack,
  setVolume,
  setProgress,
  setDuration,
  toggleShuffle,
  toggleRepeat,
  syncState,
} = playerSlice.actions;

export default playerSlice.reducer;
