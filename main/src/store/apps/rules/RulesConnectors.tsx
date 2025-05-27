import axios from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { uniqueId } from 'lodash';

export interface ArrowType {
  id: string;
  startNodeId: string;
  endNodeId: string;
  arrowLatch?: {
    x: number;
    y: number;
  } | null;
  arrowPreviewEnd?: {
    x: number;
    y: number;
  } | null;
  type: string;
}

interface ArrowsState {
  arrows: ArrowType[];
  arrowDrawing: ArrowType | null;
  hoveredArrowIndex: string | null;
}

const initialState: ArrowsState = {
  arrows: [],
  arrowDrawing: null,
  hoveredArrowIndex: null,
};

export const ArrowsSlice = createSlice({
  name: 'arrows',
  initialState,
  reducers: {
    addArrow: (state, action: PayloadAction<ArrowType>) => {
      state.arrows.push(action.payload);
    },
    deleteArrow: (state, action: PayloadAction<string>) => {
      state.arrows = state.arrows.filter((arrow) => arrow.id !== action.payload);
    },
    deleteArrowsByNode: (state, action: PayloadAction<string>) => {
      state.arrows = state.arrows.filter(
        (arrow) => arrow.startNodeId !== action.payload && arrow.endNodeId !== action.payload,
      );
    },
    setArrowDrawing: (state, action: PayloadAction<ArrowType | null>) => {
      state.arrowDrawing = action.payload;
    },
    setArrowStartNodeId: (state, action: PayloadAction<{ id: string; nodeId: string }>) => {
      const arrow = state.arrows.find((arrow) => arrow.id === action.payload.id);
      if (arrow) {
        arrow.startNodeId = action.payload.nodeId;
      }
    },
    setArrowPreviewEnd: (
      state,
      action: PayloadAction<{ id: string; x: number; y: number } | null>,
    ) => {
      if (state.arrowDrawing) {
        if (action.payload === null) {
          state.arrowDrawing.arrowPreviewEnd = null;
        } else if (state.arrowDrawing.id === action.payload?.id) {
          state.arrowDrawing.arrowPreviewEnd = {
            x: action.payload.x,
            y: action.payload.y,
          };
          // console.log('Arrow preview end set:', JSON.stringify(state.arrowDrawing));
        }
      }
    },
    setArrowLatch: (state, action: PayloadAction<{ id: string; x: number; y: number } | null>) => {
      if (state.arrowDrawing) {
        if (action.payload === null) {
          state.arrowDrawing.arrowLatch = null;
        } else if (state.arrowDrawing.id === action.payload?.id) {
          state.arrowDrawing.arrowLatch = {
            x: action.payload.x,
            y: action.payload.y,
          };
        }
      }
    },
    setHoveredArrowIndex: (state, action: PayloadAction<string>) => {
      state.hoveredArrowIndex = action.payload;
    },
    updateArrowType: (state, action: PayloadAction<{ id: string; type: string }>) => {
      const arrow = state.arrows.find((arrow) => arrow.id === action.payload.id);
      if (arrow) {
        arrow.type = action.payload.type;
      }
    },
  },
});

export const {
  addArrow,
  deleteArrow,
  deleteArrowsByNode,
  updateArrowType,
  setArrowDrawing,
  setArrowStartNodeId,
  setArrowPreviewEnd,
  setArrowLatch,
  setHoveredArrowIndex,
} = ArrowsSlice.actions;

export default ArrowsSlice.reducer;
