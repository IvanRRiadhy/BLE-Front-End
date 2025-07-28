import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch } from 'src/store/Store';
import { startMQTTclient } from './MQTT';

// const API_URL = 'http://192.168.1.165:3300/api/beacons?floorplanId=6a6ad6fa-5630-419a-b756-7685a0401fed';

export interface BeaconType {
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
  is_Active: string;
  floorplanName: string;
  maskedAreaName: string;
}

interface StateType {
  beacons: BeaconType[];
  beaconsByTopic: {
    [topic: string]: BeaconType[];
  };
  refreshTrigger: boolean;
  trackingBeacon: string;
  selectedBeacon: {
    active: boolean;
    id: string;
    area: string;
    floorplan: string;
    time: string;
  };
}

const initialState: StateType = {
  beacons: [],
  beaconsByTopic: {},
  refreshTrigger: false,
  trackingBeacon: '',
  selectedBeacon: {
    active: false,
    id: '',
    area: '',
    floorplan: '',
    time: '',
  },
};

export const BeaconSlice = createSlice({
  name: 'beacon',
  initialState,
  reducers: {
    GetBeacon: (state, action) => {
      const { topic, beacons } = action.payload;
      // console.log('Beacons:', beacons);
      // Only keep beacons with matching floorplanId
      state.beaconsByTopic[topic] = (beacons || []).filter(
        (beacon: any) => `tracking/${beacon.floorplanId}` === topic,
      );
    },
    RefreshTrigger: (state) => {
      state.refreshTrigger = true;
    },
    RefreshBeaconState: (state) => {
      state.beacons = [];
      state.beaconsByTopic = {};
      state.refreshTrigger = false;
    },
    SetTrackingBeacon: (state, action) => {
      state.trackingBeacon = action.payload;
    },
    SetSelectedBeacon: (state, action) => {
      state.selectedBeacon = action.payload;
    }
  },
});

export const { GetBeacon, RefreshTrigger, RefreshBeaconState, SetTrackingBeacon, SetSelectedBeacon } = BeaconSlice.actions;

export const fetchBeacon = (topic: string) => (dispatch: AppDispatch) => {
  let lastDispatch = 0;
  const unsubscribe = startMQTTclient((data: any) => {
    const now = Date.now();
    if (now - lastDispatch > 200) {
      lastDispatch = now;
      dispatch(
        GetBeacon({
          topic,
          beacons: Array.isArray(data) ? data : [data],
        }),
      );
    }
  }, topic);
  return unsubscribe; // <-- return the unsubscribe function
};

export default BeaconSlice.reducer;
