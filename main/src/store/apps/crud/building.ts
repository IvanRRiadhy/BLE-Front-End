import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = 'http://192.168.1.173:5000/api/MstBuilding/';

export interface BuildingType {
    id: string;
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
    buildingSearch: string;
    selectedBuilding?: BuildingType | null;
}

const initialState: StateType = {
    buildings: [],
    buildingSearch: "",
    selectedBuilding: null,
};

export const BuildingSlice = createSlice({
    name: 'buildings',
    initialState,

    reducers: {
        GetBuildings: (state, action: PayloadAction<BuildingType[]>) => {
            state.buildings = action.payload;
        },
        SelectBuilding: (state, action: PayloadAction<string>) => {
            const selected = state.buildings.find((building: BuildingType) => building.id === action.payload);
            state.selectedBuilding = selected || null;
        },
        SearchBuilding: (state, action: PayloadAction<string>) => {
            state.buildingSearch = action.payload;
        },
    },
});

export const {
    GetBuildings,
    SelectBuilding,
    SearchBuilding,
} = BuildingSlice.actions;

export const fetchBuildings = () => async (dispatch: AppDispatch) => {
    try{
        const response = await axios.get(API_URL, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        dispatch(GetBuildings(response.data.collection?.data || []));
    } catch (err: any){
        console.error("Failed to Fetch Building: ", err);
    }
};

export const addBuilding = createAsyncThunk("buildings/addBuilding", async (formData: FormData, { rejectWithValue }) => {
    try {
        formData.delete('id');
        const response = await axios.post(API_URL, formData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error: any) {
        console.error("Error adding building:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const editBuilding = createAsyncThunk("buildings/editBuilding", async (formData: FormData, { rejectWithValue }) => {
    try {
        const id = formData.get('id'); // Extract ID from FormData
        formData.delete('id');
        const response = await axios.put(`${API_URL}/${id}`, formData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error: any) {
        console.error("Error editing building:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteBuilding = createAsyncThunk("buildings/deleteBuilding", async (buildingId: string, { rejectWithValue }) => {
    try {
        await axios.delete(`${API_URL}/${buildingId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return buildingId; // Return the deleted building's ID to update the state
    } catch (error: any) {
        console.error("Error deleting building:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export default BuildingSlice.reducer;