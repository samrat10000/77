import { createSlice } from "@reduxjs/toolkit";

const defaultTracks = [
  {
    id: "local-song-1",
    title: "Oh Celeste",
    artist: "d4vd",
    albumArt: "https://i.ytimg.com/vi/6skasx2gYwM/maxresdefault.jpg",
    url: "/song.m4a",
    duration: 300,
    quote: "Oh Celeste, you've got me spinning like a carousel.",
  },
  {
    id: "local-song-2",
    title: "Be More",
    artist: "Stephen Sanchez",
    albumArt: "https://i.ytimg.com/vi/R95ILhksGt8/maxresdefault.jpg",
    url: "/song2.m4a",
    duration: 300,
    quote: "I just wanna be more, be more for you.",
  },
];

const initialState = {
  tracks: defaultTracks,
  currentIndex: 0,
};

const playlistSlice = createSlice({
  name: "playlist",
  initialState,
  reducers: {
    nextTrack: (state) => {
      if (state.tracks.length > 0) {
        state.currentIndex = (state.currentIndex + 1) % state.tracks.length;
      }
    },
    previousTrack: (state) => {
      if (state.tracks.length > 0) {
        state.currentIndex =
          state.currentIndex === 0
            ? state.tracks.length - 1
            : state.currentIndex - 1;
      }
    },
    setCurrentIndex: (state, action) => {
      state.currentIndex = action.payload;
    },
  },
});

export const { nextTrack, previousTrack, setCurrentIndex } =
  playlistSlice.actions;
export default playlistSlice.reducer;
