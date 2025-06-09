import axios from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = 'http://localhost:3030/api/beacons';

export interface BeaconType {
  beaconId: string;
  pair: string;
  first: string;
  second: string;
  firstDist: number;
  seconDist: number;
  jarakPixel: number;
  jarakMeter: number;
  points: [
    {
      x: number;
      y: number;
    },
  ];
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
}

const initialState: StateType = {
  beacons: [],
};

export const BeaconSlice = createSlice({
  name: 'beacon',
  initialState,
  reducers: {
    GetBeacon: (state, action) => {
      state.beacons = action.payload;
    },
  },
});

export const { GetBeacon } = BeaconSlice.actions;

export const fetchBeacon = () => async (dispatch: AppDispatch) => {
  try {
    const response = await axios.get(API_URL);
    dispatch(GetBeacon(response.data));
  } catch (error) {
    console.error('Error fetching beacons: ', error);
  }
};


export default BeaconSlice.reducer;