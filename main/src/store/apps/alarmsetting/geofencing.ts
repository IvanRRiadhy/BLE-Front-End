import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";
import { Save } from "@mui/icons-material";
import axios from "axios";
import { defaultGeoFencingFilter } from "../defaultForm";
import { FloorplanType } from "../crud/floorplan";

const API_DT_URL = "/api/Geofence/filter/";
const API_URL = "/api/Geofence/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type Nodes = {
    id: string;
    x: number;
    y: number;
    x_px: number;
    y_px: number;
  };

export type GeoFencingAlarmType = {
    id: string;
    name: string;
    remarks: string;
    areaShape: string;
    color: string;
    isActive: boolean;
    floorId: string;
    floorplanId: string;
    floorplan?: FloorplanType;
    nodes?: Nodes[];
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
    filters?:{

    }
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
    drawingGeoFence?: string; 
    isEditing?: boolean;
};

const initialState: StateType = {
    geoFencingAlarms: [],
    geoFencingAlarmFilter: defaultGeoFencingFilter,
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
        GetAllGeoFencingAlarms: (state, action: PayloadAction<GeoFencingAlarmType[]>) => {
            state.geoFencingAlarmAll = action.payload;
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
            // console.log("Setting selected geofencing alarm:", action.payload);
            state.selectedGeoFencingAlarm = action.payload;
            // console.log("Selected geofencing alarm:", JSON.stringify(state.selectedGeoFencingAlarm));
        },
        UpdateSelectedGeoFencingAlarm: (state, action: PayloadAction<Partial<GeoFencingAlarmType>>) => {
            if (state.selectedGeoFencingAlarm) {
                state.selectedGeoFencingAlarm = {...state.selectedGeoFencingAlarm, ...action.payload};
            }
            // console.log("Updated selected geofencing alarm:", JSON.stringify(state.selectedGeoFencingAlarm));
        },
        SaveSelectedGeoFencingAlarm: (state) => {
            if (state.selectedGeoFencingAlarm) {
                const index = state.geoFencingAlarms.findIndex(item => item.id === state.selectedGeoFencingAlarm?.id);
                if (index !== -1) {
                    state.geoFencingAlarms[index] = state.selectedGeoFencingAlarm;
                }
            }
        },
        DrawGeoFence: (state, action: PayloadAction<string>) => {
            state.drawingGeoFence = action.payload;
        },
        SetIsEditing: (state, action: PayloadAction<boolean>) => {
            state.isEditing = action.payload;
        },
        CreateNewGeoFencingAlarm: (state) => {
            state.selectedGeoFencingAlarm = {
                id: `GeoFence-${new Date().getTime()}`,
                name: '',
                remarks: '',
                areaShape: '',
                color: '#f55549',
                isActive: true,
                floorplanId: '',
                floorId: '',
            };
        }   
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
    GetAllGeoFencingAlarms,
    UpdateFilter, 
    ChangeActiveStatus,
    SetSelectedGeoFencingAlarm,
    UpdateSelectedGeoFencingAlarm,
    SaveSelectedGeoFencingAlarm,
    DrawGeoFence,
    SetIsEditing,
    CreateNewGeoFencingAlarm
} = GeoFencingAlarmSlice.actions;

export const fetchGeoFencingAlarmsAll = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
            const normalized: GeoFencingAlarmType[] = (response.data.collection.data || []).map((item: any) => {
      let nodes: Nodes[] | undefined = undefined;
      try {
        if (item.areaShape) {
          const parsed = JSON.parse(item.areaShape);
          if (Array.isArray(parsed)) {
            nodes = parsed;
          }
        }
      } catch (err) {
        console.error("Invalid areaShape JSON:", item.areaShape, err);
      }

      return {
        ...item,
        isActive: item.isActive === 1, // 1 → true, 0 → false
        nodes, // ✅ add parsed nodes
      };
    });
        dispatch(GetAllGeoFencingAlarms(normalized || []));
    } catch (error) {
        console.error('Error fetching GeoFencing Alarms:', error);
    }
};

export const fetchGeoFencingAlarms = createAsyncThunk(
  'geoFencingAlarm/fetchGeoFencingAlarms',
  async (filter: GetFilter, thunkAPI) => {
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

    console.log("GeoFencing Alarm Response:", res);

    // 🔥 normalize isActive + parse areaShape into nodes
    const normalized: GeoFencingAlarmType[] = (res.data.collection.data || []).map((item: any) => {
      let nodes: Nodes[] | undefined = undefined;
      try {
        if (item.areaShape) {
          const parsed = JSON.parse(item.areaShape);
          if (Array.isArray(parsed)) {
            nodes = parsed;
          }
        }
      } catch (err) {
        console.error("Invalid areaShape JSON:", item.areaShape, err);
      }

      return {
        ...item,
        isActive: item.isActive === 1, // 1 → true, 0 → false
        nodes, // ✅ add parsed nodes
      };
    });

    dispatch(GetGeoFencingAlarms(normalized));
    await ensureMinLatency(started, 500);

    return {
      ...res.data.collection,
      data: normalized,
    };
  }
);


export const addGeoFencingAlarm = createAsyncThunk(
    'geoFencingAlarm/addGeoFencingAlarm',
    async(geoFence: GeoFencingAlarmType, thunkAPI) => {
        const started = Date.now();
        try{
            const { id, nodes, floorplan, ...rest } = geoFence;
            const filteredData = {
                ...rest,
                isActive: rest.isActive ? 1 : 0,
            };
            const res = await axiosServices.post(API_URL, filteredData);
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
    async(geoFence: GeoFencingAlarmType, thunkAPI) => {
        const started = Date.now();
        try{
            const { id, nodes, floorplan, ...rest } = geoFence;
            const filteredData = {
                ...rest,
                isActive: rest.isActive ? 1 : 0,
            };
            const res = await axiosServices.put(`${API_URL}${id}`, filteredData);
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

