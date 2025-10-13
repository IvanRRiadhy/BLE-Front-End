import axiosServices from "../../../utils/axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { defaultAlarmTriggerFilter } from "../defaultForm";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";
import { FloorplanType } from "./floorplan";
import { CardType } from "./card";

const API_DT_URL = "/api/AlarmTriggers/filter";
const API_URL = "/api/AlarmTriggers/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));



export type GetAlarmRecordResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : AlarmTriggerType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};
export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
    filters: {
    }
}

export interface AlarmTriggerType {
    id: string;
    beaconId: string;
    floorplanId: string;
    posX: number;
    posY: number;
    isInRestrictedArea: boolean;
    firstGatewayId: string;
    secondGatewayId: string;
    triggerTime: string;
    alarmRecordStatus: string;
    actionStatus: string;
    isActive: boolean;
    alarmColor: string;
    floorplan?: FloorplanType;
    card?: CardType;
};

interface StateType {
    alarmTriggers: AlarmTriggerType[];
    alarmTriggerAll: AlarmTriggerType[];
    alarmTriggerSearch: string;
    selectedAlarmTrigger?: AlarmTriggerType | null;
    alarmTriggerTotalCount: number;
    alarmTriggerFilteredCount: number;
    alarmTriggerFilter: GetFilter;
    isLoading: boolean;
    hasLoaded: boolean;
}

const initialState: StateType = {
    alarmTriggers: [],
    alarmTriggerAll: [],
    alarmTriggerSearch: "",
    selectedAlarmTrigger: null,
    alarmTriggerTotalCount: 0,
    alarmTriggerFilteredCount: 0,
    alarmTriggerFilter: defaultAlarmTriggerFilter,
    isLoading: false,
    hasLoaded: false,
};

export const AlarmTriggerSlice = createSlice({
    name: 'alarmTriggers',
    initialState,
    reducers: {
        GetAllAlarmTrigger: (state, action: PayloadAction<AlarmTriggerType[]>) => {
            state.alarmTriggerAll = action.payload;
        },
        GetAlarmTriggers: (state, action:PayloadAction<AlarmTriggerType[]>) => {
            state.alarmTriggers = action.payload;
        },
        SearchAlarmTrigger: (state, action: PayloadAction<string>) => {
            state.alarmTriggerSearch = action.payload;
        },
        SelectAlarmTrigger: (state, action: PayloadAction<string>) => {
            const selected = state.alarmTriggers.find((alarmTrigger: AlarmTriggerType) => alarmTrigger.id === action.payload);
            state.selectedAlarmTrigger = selected || null;
        },
        UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
            state.alarmTriggerFilter = {...state.alarmTriggerFilter, ...action.payload};
        },
    },
    extraReducers: (builder) => {
        builder
        .addCase(fetchAlarmTriggerDT.pending, (state) => {
            state.isLoading = true;
            state.hasLoaded = false;
        })
        .addCase(fetchAlarmTriggerDT.fulfilled, (state, action) => {
            state.alarmTriggerTotalCount = action.payload.recordsTotal;
            state.alarmTriggerFilteredCount = action.payload.recordsFiltered;
            state.isLoading = false;
            state.hasLoaded = true;
        })
        .addCase(fetchAlarmTriggerDT.rejected, (_state, action) => {
            console.error("Error fetching AlarmTriggers: ", action.payload);
            _state.alarmTriggerTotalCount = 0;
            _state.alarmTriggerFilteredCount = 0;
            _state.isLoading = false;
            _state.hasLoaded = false;
        })
        .addCase(editAlarmTrigger.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(editAlarmTrigger.fulfilled, (state, action) => {
            state.isLoading = false;
        })
        .addCase(editAlarmTrigger.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
            _state.isLoading = false;
        });
    }
});

export const {
    GetAllAlarmTrigger,
    GetAlarmTriggers,
    SearchAlarmTrigger,
    SelectAlarmTrigger,
    UpdateFilter,
} = AlarmTriggerSlice.actions;

export const fetchAlarmTrigger = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
        dispatch(GetAllAlarmTrigger(response.data.collection.data || []));
        console.log("Response: ", response);
    } catch (err: any) {
        console.log("Error: ", err);
    }
};

export const fetchAlarmTriggerDT = createAsyncThunk(
    "alarmTriggers/fetchAlarmTriggerDT",
    async (filter: any, thunkAPI) => {
        const started = Date.now();
    const res = await retryUntilSuccess(
      () => axiosServices.post(API_DT_URL, filter),
      {
        signal: thunkAPI.signal,     
        timeoutMs: 2 * 60 * 1000,    
        minDelay: 500,
        maxDelay: 8000,
      }
    );
    console.log("Alarm Trigger: ", res);
    dispatch(GetAlarmTriggers(res.data.collection.data || []));
    await ensureMinLatency(started, 500);
    return res.data.collection;
  }
    
)

export const editAlarmTrigger = createAsyncThunk(
    "alarmTriggers/editAlarmTrigger",
    async (data: any, {rejectWithValue}) => {
        const started = Date.now();
        try {
            const { id, ...rest } = data;
            const response = await axiosServices.put(`${API_URL}${id}`, rest);
            console.log(response);
            const elapsed = Date.now() - started;
            if (elapsed < 500) await delay(500 - elapsed);
            return response.data;
        } catch (error: any) {
            console.error("Error editing AlarmTrigger:", error);
            const elapsed = Date.now() - started;
            if (elapsed < 500) await delay(500 - elapsed);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)


export default AlarmTriggerSlice.reducer;
