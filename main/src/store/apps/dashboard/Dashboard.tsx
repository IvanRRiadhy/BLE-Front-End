import axiosServices from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch, dispatch } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { ensureMinLatency, retryUntilSuccess } from 'src/utils/retry';

const API_URL = '/api/Dashboard/';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type DashboardCountType = {
  activeBeaconCount: number;
  nonActiveBeaconCount: number;
  activeGatewayCount: number;
  areaCount: number;
  blacklistCount: number;
  alarmCount: number;
};

export interface DashboardState {
  topCards: {
    data: DashboardCountType | null;
    isLoading: boolean;
    hasLoaded: boolean;
    error: string | null;
  };
}

const initialState: DashboardState = {
  topCards: {
    data: null,
    isLoading: false,
    hasLoaded: false,
    error: null,
  },
};

export const DashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    GetDashboardTopCards(state, action: PayloadAction<DashboardCountType>) {
      state.topCards.data = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
    .addCase(fetchDashboardTopCards.pending, (state) => {
      state.topCards.isLoading = true;
      state.topCards.error = null;
    })
    .addCase(fetchDashboardTopCards.fulfilled, (state, action) => {
      state.topCards.isLoading = false;
      state.topCards.hasLoaded = true;
      state.topCards.data = action.payload;
    })
    .addCase(fetchDashboardTopCards.rejected, (state, action) => {
      state.topCards.isLoading = false;
      state.topCards.error = action.error.message || 'Failed to fetch dashboard top cards';
    });
  }
});

export const { GetDashboardTopCards } = DashboardSlice.actions;

export const fetchDashboardTopCards = createAsyncThunk(
  'dashboard/fetchDashboardTopCards',
  async (_, thunkAPI) => {
    const started = Date.now();
    const res = await retryUntilSuccess(() => axiosServices.get(`${API_URL}count-summary`), {
      signal: thunkAPI.signal,
      timeoutMs: 2 * 60 * 1000,
      minDelay: 500,
      maxDelay: 8000,
    });
    console.log('Dashboard Top Cards Data:', res.data);
    await ensureMinLatency(started, 500);
    return res.data;
  },
);


export default DashboardSlice.reducer;