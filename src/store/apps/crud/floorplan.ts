import axiosServices, { BASE_URL } from "../../../utils/axios";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { floorType } from "./floor";
import { FloorplanDeviceType } from "./floorplanDevice";
import { MaskedAreaType } from "./maskedArea";
import { defaultFloorplanFilter } from "../defaultForm";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";
import { EngineType } from "./engine";

const Floorplan_API_URL = '/api/MstFloorplan/';
const Floorplan_DT_URL = '/api/MstFloorplan/filter/';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
    filters: {
        FloorId: string[],
    }
}


export type GetFloorplanResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : FloorplanType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

export interface FloorplanType {
    id: string,
    name: string,
    floorId: string,
    applicationId: string,
    floorplanImage: string,
    pixelX: number,
    pixelY: number,
    floorX: number,
    floorY: number,
    meterPerPx: number,
        // engineId: string,
    floor?: floorType,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string,
    devices?: FloorplanDeviceType[],
    deviceCount?: number,
    maskedAreas?: MaskedAreaType[],
    maskedAreaCount?: number
    engine?: EngineType;
}

interface StateType {
    floorplans: FloorplanType[];
    floorplanAll: FloorplanType[];
    floorplanSearch: string;
    selectedFloorplan?: FloorplanType | null;
    floorplanTotalCount: number;
    floorplanFilteredCount: number;
    floorplanFilter: GetFilter;
    lastFilter?: GetFilter;
isLoading: boolean;
hasLoaded: boolean;
};

const initialState: StateType = {
    floorplans: [],
    floorplanAll: [],
    floorplanSearch: '',
    selectedFloorplan: null,
    floorplanTotalCount: 0,
    floorplanFilteredCount: 0,
    floorplanFilter: defaultFloorplanFilter,
    isLoading: false,
    hasLoaded: false,
};

export const FloorplanSlice = createSlice({
    name: 'floorplans',
    initialState,
    reducers: {
        GetFloorplan: (state, action) => {
            state.floorplans = action.payload;
            // console.log('Floorplans fetched:', JSON.stringify(state.floorplans, null, 2));
        },
        GetAllFloorplan: (state, action) => {
            state.floorplanAll = action.payload;
        },
        SelectFloorplan: (state, action: PayloadAction<FloorplanType | null>) => {
            // const selected = state.floorplans.find(
            //     (floorplan: FloorplanType) => floorplan.id === action.payload
            // );
            state.selectedFloorplan = action.payload || null;
        },
        SearchFloorplan: (state, action) => {
            state.floorplanSearch = action.payload;
        },
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.floorplanFilter = { ...state.floorplanFilter, ...action.payload };
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchFloorplanDT.pending, (state, action) => {
                        const newFilter = action.meta.arg as GetFilter;
                        const prevFilter = state.lastFilter;
            
                        // If no previous filter (first load), always reset
                        if (!prevFilter) {
                            state.isLoading = true;
                            state.hasLoaded = false;
                            return;
                        }
            
                        // Detect only sorting change
                        const onlySortingChanged =
                            prevFilter.SortColumn !== newFilter.SortColumn ||
                            prevFilter.SortDir !== newFilter.SortDir;
            
                        const filtersUnchanged =
                            JSON.stringify({
                            ...prevFilter,
                            SortColumn: undefined,
                            SortDir: undefined,
                            }) ===
                            JSON.stringify({
                            ...newFilter,
                            SortColumn: undefined,
                            SortDir: undefined,
                            });
            
                        const isOnlySortChange = onlySortingChanged && filtersUnchanged;
            
                        // ✅ If sorting only, keep hasLoaded true
                        state.isLoading = true;
                        if (!isOnlySortChange) {
                            state.hasLoaded = false;
                        }
                    })
            .addCase(fetchFloorplanDT.fulfilled, (state, action) => {
                state.floorplanTotalCount = action.payload.recordsTotal;
                state.floorplanFilteredCount = action.payload.recordsFiltered;
                state.isLoading = false;
                state.hasLoaded = true;
                state.lastFilter = { ...state.floorplanFilter };
            })
            .addCase(fetchFloorplanDT.rejected, (_state, action) => {
                console.error("Error fetching floorplans: ", action.payload);
                // _state.floorplanTotalCount = 0;
                _state.floorplanFilteredCount = 0;
                    _state.isLoading = false;
                    _state.hasLoaded = false;
            })
            .addCase(addFloorplan.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(addFloorplan.fulfilled, (state, action) => {
                state.isLoading = false;
                state.floorplans.push(action.payload);
            })
            .addCase(addFloorplan.rejected, (_state, action) => {
                console.error("Add floorplan failed: ", action.payload);
                _state.isLoading = false;
            })
            .addCase(editFloorplan.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(editFloorplan.fulfilled, (state, action) => {
                state.isLoading = false;
                const index = state.floorplans.findIndex(fp => fp.id === action.payload.id);
                if (index !== -1) {
                    state.floorplans[index] = action.payload;
                }
            })
            .addCase(editFloorplan.rejected, (_state, action) => {
                console.error("Edit floorplan failed: ", action.payload);
                _state.isLoading = false;
            })
            .addCase(deleteFloorplan.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(deleteFloorplan.fulfilled, (state, action) => {
                state.isLoading = false;
                state.floorplans = state.floorplans.filter(fp => fp.id !== action.payload);
            })
            .addCase(deleteFloorplan.rejected, (_state, action) => {
                console.error("Delete floorplan failed: ", action.payload);
                _state.isLoading = false;
            })
    },
});

export const { GetFloorplan, GetAllFloorplan, SelectFloorplan, SearchFloorplan, UpdateFilter } = FloorplanSlice.actions;

export const fetchFloorplan = () => async (dispatch: AppDispatch) => {
    const started = Date.now();
    try {
        const response = await axiosServices.get(Floorplan_API_URL);
        const floorplans = response.data.collection.data || [];
                    const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        dispatch(GetAllFloorplan(floorplans));
        
    } catch (error) {
        console.error('Error fetching floorplans:', error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
    }
};

export const fetchFloorplanDT = createAsyncThunk(
    "floorplans/fetchFloorplanDT",
    async (filter: any, thunkAPI) => {
        const started = Date.now();
    const res = await retryUntilSuccess(
      () => axiosServices.post(Floorplan_DT_URL, filter),
      {
        signal: thunkAPI.signal,     
        timeoutMs: 2 * 60 * 1000,    
        minDelay: 500,
        maxDelay: 8000,
      }
    );
    console.log("Floorplan DT Data:", res.data);
    dispatch(GetFloorplan(res.data.collection.data || []));
    await ensureMinLatency(started, 500);
    return res.data.collection;
  }
)

export const addFloorplan = createAsyncThunk("floorplans/addFloorplan", async (formData: FormData, { rejectWithValue }) => {
    const started = Date.now();
    try {
        const response = await axiosServices.post(Floorplan_API_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        // console.log("Floorplan added: ", response.data);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error: any) {
        console.error("Error adding floorplan:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const editFloorplan = createAsyncThunk("floorplans/editFloorplan", async (formData: FormData, { rejectWithValue }) => {
    const started = Date.now();
    try {
        
        const id = formData.get('id'); // Extract ID from FormData
        const response = await axiosServices.put(`${Floorplan_API_URL}${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error: any) {
        console.error("Error editing floorplan:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteFloorplan = createAsyncThunk("floorplans/deleteFloorplan", async (floorplanId: string, { rejectWithValue }) => {
    const started = Date.now();
    try {
        await axiosServices.delete(`${Floorplan_API_URL}${floorplanId}`);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return floorplanId; // Return the deleted floor's ID to update the state
    } catch (error: any) {
        console.error("Error deleting floor:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const ImportFloorplan = createAsyncThunk(
    "floorplans/importFloorplan",
    async (formData: FormData, { rejectWithValue }) => {
        try {
            const response = await axiosServices.post(`${Floorplan_API_URL}import`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            // console.log("Floorplan imported: ", response.data);
            return response.data;
        } catch (error: any) {
            console.error("Error importing floorplan: ", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export const ExportFloorplan = createAsyncThunk(
    "floorplans/exportFloorplan",
    async (filter: "pdf" | "excel", { rejectWithValue }) => {
        const url = `${BASE_URL}${Floorplan_API_URL}export/${filter}`;
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
      a.download = filter === 'pdf' ? 'floors.pdf' : 'floors.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      return true; // Indicate success
        } catch (error: any) {
            console.error("Error exporting floorplan: ", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

export default FloorplanSlice.reducer;


