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
    ['d2d3032d-77c9-4dae-91b2-cc3770668d01'],
    ['6a6ad6fa-5630-419a-b756-7685a0401fed', 'd2d3032d-77c9-4dae-91b2-cc3770668d01'],
    ['1', '2', '3'],
    [
      '6a6ad6fa-5630-419a-b756-7685a0401fed',
      'd2d3032d-77c9-4dae-91b2-cc3770668d01',
      'd2d3032d-77c9-4dae-91b2-cc3770668d01',
      '6a6ad6fa-5630-419a-b756-7685a0401fed',
    ],
    ['1', '2', '3', '4', '5'],
    ['6', '5', '4', '3', '2', '1'],
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
        state.floorplanId[action.payload.gridNumber][action.payload.screenNumber] =
          action.payload.id;
      },

      prepare: (gridNumber: number, screenNumber: number, id: string) => {
        return { payload: { gridNumber, screenNumber, id } };
      },
    },
  },
});

export const { setGrid, setFloorplan } = LayoutSlice.actions;

export default LayoutSlice.reducer;
