import axios from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';
import { gatesType } from 'src/types/tracking/gate';

const API_URL = '/api/data/tracking/GatesData';

interface StateType {
  gates: any[];
  unsavedGates: any[];
  gateContent: number;
  gateSearch: string;
}

const initialState = {
  gates: [],
  unsavedGates: [],
  gateContent: 0,
  gateSearch: '',
};
const gateSize = 50;

const isColliding = (newX: number, newY: number, gateways: gatesType[], size: number) => {
  return gateways.some((gateway) => {
    return !(
      (
        newX + size <= gateway?.posX || // New gateway is left of existing one
        newX >= gateway.posX + gateSize || // New gateway is right of existing one
        newY + size <= gateway.posY || // New gateway is above existing one
        newY >= gateway.posY + gateSize
      ) // New gateway is below existing one
    );
  });
};

export const GatesSlice = createSlice({
  name: 'gates',
  initialState,

  reducers: {
    GetGates: (state, action: PayloadAction<any>) => {
      state.gates = action.payload;
      state.unsavedGates = action.payload;
    },
    SearchGate: (state, action: PayloadAction<string>) => {
      state.gateSearch = action.payload;
    },
    SelectGate: (state: StateType, action: PayloadAction<number>) => {
      const isAnyEditing = state.unsavedGates.some((gate) => gate.isEditing);
      if (!isAnyEditing) state.gateContent = action.payload;
    },

    SetActiveGate: {
      reducer: (state: StateType, action: PayloadAction<any>) => {
        state.unsavedGates = state.unsavedGates.map((gate) =>
          gate.id === action.payload.id ? { ...gate, isActive: action.payload.isActive } : gate,
        );
      },
      prepare: (id: string, isActive: boolean) => {
        return {
          payload: { id, isActive },
        };
      },
    },

    SaveGate: (state) => {
      state.gates = [...state.unsavedGates];
    },

    RevertGate: {
      reducer: (state: StateType, action: PayloadAction<{ id: string }>) => {
        const changedGate = state.unsavedGates.find((gate) => gate.id === action.payload.id);
        const baseGate = state.gates.find((gate) => gate.id === action.payload.id);
        if (changedGate && baseGate) {
          changedGate.posX = baseGate.posX;
          changedGate.posY = baseGate.posY;
        }
      },

      prepare: (id: string) => ({
        payload: { id },
      }),
    },

    UpdateGate: {
      reducer: (
        state: StateType,
        action: PayloadAction<{ id: string; updates: Partial<gatesType> }>,
      ) => {
        state.unsavedGates = state.unsavedGates.map((gate) =>
          gate.id === action.payload.id ? { ...gate, ...action.payload.updates } : gate,
        );
      },
      prepare: (id: string, updates: Partial<gatesType>) => ({
        payload: { id, updates },
      }),
    },

    SetEditGate: {
      reducer: (state: StateType, action: PayloadAction<any>) => {
        const isAnyEditing = state.unsavedGates.some((gate) => gate.isEditing);
        state.unsavedGates = state.unsavedGates.map((gate) =>
          gate.id === action.payload.id
            ? { ...gate, isEditing: !isAnyEditing && action.payload.isEditing }
            : gate,
        );
      },
      prepare: (id: string, isEditing: boolean) => {
        return {
          payload: { id, isEditing },
        };
      },
    },

    AddGate: {
      reducer: (state: StateType, action: PayloadAction<any>) => {
        const lastId = state.gates.length > 0 ? Math.max(...state.gates.map((gate) => gate.id)) : 0;
        const newGate = { ...action.payload, id: lastId + 1, isEditing: false };

        const isOverlapping = isColliding(newGate.posX, newGate.posY, state.gates, 50);
        if (!isOverlapping) {
          state.gates.push(newGate);
          state.unsavedGates.push(newGate);
        } else {
          console.warn('Cannot place the gateway here. It collides with another one.');
        }
      },

      prepare: (name, color, posX, posY, isActive) => {
        return { payload: { name, color, posX, posY, isActive } };
      },
    },
  },
});

export const {
  GetGates,
  SearchGate,
  SelectGate,
  AddGate,
  UpdateGate,
  SetActiveGate,
  SetEditGate,
  SaveGate,
  RevertGate,
} = GatesSlice.actions;

export const fetchGates = () => async (dispatch: AppDispatch) => {
  try {
    const response = await axios.get(`${API_URL}`);
    dispatch(GetGates(response.data));
  } catch (err: any) {
    throw new Error(err);
  }
};

export const saveGatesToAPI = () => async (dispatch: AppDispatch, getState: any) => {
  try {
    const { unsavedGates } = getState().gateReducer;
    await axios.post(API_URL, unsavedGates); // Save to API
    dispatch(SaveGate()); // Update actual state after saving
  } catch (err: any) {
    throw new Error(err);
  }
};

export default GatesSlice.reducer;
