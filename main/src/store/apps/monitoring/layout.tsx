import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';

interface Statetype {
  grid: number;
  floorplanId: string[][];
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
  },
});

export const { setGrid, setFloorplan } = LayoutSlice.actions;

export default LayoutSlice.reducer;
