import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  url: null, // string | null
  type: null, // 'youtube' | 'video' | 'audio' | null
  mediaState: "paused", // 'playing' | 'paused'
  mediaTime: 0,
};

const mediaSlice = createSlice({
  name: "media",
  initialState,
  reducers: {
    setMedia: (state, action) => {
      state.url = action.payload.url;
      state.type = action.payload.type;
      state.mediaState = "paused";
      state.mediaTime = 0;
    },
    setMediaState: (state, action) => {
      state.mediaState = action.payload;
    },
    setMediaTime: (state, action) => {
      state.mediaTime = action.payload;
    },
    clearMedia: (state) => {
      state.url = null;
      state.type = null;
      state.mediaState = "paused";
      state.mediaTime = 0;
    },
  },
});

export const { setMedia, setMediaState, setMediaTime, clearMedia } =
  mediaSlice.actions;
export default mediaSlice.reducer;
