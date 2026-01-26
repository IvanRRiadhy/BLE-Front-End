import axiosServices, { BASE_URL } from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch, dispatch } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { defaultPatrolRouteFilter } from '../defaultForm';
import { memberType } from './member';

const API_URL = '/api/patrol-route/';
const API_URL_FILTER = '/api/patrol-route/filter/';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type GetFilter = {
  Draw: number;
  Start: number;
  Length: number;
  SortColumn: string;
  SortDir: 'asc' | 'desc';
  SearchValue: string;
  filters?: {
    PatrolAreaId?: string[];
  };
};

export type PatrolAreas = {
    patrolAreaId: string;
    orderIndex: number;
    estimatedDistance: number;
    estimatedTime: number;
    startAreaId: string;
    endAreaId: string;
}
export type PatrolTimeGroups = {
    timeGroupId: string;
    name: string;
    scheduleType: string;
};

export type PatrolRouteType = {
  id: string;
  name: string;
  description: string;
  patrolAreaIds: string[];
  timeGroupIds: string[];
  startAreaName?: string;
  endAreaName?: string;
  patrolAreas?: PatrolAreas[];
  patrolTimeGroups?: PatrolTimeGroups[];
};

export type SecurityType = {
  id: string;
  name: string;
  cardNumber: string;
  identityId: string;
  organizationName: string;
  departmentName: string;
  districtName: string;
}

export type PatrolAssignType = {
  id:string;
  name: string;
  description: string;
  patrolRouteId: string;
  startDate: string;
  endDate: string;
  securityIds: string[];
  patrolRouteName?: string;
  securities?: SecurityType[];
  applicationId?: string;
  status?: string;
  updatedAt?: string;
  createdAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

interface Statetype {
  patrolRoutes: PatrolRouteType[];
  patrolRouteAll: PatrolRouteType[];
  patrolRouteSearch: string;
  selectedPatrolRoute?: PatrolRouteType | null;
  selectedPatrolRouteId?: string;
  patrolRouteTotalCount: number;
  patrolRouteFilteredCount: number;
  patrolRouteFilter: GetFilter;
  patrolAssignFilter: GetFilter;
  lastFilter?: GetFilter;
  isLoading: boolean;
  hasLoaded: boolean;
}

const initialState: Statetype = {
  patrolRoutes: [],
  patrolRouteAll: [],
  patrolRouteSearch: '',
  selectedPatrolRoute: null,
  selectedPatrolRouteId: '',
  patrolRouteTotalCount: 0,
  patrolRouteFilteredCount: 0,
  patrolRouteFilter: defaultPatrolRouteFilter,
  patrolAssignFilter: defaultPatrolRouteFilter,
  lastFilter: defaultPatrolRouteFilter,
  isLoading: false,
  hasLoaded: false,
};

export const PatrolRouteSlice = createSlice({
  name: 'patrolRoute',
  initialState,
  reducers: {
    GetPatrolRoute: (state, action: PayloadAction<PatrolRouteType[]>) => {
      state.patrolRoutes = action.payload;
    },
    GetAllPatrolRoute: (state, action: PayloadAction<PatrolRouteType[]>) => {
      state.patrolRouteAll = action.payload;
    },
    SelectPatrolRoute: (state, action: PayloadAction<PatrolRouteType>) => {
      state.selectedPatrolRoute = action.payload;
      state.selectedPatrolRouteId = action.payload.id;
    },
    UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
      state.patrolRouteFilter = { ...state.patrolRouteFilter, ...action.payload };
    },
  },
});

export const { GetPatrolRoute, GetAllPatrolRoute, SelectPatrolRoute, UpdateFilter } =
  PatrolRouteSlice.actions;

export default PatrolRouteSlice.reducer;
