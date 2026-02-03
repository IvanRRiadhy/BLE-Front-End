import axiosServices, { BASE_URL } from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch, dispatch } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { defaultPatrolRouteFilter } from '../defaultForm';
import { memberType } from './member';
import { PatrolAssignType, PatrolDetailPayload } from './patrolRoute';

// const API_URL = '/api/patrol-route/';
// const API_URL_FILTER = '/api/patrol-route/filter/';
// const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

export type CheckpointType = {
  id: string;
  patrolAreaId: string;
  areaNameSnap: string;
  orderIndex: number;
  arrivedAt: string;
  leftAt: string;
  distanceFromPrevMeters: number;
};

export type PatrolSession = {
  id: string;
  patrolRouteId: string;
  patrolRouteNameSnap: string;
  securityId: string;
  securityNameSnap: string;
  securityIdentityIdSnap: string;
  securityCardNumberSnap: string;
  patrolAssignmentId: string;
  patrolAssignmentNameSnap: string;
  timeGroupId: string;
  timeGroupNameSnap: string;
  startAreaNameSnap: string;
  endAreaNameSnap: string;
  startedAt: string;
  endedAt: string;
  checkpointCount: number;
  checkpoints: CheckpointType[];
  applicationId: string;
};

interface PatrolSessionState {
  patrolSessions: PatrolSession[];
  currentPatrolSession: PatrolSession | null;
  selectedPatrolAssignment: PatrolDetailPayload | null;
  patrolSessionFilter: GetFilter;
}

const initialState: PatrolSessionState = {
  patrolSessions: [],
  currentPatrolSession: null,
  selectedPatrolAssignment: null,
  patrolSessionFilter: defaultPatrolRouteFilter,
};

export const PatrolSessionSlice = createSlice({
  name: 'patrolSession',
  initialState,
  reducers: {
    setPatrolSessions: (state, action: PayloadAction<PatrolSession[]>) => {
      state.patrolSessions = action.payload;
    },
    setCurrentPatrolSession: (state, action: PayloadAction<PatrolSession>) => {
      state.currentPatrolSession = action.payload;
    },
    setSelectedPatrolAssignment: (state, action: PayloadAction<PatrolDetailPayload | null>) => {
      state.selectedPatrolAssignment = action.payload;
    },
    updatePatrolSessionFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
      state.patrolSessionFilter = { ...state.patrolSessionFilter, ...action.payload };
    },
  },
});

export const {
  setPatrolSessions,
  setCurrentPatrolSession,
  setSelectedPatrolAssignment,
  updatePatrolSessionFilter,
} = PatrolSessionSlice.actions;

export default PatrolSessionSlice.reducer;