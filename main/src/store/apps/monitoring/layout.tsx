import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type screenSettings = {
  scale: number;
  translateX: number;
  translateY: number;
};
export type screenDisplay = {
  displayType: number; //0: floorplan, 1: masked area, 2: cctv
  displayOutput: string;
};
export const screenOrderMap: { [grid: number]: Array<[number, number?, number?]> } = {
  1: [[0]],
  2: [[0], [1]],
  3: [[0], [1, 0], [1, 1]],
  4: [[0, 0], [1, 0], [0, 1], [1, 1]],
  5: [[0, 0], [1, 0], [0, 1, 0], [0, 1, 1], [1, 1]],
  6: [[0, 0], [1, 0], [1, 1], [0, 1, 0], [0, 1, 1], [1, 2]],
};

interface Statetype {
  grid: number;
  floorplanId: string[][];
  screenDisplay: screenDisplay[][];
  screenSettings: screenSettings[][];
}

const initialState: Statetype = {
  grid: 1,
  floorplanId: [
    [],
    [''],
    ['', ''],
    ['', '', ''],
    ['', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', '', ''],
  ],
  screenDisplay: [
    [],
    [{ displayType: 0, displayOutput: '' }],
    [
      { displayType: 0, displayOutput: '' },
      { displayType: 0, displayOutput: '' },
    ],
    [
      { displayType: 0, displayOutput: '' },
      { displayType: 0, displayOutput: '' },
      { displayType: 0, displayOutput: '' },
    ],
    [
      { displayType: 0, displayOutput: '' },
      { displayType: 0, displayOutput: '' },
      { displayType: 0, displayOutput: '' },
      { displayType: 0, displayOutput: '' },
    ],
    [
      { displayType: 0, displayOutput: '' },
      { displayType: 0, displayOutput: '' },
      { displayType: 0, displayOutput: '' },
      { displayType: 0, displayOutput: '' },
      { displayType: 0, displayOutput: '' },
    ],
    [
      { displayType: 0, displayOutput: '' },
      { displayType: 0, displayOutput: '' },
      { displayType: 0, displayOutput: '' },
      { displayType: 0, displayOutput: '' },
      { displayType: 0, displayOutput: '' },
      { displayType: 0, displayOutput: '' },
    ],
  ],
  screenSettings: [
    [],
    [{ scale: 1, translateX: 0, translateY: 0 }],
    [
      { scale: 1, translateX: 0, translateY: 0 },
      { scale: 1, translateX: 0, translateY: 0 },
    ],
    [
      { scale: 1, translateX: 0, translateY: 0 },
      { scale: 1, translateX: 0, translateY: 0 },
      { scale: 1, translateX: 0, translateY: 0 },
    ],
    [
      { scale: 1, translateX: 0, translateY: 0 },
      { scale: 1, translateX: 0, translateY: 0 },
      { scale: 1, translateX: 0, translateY: 0 },
      { scale: 1, translateX: 0, translateY: 0 },
    ],
    [
      { scale: 1, translateX: 0, translateY: 0 },
      { scale: 1, translateX: 0, translateY: 0 },
      { scale: 1, translateX: 0, translateY: 0 },
      { scale: 1, translateX: 0, translateY: 0 },
      { scale: 1, translateX: 0, translateY: 0 },
    ],
    [
      { scale: 1, translateX: 0, translateY: 0 },
      { scale: 1, translateX: 0, translateY: 0 },
      { scale: 1, translateX: 0, translateY: 0 },
      { scale: 1, translateX: 0, translateY: 0 },
      { scale: 1, translateX: 0, translateY: 0 },
      { scale: 1, translateX: 0, translateY: 0 },
    ],
  ],
};

export const LayoutSlice = createSlice({
  name: 'layout',
  initialState,
  reducers: {
    setGrid: (state, action: PayloadAction<number>) => {
      state.grid = action.payload;
    },
    setFloorplan: {
      reducer: (state: Statetype, action: PayloadAction<any>) => {
        console.log('setFloorplan: ', action.payload);
        state.floorplanId[action.payload.gridNumber][action.payload.screenNumber - 1] =
          action.payload.id;

        console.log('layout: ', JSON.stringify(state.floorplanId));
      },

      prepare: (gridNumber: number, screenNumber: number, id: string) => {
        return { payload: { gridNumber, screenNumber, id } };
      },
    },
    setScreenDisplay: {
      reducer: (state: Statetype, action: PayloadAction<any>) => {
        const { gridNumber, screenNumber, display } = action.payload;
        console.log('setScreenDisplay: ', action.payload);

        if (!state.screenDisplay[gridNumber]) {
          state.screenDisplay[gridNumber] = [];
        }
        state.screenDisplay[gridNumber][screenNumber - 1] = display;
        console.log('layout: ', JSON.stringify(state.screenDisplay[gridNumber]));
      },

      prepare: (gridNumber: number, screenNumber: number, display: screenDisplay) => {
        return {
          payload: { gridNumber, screenNumber, display },
        };
      },
    },
    setScreenSettings: {
      reducer: (state: Statetype, action: PayloadAction<any>) => {
        const { gridNumber, screenNumber, settings } = action.payload;
        console.log('setScreenSettings: ', action.payload);

        if (!state.screenSettings[gridNumber]) {
          state.screenSettings[gridNumber] = [];
        }
        state.screenSettings[gridNumber][screenNumber - 1] = settings;
        console.log('layout: ', JSON.stringify(state.screenSettings));
      },

      prepare: (gridNumber: number, screenNumber: number, settings: screenSettings) => {
        return { payload: { gridNumber, screenNumber, settings } };
      },
    },
  },
});

export const { setGrid, setFloorplan, setScreenDisplay, setScreenSettings } = LayoutSlice.actions;

export default LayoutSlice.reducer;
