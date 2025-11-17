import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch } from 'src/store/Store';
import { startMQTTclient } from './MQTT';
import axiosServices from 'src/utils/axios';

const ALARM_URL = 'http://192.168.1.10:3300';

export interface AlarmType {
  beaconId: string;
  pair: string;
  first: string;
  second: string;
  firstDist: number;
  seconDist: number;
  jarakPixel: number;
  jarakMeter: number;
  point: {
    x: number;
    y: number;
  };
  firstReaderCoord: {
    id: string;
    x: number;
    y: number;
  };
  secondReaderCoord: {
    id: string;
    x: number;
    y: number;
  };
  time: string;
  floorplanId: string;
  inRestrictedArea: boolean;
  is_Active: boolean;
  floorplanName: string;
  maskedAreaName: string;
}
export interface MQTTAlarmType {
  MemberName: string | null;
  action: string;
  alarmName: string;
  cardAccesses: any;
  cardId: string;
  cardName: string;
  cardDMAC: string;
  color: string;
  faceImage: string;
  floorplanName: string;
  maskedAreaId: string;
  maskedAreaName: string;
  period: {
    start: string;
    end: string;
  };
  priority: string; // Note the spelling matches the response
  status: string;
  triggerId: string;
  visitorName: string;
}

interface StateType {
  alarms: AlarmType[];
  refreshTrigger: boolean;
}

const initialState: StateType = {
  alarms: [],
  refreshTrigger: false,
};

export const AlarmSlice = createSlice({
  name: 'alarm',
  initialState,
  reducers: {
    GetAlarm: (state, action) => {
      console.log(action.payload);
      const { alarms } = action.payload;
      state.alarms = alarms;
      console.log(state.alarms);
    },
    RefreshTrigger: (state) => {
      state.refreshTrigger = true;
    },
    RefreshAlarmState: (state) => {
      state.alarms = [];
      state.refreshTrigger = false;
    },
  },
});

export const { GetAlarm, RefreshTrigger, RefreshAlarmState } = AlarmSlice.actions;

export const handleFetchDummyBeacon = () => async (dispatch: AppDispatch) => {
  try {
    const response = await axiosServices.get(`${ALARM_URL}/dummy-beacon`);
    console.log('Dummy Beacon Data:', response.data);
    dispatch(GetAlarm(response.data || []));
  } catch (error) {
    console.error('Error fetching dummy beacon:', error);
  }
};

export default AlarmSlice.reducer;
