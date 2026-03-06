import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { defaultPatrolSessionFilter } from '../defaultForm';
import { PatrolDetailPayload } from './patrolRoute';

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
  timeRange?: string;
  filters?: {
    PatrolAssignmentId?: string;
    SecurityId?: string[];
  };
};

export type CheckpointType = {
  id: string;
  patrolAreaId: string;
  areaNameSnap: string;
  orderIndex: number;
  cycleIndex: number;
  checkpointStatus: string;
  arrivedAt: string;
  leftAt: string;
  clearedAt: string;
  minDwellTime: number;
  maxDwellTime: number;
  distanceFromPrevMeters: number;
  notes: string;
};

export type PatrolSessionType = {
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
  patrolSessions: PatrolSessionType[];
  currentPatrolSession: PatrolSessionType | null;
  selectedPatrolAssignment: PatrolDetailPayload | null;
  patrolSessionFilter: GetFilter;
}

const initialState: PatrolSessionState = {
  patrolSessions: [],
  currentPatrolSession: null,
  selectedPatrolAssignment: null,
  patrolSessionFilter: defaultPatrolSessionFilter,
};

export const PatrolSessionSlice = createSlice({
  name: 'patrolSession',
  initialState,
  reducers: {
    setPatrolSessions: (state, action: PayloadAction<PatrolSessionType[]>) => {
      state.patrolSessions = action.payload;
    },
    setCurrentPatrolSession: (state, action: PayloadAction<PatrolSessionType>) => {
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
