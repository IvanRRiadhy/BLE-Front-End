import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { ensureMinLatency } from "src/utils/retry";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type GetCCTVResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : AlarmSettingType[];
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
};


export type AlarmSettingType = {
    id: string;
    name: string;
    isActive: boolean;
};

interface StateType {
    alarmSettings: AlarmSettingType[];
    alarmSettingFilter: GetFilter;
    alarmSettingAll: AlarmSettingType[];
    isLoading: boolean;
    hasLoaded: boolean;
        alarmSettingTotalCount: number;
    alarmSettingFilteredCount: number;
    alarmSettingActiveCount: number;
};

const initialState: StateType = {
    alarmSettings: [],
    alarmSettingFilter: {
        Draw: 0,
        Start: 0,
        Length: 10,
        SortColumn: 'Name',
        SortDir: 'asc',
        SearchValue: '',
    },
    alarmSettingAll: [],
    isLoading: false,
    hasLoaded: false,
    alarmSettingTotalCount: 0,
    alarmSettingFilteredCount: 0,
    alarmSettingActiveCount: 0,
};

export const AlarmSettingSlice = createSlice({
    name: "alarmSetting",
    initialState,
    reducers: {
        GetAlarmSetting: (state, action: PayloadAction<AlarmSettingType[]>) => {
            state.alarmSettings = action.payload;
        },
        UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
            state.alarmSettingFilter = { ...state.alarmSettingFilter, ...action.payload};
        },
        ChangeActiveStatus: (state, action: PayloadAction<{id: string, isActive: boolean}>) => {
            const index = state.alarmSettings.findIndex(alarmSetting => alarmSetting.id === action.payload.id);
            if (index !== -1) {
                state.alarmSettings[index].isActive = action.payload.isActive;
            }
        },
    },
    extraReducers: (builder) => {
        builder
        .addCase(fetchAlarmSettingsDT.pending, (state) => {
            state.isLoading = true;
            state.hasLoaded = false;
        })
        .addCase(fetchAlarmSettingsDT.fulfilled, (state, action) => {
            state.isLoading = false;
            state.hasLoaded = true;
    state.alarmSettingTotalCount = action.payload.length;
    state.alarmSettingFilteredCount = action.payload.length;
    state.alarmSettingActiveCount = action.payload.filter(a => a.isActive).length;
        })
        .addCase(fetchAlarmSettingsDT.rejected, (state) => {
            state.isLoading = false;
            state.hasLoaded = false;
        });
    },
});

export const { GetAlarmSetting, UpdateFilter, ChangeActiveStatus } = AlarmSettingSlice.actions;

export const fetchAlarmSettingsDT = createAsyncThunk(
    'alarmSetting/fetchAlarmSettiingsDT',
    async (filter: GetFilter, thunkAPI) => {
        const started = Date.now();
        dispatch(GetAlarmSetting(AlarmSettingDummy));
        await ensureMinLatency(started, 500);
        return AlarmSettingDummy;
    }
)


export default AlarmSettingSlice.reducer;

const AlarmSettingDummy = [
    { id: "1", name: "GeoFencing", isActive: true },
    { id: "2", name: "People Counting", isActive: false },
    { id: "3", name: "Line Detection", isActive: true },
    { id: "4", name: "Alarm A", isActive: false },
    { id: "5", name: "Alarm B", isActive: true },
    { id: "6", name: "Alarm C", isActive: false },
]