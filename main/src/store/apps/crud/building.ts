import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = '/api/MstBuilding/';

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
        const response = await axiosServices.get(API_URL);
        dispatch(GetBuildings(response.data.collection?.data || []));
    } catch (err: any){
        console.error("Failed to Fetch Building: ", err);
    }
};

export const addBuilding = createAsyncThunk("buildings/addBuilding", async (formData: FormData, { rejectWithValue }) => {
    try {
        formData.delete('id');
        const response = await axiosServices.post(API_URL, formData);
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
        const response = await axiosServices.put(`${API_URL}${id}`, formData);
        return response.data;
    } catch (error: any) {
        console.error("Error editing building:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteBuilding = createAsyncThunk("buildings/deleteBuilding", async (buildingId: string, { rejectWithValue }) => {
    try {
        await axiosServices.delete(`${API_URL}${buildingId}`);
        return buildingId; // Return the deleted building's ID to update the state
    } catch (error: any) {
        console.error("Error deleting building:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export default BuildingSlice.reducer;