import axiosServices from "../../../utils/axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { AppDispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { retryUntilSuccess } from "src/utils/retry";
import axios from "axios";
import { getConfig } from "src/config";

const API_URL = "/api/MstEngine/";

// ❌ REMOVE THIS:
// const ENGINE_URL = getConfig().API_ENGINE_URL + '/fetch-tracking-engine';

// ✔ ADD THIS:
export let ENGINE_URL = ''; // dynamic (will be set after config load)

export function initializeEngineConfig() {
  ENGINE_URL = getConfig().API_ENGINE_URL + '/fetch-tracking-engine';
}

export interface EngineType {
  id: string;
  name: string;
  engineTrackingId: string;
  port: number;
  isLive: number;
  lastLive: string;
  serviceStatus: number;
}

interface StateType {
  engines: EngineType[];
}

const initialState: StateType = {
  engines: [],
};

export const EngineSlice = createSlice({
  name: "engine",
  initialState,
  reducers: {
    GetEngines: (state, action: PayloadAction<EngineType[]>) => {
      state.engines = action.payload;
    }
  },
});

export const { GetEngines } = EngineSlice.actions;

export const fetchEngines = () => async (dispatch: AppDispatch) => {
  try {
    const response = await retryUntilSuccess(() => axiosServices.get(API_URL), {
      timeoutMs: 2 * 60 * 1000,
      minDelay: 500,
      maxDelay: 8000,
    });

    console.log("✅ Fetch engines:", response.data.collection);
    dispatch(GetEngines(response.data.collection.data || []));
  } catch (error) {
    console.error("❌ Error fetching engines:", error);
  }
};

export const restartEngine = createAsyncThunk(
  "engines/restartEngine",
  async (_engineId: string, { rejectWithValue }) => {
    try {
      console.log("Restarting engine using URL:", ENGINE_URL);
      const response = await axios.get(ENGINE_URL);
      return response.data;
    } catch (error: any) {
      console.error("Error restarting engine:", error);
      return rejectWithValue(error.response?.data || "Unknown error");
    }
  }
);

export default EngineSlice.reducer;
