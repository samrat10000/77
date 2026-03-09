import { configureStore } from "@reduxjs/toolkit";
import playerReducer from "@/features/player/playerSlice";
import playlistReducer from "@/features/playlist/playlistSlice";
import jamReducer from "@/features/jam/jamSlice";
import mediaReducer from "@/features/media/mediaSlice";

export const store = configureStore({
  reducer: {
    player: playerReducer,
    playlist: playlistReducer,
    jam: jamReducer,
    media: mediaReducer,
  },
});
