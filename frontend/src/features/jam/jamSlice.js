import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  sessionId: null,
  isHost: false,
  participants: [],
  isJoined: false,
  error: null,
};

const jamSlice = createSlice({
  name: "jam",
  initialState,
  reducers: {
    setSessionId: (state, action) => {
      state.sessionId = action.payload;
      state.isJoined = true;
      state.error = null;
    },
    setIsHost: (state, action) => {
      state.isHost = action.payload;
    },
    setParticipants: (state, action) => {
      state.participants = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    leaveSession: (state) => {
      state.sessionId = null;
      state.isHost = false;
      state.participants = [];
      state.isJoined = false;
      state.error = null;
    },
  },
});

export const {
  setSessionId,
  setIsHost,
  setParticipants,
  setError,
  leaveSession,
} = jamSlice.actions;
export default jamSlice.reducer;
