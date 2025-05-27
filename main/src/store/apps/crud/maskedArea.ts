import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { FloorplanType } from "./floorplan";
import { floorType } from "./floor";
import { restrictedStatus } from "src/types/crud/input";
import { ResetState } from "./floorplanDevice";

const API_URL = 'http://192.168.1.173:5000/api/FloorplanMaskedArea/';
const Other_API_URL = 'http://192.168.1.173:5000/api/usergroup/';


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
    originalMaskedAreas: MaskedAreaType[];
    unsavedMaskedAreas: MaskedAreaType[];
    maskedAreaSearch: string;
    selectedMaskedArea?: MaskedAreaType | null;
    editingMaskedArea?: MaskedAreaType | null;
    deletedMaskedArea?: MaskedAreaType[];
    addedMaskedArea?: MaskedAreaType[];
    drawingMaskedArea?: string;
}

const initialState: StateType = {
    maskedAreas: [],
    originalMaskedAreas: [],
    unsavedMaskedAreas: [],
    maskedAreaSearch: "",
    selectedMaskedArea: null,
    editingMaskedArea: null,
    deletedMaskedArea: [],
    addedMaskedArea: [],
    drawingMaskedArea: "",
};

export const MaskedAreaSlice = createSlice({
    name: "maskedAreas",
    initialState,
    reducers: {
        GetMaskedArea: (state, action: PayloadAction<MaskedAreaType[]>) => {
            state.maskedAreas = action.payload;
            state.originalMaskedAreas = action.payload;
        },
        GetUnsavedMaskedArea: (state) => {
            state.unsavedMaskedAreas = state.maskedAreas;
        },
        SelectMaskedArea: (state, action) => {
            const selected = state.unsavedMaskedAreas.find((maskedArea: MaskedAreaType) => maskedArea.id === action.payload);
            state.selectedMaskedArea = selected || null;
        },
        SelectEditingMaskedArea: (state, action) => {
            const selected = state.unsavedMaskedAreas.find((maskedArea: MaskedAreaType) => maskedArea.id === action.payload);
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
            const index = state.unsavedMaskedAreas.findIndex((maskedArea) => maskedArea.id === action.payload.id);
            if (index !== -1) {
                // Create a new array with the updated area
                state.unsavedMaskedAreas = state.unsavedMaskedAreas.map((maskedArea, i) =>
                    i === index ? {...maskedArea, ...action.payload} : maskedArea
                );
        
                // Update the editingMaskedArea immutably
                state.editingMaskedArea = {
                    ...state.editingMaskedArea,
                    ...action.payload,
                };
            }
        },
        EditMaskedAreaPosition: (state, action: PayloadAction<MaskedAreaType>) => {
            const index = state.unsavedMaskedAreas.findIndex((maskedArea) => maskedArea.id === action.payload.id);
            if (index !== -1) {
                // Create a new array with the updated area
                state.unsavedMaskedAreas = state.unsavedMaskedAreas.map((maskedArea, i) =>
                    i === index ? {...maskedArea, areaShape: action.payload.areaShape, nodes: action.payload.nodes} : maskedArea
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
            const index = state.unsavedMaskedAreas.findIndex((maskedArea) => maskedArea.id === action.payload);
            console.log(index);
            if (index !== -1 && state.maskedAreas[index]) {
                if(state.maskedAreas[index].id === state.unsavedMaskedAreas[index].id) {
                    state.maskedAreas[index] = state.unsavedMaskedAreas[index];
                }
                console.log("Saved Masked Area: ", JSON.stringify(state.maskedAreas[index].areaShape, null, 2));
            }
            else {
                console.log("Masked Area added");
                state.maskedAreas.push(state.unsavedMaskedAreas[index]);
                state.addedMaskedArea?.push(state.unsavedMaskedAreas[index]);
            }

            // GetUnsavedMaskedArea();
        },
        DeleteUnsavedMaskedArea: (state, action: PayloadAction<string>) => {
            const index = state.unsavedMaskedAreas.findIndex((maskedArea) => maskedArea.id === action.payload);
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
                const index = state.unsavedMaskedAreas.findIndex((maskedArea) => maskedArea.id === action.payload.id);
                const area = state.maskedAreas.find((maskedArea) => maskedArea.id === action.payload.id);
                if(index !== -1) {
                    const area = state.unsavedMaskedAreas[index];
                    //Check if status is valid
                    const validStatus = restrictedStatus.map((status) => status.value);
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
            });
    },
});

export const {
    GetMaskedArea,
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
} = MaskedAreaSlice.actions;    

export const fetchMaskedAreas = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axios.get(API_URL, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        let newAreas: MaskedAreaType[] = [];
        if(response.data.collection.data) {
            newAreas = response.data.collection.data.map((maskedArea: MaskedAreaType) => {
                const parsedNodes = JSON.parse(maskedArea.areaShape);
                maskedArea.nodes = parsedNodes;
                return maskedArea;
            })
        }
        console.log("fetching...");
        dispatch(GetMaskedArea(newAreas || []));
    } catch (error) {
        console.log(error);
    }
}

export const addMaskedArea = createAsyncThunk("maskedAreas/addMaskedArea", async (maskedArea: MaskedAreaType, { rejectWithValue }) => {
    try {
        const {id, createdAt, createdBy, updatedAt, updatedBy, generate, status, ... filteredMaskedAreaData} = maskedArea;
        const response = await axios.post(API_URL, filteredMaskedAreaData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
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

        const response = await axios.put(`${API_URL}/${id}`, filteredMaskedAreaData, {
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
        await axios.delete(`${API_URL}/${maskedAreaId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        console.log("Masked area deleted:", maskedAreaId);
        return maskedAreaId; // Return the deleted masked area's ID to update the state
    } catch (error: any) {
        console.error("Error deleting masked area:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export default MaskedAreaSlice.reducer;