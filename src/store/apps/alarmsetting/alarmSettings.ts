import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";
import { defaultAlarmSettingFilter } from "../defaultForm";

const API_URL = "/api/AlarmCategorySettings/";
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
    alarmCategory: string;
    remarks: string;
    isEnabled: boolean;
    alarmLevelPriority: "Low" | "Medium" | "High";
    alarmColor: string;
    notifyIntervalSec: number;
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
    alarmSettingFilter: defaultAlarmSettingFilter,
    alarmSettingAll: [],
    isLoading: false,
    hasLoaded: true,
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
        GetAlarmSettingAll: (state, action: PayloadAction<AlarmSettingType[]>) => {
            state.alarmSettingAll = action.payload;
        },
        UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
            state.alarmSettingFilter = { ...state.alarmSettingFilter, ...action.payload};
        },
        ChangeActiveStatus: (state, action: PayloadAction<{id: string, isEnabled: boolean}>) => {
            const index = state.alarmSettings.findIndex(alarmSetting => alarmSetting.id === action.payload.id);
            if (index !== -1) {
                state.alarmSettings[index].isEnabled = action.payload.isEnabled;
            }
        },
        ChangePriorityStatus: (state, action: PayloadAction<{id: string, priority: "Low" | "Medium" | "High"}>) => {
            const index = state.alarmSettings.findIndex(alarmSetting => alarmSetting.id === action.payload.id);
            if (index !== -1) {
                state.alarmSettings[index].alarmLevelPriority = action.payload.priority;
            }
        },
    },
    extraReducers: (builder) => {
        builder
        .addCase(fetchAlarmSettingsDT.pending, (state) => {
            // state.isLoading = true;
            // state.hasLoaded = false;
        })
        .addCase(fetchAlarmSettingsDT.fulfilled, (state, action) => {
            // state.isLoading = false;
            // state.hasLoaded = true;
    state.alarmSettingTotalCount = action.payload.recordsTotal;
    state.alarmSettingFilteredCount = action.payload.recordsFiltered;
  state.alarmSettingActiveCount = (action.payload.data ?? []).filter(
    (a: any) => a.isEnabled === 1 // API still sends 1/0 here
  ).length;
        })
        .addCase(fetchAlarmSettingsDT.rejected, (state) => {
            // state.isLoading = false;
            // state.hasLoaded = false;
        });
    },
});

export const { GetAlarmSetting, GetAlarmSettingAll, UpdateFilter, ChangeActiveStatus, ChangePriorityStatus } = AlarmSettingSlice.actions;

export const fetchAlarmSetting = createAsyncThunk(
    'alarmSetting/fetchAlarmSetting',
    async (_, thunkAPI) => {
        try {
            const response = await axiosServices.get(API_URL);
                    const normalized : AlarmSettingType[] = response.data.collection.data.map((item: any) => ({
            ...item,
            isEnabled: item.isEnabled === 1,
        }));
            dispatch(GetAlarmSettingAll(normalized));
            return response.data.collection;
        } catch (error) {
            return thunkAPI.rejectWithValue(error);
        }
    }
)

export const fetchAlarmSettingsDT = createAsyncThunk(
    'alarmSetting/fetchAlarmSettiingsDT',
    async (filter: GetFilter, thunkAPI) => {    
        const started = Date.now();
            const res = await retryUntilSuccess(
              () => axiosServices.post(`${API_URL}filter`, filter),
              {
                signal: thunkAPI.signal,
                timeoutMs: 2 * 60 * 1000,
                minDelay: 500,
                maxDelay: 8000,
              }
            );
        const normalized : AlarmSettingType[] = res.data.collection.data.map((item: any) => ({
            ...item,
            isEnabled: item.isEnabled === 1,
        }));
        console.log("Alarm Settings Response:", res.data.collection);
        dispatch(GetAlarmSetting(normalized));
        await ensureMinLatency(started, 500);
        return res.data.collection;
    }
)

export const editAlarmSetting = createAsyncThunk(
    'alarmSetting/editAlarmSetting',
    async (data: AlarmSettingType, thunkAPI) => {
    try {
      const { id, isEnabled, ...rest } = data;

      // 🔹 transform isEnabled (boolean → number)
      const filteredData = {
        ...rest,
        isEnabled: isEnabled ? 1 : 0,
      };

      const response = await axiosServices.put(`${API_URL}${id}`, filteredData);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
    
)


export default AlarmSettingSlice.reducer;

