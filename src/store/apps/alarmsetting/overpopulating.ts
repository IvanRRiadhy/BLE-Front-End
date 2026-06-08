import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";
import { Save } from "@mui/icons-material";
import axios from "axios";
import { defaultOverPopulatingFilter } from "../defaultForm";
import { FloorplanType } from "../crud/floorplan";

const API_DT_URL = "/api/Overpopulating/filter/";
const API_URL = "/api/Overpopulating/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type Nodes = {
    id: string;
    x: number;
    y: number;
    x_px: number;
    y_px: number;
  };

export type OverPopulatingAlarmType = {
    id: string;
    name: string;
    remarks: string;
    areaShape: string;
    color: string;
    isActive: boolean;
    floorId: string;
    floorplanId: string;
    maxCapacity: number;
    floorplan?: FloorplanType;
    nodes?: Nodes[];
}

export type GetOverPopulatingResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : OverPopulatingAlarmType[];
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
    overPopulatingAlarms: OverPopulatingAlarmType[];
    overPopulatingAlarmFilter: GetFilter;
    overPopulatingAlarmAll: OverPopulatingAlarmType[];
    selectedOverPopulatingAlarm: OverPopulatingAlarmType | null;
    isLoading: boolean;
    hasLoaded: boolean;
        overPopulatingAlarmTotalCount: number;
    overPopulatingAlarmFilteredCount: number;
    overPopulatingAlarmActiveCount: number;
    drawingOverPopulating?: string; 
    isEditing?: boolean;
};

const initialState: StateType = {
    overPopulatingAlarms: [],
    overPopulatingAlarmFilter: defaultOverPopulatingFilter,
    overPopulatingAlarmAll: [],
    selectedOverPopulatingAlarm: null,
    isLoading: false,
    hasLoaded: false,
    overPopulatingAlarmTotalCount: 0,
    overPopulatingAlarmFilteredCount: 0,
    overPopulatingAlarmActiveCount: 0,

};

export const OverPopulatingAlarmSlice = createSlice({
    name: "OverPopulatingAlarm",
    initialState,
    reducers: {
        GetOverPopulatingAlarms: (state, action: PayloadAction<OverPopulatingAlarmType[]>) => {
            state.overPopulatingAlarms = action.payload;
        },
        GetAllOverPopulatingAlarms: (state, action: PayloadAction<OverPopulatingAlarmType[]>) => {
            state.overPopulatingAlarmAll = action.payload;
        },
        UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
            state.overPopulatingAlarmFilter = {...state.overPopulatingAlarmFilter, ...action.payload};
        },
        ChangeActiveStatus: (state, action: PayloadAction<{id: string; isActive: boolean}>) => {
            const index = state.overPopulatingAlarms.findIndex(item => item.id === action.payload.id);
            if (index !== -1) {
                state.overPopulatingAlarms[index].isActive = action.payload.isActive;
            }
        },  
        SetSelectedOverPopulatingAlarm: (state, action: PayloadAction<OverPopulatingAlarmType | null>) => {
            // console.log("Setting selected geofencing alarm:", action.payload);
            state.selectedOverPopulatingAlarm = action.payload;
            // console.log("Selected geofencing alarm:", JSON.stringify(state.selectedOverPopulatingAlarm));
        },
        UpdateSelectedOverPopulatingAlarm: (state, action: PayloadAction<Partial<OverPopulatingAlarmType>>) => {
            if (state.selectedOverPopulatingAlarm) {
                state.selectedOverPopulatingAlarm = {...state.selectedOverPopulatingAlarm, ...action.payload};
            }
            // console.log("Updated selected geofencing alarm:", JSON.stringify(state.selectedOverPopulatingAlarm));
        },
        SaveSelectedOverPopulatingAlarm: (state) => {
            if (state.selectedOverPopulatingAlarm) {
                const index = state.overPopulatingAlarms.findIndex(item => item.id === state.selectedOverPopulatingAlarm?.id);
                if (index !== -1) {
                    state.overPopulatingAlarms[index] = state.selectedOverPopulatingAlarm;
                }
            }
        },
        DrawOverPopulating: (state, action: PayloadAction<string>) => {
            state.drawingOverPopulating = action.payload;
        },
        SetIsEditing: (state, action: PayloadAction<boolean>) => {
            state.isEditing = action.payload;
        },
        CreateNewOverPopulatingAlarm: (state) => {
            state.selectedOverPopulatingAlarm = {
                id: `OverPopulating-${new Date().getTime()}`,
                name: '',
                remarks: '',
                areaShape: '',
                color: '#eff549ff',
                isActive: true,
                floorplanId: '',
                floorId: '',
                maxCapacity: 0,
            };
        }   
    },
    extraReducers: (builder) => {
        builder
        .addCase(fetchOverPopulatingAlarms.pending, (state) => {
            state.isLoading = true;
            state.hasLoaded = false;
        })
        .addCase(fetchOverPopulatingAlarms.fulfilled, (state, action) => {
            state.isLoading = false;
            state.hasLoaded = true;
            state.overPopulatingAlarmTotalCount = action.payload.recordsTotal;
            state.overPopulatingAlarmFilteredCount = action.payload.recordsFiltered;
            state.overPopulatingAlarmActiveCount = action.payload.data.filter((item: OverPopulatingAlarmType) => item.isActive).length;
        })
        .addCase(fetchOverPopulatingAlarms.rejected, (state) => {
            state.isLoading = false;
            state.hasLoaded = false;
        });
    }
});

export const { 
    GetOverPopulatingAlarms, 
    GetAllOverPopulatingAlarms,
    UpdateFilter, 
    ChangeActiveStatus,
    SetSelectedOverPopulatingAlarm,
    UpdateSelectedOverPopulatingAlarm,
    SaveSelectedOverPopulatingAlarm,
    DrawOverPopulating,
    SetIsEditing,
    CreateNewOverPopulatingAlarm
} = OverPopulatingAlarmSlice.actions;

export const fetchOverPopulatingAlarmsAll = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
            const normalized: OverPopulatingAlarmType[] = (response.data.collection.data || []).map((item: any) => {
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
        dispatch(GetAllOverPopulatingAlarms(normalized || []));
    } catch (error) {
        console.error('Error fetching OverPopulating Alarms:', error);
    }
};

export const fetchOverPopulatingAlarms = createAsyncThunk(
  'overPopulatingAlarm/fetchOverPopulatingAlarms',
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

    console.log("OverPopulating Alarm Response:", res);

    // 🔥 normalize isActive + parse areaShape into nodes
    const normalized: OverPopulatingAlarmType[] = (res.data.collection.data || []).map((item: any) => {
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

    dispatch(GetOverPopulatingAlarms(normalized));
    await ensureMinLatency(started, 500);

    return {
      ...res.data.collection,
      data: normalized,
    };
  }
);


export const addOverPopulatingAlarm = createAsyncThunk(
    'overPopulatingAlarm/addOverPopulatingAlarm',
    async(geoFence: OverPopulatingAlarmType, thunkAPI) => {
        const started = Date.now();
        try{
            const { id, nodes, floorplan, ...rest } = geoFence;
            const filteredData = {
                ...rest,
                isActive: rest.isActive ? 1 : 0,
            };
            console.log(filteredData);
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

export const editOverPopulatingAlarm = createAsyncThunk(
    'overPopulatingAlarm/editOverPopulatingAlarm',
    async(geoFence: OverPopulatingAlarmType, thunkAPI) => {
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

export const deleteOverPopulatingAlarm = createAsyncThunk(
    'overPopulatingAlarm/deleteOverPopulatingAlarm',
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


export default OverPopulatingAlarmSlice.reducer;

