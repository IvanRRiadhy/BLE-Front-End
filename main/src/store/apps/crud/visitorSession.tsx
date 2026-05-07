import axiosServices from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { dispatch } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { ensureMinLatency, retryUntilSuccess } from 'src/utils/retry';
import { VisitorType } from './visitor';
import { memberType } from './member';

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
  buildingId?: string | null;
  floorId?: string | null;
  floorplanId?: string | null;
  areaId?: string | null;
  visitorId?: string | null;
  memberId?: string | null;
  // buildingId?: string;
  // floorId?: string;
  // floorplanId?: string;
  // areaId?: string;
  // visitorId?: string;
  // memberId?: string;
  personType?: 'member' | 'visitor' | 'security' | 'all' | null;
  identityId?: string | null;
  // eventTypes: EventTypesFilter;
};

export type OldGetFilter = {
    timeRange: string;
    buildingId: string[];
    floorId: string[];
    floorplanId: string[];
    areaId: string[];
    visitorId: string[];
    memberId: string[];
    from?: string ;
    to?: string ;
}

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
  personId: string | null;
  personName: string | null;
  memberId: string | null;
  memberName: string | null;
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

export type NewSessionType = {
  areaId: string | null;
  areaName: string | null;
  buildingId: string | null;
  buildingName: string | null;
  durationFormatted: string | null;
  durationMinutes: number | null;
  enterTime: string | null;
  exitTime: string | null;
  floorId: string | null;
  floorName: string | null;
  floorplanId: string | null;
  floorplanName: string | null;
  floorplanImage: string | null;
  hasIncident: boolean;
  incident: string | null;
  sessionStatus: string | null;
};

export type VisitorSessionPersonType = {
  personId: string;
  personName: string;
  personType: string;

  identityId: string | null;

  cardId: string | null;
  cardNumber: string | null;

  memberId: string | null;
  memberName: string | null;

  visitorId: string | null;
  visitorName: string | null;

  currentArea: string | null;
  firstAreaEntered: string | null;
  lastAreaExited: string | null;

  areasVisited: string[];
  restrictedAreasVisited: number;

  totalSessions: number;
  totalDurationMinutes: number;
  totalDurationFormatted: string | null;
  totalIncidents: number;

  sessions: NewSessionType[];
};


export type VisitorSessionSumaryType = {
  totalDurationMinutes: number;
  firstDetection: string;
  lastDetection: string;
  areasVisited: string[];
  totalDetections: number;
  totalSessions: number;
  uniqueVisitors: number;
  uniqueMembers: number;
}

export type VisualPathPointType = {
  x: number;
  y: number;
  time: string;
  area: string;
  personName: string;
  personId: string;
};

export type VisualPathFloorplanType = {
  floorplanId: string;
  floorplanName: string;
  floorplanImage: string;
  points: VisualPathPointType[];
};

export type VisualPathsType = {
  floorplans: Record<string, VisualPathFloorplanType>;
};

export type VisitorSessionResponseType = {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;

  persons: VisitorSessionPersonType[];

  summary: VisitorSessionSumaryType | null;

  visualPaths: VisualPathsType;
};

interface StateType {
  visitorSessions: VisitorSessionType[];
  visitorSessionAll: VisitorSessionType[];
  newVisitorSessions: NewSessionType[];
  newVisitorSessionsAll: NewSessionType[];
  selectedVisitor: VisitorType;
  selectedMember: memberType;
  selectedSecurity: memberType;
  visitorSessionSearch: string;
  selectedVisitorSession?: VisitorSessionType | null;
  visitorSessionTotalCount: number;
  visitorSessionFilteredCount: number;
  visitorSessionFilter: GetFilter;
  newVisitorSessionFilter: GetFilter;
  lastFilter?: GetFilter;
  isLoading: boolean;
  hasLoaded: boolean;
}

const initialState: StateType = {
  visitorSessions: [],
  visitorSessionAll: [],
  newVisitorSessions: [],
  newVisitorSessionsAll: [],
  selectedVisitor: {} as VisitorType,
  selectedMember: {} as memberType,
  selectedSecurity: {} as memberType,
  visitorSessionSearch: '',
  selectedVisitorSession: null,
  visitorSessionTotalCount: 0,
  visitorSessionFilteredCount: 0,
  visitorSessionFilter: {
    timeRange: 'daily',
    // buildingId: [],
    // floorId: [],
    // floorplanId: [],
    // areaId: [],
    visitorId: "",
    // memberId: [],
    personType: null,
    // eventTypes: {
    //   all: true,
    //   accessTracking: true,
    //   alarm: true,
    //   alarmSubTypes: {},
    // },
  },
  newVisitorSessionFilter: {
    timeRange: 'daily',
    // buildingId: [],
    // floorId: [],
    // floorplanId: [],
    // areaId: [],
    // visitorId: "",
    // memberId: [],
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
        SetSelectedMember: (state, action: PayloadAction<memberType>) => {
      state.selectedMember = action.payload;
    },
    SetSelectedSecurity: (state, action: PayloadAction<memberType>) => {
      state.selectedSecurity = action.payload;
    },
    UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
      state.visitorSessionFilter = { ...state.visitorSessionFilter, ...action.payload };
    },
    NewUpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
      state.newVisitorSessionFilter = { ...state.newVisitorSessionFilter, ...action.payload };
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
  SetSelectedMember,
  SetSelectedSecurity,
  UpdateFilter,
  NewUpdateFilter,
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
