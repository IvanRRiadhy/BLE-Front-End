import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = 'http://localhost:5034/api/FloorplanMaskedArea';

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
}

interface StateType {
    maskedAreas: MaskedAreaType[];
    maskedAreaSearch: string;
    selectedMaskedArea?: MaskedAreaType | null;
}

const initialState: StateType = {
    maskedAreas: [],
    maskedAreaSearch: "",
    selectedMaskedArea: null,
};

export const MaskedAreaSlice = createSlice({
    name: "maskedAreas",
    initialState,
    reducers: {
        GetMaskedArea: (state, action: PayloadAction<MaskedAreaType[]>) => {
            state.maskedAreas = action.payload;
        },
        SelectMaskedArea: (state, action: PayloadAction<string>) => {
            const selected = state.maskedAreas.find((maskedArea: MaskedAreaType) => maskedArea.id === action.payload);
            state.selectedMaskedArea = selected || null;
        },
        SearchMaskedArea: (state, action: PayloadAction<string>) => {
            state.maskedAreaSearch = action.payload;
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
} = MaskedAreaSlice.actions;    

export const fetchMaskedAreas = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axios.get(API_URL);
        dispatch(GetMaskedArea(response.data?.collection?.data || []));
    } catch (error) {
        console.log(error);
    }
}

export const addMaskedArea = createAsyncThunk("maskedAreas/addMaskedArea", async (maskedArea: MaskedAreaType, { rejectWithValue }) => {
    try {
        const {id, createdBy, createdAt, updatedBy, updatedAt, ...filteredMaskedAreaData} = maskedArea
        const response = await axios.post(API_URL, filteredMaskedAreaData);
        return response.data;
    } catch (error: any) {
        console.error("Error adding masked area:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const editMaskedArea = createAsyncThunk("maskedAreas/editMaskedArea", async (maskedArea: MaskedAreaType, { rejectWithValue }) => {
    try {
        const { id, createdBy, createdAt, updatedBy, updatedAt, ...filteredMaskedAreaData } = maskedArea;
        const response = await axios.put(`${API_URL}/${id}`, filteredMaskedAreaData);
        return response.data;
    } catch (error: any) {
        console.error("Error editing masked area:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteMaskedArea = createAsyncThunk("maskedAreas/deleteMaskedArea", async (maskedAreaId: string, { rejectWithValue }) => {
    try {
        await axios.delete(`${API_URL}/${maskedAreaId}`);
        return maskedAreaId; // Return the deleted masked area's ID to update the state
    } catch (error: any) {
        console.error("Error deleting masked area:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export default MaskedAreaSlice.reducer;