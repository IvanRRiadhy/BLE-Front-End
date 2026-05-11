import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface EvacuationSummary {
  totalRequired: number;
  totalEvacuated: number;
  totalConfirmed: number;
  totalRemaining: number;
  totalConfirmedNotification: number;
}

export interface EvacuationPerson {
  transactionId: string;
  personId: string;
  personName: string;
  personCategory: string;
  personStatus: string;
  assemblyPointId: string | null;
  assemblyPointName: string | null;
  position: {
    buildingId: string;
    buildingName: string;
    floorId: string;
    floorName: string;
    floorplanId: string;
    floorplanName: string;
    areaId: string;
    areaName: string;
    lastDetected: string;
  } | null;
  card: {
    cardId: string;
    cardNumber: string;
    beaconId: string;
  };
  statusTimestamps: {
    confirmedEvacuationAt: string;
    confirmedEvacuationBy: string;
    confirmedNotificationAt: string;
    confirmedNotificationBy: string;
    evacuationAt: string;
    evacuationBy: string;
  }
}

export interface EvacuationData {
  evacuationAlertId: string;
  status: string;
  timestamp: string;
  summary: EvacuationSummary;
  persons: EvacuationPerson[];
  byAssemblyPoint: any[];
}

interface EvacuationState {
  evacuationId: string;
  evacState: 'idle' | 'running' | 'finished';
  data: EvacuationData | null;
  startTime: number | null;
}

const getSafeStorage = (key: string, defaultValue: any) => {
  const item = localStorage.getItem(key);
  if (!item || item === 'undefined') return defaultValue;
  try {
    return JSON.parse(item);
  } catch (e) {
    return defaultValue;
  }
};

const initialState: EvacuationState = {
  evacuationId: getSafeStorage('evacuationId', ''),
  evacState: getSafeStorage('evacState', 'idle'),
  data: null,
  startTime: getSafeStorage('evacStartTime', null),
};

export const EvacuationSlice = createSlice({
  name: 'evacuation',
  initialState,
  reducers: {
    setEvacuationId: (state, action: PayloadAction<string>) => {
      state.evacuationId = action.payload;
      localStorage.setItem('evacuationId', JSON.stringify(action.payload));
    },
    setEvacuationState: (state, action: PayloadAction<'idle' | 'running' | 'finished'>) => {
      state.evacState = action.payload;
      localStorage.setItem('evacState', JSON.stringify(action.payload));
      if (action.payload === 'idle') {
        state.startTime = null;
        localStorage.removeItem('evacStartTime');
      }
    },
    setEvacuationStartTime: (state, action: PayloadAction<number | null>) => {
      state.startTime = action.payload;
      if (action.payload) {
        localStorage.setItem('evacStartTime', JSON.stringify(action.payload));
      } else {
        localStorage.removeItem('evacStartTime');
      }
    },
    updateEvacuationData: (state, action: PayloadAction<EvacuationData>) => {
      state.data = action.payload;
    },
    resetEvacuation: (state) => {
      state.evacuationId = '';
      state.evacState = 'idle';
      state.data = null;
      state.startTime = null;
      localStorage.removeItem('evacuationId');
      localStorage.removeItem('evacState');
      localStorage.removeItem('evacStartTime');
    },
  },
});

export const { 
  setEvacuationId, 
  setEvacuationState, 
  setEvacuationStartTime,
  updateEvacuationData, 
  resetEvacuation 
} = EvacuationSlice.actions;

export default EvacuationSlice.reducer;
