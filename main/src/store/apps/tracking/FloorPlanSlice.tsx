import axios from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';
import { floorplanType } from 'src/types/tracking/floorplan';
import { gatesType } from 'src/types/tracking/gate';

const API_URL = '/api/data/tracking/FloorPlanData';

interface StateType {
  floorplans: floorplanType[];
  floorplanContent: number;
  floorplanSearch: string;
  selectedFloorPlan?: floorplanType | null;
}

const initialState = {
  floorplans: [],
  floorplanContent: 0,
  floorplanSearch: '',
  selectedFloorPlan: null,
};

export const FloorplanSlice = createSlice({
  name: 'floorplans',
  initialState,

  reducers: {
    GetFloorplans: (state, action) => {
      state.floorplans = action.payload;
    },
    SelectFloorplan: (state, action: PayloadAction<string>) => {
      const selected = state.floorplans.find(
        (floorplan: floorplanType) => floorplan.id === action.payload,
      );
      state.selectedFloorPlan = selected || null;
      state.floorplanContent = parseInt(action.payload) || 0;
    },
    SearchFloorplan: (state, action) => {
      state.floorplanSearch = action.payload;
    },

    UpdateFloorplan: {
      reducer: (state: StateType, action: PayloadAction<any>) => {
        state.floorplans = state.floorplans.map(
          (floorplan) => {
            if (floorplan.id === action.payload.id) {
              if (action.payload.field === 'gateways') {
                floorplan.gateways.push(action.payload.value);
              } else {
                const field = action.payload.field as keyof floorplanType;
                floorplan[field] = action.payload.value;
              }
              return floorplan;
            }
            return floorplan;
          },
          // floorplan.id === action.payload.id
          //   ? { ...floorplan, [action.payload.field]: action.payload.value }
          //   : floorplan,
        );
      },
      prepare: (id, field, value) => {
        return {
          payload: { id, field, value },
        };
      },
    },
    AddFloor: {
      reducer: (state: StateType, action: PayloadAction<any>) => {
        const lastId =
          state.floorplans.length > 0
            ? Math.max(...state.floorplans.map((floorplan) => parseInt(floorplan.id)))
            : 0;
        const newFloorplan = { ...action.payload, id: `${lastId + 1}`, gateways: [] };
        state.floorplans.push(newFloorplan);
      },

      prepare: (name, color, imagesrc) => {
        return { payload: { name, color, imagesrc } };
      },
    },
  },
});

export const selectFloorPlan =
  (floorplanId: string) => (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    const gateways: gatesType[] = state.gateReducer.unsavedGates;

    const isAnyEditing = gateways.some((gate) => gate.isEditing);

    if (!isAnyEditing) {
      dispatch(SelectFloorplan(floorplanId));
    } else {
      console.warn('Cannot switch floorplans while editing a gateway.');
    }
  };

export const { GetFloorplans, SelectFloorplan, SearchFloorplan, UpdateFloorplan, AddFloor } =
  FloorplanSlice.actions;

export const fetchFloorplans = () => async (dispatch: AppDispatch) => {
  try {
    const response = await axios.get(`${API_URL}`);
    dispatch(GetFloorplans(response.data));
  } catch (err: any) {
    throw new Error(err);
  }
};

export default FloorplanSlice.reducer;
