import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface JamState {
  sessionId: string | null;
  isHost: boolean;
  participants: string[];
  isJoined: boolean;
  error: string | null;
}

const initialState: JamState = {
  sessionId: null,
  isHost: false,
  participants: [],
  isJoined: false,
  error: null,
};

const jamSlice = createSlice({
  name: 'jam',
  initialState,
  reducers: {
    setSessionId: (state, action: PayloadAction<string>) => {
      state.sessionId = action.payload;
      state.isJoined = true;
      state.error = null;
    },
    setIsHost: (state, action: PayloadAction<boolean>) => {
      state.isHost = action.payload;
    },
    setParticipants: (state, action: PayloadAction<string[]>) => {
      state.participants = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
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

export const { setSessionId, setIsHost, setParticipants, setError, leaveSession } = jamSlice.actions;
export default jamSlice.reducer;
