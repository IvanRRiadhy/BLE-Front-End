import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = 'http://192.168.1.116:5000/api/MstBuilding/';

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

export default BuildingSlice.reducer;