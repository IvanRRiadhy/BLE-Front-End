import axiosServices from "../../../utils/axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { masterVisitorType } from "./visitor";
import { bleReaderType } from "./bleReader";
import { MaskedAreaType } from "./maskedArea";

const API_URL = '/api/AlarmRecordTracking/';
const API_DT_URL = '/api/AlarmRecordTracking/filter/';

export type GetAlarmRecordResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : AlarmType[];
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
    searchValue: string,
}


export interface AlarmType {
    id: string;
    timestamp: string;
    visitorId: string;
    readerId: string;
    floorplanMaskedAreaId: string;
    applicationId: string;
    alarmRecordStatus: string;
    actionStatus: string;
    idleTimestamp: string;
    doneTimestamp: string;
    cancelTimestamp: string;
    waitingTimestamp: string;
    investigatedTimestamp: string;
    investigatedDoneAt: string;
    idlyBy: string;
    doneBy: string;
    cancelBy: string;
    waitingBy: string;
    investigatedBy: string;
    investigatedResult: string;
    visitor?: masterVisitorType;
    reader?: bleReaderType;
    floorplanMaskedArea?: MaskedAreaType; 
};

interface StateType {
    alarmRecordTrackings: AlarmType[];
    alarmRecordTrackingSearch: string;
    selectedAlarmRecordTracking?: AlarmType | null;
    alarmRecordTotalCount: number;
    alarmRecordFilteredCount: number;
    alarmRecordFilter: GetFilter
};

const initialState: StateType = {
    alarmRecordTrackings: [],
    alarmRecordTrackingSearch: '',
    selectedAlarmRecordTracking: null,
    alarmRecordTotalCount: 0,
    alarmRecordFilteredCount: 0,
    alarmRecordFilter: {
        Draw: 1,
        Start: 0,
        Length: 5,
        SortColumn: "timestamp",
        SortDir: "desc",
        searchValue: "",
    }
};
export const AlarmSlice = createSlice({
    name: 'alarmRecordTrackings',
    initialState,
    reducers: {
        GetAlarms: (state, action:PayloadAction<AlarmType[]>) => {
            state.alarmRecordTrackings = action.payload;
        },
        SelectAlarm: (state, action: PayloadAction<string>) => {
            const selected = state.alarmRecordTrackings.find(
                (alarm: AlarmType) => alarm.id === action.payload
            );
            state.selectedAlarmRecordTracking = selected || null;
        },
        SearchAlarm: (state, action: PayloadAction<string>) => {
            state.alarmRecordTrackingSearch = action.payload;
        },
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.alarmRecordFilter = { ...state.alarmRecordFilter, ...action.payload };
        }

    },
    extraReducers: (builder) => {
        builder
        .addCase(fetchAlarmDT.fulfilled, (state, action) => {
            state.alarmRecordTotalCount = action.payload.recordsTotal;
            state.alarmRecordFilteredCount = action.payload.recordsFiltered;
        })
    }
});


export const {
    GetAlarms, SelectAlarm, SearchAlarm, UpdateFilter
} = AlarmSlice.actions;


export const fetchAlarm = () => async (dispatch: AppDispatch) => {
    try{
        const response = await axiosServices.get(`${API_URL}`);
        dispatch(GetAlarms(response.data.collection?.data || []));
        console.log("Alarm records fetched successfully: ", response.data);
    } catch (err: any) {
        console.error("Error fetching Alarm: ", err);
    }
};

export const fetchAlarmDT = createAsyncThunk(
    "alarmRecordTrackings/fetchAlarmDT",
    async (filter: any, { rejectWithValue }) => {
        try {
            const response = await axiosServices.post(`${API_DT_URL}`, filter);
            dispatch(GetAlarms(response.data.collection.data || []));
            console.log("Fetch Alarm", response.data.collection);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching Alarm:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

export default AlarmSlice.reducer;