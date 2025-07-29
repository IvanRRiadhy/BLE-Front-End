import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { FloorplanType } from "./floorplan";
import { floorType } from "./floor";
import { restrictedStatus } from "src/types/crud/input";

const API_URL = '/api/FloorplanMaskedArea/';
const API_DT_URL = '/api/FloorplanMaskedArea/filter/';

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    searchValue: string,
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

export interface MaskedAreaType {
    id: string,
    floorplanId: string,
    floorId: string,
    name: string,
    areaShape: string,
    colorArea:string,
    restrictedStatus: string,
    engineAreaId: string,
    wideArea: number,
    positionPxX: number,
    positionPxY: number,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string,
    floor?: floorType,
    floorplan?: FloorplanType,
    generate?: number,
    status?: number
    nodes?: Nodes[],
}

interface StateType {
    maskedAreas: MaskedAreaType[];
    maskedAreaAll: MaskedAreaType[];
    originalMaskedAreas: MaskedAreaType[];
    unsavedMaskedAreas: MaskedAreaType[];
    maskedAreaSearch: string;
    selectedMaskedArea?: MaskedAreaType | null;
    editingMaskedArea?: MaskedAreaType | null;
    deletedMaskedArea?: MaskedAreaType[];
    addedMaskedArea?: MaskedAreaType[];
    drawingMaskedArea?: string;
    maskedAreaTotalCount: number;
    maskedAreaFilteredCount: number;
    maskedAreaFilter: GetFilter;
}

const initialState: StateType = {
    maskedAreas: [],
    maskedAreaAll: [],
    originalMaskedAreas: [],
    unsavedMaskedAreas: [],
    maskedAreaSearch: "",
    selectedMaskedArea: null,
    editingMaskedArea: null,
    deletedMaskedArea: [],
    addedMaskedArea: [],
    drawingMaskedArea: "",
    maskedAreaTotalCount: 0,
    maskedAreaFilteredCount: 0,
    maskedAreaFilter: {
        Draw: 1,
        Start: 0,
        Length: 5,
        SortColumn: "UpdatedAt",
        SortDir: "desc",
        searchValue: "",
        filters: {
            FloorplanId: [],
            FloorId: [],
        }
    }
};

export const MaskedAreaSlice = createSlice({
    name: "maskedAreas",
    initialState,
    reducers: {
        GetMaskedArea: (state, action: PayloadAction<MaskedAreaType[]>) => {
            state.maskedAreas = action.payload;

        },
        GetAllMaskedArea: (state, action: PayloadAction<MaskedAreaType[]>) => {
            state.maskedAreaAll = action.payload;
                        state.originalMaskedAreas = action.payload;
            // console.log("All Masked Areas: ", JSON.stringify(state.maskedAreaAll, null, 2));
        },
        GetUnsavedMaskedArea: (state) => {
            state.unsavedMaskedAreas = state.maskedAreaAll;
        },
        SelectMaskedArea: (state, action) => {
            const selected = state.unsavedMaskedAreas.find((maskedAreaAll: MaskedAreaType) => maskedAreaAll.id === action.payload);
            state.selectedMaskedArea = selected || null;
        },
        SelectEditingMaskedArea: (state, action) => {
            const selected = state.unsavedMaskedAreas.find((maskedAreaAll: MaskedAreaType) => maskedAreaAll.id === action.payload);
            console.log("Selected Masked Area: ", action.payload);
            state.editingMaskedArea = selected || null;
        },
        SearchMaskedArea: (state, action: PayloadAction<string>) => {
            state.maskedAreaSearch = action.payload;
        },
        AddUnsavedMaskedArea: (state, action: PayloadAction<MaskedAreaType>) => {
            state.unsavedMaskedAreas.push(action.payload);
        },
        EditUnsavedMaskedArea: (state, action: PayloadAction<MaskedAreaType>) => {
            const index = state.unsavedMaskedAreas.findIndex((maskedAreaAll) => maskedAreaAll.id === action.payload.id);
            if (index !== -1) {
                // Create a new array with the updated area
                state.unsavedMaskedAreas = state.unsavedMaskedAreas.map((maskedAreaAll, i) =>
                    i === index ? {...maskedAreaAll, ...action.payload} : maskedAreaAll
                );
        
                // Update the editingMaskedArea immutably
                state.editingMaskedArea = {
                    ...state.editingMaskedArea,
                    ...action.payload,
                };
            }
        },
        EditMaskedAreaPosition: (state, action: PayloadAction<MaskedAreaType>) => {
            const index = state.unsavedMaskedAreas.findIndex((maskedAreaAll) => maskedAreaAll.id === action.payload.id);
            if (index !== -1) {
                // Create a new array with the updated area
                state.unsavedMaskedAreas = state.unsavedMaskedAreas.map((maskedAreaAll, i) =>
                    i === index ? {...maskedAreaAll, areaShape: action.payload.areaShape, nodes: action.payload.nodes} : maskedAreaAll
                );
        
                // Update the editingMaskedArea immutably   
                if(state.editingMaskedArea) {
                state.editingMaskedArea = {
                    ...state.editingMaskedArea,
                    areaShape: action.payload.areaShape,
                    nodes: action.payload.nodes,
                };
            };
            }
        },
        SaveMaskedArea: (state, action: PayloadAction<string>) => {
            const index = state.unsavedMaskedAreas.findIndex((maskedAreaAll) => maskedAreaAll.id === action.payload);
            console.log(index);
            if (index !== -1 && state.maskedAreaAll[index]) {
                if(state.maskedAreaAll[index].id === state.unsavedMaskedAreas[index].id) {
                    state.maskedAreaAll[index] = state.unsavedMaskedAreas[index];
                }
                console.log("Saved Masked Area: ", JSON.stringify(state.maskedAreaAll[index].areaShape, null, 2));
            }
            else {
                console.log("Masked Area added");
                state.maskedAreaAll.push(state.unsavedMaskedAreas[index]);
                state.addedMaskedArea?.push(state.unsavedMaskedAreas[index]);
            }

            // GetUnsavedMaskedArea();
        },
        DeleteUnsavedMaskedArea: (state, action: PayloadAction<string>) => {
            const index = state.unsavedMaskedAreas.findIndex((maskedAreaAll) => maskedAreaAll.id === action.payload);
            if (index !== -1) {
                state.deletedMaskedArea?.push(state.unsavedMaskedAreas[index]);
                state.unsavedMaskedAreas.splice(index, 1);

                console.log(`Area with ID ${action.payload} deleted from unsaved Area.`);
            } else {
                console.warn(`Area with ID ${action.payload} not found in unsaved Area.`);
            }
        },
        RevertMaskedArea: {
            reducer: (state, action: PayloadAction<{id: string}>) => {
                console.log(action.payload);
                const index = state.unsavedMaskedAreas.findIndex((maskedAreaAll) => maskedAreaAll.id === action.payload.id);
                const area = state.maskedAreas.find((maskedAreaAll) => maskedAreaAll.id === action.payload.id);
                if(index !== -1) {
                    const area = state.unsavedMaskedAreas[index];
                    //Check if status is valid
                    const validStatus = restrictedStatus.map((status) => status.value);
                    console.log("Valid Status: ", validStatus);
                    console.log("Area Status: ", area.restrictedStatus);
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
            console.log("Drawing Masked Area: ", action.payload);
        },
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.maskedAreaFilter = { ...state.maskedAreaFilter, ...action.payload };
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
            .addCase(fetchMaskedAreaDT.fulfilled, (state, action) => {
                console.log("Masked Area Records Total: ", action.payload.recordsTotal);
                console.log("Masked Area Records Filtered: ", action.payload.recordsFiltered);
                state.maskedAreaTotalCount = action.payload.recordsTotal;
                state.maskedAreaFilteredCount = action.payload.recordsFiltered;
            })
            .addCase(fetchMaskedAreaDT.rejected, (_state, action) => {
                console.error("Fetch failed: ", action.payload);
                // _state.maskedAreaTotalCount = 0;
                _state.maskedAreaFilteredCount = 0;
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
    DrawingMaskedArea,
    ResetAreaState,
    EditMaskedAreaPosition,
    UpdateFilter,
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
        dispatch(GetAllMaskedArea(newAreas || []));
    } catch (error) {
        console.log(error);
    }
}

export const fetchMaskedAreaDT = createAsyncThunk(
    "maskedAreas/fetchMaskedAreaDT", 
    async (filter: any, { rejectWithValue }) => {
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
            return rejectWithValue("Filter contains 'Empty', skipping request");
        }
            console.log("Fetch Masked Area DT: ", filter);
            const response = await axiosServices.post(API_DT_URL, filter);
            dispatch(GetMaskedArea([response.data.collection.data]));
            console.log("Fetch masked areas", response.data.collection);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching masked area:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

export const addMaskedArea = createAsyncThunk("maskedAreas/addMaskedArea", async (maskedArea: MaskedAreaType, { rejectWithValue }) => {
    try {
        const {id, createdAt, createdBy, updatedAt, updatedBy, generate, status, ... filteredMaskedAreaData} = maskedArea;
        const response = await axiosServices.post(API_URL, filteredMaskedAreaData);
        return response.data;
    } catch (error: any) {
        console.error("Error adding masked area:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const editMaskedArea = createAsyncThunk("maskedAreas/editMaskedArea", async (maskedArea: MaskedAreaType, { rejectWithValue }) => {
    try {
        const {id, createdAt, createdBy, updatedAt, updatedBy, generate, status, floor, floorplan, ... filteredMaskedAreaData} = maskedArea;
        console.log("Data being sent to the server:", JSON.stringify(filteredMaskedAreaData, null, 2));

        const response = await axiosServices.put(`${API_URL}${id}`, filteredMaskedAreaData, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error: any) {
        console.error("Error editing masked area:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteMaskedArea = createAsyncThunk("maskedAreas/deleteMaskedArea", async (maskedAreaId: string, { rejectWithValue }) => {
    try {
        await axiosServices.delete(`${API_URL}${maskedAreaId}`);
        console.log("Masked area deleted:", maskedAreaId);
        return maskedAreaId; // Return the deleted masked area's ID to update the state
    } catch (error: any) {
        console.error("Error deleting masked area:", error);
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
            console.log("Masked area imported: ", response.data);
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
    const url = `http://192.168.1.116:5000${API_URL}export/${filter}`;
    const accessToken = localStorage.getItem('token');
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-API-KEY-TRACKING-PEOPLE':
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