
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {  defaultPatrolCaseFilter, defaultPatrolCaseUploadForm, defaultPatrolSessionFilter } from '../defaultForm';
import {  PatrolAssignType, PatrolDetailPayload, PatrolRouteType } from './patrolRoute';
import { memberType } from './member';

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
    PatrolAssignmentId?: string;
    SecurityId?: string[];
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

export type CaseAttachmentType = {
    fileUrl: string;
    fileType: string;
}

export type CaseUploadType = {
    title: string;
    description: string;
    caseType: string;
    threatLevel: string;
    patrolSessionId: string;
    patrolAreaId: string;
    attachments : CaseAttachmentType[] | [];
}

export type PatrolCaseType = {
    id: string;
    title: string;
    description: string;
    caseType: string;
    caseStatus:string;
    patrolSessionId: string;
    securityId: string;
    approvedByHeadId: string;
    patrolAssignmentId: string;
    patrolRouteId: string;
    patrolAreaId: string;
    patrolAreaName?: string;
    security?: memberType;
    patrolAssignment?: PatrolAssignType;
    patrolRoute?: PatrolRouteType;
    attachments : CaseAttachmentType[];
    status: number;
    applicationId: string;
}

interface PatrolSessionState {
  patrolCases: PatrolCaseType[];
  selectedPatrolCase: PatrolCaseType | null;
  caseFilter: GetFilter;
  caseUpload: CaseUploadType;
}

const initialState: PatrolSessionState = {
  patrolCases: [],
  selectedPatrolCase: null,
  caseFilter: defaultPatrolCaseFilter,
  caseUpload: defaultPatrolCaseUploadForm
};

export const PatrolCaseSlice = createSlice({
  name: 'patrolCase',
  initialState,
  reducers: {
        SetPatrolCases: (state, action: PayloadAction<PatrolCaseType[]>) => {
            state.patrolCases = action.payload;
        },
        SetSelectedPatrolCase: (state, action: PayloadAction<PatrolCaseType | null>) => {
            state.selectedPatrolCase = action.payload;
        },
        UpdatePatrolCaseFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
            state.caseFilter = { ...state.caseFilter, ...action.payload };
        },
  },
});

export const {
  SetPatrolCases,
  SetSelectedPatrolCase,
  UpdatePatrolCaseFilter
} = PatrolCaseSlice.actions;

export default PatrolCaseSlice.reducer;