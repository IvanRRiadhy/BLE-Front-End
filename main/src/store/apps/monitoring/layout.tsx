import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';

interface Statetype {
  grid: number;
  floorplanId: string[][];
  screenSettings: screenSettings[][];
}
export type screenSettings = {
  scale: number;
  translateX: number;
  translateY: number;
};

const initialScreen: screenSettings = {
  scale: 1,
  translateX: 0,
  translateY: 0,
};

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
  screenSettings: [
    [],
    [{ scale: 1, translateX: 0, translateY: 0 }],
    [{ scale: 1, translateX: 0, translateY: 0 }, { scale: 1, translateX: 0, translateY: 0 }],
    [{ scale: 1, translateX: 0, translateY: 0 }, { scale: 1, translateX: 0, translateY: 0 }, { scale: 1, translateX: 0, translateY: 0 }],
    [{ scale: 1, translateX: 0, translateY: 0 }, { scale: 1, translateX: 0, translateY: 0 }, { scale: 1, translateX: 0, translateY: 0 }, { scale: 1, translateX: 0, translateY: 0 }],
    [{ scale: 1, translateX: 0, translateY: 0 }, { scale: 1, translateX: 0, translateY: 0 }, { scale: 1, translateX: 0, translateY: 0 }, { scale: 1, translateX: 0, translateY: 0 }, { scale: 1, translateX: 0, translateY: 0 }],
    [{ scale: 1, translateX: 0, translateY: 0 }, { scale: 1, translateX: 0, translateY: 0 }, { scale: 1, translateX: 0, translateY: 0 }, { scale: 1, translateX: 0, translateY: 0 }, { scale: 1, translateX: 0, translateY: 0 }, { scale: 1, translateX: 0, translateY: 0 }],
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

export const { setGrid, setFloorplan, setScreenSettings } = LayoutSlice.actions;

export default LayoutSlice.reducer;
