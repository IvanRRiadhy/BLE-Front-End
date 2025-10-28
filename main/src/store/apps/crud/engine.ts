import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";

const API_URL = "/api/MstEngine/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface EngineType {
    id: string;
    name: string;
    engineTrackingId: string;
    port: number;
    isLive: number;
    lastLive: string;
    serviceStatus: number;
};

interface StateType {
    engines: EngineType[];
};

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
        const response = await retryUntilSuccess(() => axiosServices.get(API_URL),      
        {   
        timeoutMs: 2 * 60 * 1000,    
        minDelay: 500,
        maxDelay: 8000,
      });
        console.log("✅ Fetch engines:", response.data.collection);
        dispatch(GetEngines(response.data.collection));
    } catch (error) {
        console.error("❌ Error fetching engines:", error);
    }
};

export default EngineSlice.reducer;