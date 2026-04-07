import axiosServices, { BASE_URL } from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch, dispatch } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { defaultPatrolAssignmentFilter, defaultPatrolRouteFilter } from '../defaultForm';
import { memberType } from './member';
import { TimeGroupType } from './timeGroup';

const API_URL = '/api/patrol-route/';
const API_URL_FILTER = '/api/patrol-route/filter/';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type GetFilter = {
  draw: number;
  start: number;
  length: number;
  sortColumn: string;
  sortDir: 'asc' | 'desc';
  searchValue: string;
  filters?: {
    PatrolAreaId?: string[];
    'Securities.Id'?: string[];
  };
};

export type PatrolAreas = {
  patrolAreaId: string;
  orderIndex: number;
  estimatedDistance: number;
  estimatedTime: number;
  minDwellTime: number;
  maxDwellTime: number;
  startAreaId: string;
  endAreaId: string;
};
export type PatrolTimeGroups = {
  id: string;
  name: string;
  scheduleType: string;
};
export type RouteAreasType = {
  patrolAreaId: string;
  minDwellTime: number;
  maxDwellTime: number;
}

export type PatrolRouteType = {
  id: string;
  name: string;
  description: string;
  // patrolAreaIds: string[];
  routeAreas: RouteAreasType[];

  startAreaName?: string;
  endAreaName?: string;
  patrolAreas?: PatrolAreas[];
};

export type SecurityType = {
  id: string;
  name: string;
  cardNumber: string;
  identityId: string;
  organizationName: string;
  departmentName: string;
  districtName: string;
};

export type ShiftReplacementType = {
  id: string;
  patrolAssignmentId: string;
  originalSecurity: SecurityType;
  substituteSecurity: SecurityType;
  replacementStartDate: string;
  replacementEndDate: string;
  reason: string;
}

export type PatrolAssignType = {
  id: string;
  name: string;
  description: string;
  approvalType: string;
  durationType: string;
  startType: string;
  cycleType: string;
  cycleCount: number;
  patrolRouteId: string;
  startDate: string;
  endDate: string;
  // headSecurityIds?: string[];
  securityHead1Id?: string;
  securityHead2Id?: string;
  securityIds: string[];
  timeGroupId: string;
  nextPatrolStatus: string;
  isEnded: boolean;
  patrolRoute?: PatrolRouteType;
  // headSecurities?: SecurityType[];
  securities?: SecurityType[];
  securityHead1?: SecurityType;
  securityHead2?: SecurityType;
  timeGroup?: PatrolTimeGroups;
  shiftReplacements?: ShiftReplacementType[];
  applicationId?: string;
  status?: string;
  updatedAt?: string;
  createdAt?: string;
  createdBy?: string;
  updatedBy?: string;
};

interface Statetype {
  patrolRoutes: PatrolRouteType[];
  patrolRouteAll: PatrolRouteType[];
  patrolRouteSearch: string;
  selectedPatrolRoute?: PatrolRouteType | null;
  selectedPatrolRouteId?: string;
  selectedPatrolAssign?: PatrolAssignType | null;
  selectedPatrolAssignId?: string;
  patrolRouteTotalCount: number;
  patrolRouteFilteredCount: number;
  patrolRouteFilter: GetFilter;
  patrolAssignFilter: GetFilter;
  lastFilter?: GetFilter;
  isLoading: boolean;
  hasLoaded: boolean;
}

export type PatrolDetailPayload = {
  patrolAssignment: PatrolAssignType;
  route: PatrolRouteType;
  timeGroups: TimeGroupType[];
  nearestPatrol?: Date | null;
};

const initialState: Statetype = {
  patrolRoutes: [],
  patrolRouteAll: [],
  patrolRouteSearch: '',
  selectedPatrolRoute: null,
  selectedPatrolRouteId: '',
  selectedPatrolAssign: null,
  selectedPatrolAssignId: '',
  patrolRouteTotalCount: 0,
  patrolRouteFilteredCount: 0,
  patrolRouteFilter: defaultPatrolRouteFilter,
  patrolAssignFilter: defaultPatrolAssignmentFilter,
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
    SelectPatrolRoute: (state, action: PayloadAction<PatrolRouteType | null>) => {
      state.selectedPatrolRoute = action.payload;
      state.selectedPatrolRouteId = action.payload?.id || '';
    },
    SelectPatrolAssign: (state, action: PayloadAction<PatrolAssignType | null>) => {
      state.selectedPatrolAssign = action.payload;
      state.selectedPatrolAssignId = action.payload?.id || '';
    },
    UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
      state.patrolRouteFilter = { ...state.patrolRouteFilter, ...action.payload };
    },
    UpdateAssignmentFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
      state.patrolAssignFilter = { ...state.patrolAssignFilter, ...action.payload };
    },
  },
});

export const {
  GetPatrolRoute,
  GetAllPatrolRoute,
  SelectPatrolRoute,
  UpdateFilter,
  SelectPatrolAssign,
  UpdateAssignmentFilter,
} = PatrolRouteSlice.actions;

export default PatrolRouteSlice.reducer;
