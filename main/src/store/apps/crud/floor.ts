import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = "http://192.168.1.173:5000/api/MstFloor/";

export interface floorType {
    id: string,
    buildingId: string,
    name: string,
    floorImage: string,
    pixelX: number,
    pixelY: number,
    floorX: number,
    floorY: number,
    meterPerPx: number,
    engineFloorId: number,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string,
}

interface StateType {
    floors: floorType[];
    floorSearch: string;
    selectedFloor?: floorType | null;
}

const initialState: StateType = {
    floors: [],
    floorSearch: "",
    selectedFloor: null,
};

export const FloorSlice = createSlice({
    name: "floors",
    initialState,

    reducers: {
        GetFloor: (state, action: PayloadAction<floorType[]>) => {
            state.floors = action.payload;
        },
        SelectFloor: (state, action: PayloadAction<string>) => {
            const selected = state.floors.find((floor: floorType) => floor.id === action.payload);
            state.selectedFloor = selected || null;
        },
        SearchFloor: (state, action: PayloadAction<string>) => {
            state.floorSearch = action.payload;
        },
    },

    extraReducers: (builder) => {
        builder
            .addCase(addFloor.fulfilled, (state, action) => {
                state.floors.push(action.payload);
            })
            .addCase(addFloor.rejected, (_state, action) => {
                console.error("Add floor failed: ", action.payload);
            })
            .addCase(editFloor.fulfilled, (state, action) => {
                const index = state.floors.findIndex((floor) => floor.id === action.payload.id);
                if (index !== -1) {
                    state.floors[index] = action.payload;
                    state.selectedFloor = action.payload;
                }
            })
            .addCase(editFloor.rejected, (_state, action) => {
                console.error("Update failed: ", action.payload);
            })
            .addCase(deleteFloor.fulfilled, (state, action) => {
                state.floors = state.floors.filter(floor => floor.id !== action.payload);
                if (state.selectedFloor?.id === action.payload) {
                    state.selectedFloor = null;
                }
            })
            .addCase(deleteFloor.rejected, (_state, action) => {
                console.error("Delete failed: ", action.payload);
            })
        }
});

export const {
    GetFloor,
    SelectFloor,
    SearchFloor,
} = FloorSlice.actions;

export const fetchFloors = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axios.get(API_URL, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        })
        dispatch(GetFloor(response.data?.collection?.data || []));
    } catch (error) {
        console.log(error);
    }
}

export const addFloor = createAsyncThunk("floors/addFloor", async (formData: FormData, { rejectWithValue }) => {
    try {
        const response = await axios.post(API_URL, formData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error: any) {
        console.error("Error adding floor:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const editFloor = createAsyncThunk("floors/editFloor", async (formData: FormData, { rejectWithValue }) => {
    try {
        const id = formData.get('id'); // Extract ID from FormData
        console.log(id)
        formData.delete('id'); // Remove ID from FormData to avoid sending it again
        const response = await axios.put(`${API_URL}/${id}`, formData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error: any) {
        console.error("Error editing floor:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteFloor = createAsyncThunk("floors/deleteFloor", async (floorId: string, { rejectWithValue }) => {
    try {
        await axios.delete(`${API_URL}/${floorId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return floorId; // Return the deleted floor's ID to update the state
    } catch (error: any) {
        console.error("Error deleting floor:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export default FloorSlice.reducer;