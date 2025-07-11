import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch } from 'src/store/Store';
import { startMQTTclient } from './MQTT';
import axiosServices from 'src/utils/axios';

const ALARM_URL = 'http://192.168.1.116:3300';

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
      console.log(action.payload)
      const { alarms } = action.payload;
      state.alarms = alarms;
      console.log(state.alarms);
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
          alarms: Array.isArray(data) ? data : [data],
        }),
      );
    }
  }, topic);
  return unsubscribe;
};

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
