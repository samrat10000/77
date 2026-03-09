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
  {
    id: "PtBwtlGBXV8",
    title: "Backstreet Girl",
    artist: "d4vd",
    albumArt: "/thumbs/PtBwtlGBXV8.webp",
    url: "/songs/PtBwtlGBXV8.m4a",
    duration: 249,
    quote: "Just a backstreet girl in a lonely world.",
  },
  {
    id: "yCgNZ__Eho4",
    title: "Nazrein",
    artist: "Gravero & faizal",
    albumArt: "/thumbs/yCgNZ__Eho4.webp",
    url: "/songs/yCgNZ__Eho4.m4a",
    duration: 142,
    quote: "Nazrein milti hain toh dil dhadakta hai.",
  },
  {
    id: "xx-Xqmmzlk4",
    title: "The Pool",
    artist: "Stephen Sanchez",
    albumArt: "/thumbs/xx-Xqmmzlk4.webp",
    url: "/songs/xx-Xqmmzlk4.m4a",
    duration: 291,
    quote: "I'm jumping in the pool of your love.",
  },
  {
    id: "cVeYZe3pkVo",
    title: "Panah",
    artist: "SaiKat | Debjyoti",
    albumArt: "/thumbs/cVeYZe3pkVo.webp",
    url: "/songs/cVeYZe3pkVo.m4a",
    duration: 199,
    quote: "Tum hi ho meri panah.",
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
