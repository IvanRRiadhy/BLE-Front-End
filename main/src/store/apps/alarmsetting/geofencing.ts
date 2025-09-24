import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";
import { Save } from "@mui/icons-material";
import axios from "axios";

const API_DT_URL = "/api/Geofence/filter/";
const API_URL = "/api/Geofence/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type GeoFencingAlarmType = {
    id: string;
    name: string;
    remarks: string;
    areaShape: string;
    colorArea: string;
    behavior: string;
    isActive: boolean;
}

export type GetGeoFencingResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : GeoFencingAlarmType[];
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

interface StateType {
    geoFencingAlarms: GeoFencingAlarmType[];
    geoFencingAlarmFilter: GetFilter;
    geoFencingAlarmAll: GeoFencingAlarmType[];
    selectedGeoFencingAlarm: GeoFencingAlarmType | null;
    isLoading: boolean;
    hasLoaded: boolean;
        geoFencingAlarmTotalCount: number;
    geoFencingAlarmFilteredCount: number;
    geoFencingAlarmActiveCount: number;
};

const initialState: StateType = {
    geoFencingAlarms: [],
    geoFencingAlarmFilter: {
        Draw: 0,
        Start: 0,
        Length: 10,
        SortColumn: 'Name',
        SortDir: 'asc',
        SearchValue: '',
    },
    geoFencingAlarmAll: [],
    selectedGeoFencingAlarm: null,
    isLoading: false,
    hasLoaded: false,
    geoFencingAlarmTotalCount: 0,
    geoFencingAlarmFilteredCount: 0,
    geoFencingAlarmActiveCount: 0,
};

export const GeoFencingAlarmSlice = createSlice({
    name: "GeoFencingAlarm",
    initialState,
    reducers: {
        GetGeoFencingAlarms: (state, action: PayloadAction<GeoFencingAlarmType[]>) => {
            state.geoFencingAlarms = action.payload;
        },
        UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
            state.geoFencingAlarmFilter = {...state.geoFencingAlarmFilter, ...action.payload};
        },
        ChangeActiveStatus: (state, action: PayloadAction<{id: string; isActive: boolean}>) => {
            const index = state.geoFencingAlarms.findIndex(item => item.id === action.payload.id);
            if (index !== -1) {
                state.geoFencingAlarms[index].isActive = action.payload.isActive;
            }
        },  
        SetSelectedGeoFencingAlarm: (state, action: PayloadAction<GeoFencingAlarmType | null>) => {
            state.selectedGeoFencingAlarm = action.payload;
        },
        UpdateSelectedGeoFencingAlarm: (state, action: PayloadAction<Partial<GeoFencingAlarmType>>) => {
            if (state.selectedGeoFencingAlarm) {
                state.selectedGeoFencingAlarm = {...state.selectedGeoFencingAlarm, ...action.payload};
            }
        },
        SaveSelectedGeoFencingAlarm: (state) => {
            if (state.selectedGeoFencingAlarm) {
                const index = state.geoFencingAlarms.findIndex(item => item.id === state.selectedGeoFencingAlarm?.id);
                if (index !== -1) {
                    state.geoFencingAlarms[index] = state.selectedGeoFencingAlarm;
                }
            }
        },
    },
    extraReducers: (builder) => {
        builder
        .addCase(fetchGeoFencingAlarms.pending, (state) => {
            state.isLoading = true;
            state.hasLoaded = false;
        })
        .addCase(fetchGeoFencingAlarms.fulfilled, (state, action) => {
            state.isLoading = false;
            state.hasLoaded = true;
            state.geoFencingAlarmTotalCount = action.payload.recordsTotal;
            state.geoFencingAlarmFilteredCount = action.payload.recordsFiltered;
            state.geoFencingAlarmActiveCount = action.payload.data.filter((item: GeoFencingAlarmType) => item.isActive).length;
        })
        .addCase(fetchGeoFencingAlarms.rejected, (state) => {
            state.isLoading = false;
            state.hasLoaded = false;
        });
    }
});

export const { 
    GetGeoFencingAlarms, 
    UpdateFilter, 
    ChangeActiveStatus,
    SetSelectedGeoFencingAlarm,
    UpdateSelectedGeoFencingAlarm,
    SaveSelectedGeoFencingAlarm
} = GeoFencingAlarmSlice.actions;

export const fetchGeoFencingAlarms = createAsyncThunk(
    'geoFencingAlarm/fetchGeoFencingAlarms',
    async (filter: GetFilter, thunkAPI) => {
        const started = Date.now();
        // dispatch(GetGeoFencingAlarms(geofencingDummyData));
        const res = await retryUntilSuccess(
            () => axiosServices.post(API_DT_URL, filter ),
            {
                signal: thunkAPI.signal,     
                timeoutMs: 2 * 60 * 1000,    
                minDelay: 500,
                maxDelay: 8000,
            }
        )
        console.log("GeoFencing Alarm Response:", res);
    // 🔥 normalize isActive
    const normalized = (res.data.collection.data || []).map((item: any) => ({
      ...item,
      isActive: item.isActive === 1, // 1 → true, 0 → false
    }));

    dispatch(GetGeoFencingAlarms(normalized));
    await ensureMinLatency(started, 500);

    return {
      ...res.data.collection,
      data: normalized, // keep normalized in the returned payload too
    };
    }
)

export const addGeoFencingAlarm = createAsyncThunk(
    'geoFencingAlarm/addGeoFencingAlarm',
    async(formData: FormData, thunkAPI) => {
        const started = Date.now();
        try{
            const res = await axiosServices.post(API_URL, formData);
            const elapsed = Date.now() - started;
            if(elapsed < 500){
                await delay(500 - elapsed);
            }
            return res.data;
        }catch(error){
            return thunkAPI.rejectWithValue(error);
        }
});

export const editGeoFencingAlarm = createAsyncThunk(
    'geoFencingAlarm/editGeoFencingAlarm',
    async(formData: FormData, thunkAPI) => {
        const started = Date.now();
        try{
            const id = formData.get('id'); // Extract ID from FormData
            formData.delete('id'); // Remove ID from FormData to avoid sending it again
            const res = await axiosServices.put(`${API_URL}${id}`, formData);
            const elapsed = Date.now() - started;
            if(elapsed < 500){
                await delay(500 - elapsed);
            }
            return res.data;
        }catch(error){
            return thunkAPI.rejectWithValue(error);
        }
    });

export const deleteGeoFencingAlarm = createAsyncThunk(
    'geoFencingAlarm/deleteGeoFencingAlarm',
    async(id: string, thunkAPI) => {
        const started = Date.now();
        try{
            const res = await axiosServices.delete(`${API_URL}${id}`);
            const elapsed = Date.now() - started;
            if(elapsed < 500){
                await delay(500 - elapsed);
            }
            return res.data;
        }catch(error){
            return thunkAPI.rejectWithValue(error);
        }
    });


export default GeoFencingAlarmSlice.reducer;

