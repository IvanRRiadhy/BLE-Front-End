import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";
import { Save } from "@mui/icons-material";
import axios from "axios";
import { defaultStayOnAreaFilter } from "../defaultForm";
import { FloorplanType } from "../crud/floorplan";

const API_DT_URL = "/api/StayOnArea/filter/";
const API_URL = "/api/StayOnArea/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type Nodes = {
    id: string;
    x: number;
    y: number;
    x_px: number;
    y_px: number;
  };

export type StayOnAreaAlarmType = {
    id: string;
    name: string;
    remarks: string;
    areaShape: string;
    color: string;
    isActive: boolean;
    floorId: string;
    floorplanId: string;
    maxDuration: number;
    floorplan?: FloorplanType;
    nodes?: Nodes[];
}

export type GetStayOnAreaResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : StayOnAreaAlarmType[];
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
    stayOnAreaAlarms: StayOnAreaAlarmType[];
    stayOnAreaAlarmFilter: GetFilter;
    stayOnAreaAlarmAll: StayOnAreaAlarmType[];
    selectedStayOnAreaAlarm: StayOnAreaAlarmType | null;
    isLoading: boolean;
    hasLoaded: boolean;
        stayOnAreaAlarmTotalCount: number;
    stayOnAreaAlarmFilteredCount: number;
    stayOnAreaAlarmActiveCount: number;
    drawingStayOnArea?: string; 
    isEditing?: boolean;
};

const initialState: StateType = {
    stayOnAreaAlarms: [],
    stayOnAreaAlarmFilter: defaultStayOnAreaFilter,
    stayOnAreaAlarmAll: [],
    selectedStayOnAreaAlarm: null,
    isLoading: false,
    hasLoaded: false,
    stayOnAreaAlarmTotalCount: 0,
    stayOnAreaAlarmFilteredCount: 0,
    stayOnAreaAlarmActiveCount: 0,

};

export const StayOnAreaAlarmSlice = createSlice({
    name: "StayOnAreaAlarm",
    initialState,
    reducers: {
        GetStayOnAreaAlarms: (state, action: PayloadAction<StayOnAreaAlarmType[]>) => {
            state.stayOnAreaAlarms = action.payload;
        },
        GetAllStayOnAreaAlarms: (state, action: PayloadAction<StayOnAreaAlarmType[]>) => {
            state.stayOnAreaAlarmAll = action.payload;
        },
        UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
            state.stayOnAreaAlarmFilter = {...state.stayOnAreaAlarmFilter, ...action.payload};
        },
        ChangeActiveStatus: (state, action: PayloadAction<{id: string; isActive: boolean}>) => {
            const index = state.stayOnAreaAlarms.findIndex(item => item.id === action.payload.id);
            if (index !== -1) {
                state.stayOnAreaAlarms[index].isActive = action.payload.isActive;
            }
        },  
        SetSelectedStayOnAreaAlarm: (state, action: PayloadAction<StayOnAreaAlarmType | null>) => {
            // console.log("Setting selected geofencing alarm:", action.payload);
            state.selectedStayOnAreaAlarm = action.payload;
            // console.log("Selected geofencing alarm:", JSON.stringify(state.selectedStayOnAreaAlarm));
        },
        UpdateSelectedStayOnAreaAlarm: (state, action: PayloadAction<Partial<StayOnAreaAlarmType>>) => {
            if (state.selectedStayOnAreaAlarm) {
                state.selectedStayOnAreaAlarm = {...state.selectedStayOnAreaAlarm, ...action.payload};
            }
            // console.log("Updated selected geofencing alarm:", JSON.stringify(state.selectedStayOnAreaAlarm));
        },
        SaveSelectedStayOnAreaAlarm: (state) => {
            if (state.selectedStayOnAreaAlarm) {
                const index = state.stayOnAreaAlarms.findIndex(item => item.id === state.selectedStayOnAreaAlarm?.id);
                if (index !== -1) {
                    state.stayOnAreaAlarms[index] = state.selectedStayOnAreaAlarm;
                }
            }
        },
        DrawStayOnArea: (state, action: PayloadAction<string>) => {
            state.drawingStayOnArea = action.payload;
        },
        SetIsEditing: (state, action: PayloadAction<boolean>) => {
            state.isEditing = action.payload;
        },
        CreateNewStayOnAreaAlarm: (state) => {
            state.selectedStayOnAreaAlarm = {
                id: `StayOnArea-${new Date().getTime()}`,
                name: '',
                remarks: '',
                areaShape: '',
                color: '#70e3fdff',
                isActive: true,
                floorplanId: '',
                floorId: '',
                maxDuration: 0,
            };
        }   
    },
    extraReducers: (builder) => {
        builder
        .addCase(fetchStayOnAreaAlarms.pending, (state) => {
            state.isLoading = true;
            state.hasLoaded = false;
        })
        .addCase(fetchStayOnAreaAlarms.fulfilled, (state, action) => {
            state.isLoading = false;
            state.hasLoaded = true;
            state.stayOnAreaAlarmTotalCount = action.payload.recordsTotal;
            state.stayOnAreaAlarmFilteredCount = action.payload.recordsFiltered;
            state.stayOnAreaAlarmActiveCount = action.payload.data.filter((item: StayOnAreaAlarmType) => item.isActive).length;
        })
        .addCase(fetchStayOnAreaAlarms.rejected, (state) => {
            state.isLoading = false;
            state.hasLoaded = false;
        });
    }
});

export const { 
    GetStayOnAreaAlarms, 
    GetAllStayOnAreaAlarms,
    UpdateFilter, 
    ChangeActiveStatus,
    SetSelectedStayOnAreaAlarm,
    UpdateSelectedStayOnAreaAlarm,
    SaveSelectedStayOnAreaAlarm,
    DrawStayOnArea,
    SetIsEditing,
    CreateNewStayOnAreaAlarm
} = StayOnAreaAlarmSlice.actions;

export const fetchStayOnAreaAlarmsAll = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
            const normalized: StayOnAreaAlarmType[] = (response.data.collection.data || []).map((item: any) => {
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
        dispatch(GetAllStayOnAreaAlarms(normalized || []));
    } catch (error) {
        console.error('Error fetching StayOnArea Alarms:', error);
    }
};

export const fetchStayOnAreaAlarms = createAsyncThunk(
  'stayOnAreaAlarm/fetchStayOnAreaAlarms',
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

    console.log("StayOnArea Alarm Response:", res);

    // 🔥 normalize isActive + parse areaShape into nodes
    const normalized: StayOnAreaAlarmType[] = (res.data.collection.data || []).map((item: any) => {
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

    dispatch(GetStayOnAreaAlarms(normalized));
    await ensureMinLatency(started, 500);

    return {
      ...res.data.collection,
      data: normalized,
    };
  }
);


export const addStayOnAreaAlarm = createAsyncThunk(
    'stayOnAreaAlarm/addStayOnAreaAlarm',
    async(geoFence: StayOnAreaAlarmType, thunkAPI) => {
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

export const editStayOnAreaAlarm = createAsyncThunk(
    'stayOnAreaAlarm/editStayOnAreaAlarm',
    async(geoFence: StayOnAreaAlarmType, thunkAPI) => {
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

export const deleteStayOnAreaAlarm = createAsyncThunk(
    'stayOnAreaAlarm/deleteStayOnAreaAlarm',
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


export default StayOnAreaAlarmSlice.reducer;

