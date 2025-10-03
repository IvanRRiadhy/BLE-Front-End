import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";
import { Save } from "@mui/icons-material";
import axios from "axios";
import { defaultBoundaryFilter } from "../defaultForm";
import { FloorplanType } from "../crud/floorplan";

const API_DT_URL = "/api/Boundary/filter/";
const API_URL = "/api/Boundary/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type Nodes = {
    id: string;
    x: number;
    y: number;
    x_px: number;
    y_px: number;
  };

  type BoundaryNodes = {
    a: Nodes[];
    b: Nodes[];
  }

export type BoundaryAlarmType = {
    id: string;
    name: string;
    remarks: string;
    areaShape: string;
    boundaryType: number;
    color: string;
    isActive: boolean;
    floorId: string;
    floorplanId: string;
    floorplan?: FloorplanType;
    nodes?: BoundaryNodes;
}

export type GetBoundaryResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : BoundaryAlarmType[];
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
    boundaryAlarms: BoundaryAlarmType[];
    boundaryAlarmFilter: GetFilter;
    boundaryAlarmAll: BoundaryAlarmType[];
    selectedBoundaryAlarm: BoundaryAlarmType | null;
    isLoading: boolean;
    hasLoaded: boolean;
        boundaryAlarmTotalCount: number;
    boundaryAlarmFilteredCount: number;
    boundaryAlarmActiveCount: number;
    drawingBoundary?: string; 
    isEditing?: boolean;
};

const initialState: StateType = {
    boundaryAlarms: [],
    boundaryAlarmFilter: defaultBoundaryFilter,
    boundaryAlarmAll: [],
    selectedBoundaryAlarm: null,
    isLoading: false,
    hasLoaded: false,
    boundaryAlarmTotalCount: 0,
    boundaryAlarmFilteredCount: 0,
    boundaryAlarmActiveCount: 0,

};

export const BoundaryAlarmSlice = createSlice({
    name: "BoundaryAlarm",
    initialState,
    reducers: {
        GetBoundaryAlarms: (state, action: PayloadAction<BoundaryAlarmType[]>) => {
            state.boundaryAlarms = action.payload;
        },
        GetAllBoundaryAlarms: (state, action: PayloadAction<BoundaryAlarmType[]>) => {
            state.boundaryAlarmAll = action.payload;
        },
        UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
            state.boundaryAlarmFilter = {...state.boundaryAlarmFilter, ...action.payload};
        },
        ChangeActiveStatus: (state, action: PayloadAction<{id: string; isActive: boolean}>) => {
            const index = state.boundaryAlarms.findIndex(item => item.id === action.payload.id);
            if (index !== -1) {
                state.boundaryAlarms[index].isActive = action.payload.isActive;
            }
        },  
        SetSelectedBoundaryAlarm: (state, action: PayloadAction<BoundaryAlarmType | null>) => {
            // console.log("Setting selected geofencing alarm:", action.payload);
            state.selectedBoundaryAlarm = action.payload;
            // console.log("Selected geofencing alarm:", JSON.stringify(state.selectedBoundaryAlarm));
        },
        UpdateSelectedBoundaryAlarm: (state, action: PayloadAction<Partial<BoundaryAlarmType>>) => {
            if (state.selectedBoundaryAlarm) {
                state.selectedBoundaryAlarm = {...state.selectedBoundaryAlarm, ...action.payload};
            }
            // console.log("Updated selected geofencing alarm:", JSON.stringify(state.selectedBoundaryAlarm));
        },
        SaveSelectedBoundaryAlarm: (state) => {
            if (state.selectedBoundaryAlarm) {
                const index = state.boundaryAlarms.findIndex(item => item.id === state.selectedBoundaryAlarm?.id);
                if (index !== -1) {
                    state.boundaryAlarms[index] = state.selectedBoundaryAlarm;
                }
            }
        },
        DrawBoundary: (state, action: PayloadAction<string>) => {
            state.drawingBoundary = action.payload;
        },
        SetIsEditing: (state, action: PayloadAction<boolean>) => {
            state.isEditing = action.payload;
        },
        CreateNewBoundaryAlarm: (state) => {
            state.selectedBoundaryAlarm = {
                id: `Boundary-${new Date().getTime()}`,
                name: '',
                remarks: '',
                areaShape: '',
                boundaryType: 0,
                color: '#45fc4eff',
                isActive: true,
                floorplanId: '',
                floorId: '',
            };
        }   
    },
    extraReducers: (builder) => {
        builder
        .addCase(fetchBoundaryAlarms.pending, (state) => {
            state.isLoading = true;
            state.hasLoaded = false;
        })
        .addCase(fetchBoundaryAlarms.fulfilled, (state, action) => {
            state.isLoading = false;
            state.hasLoaded = true;
            state.boundaryAlarmTotalCount = action.payload.recordsTotal;
            state.boundaryAlarmFilteredCount = action.payload.recordsFiltered;
            state.boundaryAlarmActiveCount = action.payload.data.filter((item: BoundaryAlarmType) => item.isActive).length;
        })
        .addCase(fetchBoundaryAlarms.rejected, (state) => {
            state.isLoading = false;
            state.hasLoaded = false;
        });
    }
});

export const { 
    GetBoundaryAlarms, 
    GetAllBoundaryAlarms,
    UpdateFilter, 
    ChangeActiveStatus,
    SetSelectedBoundaryAlarm,
    UpdateSelectedBoundaryAlarm,
    SaveSelectedBoundaryAlarm,
    DrawBoundary,
    SetIsEditing,
    CreateNewBoundaryAlarm
} = BoundaryAlarmSlice.actions;

export const fetchBoundaryAlarmsAll = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
            const normalized: BoundaryAlarmType[] = (response.data.collection.data || []).map((item: any) => {
      let nodes: BoundaryNodes  = {a: [], b: []};
      try {
  if (item.areaShape) {
    const parsed = JSON.parse(item.areaShape);
    if (parsed && parsed.a && parsed.b) {
      nodes = parsed as BoundaryNodes;
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
        dispatch(GetAllBoundaryAlarms(normalized || []));
    } catch (error) {
        console.error('Error fetching Boundary Alarms:', error);
    }
};

export const fetchBoundaryAlarms = createAsyncThunk(
  'boundaryAlarm/fetchBoundaryAlarms',
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

    console.log("Boundary Alarm Response:", res);

    // 🔥 normalize isActive + parse areaShape into nodes
    const normalized: BoundaryAlarmType[] = (res.data.collection.data || []).map((item: any) => {
      let nodes: BoundaryNodes | undefined = undefined;
        try {
            console.log("Area Shape:", item.areaShape);
        if (item.areaShape) {
            const parsed = JSON.parse(item.areaShape);
            console.log("Area Shape Parsed:", parsed);
            // ✅ new format
            if (parsed && parsed.a && parsed.b) {
            nodes = parsed as BoundaryNodes;
            console.log("Area Shape Nodes:", nodes);
            }
            // ✅ fallback: old format (flat array)
            else if (Array.isArray(parsed)) {
            nodes = { a: parsed, b: [] }; // wrap old array into {a, b}
            console.log("Area Shape Nodes:", nodes);
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
    console.log("Boundary Alarm Response:", normalized);
    dispatch(GetBoundaryAlarms(normalized));
    await ensureMinLatency(started, 500);

    return {
      ...res.data.collection,
      data: normalized,
    };
  }
);


export const addBoundaryAlarm = createAsyncThunk(
    'boundaryAlarm/addBoundaryAlarm',
    async(geoFence: BoundaryAlarmType, thunkAPI) => {
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

export const editBoundaryAlarm = createAsyncThunk(
    'boundaryAlarm/editBoundaryAlarm',
    async(geoFence: BoundaryAlarmType, thunkAPI) => {
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

export const deleteBoundaryAlarm = createAsyncThunk(
    'boundaryAlarm/deleteBoundaryAlarm',
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


export default BoundaryAlarmSlice.reducer;

