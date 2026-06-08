import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface SessionState {
  tokenAvailable: boolean;
  session: string | null;
  activeFeatures: string[];
}

const initialState: SessionState = {
  tokenAvailable: false,
  session: null,
  activeFeatures: [],
};

export const SessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setTokenAvailable: (state, action: PayloadAction<boolean>) => {
      state.tokenAvailable = action.payload;
    },
    setSession: (state, action: PayloadAction<string | null>) => {
      state.session = action.payload;
    },
    setActiveFeatures: (state, action: PayloadAction<string[]>) => {
      state.activeFeatures = action.payload;
    },
  },
});

export const { setTokenAvailable, setSession, setActiveFeatures } = SessionSlice.actions;

export default SessionSlice.reducer;