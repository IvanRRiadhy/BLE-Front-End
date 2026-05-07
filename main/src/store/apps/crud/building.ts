import axiosServices, { BASE_URL } from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { defaultBuildingFilter } from "../defaultForm";
import toast from "react-hot-toast";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";

const API_URL = '/api/MstBuilding/';
const API_DT_URL = '/api/MstBuilding/filter/';
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));


export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
}


export type GetBuildingResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : BuildingType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

export interface BuildingType {
    id: string;
    tag: string;
    name: string;
    image: string;
    applicationId: string;
    createdBy: string;
    createdAt: string;
    updatedBy: string;
    updatedAt: string;
}

interface StateType {
    buildings: BuildingType[];
    buildingAll: BuildingType[];
    buildingSearch: string;
    selectedBuilding?: BuildingType | null;
    buildingTotalCount: number;
    buildingFilteredCount: number;
    buildingFilter: GetFilter;
    lastFilter?: GetFilter;
isLoading: boolean;
hasLoaded: boolean;
}

const initialState: StateType = {
    buildings: [],
    buildingAll: [],
    buildingSearch: "",
    selectedBuilding: null,
    buildingTotalCount: 0,
    buildingFilteredCount: 0,
    buildingFilter: defaultBuildingFilter,
    isLoading: false,
    hasLoaded: false,
};

export const BuildingSlice = createSlice({
    name: 'buildings',
    initialState,

    reducers: {
        GetBuildings: (state, action: PayloadAction<BuildingType[]>) => {
            state.buildings = action.payload;
        },
        GetAllBuildings: (state, action: PayloadAction<BuildingType[]>) => {
            state.buildingAll = action.payload;
        },
        SelectBuilding: (state, action: PayloadAction<string>) => {
            const selected = state.buildings.find((building: BuildingType) => building.id === action.payload);
            state.selectedBuilding = selected || null;
        },
        SearchBuilding: (state, action: PayloadAction<string>) => {
            state.buildingSearch = action.payload;
        },
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.buildingFilter = { ...state.buildingFilter, ...action.payload };
        }
    },
    extraReducers: (builder) => {
        builder
        .addCase(fetchBuildingDT.fulfilled, (state, action) => {
            state.buildingTotalCount = action.payload.recordsTotal;
            state.buildingFilteredCount = action.payload.recordsFiltered;
            state.isLoading = false;
            state.hasLoaded = true;
            state.lastFilter = { ...state.buildingFilter };
            console.log("Buildings fetched:", JSON.stringify(state.hasLoaded, null, 2));
        })
        .addCase(fetchBuildingDT.pending, (state, action) => {
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
        .addCase(fetchBuildingDT.rejected, (state, action) => {
            console.error("Error fetching buildings: ", action.payload);
            toast.error("Error fetching buildings: " + action.payload);
            // state.buildingTotalCount = 0;
            state.buildingFilteredCount = 0;
            state.isLoading = false;
            state.hasLoaded = false;
        })
        .addCase(addBuilding.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(addBuilding.fulfilled, (state, action) => {
            state.buildings.push(action.payload);
                state.isLoading = false;

        })
        .addCase(addBuilding.rejected, (state, action) => {
            console.error("Add failed: ", action.payload);
                state.isLoading = false;

        })
        .addCase(editBuilding.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(editBuilding.fulfilled, (state, action) => {
            const index = state.buildings.findIndex((building) => building.id === action.payload.id);
            if (index !== -1) {
                state.buildings[index] = action.payload;
                state.selectedBuilding = action.payload;
            }
                state.isLoading = false;
        })
        .addCase(editBuilding.rejected, (state, action) => {
            console.error("Update failed: ", action.payload);
                state.isLoading = false;
        })
        .addCase(deleteBuilding.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(deleteBuilding.fulfilled, (state, action) => {
            state.buildings = state.buildings.filter(building => building.id !== action.payload);
            if (state.selectedBuilding?.id === action.payload) {
                state.selectedBuilding = null;
            }
                state.isLoading = false;
        })
        .addCase(deleteBuilding.rejected, (state, action) => {
            console.error("Delete failed: ", action.payload);
                state.isLoading = false;
        })

    }
});

export const {
    GetBuildings,
    GetAllBuildings,
    SelectBuilding,
    SearchBuilding,
    UpdateFilter
} = BuildingSlice.actions;

export const fetchBuildings = () => async (dispatch: AppDispatch) => {
    try{
        const response = await axiosServices.get(API_URL);
        dispatch(GetAllBuildings(response.data.collection?.data || []));
    } catch (err: any){
        console.error("Failed to Fetch Building: ", err);
    }
};

export const fetchBuildingDT = createAsyncThunk(
    "buildings/fetchBuildingDT",
    async (filter: any, thunkAPI) => {
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

    dispatch(GetBuildings(res.data.collection.data || []));
    await ensureMinLatency(started, 500);
    return res.data.collection;
  }
)

export const addBuilding = createAsyncThunk("buildings/addBuilding", async (formData: FormData, { rejectWithValue }) => {
    const started = Date.now();
    try {
        formData.delete('id');
        const response = await axiosServices.post(API_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
              const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);

        return response.data;
    } catch (error: any) {
              const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);

        console.error("Error adding building:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const editBuilding = createAsyncThunk("buildings/editBuilding", async (formData: FormData, { rejectWithValue }) => {
    const started = Date.now();
    try {
        const id = formData.get('id'); // Extract ID from FormData
        formData.delete('id');
        const response = await axiosServices.put(`${API_URL}${id}`, formData,{
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
              const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);

        return response.data;
    } catch (error: any) {
              const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);

        console.error("Error editing building:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteBuilding = createAsyncThunk("buildings/deleteBuilding", async (buildingId: string, { rejectWithValue }) => {
    const started = Date.now();
    try {
        await axiosServices.delete(`${API_URL}${buildingId}`);
                      const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return buildingId; // Return the deleted building's ID to update the state


    } catch (error: any) {
              const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);

        console.error("Error deleting building:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});
export const ImportBuilding = createAsyncThunk(
    "buildings/importBuilding",
    async (formData: FormData, { rejectWithValue }) => {
        try {
            const response = await axiosServices.post(`${API_URL}import`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            // console.log("Building imported: ", response.data);
            return response.data;
        } catch (error: any) {
            console.error("Error importing building: ", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export const ExportBuilding = createAsyncThunk(
    "buildings/exportBuilding",
    async (filter: "pdf" | "excel", { rejectWithValue }) => {
    const url = `${BASE_URL}${API_URL}export/${filter}`;
    const accessToken = localStorage.getItem('token');
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-BIOPEOPLETRACKING-API-KEY':
            'FujDuGTsyEXVwkKrtRgn52APwAVRGmPOiIRX8cffynDvIW35bJaGeH3NcH6HcSeK',
        },
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filter === 'pdf' ? 'Building.pdf' : 'Building.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      return true; // Indicate success
        } catch (error: any) {
            console.error("Error exporting building: ", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export default BuildingSlice.reducer;