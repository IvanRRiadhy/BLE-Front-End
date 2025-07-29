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
    filters: {
        FloorplanMaskedAreaId: string[],
        ReaderId: string[],
        VisitorId: string[],
    }
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
        SortColumn: "Timestamp",
        SortDir: "desc",
        searchValue: "",
        filters: {
            FloorplanMaskedAreaId: [],
            ReaderId: [],
            VisitorId: [],
        }
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
        .addCase(fetchAlarmDT.rejected, (_state, action) => {
            console.error("Error fetching Alarm: ", action.payload);
            // _state.alarmRecordTotalCount = 0;
            _state.alarmRecordFilteredCount = 0;
        });
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
                                if (
            filter?.filters &&
            Object.values(filter.filters).some(
                (arr: any) => Array.isArray(arr) && arr.includes("Empty")
            )
        ) {
            console.log("Filter contains 'Empty', skipping request");
            // Option 1: just return null (success, no data)
            // return null;
            // Option 2: reject, if you want to treat as error
            return rejectWithValue("Filter contains 'Empty', skipping request");
        }
            const response = await axiosServices.post(`${API_DT_URL}`, filter);
            dispatch(GetAlarms(response.data.collection.data || []));
            console.log("Fetch Alarm", response.data.collection);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching Alarm:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export const ImportAlarm = createAsyncThunk(
    "alarmRecordTrackings/importAlarm",
    async (formData: FormData, { rejectWithValue }) => {
        try {
            const response = await axiosServices.post(`${API_URL}import`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            console.log("Alarm imported: ", response.data);
            return response.data;
        } catch (error: any) {
            console.error("Error importing Alarm:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export const ExportAlarm = createAsyncThunk(
    "alarmRecordTrackings/exportAlarm",
    async (filter: "pdf" | "excel", { rejectWithValue }) => {
        const url = `${API_URL}export/${filter}`;
        const accessToken = localStorage.getItem("token");
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers:{
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-API-KEY-TRACKING-PEOPLE':
            'FujDuGTsyEXVwkKrtRgn52APwAVRGmPOiIRX8cffynDvIW35bJaGeH3NcH6HcSeK',
        },
            });
            if(!response.ok) throw new Error('Export failed');
                  const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filter === 'pdf' ? 'alarm.pdf' : 'alarm.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      return true; // Indicate success
        } catch (error: any) {
            console.error("Error exporting Alarm:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export default AlarmSlice.reducer;