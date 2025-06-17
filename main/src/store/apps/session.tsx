import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';

interface SessionState {
  tokenAvailable: boolean;
  session: string | null;
}

const initialState: SessionState = {
  tokenAvailable: false,
  session: null,
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
  },
});

export const { setTokenAvailable, setSession } = SessionSlice.actions;

export default SessionSlice.reducer;