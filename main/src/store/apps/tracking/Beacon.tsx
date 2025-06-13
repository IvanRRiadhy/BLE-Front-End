import axios from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { startMQTTclient } from './MQTT';

const API_URL = 'http://192.168.1.165:3300/api/beacons?floorplanId=6a6ad6fa-5630-419a-b756-7685a0401fed';

export interface BeaconType {
  beaconId: string;
  pair: string;
  first: string;
  second: string;
  firstDist: number;
  seconDist: number;
  jarakPixel: number;
  jarakMeter: number;
  point: 
    {
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
}

interface StateType {
  beacons: BeaconType[];
    beaconsByTopic: {
    [topic: string]: BeaconType[];
  };
}

const initialState: StateType = {
  beacons: [],
    beaconsByTopic: {},
};

export const BeaconSlice = createSlice({
  name: 'beacon',
  initialState,
  reducers: {
GetBeacon: (state, action) => {
  const { topic, beacons } = action.payload;
  // Only keep beacons with matching floorplanId
  state.beaconsByTopic[topic] = (beacons || []).filter(
    (beacon: any) => beacon.floorplanId === topic
  );
},
  },
});

export const { GetBeacon } = BeaconSlice.actions;

export const fetchBeacon = (topic: string) => (dispatch: AppDispatch) => {
  let lastDispatch = 0;
  const unsubscribe = startMQTTclient((data: any) => {
    const now = Date.now();
    if (now - lastDispatch > 200) {
      lastDispatch = now;
      dispatch(GetBeacon({
        topic,
        beacons: Array.isArray(data) ? data : [data],
      }));
    }
  }, topic);
  return unsubscribe; // <-- return the unsubscribe function
};


export default BeaconSlice.reducer;