import axiosServices from "../../../utils/axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { masterVisitorType, VisitorType } from "./visitor";
import { bleReaderType } from "./bleReader";
import { MaskedAreaType } from "./maskedArea";
import { defaultAlarmRecordFilter } from "../defaultForm";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";
import { AlarmTriggerType } from "./alarmTrigger";
import { memberType } from "./member";

const API_URL = '/api/AlarmRecordTracking/';
const API_DT_URL = '/api/AlarmRecordTracking/filter/';
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
    SearchValue: string,
    dateFilters?:{
        TimeStamp?: {
            DateFrom?: string | null,
            DateTo?: string | null,
        }
    }
    filters: {
        FloorplanMaskedAreaId?: string[],
        ReaderId?: string[],
        VisitorId?: string[],
        MemberId?: string[],
    }
}


export interface AlarmType {
    id: string;
    timestamp: string;
    visitorId?: string;
    memberId?: string;
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
    member?: memberType;
    visitor?: VisitorType;
    reader?: bleReaderType;
    floorplanMaskedArea?: MaskedAreaType; 
    alarmTriggers: AlarmTriggerType;
};

interface StateType {
    alarmRecordTrackings: AlarmType[];
    alarmRecordTrackingAll: AlarmType[];
    alarmRecordTrackingSearch: string;
    selectedAlarmRecordTracking?: AlarmType | null;
    alarmRecordTotalCount: number;
    alarmRecordFilteredCount: number;
    alarmRecordFilter: GetFilter
isLoading: boolean;
hasLoaded: boolean;
};

const initialState: StateType = {
    alarmRecordTrackings: [],
    alarmRecordTrackingAll: [],
    alarmRecordTrackingSearch: '',
    selectedAlarmRecordTracking: null,
    alarmRecordTotalCount: 0,
    alarmRecordFilteredCount: 0,
    alarmRecordFilter: defaultAlarmRecordFilter,
    isLoading: false,
    hasLoaded: false,
};
export const AlarmSlice = createSlice({
    name: 'alarmRecordTrackings',
    initialState,
    reducers: {
        GetAlarms: (state, action:PayloadAction<AlarmType[]>) => {
            state.alarmRecordTrackings = action.payload;
        },
        GetAllAlarms: (state, action:PayloadAction<AlarmType[]>) => {
            state.alarmRecordTrackingAll = action.payload;
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
        .addCase(fetchAlarmDT.pending, (state) => {
            state.isLoading = true;
            state.hasLoaded = false;
        })
        .addCase(fetchAlarmDT.fulfilled, (state, action) => {
            state.alarmRecordTotalCount = action.payload.recordsTotal;
            state.alarmRecordFilteredCount = action.payload.recordsFiltered;
                state.isLoading = false;
                state.hasLoaded = true;
        })
        .addCase(fetchAlarmDT.rejected, (_state, action) => {
            console.error("Error fetching Alarm: ", action.payload);
            // _state.alarmRecordTotalCount = 0;
            _state.alarmRecordFilteredCount = 0;
                _state.isLoading = false;
                _state.hasLoaded = false;
        });
    }
});


export const {
    GetAlarms,GetAllAlarms, SelectAlarm, SearchAlarm, UpdateFilter
} = AlarmSlice.actions;


export const fetchAlarm = () => async (dispatch: AppDispatch) => {
    try{
        const response = await axiosServices.get(`${API_URL}`);
        dispatch(GetAllAlarms(response.data.collection?.data || []));
        // console.log("Alarm records fetched successfully: ", response.data);
    } catch (err: any) {
        console.error("Error fetching Alarm: ", err);
    }
};

export const fetchAlarmDT = createAsyncThunk(
  "alarmRecordTrackings/fetchAlarmDT",
  async (filter: any, thunkAPI) => {
    const { dispatch, rejectWithValue } = thunkAPI;
    const started = Date.now();

    try {
      // Early guard: skip if any filter array contains "Empty"
      if (
        filter?.filters &&
        Object.values(filter.filters).some(
          (arr: any) => Array.isArray(arr) && arr.includes("Empty")
        )
      ) {
        await ensureMinLatency(started, 500);
        return rejectWithValue("Filter contains 'Empty', skipping request");
      }
      console.log("Filters: ", filter)
      // Retry-able request with cancellation
      const response = await retryUntilSuccess(
        () => axiosServices.post(`${API_DT_URL}`, filter)
      );
      console.log("Alarm records fetched successfully: ", response.data);
      // Update list in store
      dispatch(GetAlarms(response.data.collection.data || []));

      await ensureMinLatency(started, 500);
      return response.data.collection; // { data, draw, recordsTotal, recordsFiltered }
    } catch (error: any) {
      console.error("Error fetching Alarm:", error);
      await ensureMinLatency(started, 500);
      return rejectWithValue(error?.response?.data || "Unknown error");
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
            // console.log("Alarm imported: ", response.data);
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
        const url = `http://192.168.1.116:5000${API_URL}export/${filter}`;
        const accessToken = localStorage.getItem("token");
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers:{
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-BIOPEOPLETRACKING-API-KEY':
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