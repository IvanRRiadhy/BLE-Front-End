import axiosServices, { BASE_URL } from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { FloorplanType } from "./floorplan";
import { floorType } from "./floor";
import { restrictedStatus } from "src/types/crud/input";
import { defaultMaskedAreaFilter } from "../defaultForm";

const API_URL = '/api/FloorplanMaskedArea/';
const API_DT_URL = '/api/FloorplanMaskedArea/filter/';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
    filters : {
        FloorplanId: string[],
        FloorId: string[],
    }
}


export type GetMaskedAreaResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : MaskedAreaType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

type Nodes = {
    id: string;
    x: number;
    y: number;
    x_px: number;
    y_px: number;
  };

  export type MaskedAreaLabelType = {
    id: string;
    labelName: string;
}

export interface MaskedAreaType {
    id: string,
    floorplanId: string,
    floorId: string,
    name: string,
    areaShape: string,
    colorArea:string,
    restrictedStatus: string,
    applicationId?: string,
    allowFloorChange: boolean,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string,
    floor?: floorType,
    floorplan?: FloorplanType,
    generate?: number,
    status?: number
    nodes?: Nodes[],
    labels?: MaskedAreaLabelType[],
    labelIds?: string[],
    isAssemblyPoint: boolean;
}

interface StateType {
    maskedAreas: MaskedAreaType[];
    maskedAreaAll: MaskedAreaType[];
    originalMaskedAreas: MaskedAreaType[];
    unsavedMaskedAreas: MaskedAreaType[];
    maskedAreaSearch: string;
    isDrawing: boolean;
    selectedMaskedArea?: MaskedAreaType | null;
    editingMaskedArea?: MaskedAreaType | null;
    deletedMaskedArea?: MaskedAreaType[];
    addedMaskedArea: MaskedAreaType[];
    drawingMaskedArea?: string;
    maskedAreaTotalCount: number;
    maskedAreaFilteredCount: number;
    maskedAreaFilter: GetFilter;
    lastFilter?: GetFilter;
isLoading: boolean;
hasLoaded: boolean;
}

const initialState: StateType = {
    maskedAreas: [],
    maskedAreaAll: [],
    originalMaskedAreas: [],
    unsavedMaskedAreas: [],
    maskedAreaSearch: "",
    isDrawing: false,
    selectedMaskedArea: null,
    editingMaskedArea: null,
    deletedMaskedArea: [],
    addedMaskedArea: [],
    drawingMaskedArea: "",
    maskedAreaTotalCount: 0,
    maskedAreaFilteredCount: 0,
    maskedAreaFilter: defaultMaskedAreaFilter,
    isLoading: false,
    hasLoaded: false,
};

export const MaskedAreaSlice = createSlice({
    name: "maskedAreas",
    initialState,
    reducers: {
        GetMaskedArea: (state, action: PayloadAction<MaskedAreaType[]>) => {
            state.maskedAreas = action.payload;
             console.log("Masked Areas: ", JSON.stringify(state.maskedAreas, null, 2));
        },
        GetAllMaskedArea: (state, action: PayloadAction<MaskedAreaType[]>) => {
            state.maskedAreaAll = action.payload;
                        state.originalMaskedAreas = action.payload;
                        console.log("Unsaved Masked Areas: ", JSON.stringify(state.maskedAreaAll, null, 2));
        },
        GetUnsavedMaskedArea: (state) => {
            state.unsavedMaskedAreas = state.maskedAreaAll;
            
        },
        SelectMaskedArea: (state, action) => {
            const selected = state.unsavedMaskedAreas.find((maskedAreaAll: MaskedAreaType) => maskedAreaAll.id === action.payload) || state.editingMaskedArea;
            state.selectedMaskedArea = selected || null;
        },
        SelectEditingMaskedArea: (state, action: PayloadAction<MaskedAreaType | null>) => {
            state.editingMaskedArea = action.payload || null;
        },
        SearchMaskedArea: (state, action: PayloadAction<string>) => {
            state.maskedAreaSearch = action.payload;
        },
        AddUnsavedMaskedArea: (state, action: PayloadAction<MaskedAreaType>) => {
            state.unsavedMaskedAreas.push(action.payload);
        },
        EditUnsavedMaskedArea: (state, action: PayloadAction<MaskedAreaType>) => {
            const index = state.unsavedMaskedAreas.findIndex((maskedAreaAll) => maskedAreaAll.id === action.payload.id);
            const { areaShape, nodes, ...formattedArea} = action.payload;
                            if(state.editingMaskedArea) {
                                    state.editingMaskedArea = {
                    ...state.editingMaskedArea,
                    ...formattedArea,
                };
                }
            if (index !== -1) {
                // Create a new array with the updated area
                state.unsavedMaskedAreas = state.unsavedMaskedAreas.map((maskedAreaAll, i) =>
                    i === index ? {...maskedAreaAll, ...formattedArea} : maskedAreaAll
                );
                // Update the editingMaskedArea immutably

            }
        },
        EditMaskedAreaPosition: (state, action: PayloadAction<MaskedAreaType>) => {
            console.log("EditMaskedAreaPosition", action.payload);
                            if(state.editingMaskedArea) {
                state.editingMaskedArea = {
                    ...state.editingMaskedArea,
                    areaShape: action.payload.areaShape,
                    nodes: action.payload.nodes,
                };
            };
            const index = state.unsavedMaskedAreas.findIndex((maskedAreaAll) => maskedAreaAll.id === action.payload.id);
            if (index !== -1) {
                // Create a new array with the updated area
                state.unsavedMaskedAreas = state.unsavedMaskedAreas.map((maskedAreaAll, i) =>
                    i === index ? {...maskedAreaAll, areaShape: action.payload.areaShape, nodes: action.payload.nodes} : maskedAreaAll
                );
        
                // Update the editingMaskedArea immutably   

            }
        },
        SaveMaskedArea: (state, action: PayloadAction<string>) => {
            const index = state.unsavedMaskedAreas.findIndex((maskedAreaAll) => maskedAreaAll.id === action.payload);
            if (index !== -1 && state.maskedAreaAll[index] ) {
                if(state.maskedAreaAll[index].id !== action.payload)return;
                if(state.maskedAreaAll[index].id === state.unsavedMaskedAreas[index].id) {
                    state.maskedAreaAll[index] = state.unsavedMaskedAreas[index];
                }
            }
            else {
                state.maskedAreaAll.push(state.unsavedMaskedAreas[index]);
                state.addedMaskedArea.push(state.unsavedMaskedAreas[index]);
            }
        },
        SaveEditingArea: (state) => {
            if(state.editingMaskedArea !== null && state.editingMaskedArea !== undefined) {
                const index = state.unsavedMaskedAreas.findIndex((maskedAreaAll) => maskedAreaAll.id === state.editingMaskedArea?.id);
                console.log("index", index);
                if (index !== -1) {
                    state.unsavedMaskedAreas[index] = state.editingMaskedArea;
                    state.maskedAreaAll[index] = state.editingMaskedArea;
                }
                else {
                    state.unsavedMaskedAreas.push(state.editingMaskedArea);
                    state.maskedAreaAll.push(state.editingMaskedArea);
                    state.addedMaskedArea.push(state.editingMaskedArea);
                    console.log("Unsaved Masked Areas: ", JSON.stringify(state.unsavedMaskedAreas, null, 2));
                }
            }
        },
        DeleteUnsavedMaskedArea: (state, action: PayloadAction<string>) => {
            const index = state.unsavedMaskedAreas.findIndex((maskedAreaAll) => maskedAreaAll.id === action.payload);
            if (index !== -1) {
                state.deletedMaskedArea?.push(state.unsavedMaskedAreas[index]);
                state.unsavedMaskedAreas.splice(index, 1);                
            } else {
                console.warn(`Area with ID ${action.payload} not found in unsaved Area.`);
            }
        },
        RevertMaskedArea: {
            reducer: (state, action: PayloadAction<{id: string}>) => {
                const index = state.unsavedMaskedAreas.findIndex((maskedAreaAll) => maskedAreaAll.id === action.payload.id);
                const area = state.maskedAreaAll.find((maskedAreaAll) => maskedAreaAll.id === action.payload.id);
                console.log("area", area, JSON.stringify(state.unsavedMaskedAreas, null, 2));
                if(index !== -1) {
                    const area = state.unsavedMaskedAreas[index];
                    //Check if status is valid
                    const validStatus = restrictedStatus.map((status) => status.value);
                    console.log("Status", area.restrictedStatus, validStatus);
                    if(!validStatus.includes(area.restrictedStatus) || area.restrictedStatus === "") {
                        
                        state.unsavedMaskedAreas.splice(index, 1);
                        return;
                    }
                }
                if(area) {
                    if(state.selectedMaskedArea?.id === action.payload.id) {
                        state.selectedMaskedArea = area;
                    }
                    if(index !== -1) {

                        state.unsavedMaskedAreas[index] = area;
                        state.editingMaskedArea = null;
                    }
                }
            },
            prepare: (id: string) => ({
                payload: {id},
            })
        },
        ResetAreaState: (state) => {
            state.deletedMaskedArea = [];
            state.addedMaskedArea = [];
            state.selectedMaskedArea = null;
            state.editingMaskedArea = null;
        },
        DrawingMaskedArea: (state, action: PayloadAction<string>) => {
            state.drawingMaskedArea = action.payload;
        },
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.maskedAreaFilter = { ...state.maskedAreaFilter, ...action.payload };
        },
        SetIsDrawing: (state: StateType, action: PayloadAction<boolean>) => {
            state.isDrawing = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(addMaskedArea.fulfilled, (state, action) => {
                state.maskedAreas.push(action.payload);
            })
            .addCase(addMaskedArea.rejected, (_state, action) => {
                console.error("Add failed: ", action.payload);
            })
            .addCase(editMaskedArea.fulfilled, (state, action) => {
                const index = state.maskedAreas.findIndex((maskedArea) => maskedArea.id === action.payload.id);
                if (index !== -1) {
                    state.maskedAreas[index] = action.payload;
                }
            })
            .addCase(editMaskedArea.rejected, (_state, action) => {
                console.error("Update failed: ", action.payload);
            })
            .addCase(deleteMaskedArea.fulfilled, (state, action) => {
                state.maskedAreas = state.maskedAreas.filter((maskedArea) => maskedArea.id !== action.payload);
            })
            .addCase(deleteMaskedArea.rejected, (_state, action) => {
                console.error("Delete failed: ", action.payload);
            })
            .addCase(fetchMaskedAreaDT.pending, (state, action) => {
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
            .addCase(fetchMaskedAreaDT.fulfilled, (state, action) => {
                state.maskedAreaTotalCount = action.payload.recordsTotal;
                state.maskedAreaFilteredCount = action.payload.recordsFiltered;
                    state.isLoading = false;
                    state.hasLoaded = true;
                    state.lastFilter = { ...state.maskedAreaFilter };
            })
            .addCase(fetchMaskedAreaDT.rejected, (_state, action) => {
                console.error("Fetch failed: ", action.payload);
                _state.maskedAreaTotalCount = 0;
                _state.maskedAreaFilteredCount = 0;
                    _state.isLoading = false;
                    _state.hasLoaded = true;
            });
    },
});

export const {
    GetMaskedArea,
    GetAllMaskedArea,
    SelectMaskedArea,
    SearchMaskedArea,
    AddUnsavedMaskedArea,
    EditUnsavedMaskedArea,
    DeleteUnsavedMaskedArea,
    RevertMaskedArea,
    SelectEditingMaskedArea,
    GetUnsavedMaskedArea,
    SaveMaskedArea,
    SaveEditingArea,
    DrawingMaskedArea,
    ResetAreaState,
    EditMaskedAreaPosition,
    UpdateFilter,
    SetIsDrawing,
} = MaskedAreaSlice.actions;    

export const fetchMaskedAreas = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
        let newAreas: MaskedAreaType[] = [];
        if(response.data.collection.data) {
            newAreas = response.data.collection.data.map((maskedArea: MaskedAreaType) => {
                const parsedNodes = JSON.parse(maskedArea.areaShape);
                maskedArea.nodes = parsedNodes;
                return maskedArea;
            })
        }
        // console.log("MaskedArea: " ,response.data.collection);
        dispatch(GetAllMaskedArea(newAreas || []));
    } catch (error) {
        console.log(error);
    }
}

export const fetchMaskedAreaDT = createAsyncThunk(
    "maskedAreas/fetchMaskedAreaDT", 
    async (filter: any, { rejectWithValue }) => {
        const started = Date.now();
        try {
                    if (
            filter?.filters &&
            Object.values(filter.filters).some(
                (arr: any) => Array.isArray(arr) && arr.includes("Empty")
            )
        ) {
            console.log("Filter contains 'Empty', skipping request");
            // Option 1: just return null (success, no data)
            // return null;
            // Option 2: reject, if you want to treat as error
                                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return rejectWithValue("Filter contains 'Empty', skipping request");
        }
            console.log("Fetch Masked Area DT: ", filter);
            const response = await axiosServices.post(API_DT_URL, filter);
            dispatch(GetMaskedArea(response.data.collection.data || []));
            console.log("Fetch masked areas", response.data.collection);
                                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching masked area:", error);
                                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

export const addMaskedArea = createAsyncThunk("maskedAreas/addMaskedArea", async (maskedArea: MaskedAreaType, { rejectWithValue }) => {
    const started = Date.now();
    try {
        const {id, createdAt, createdBy, updatedAt, updatedBy, generate, status, ... filteredMaskedAreaData} = maskedArea;
        const response = await axiosServices.post(API_URL, filteredMaskedAreaData);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error: any) {
        console.error("Error adding masked area:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const editMaskedArea = createAsyncThunk("maskedAreas/editMaskedArea", async (maskedArea: MaskedAreaType, { rejectWithValue }) => {
    const started = Date.now();
    try {
        const {id, createdAt, createdBy, updatedAt, updatedBy, generate, status, floor, floorplan, ... filteredMaskedAreaData} = maskedArea;
        const response = await axiosServices.put(`${API_URL}${id}`, filteredMaskedAreaData, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error: any) {
        console.error("Error editing masked area:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteMaskedArea = createAsyncThunk("maskedAreas/deleteMaskedArea", async (maskedAreaId: string, { rejectWithValue }) => {
    const started = Date.now();
    try {
        await axiosServices.delete(`${API_URL}${maskedAreaId}`);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return maskedAreaId;
    } catch (error: any) {
        console.error("Error deleting masked area:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const ImportMaskedArea = createAsyncThunk(
    "maskedAreas/importMaskedArea",
    async (formData: FormData, { rejectWithValue }) => {
        try {
            const response = await axiosServices.post(`${API_URL}import`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            return response.data;
        } catch (error: any) {
            console.error("Error importing masked area: ", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export const ExportMaskedArea = createAsyncThunk(
    "maskedAreas/exportMaskedArea",
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
      a.download = filter === 'pdf' ? 'MaskedArea.pdf' : 'MaskedArea.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      return true; // Indicate success
        } catch (error: any) {
            console.error("Error exporting masked area: ", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export default MaskedAreaSlice.reducer;