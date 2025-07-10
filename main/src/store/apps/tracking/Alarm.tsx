
import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch } from 'src/store/Store';
import { startMQTTclient } from './MQTT';

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

interface StateType {
  alarms: AlarmType[];
  // alarmByTopic: {
  //     [topis: string]: AlarmType[];
  // };
  refreshTrigger: boolean;
}

const initialState: StateType = {
  alarms: [],
  // alarmByTopic: {},
  refreshTrigger: false,
};

export const AlarmSlice = createSlice({
  name: 'alarm',
  initialState,
  reducers: {
    GetAlarm: (state, action) => {
      const { alarms } = action.payload;
      state.alarms = alarms;
    },
    RefreshTrigger: (state) => {
      state.refreshTrigger = true;
    },
    RefreshAlarmState: (state) => {
      state.alarms = [];
      // state.alarmByTopic = {};
      state.refreshTrigger = false;
    },
  },
});

export const { GetAlarm, RefreshTrigger, RefreshAlarmState } = AlarmSlice.actions;

export const fetchAlarm = (topic: string) => (dispatch: AppDispatch) => {
  let lastDispatch = 0;
  const unsubscribe = startMQTTclient((data: any) => {
    const now = Date.now();
    if (now - lastDispatch > 200) {
      lastDispatch = now;
      dispatch(
        GetAlarm({
          alarm: Array.isArray(data) ? data : [data],
        }),
      );
    }
  }, topic);
  return unsubscribe;
};

export default AlarmSlice.reducer;
