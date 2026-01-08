import axiosServices from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { dispatch } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { ensureMinLatency, retryUntilSuccess } from 'src/utils/retry';
import { VisitorType } from './visitor';

const API_URL = '/api/TrackingAnalytics/visitor-session/';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface EventTypesFilter {
  all: boolean;
  accessTracking: boolean;
  alarm: boolean;
  alarmSubTypes: Record<string, boolean>;
}

export type GetFilter = {
  timeRange: string;
  buildingId: string | null;
  floorId: string | null;
  floorplanId: string | null;
  areaId: string | null;
  visitorId?: string | null;
  memberId?: string | null;
  personType?: 'member' | 'visitor' | 'all' | null;
  // eventTypes: EventTypesFilter;
};

export type GetVisitorSession = {
  RecordsTotal: number;
  RecordsFiltered: number;
  Draw: number;
  status: string;
  status_code: number;
  title: string;
  msg: string;
  collection: {
    data: VisitorSessionType[];
    draw: number;
    recordsTotal: number;
    recordsFiltered: number;
  };
};

export type VisitorSessionType = {
  visitorId: string | null;
  visitorName: string | null;
  cardId: string | null;
  cardName: string | null;
  buildingId: string | null;
  buildingName: string | null;
  floorId: string | null;
  floorName: string | null;
  floorplanId: string | null;
  floorplanName: string | null;
  floorplanImage: string | null;
  areaId: string | null;
  areaName: string | null;
  personType: string;
  enterTime: string | null;
  exitTime: string | null;
  durationInMinutes: number | null;
  status: string | null;
  hostName: string | null;
};

interface StateType {
  visitorSessions: VisitorSessionType[];
  visitorSessionAll: VisitorSessionType[];
  selectedVisitor: VisitorType;
  visitorSessionSearch: string;
  selectedVisitorSession?: VisitorSessionType | null;
  visitorSessionTotalCount: number;
  visitorSessionFilteredCount: number;
  visitorSessionFilter: GetFilter;
  lastFilter?: GetFilter;
  isLoading: boolean;
  hasLoaded: boolean;
}

const initialState: StateType = {
  visitorSessions: [],
  visitorSessionAll: [],
  selectedVisitor: {} as VisitorType,
  visitorSessionSearch: '',
  selectedVisitorSession: null,
  visitorSessionTotalCount: 0,
  visitorSessionFilteredCount: 0,
  visitorSessionFilter: {
    timeRange: 'daily',
    buildingId: null,
    floorId: null,
    floorplanId: null,
    areaId: null,
    visitorId: '',
    memberId: '',
    personType: null,
    // eventTypes: {
    //   all: true,
    //   accessTracking: true,
    //   alarm: true,
    //   alarmSubTypes: {},
    // },
  },
  isLoading: false,
  hasLoaded: false,
};

export const VisitorSessionSlice = createSlice({
  name: 'visitorSessions',
  initialState,
  reducers: {
    GetVisitorSessions: (state, action: PayloadAction<VisitorSessionType[]>) => {
      state.visitorSessions = action.payload;
    },
    GetAllVisitorSession: (state, action: PayloadAction<VisitorSessionType[]>) => {
      state.visitorSessionAll = action.payload;
    },
    SearchVisitorSession: (state, action: PayloadAction<string>) => {
      state.visitorSessionSearch = action.payload;
    },
    SetSelectedVisitorSession: (state, action: PayloadAction<VisitorSessionType | null>) => {
      state.selectedVisitorSession = action.payload;
    },
    SetSelectedVisitor: (state, action: PayloadAction<VisitorType>) => {
      state.selectedVisitor = action.payload;
    },
    UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
      state.visitorSessionFilter = { ...state.visitorSessionFilter, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVisitorSession.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchVisitorSession.fulfilled, (state) => {
        state.isLoading = false;
        state.hasLoaded = true;
      })
      .addCase(fetchVisitorSession.rejected, (state) => {
        state.isLoading = false;
        state.hasLoaded = false;
      });
  },
});

export const {
  GetVisitorSessions,
  GetAllVisitorSession,
  SearchVisitorSession,
  SetSelectedVisitorSession,
  SetSelectedVisitor,
  UpdateFilter,
} = VisitorSessionSlice.actions;

export const fetchVisitorSession = createAsyncThunk(
  'visitorSessions/fetchVisitorSession',
  async (filter: GetFilter, thunkAPI) => {
    const started = Date.now();
    console.log('filter: ', filter);
    const res = await retryUntilSuccess(() => axiosServices.post(API_URL, filter), {
      signal: thunkAPI.signal,
      timeoutMs: 2 * 60 * 1000,
      minDelay: 500,
      maxDelay: 8000,
    });
    console.log('res: ', res.data);
    dispatch(GetVisitorSessions(res.data.data || []));
    await ensureMinLatency(started, 500);
    return res.data;
  },
);

export default VisitorSessionSlice.reducer;
