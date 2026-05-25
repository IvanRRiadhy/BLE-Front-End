import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { SecurityType } from './patrolRoute';


export type SessionStatus =
  | 'scheduled'
  | 'active'
  | 'completed'
  | 'absent'
  | 'partialcompleted'
  | 'timedout';

export type TimeRangeOption =
  | 'today'
  | 'yesterday'
  | 'weekly'
  | 'last_week'
  | 'monthly'
  | 'last_month'
  | 'yearly'
  | 'last_year'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'custom';


export type GetFilter = {
  draw: number;
  start: number;
  length: number;
  sortColumn: string;
  sortDir: 'asc' | 'desc';
  searchValue: string;
  timeRange?: TimeRangeOption | '';
  timezone?: string;
  dateFilters?: {
    StartedAt?: {
      dateFrom: string | null;
      dateTo: string | null;
    };
  };
  filters?: {
    securityId?: string[];
    routeId?: string[];
    isCompleted?: boolean | null;
    assignmentId?: string[];
    sessionStatus?: SessionStatus | null;
  };
};



// ==========================
// Main Session Type
// ==========================
export interface PatrolReportType {
  sessionId: string;
  sessionStatus: string;
  startedAt: string;
  endedAt: string | null;
  durationFormatted: string | null;

  securityId: string;
  securityName: string;
  securityEmployeeNumber: string;

  assignmentId: string;
  assignmentName: string;

  routeId: string;
  routeName: string;

  metrics: SessionMetrics;
  timeline: SessionTimeline[];
  cases: SessionCase[];
}

// ==========================
// Metrics
// ==========================
export interface SessionMetrics {
  totalCheckpoints: number;
  completedCheckpoints: number;
  completionPercentage: number;
  totalCases: number;
  totalDuration: string | null;
  averageCheckpointTime: string | null;
  isCompletedOnTime: boolean;
}

// ==========================
// Timeline
// ==========================
export interface SessionTimeline {
  stage: string;
  stageName: string;
  timestamp: string;
  // durationSeconds: number | null;
  // durationFormatted: string | null;
  isDelayed: boolean;
  delaySeconds: number | null;
  // notes: string | null;
  dwellTimeFormatted: string | null;
  dwellTimeSeconds: number | null;
  dwellTimeStatus: "Under" | "Normal" | "Over"
  isArrived: boolean;
  isCleared: boolean;
  maxDwellTimeSeconds: number | null;
  minDwellTimeSeconds: number | null;
  orderIndex: number;
  travelTimeFormatted: string | null;
  travelTimeSeconds: number | null
}

// ==========================
// Cases
// ==========================
export interface SessionCase {
  caseId: string;
  reportedAt: string;
  title: string;
  caseType: string;
  threatLevel: string;
  caseStatus: string;
  areaName: string | null;
}

interface StateType {
  patrolSessions: PatrolReportType[];
  patrolSessionTotalCount: number;
  patrolSessionFilteredCount: number;
  patrolSessionFilter: GetFilter;
  selectedSecurity: SecurityType | null;
  isLoading: boolean;
  hasLoaded: boolean;
}

const initialState: StateType = {
  patrolSessions: [],
  patrolSessionTotalCount: 0,
  patrolSessionFilteredCount: 0,
  patrolSessionFilter: {} as GetFilter,
  selectedSecurity: null,
  isLoading: false,
  hasLoaded: false,
};

export const PatrolReportSlice = createSlice({
  name: 'patrolReport',
  initialState,
  reducers: {
    GetPatrolReports: (state, action: PayloadAction<PatrolReportType[]>) => {
      state.patrolSessions = action.payload;
    },
    SetSelectedSecurity: (state, action: PayloadAction<SecurityType | null>) => {
      state.selectedSecurity = action.payload;
    },
    UpdatePatrolReportFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
      state.patrolSessionFilter = { ...state.patrolSessionFilter, ...action.payload };
    },
  },
});

export const { GetPatrolReports, SetSelectedSecurity, UpdatePatrolReportFilter } =
  PatrolReportSlice.actions;

export default PatrolReportSlice.reducer;
