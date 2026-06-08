import axiosServices from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch, dispatch } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { ensureMinLatency, retryUntilSuccess } from 'src/utils/retry';

const API_URL = '/api/Dashboard/';
const API_TrackingAnalytic_URL = '/api/TrackingAnalytics/';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type DashboardCountType = {
  activeBeaconCount: number;
  nonActiveBeaconCount: number;
  activeGatewayCount: number;
  areaCount: number;
  blacklistCount: number;
  alarmCount: number;
};

export type DashboardAreaChartFilter = {
  from?: string | null;
  to?: string | null;
  TimeRange: string;
  operatorName: string | null;
  visitorId: string | null;
  buildingId: string | null;
  floorId: string | null;
  floorplanMaskedAreaId: string | null;
};

export type DashboardAreaChartType = {
  areaId: string;
  areaName: string;
  totalRecords: number;
};

export type DashboardAreaAccessFilter = {
  from: string | null;
  to: string | null;
  TimeRange: string;
  operatorName: string | null;
  visitorId: string | null;
  buildingId: string | null;
  floorId: string | null;
  floorplanMaskedAreaId: string | null;
};

export type DashboardAreaAccessType = {
  accessedAreaTotal: number;
  withPermission: number;
  withoutPermission: number;
};

export type CountCardType = {
  totalCardCount: number;
  visitorCardCount: number;
  memberCardCount: number;
  totalCardUse: number;
};

export interface DashboardState {
  topCards: {
    data: DashboardCountType | null;
    isLoading: boolean;
    hasLoaded: boolean;
    error: string | null;
  };
  areaChart: {
    data: DashboardAreaChartType[] | null;
    isLoading: boolean;
    hasLoaded: boolean;
    error: string | null;
  };
  trackingGraph: {
    data: DashboardAreaAccessType | null;
    isLoading: boolean;
    hasLoaded: boolean;
    error: string | null;
  };
  CardCount: {
    data: CountCardType | null;
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
  areaChart: {
    data: null,
    isLoading: false,
    hasLoaded: false,
    error: null,
  },
  trackingGraph: {
    data: null,
    isLoading: false,
    hasLoaded: false,
    error: null,
  },
  CardCount: {
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
      })
      .addCase(fetchAreaChart.pending, (state) => {
        state.areaChart.isLoading = true;
        state.areaChart.error = null;
      })
      .addCase(fetchAreaChart.fulfilled, (state, action) => {
        state.areaChart.isLoading = false;
        state.areaChart.hasLoaded = true;
        state.areaChart.data = action.payload;
      })
      .addCase(fetchAreaChart.rejected, (state, action) => {
        state.areaChart.isLoading = false;
        state.areaChart.error = action.error.message || 'Failed to fetch area chart';
      })
      .addCase(fetchTrackingGraph.pending, (state) => {
        state.trackingGraph.isLoading = true;
        state.trackingGraph.error = null;
      })
      .addCase(fetchTrackingGraph.fulfilled, (state, action) => {
        state.trackingGraph.isLoading = false;
        state.trackingGraph.hasLoaded = true;
        state.trackingGraph.data = action.payload;
      })
      .addCase(fetchTrackingGraph.rejected, (state, action) => {
        state.trackingGraph.isLoading = false;
        state.trackingGraph.error = action.error.message || 'Failed to fetch tracking graph';
      })
      .addCase(fetchCardCount.pending, (state) => {
        state.CardCount.isLoading = true;
        state.CardCount.error = null;
      })
      .addCase(fetchCardCount.fulfilled, (state, action) => {
        state.CardCount.isLoading = false;
        state.CardCount.hasLoaded = true;
        console.log('Card Count:', action.payload.data);
        state.CardCount.data = action.payload.data;
      })
      .addCase(fetchCardCount.rejected, (state, action) => {
        state.CardCount.isLoading = false;
        state.CardCount.error = action.error.message || 'Failed to fetch card count';
      })
  },
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

export const fetchAreaChart = createAsyncThunk(
  'dashboard/fetchAreaChart',
  async (filter: DashboardAreaChartFilter, thunkAPI) => {
    const started = Date.now();
    const res = await retryUntilSuccess(() => axiosServices.post(`${API_TrackingAnalytic_URL}area`, filter), {
      signal: thunkAPI.signal,
      timeoutMs: 2 * 60 * 1000,
      minDelay: 500,
      maxDelay: 8000,
    });
    console.log('Dashboard Area Chart Data:', res.data.data);
    await ensureMinLatency(started, 500);
    return res.data.data;
  },
);

export const fetchTrackingGraph = createAsyncThunk(
  'dashboard/fetchTrackingGraph',
  async (filter: DashboardAreaAccessFilter, thunkAPI) => {
    const started = Date.now();
    const res = await retryUntilSuccess(
      () => axiosServices.post(`${API_TrackingAnalytic_URL}area-accessed`, filter),
      {
        signal: thunkAPI.signal,
        timeoutMs: 2 * 60 * 1000,
        minDelay: 500,
        maxDelay: 8000,
      },
    );
    console.log('Dashboard Tracking Graph Data:', res.data);
    await ensureMinLatency(started, 500);
    return res.data;
  },
);

export const fetchCardCount = createAsyncThunk('dashboard/fetchCardCount', async (_, thunkAPI) => {
  const started = Date.now();
  const res = await retryUntilSuccess(() => axiosServices.get(`${API_URL}count-card`), {
    signal: thunkAPI.signal,
    timeoutMs: 2 * 60 * 1000,
    minDelay: 500,
    maxDelay: 8000,
  });
  console.log('Dashboard Card Count Data:', res.data);
  await ensureMinLatency(started, 500);
  return res.data;
});

export default DashboardSlice.reducer;
