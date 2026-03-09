import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isPlaying: false,
  currentTrack: null,
  volume: 1,
  progress: 0,
  duration: 0,
  isShuffle: false,
  isRepeat: false,
};

const playerSlice = createSlice({
  name: "player",
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
    setCurrentTrack: (state, action) => {
      state.currentTrack = action.payload;
    },
    setVolume: (state, action) => {
      state.volume = action.payload;
    },
    setProgress: (state, action) => {
      state.progress = action.payload;
    },
    setDuration: (state, action) => {
      state.duration = action.payload;
    },
    toggleShuffle: (state) => {
      state.isShuffle = !state.isShuffle;
    },
    toggleRepeat: (state) => {
      state.isRepeat = !state.isRepeat;
    },
    syncState: (state, action) => {
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
