import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { floorType } from "./floor";
import { FloorplanDeviceType } from "./floorplanDevice";
import { MaskedAreaType } from "./maskedArea";

const Floorplan_API_URL = '/api/MstFloorplan/';
const Device_API_URL = '/api/FloorplanDevice/';
const Area_API_URL = '/api/FloorplanMaskedArea/';

export interface FloorplanType {
    id: string,
    name: string,
    floorId: string,
    applicationId: string,
    floor: floorType,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string,
    devices?: FloorplanDeviceType[],
    maskedAreas?: MaskedAreaType[]
}

interface StateType {
    floorplans: FloorplanType[];
    floorplanSearch: string;
    selectedFloorplan?: FloorplanType | null;
};

const initialState: StateType = {
    floorplans: [],
    floorplanSearch: '',
    selectedFloorplan: null
};

export const FloorplanSlice = createSlice({
    name: 'floorplans',
    initialState,
    reducers: {
        GetFloorplan: (state, action) => {
            state.floorplans = action.payload;
        },
        SelectFloorplan: (state, action) => {
            const selected = state.floorplans.find(
                (floorplan: FloorplanType) => floorplan.id === action.payload
            );
            state.selectedFloorplan = selected || null;
        },
        SearchFloorplan: (state, action) => {
            state.floorplanSearch = action.payload;
        },
    },
});

export const { GetFloorplan, SelectFloorplan, SearchFloorplan } = FloorplanSlice.actions;

export const fetchFloorplan = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(Floorplan_API_URL);
        const deviceResponse = await axiosServices.get(Device_API_URL);
        const areaResponse = await axiosServices.get(Area_API_URL)

        const floorplans = response.data.collection.data || [];
        const devices = deviceResponse.data.collection.data || [];
        const areas = areaResponse.data.collection.data || [];

        // Enrich floorplans with devices
        const enrichedFloorplans = floorplans.map((floorplan: FloorplanType) => ({
            ...floorplan,
            devices: devices.filter((device: FloorplanDeviceType) => device.floorplanId === floorplan.id),
            maskedAreas: areas.filter((area: MaskedAreaType) => area.floorplanId === floorplan.id)
        }));

        dispatch(GetFloorplan(enrichedFloorplans));

    } catch (error) {
        console.error('Error fetching floorplans:', error);
    }
};

export const addFloor = createAsyncThunk("floorplans/addFloorplan", async (formData: FormData, { rejectWithValue }) => {
    try {
        const response = await axiosServices.post(Floorplan_API_URL, formData);
        return response.data;
    } catch (error: any) {
        console.error("Error adding floorplan:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const editFloorplan = createAsyncThunk("floorplans/editFloorplan", async (formData: FormData, { rejectWithValue }) => {
    try {
        const id = formData.get('id'); // Extract ID from FormData
        const response = await axiosServices.put(`${Floorplan_API_URL}${id}`, formData);
        return response.data;
    } catch (error: any) {
        console.error("Error editing floorplan:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteFloorplan = createAsyncThunk("floorplans/deleteFloorplan", async (floorplanId: string, { rejectWithValue }) => {
    try {
        await axiosServices.delete(`${Floorplan_API_URL}${floorplanId}`);
        return floorplanId; // Return the deleted floor's ID to update the state
    } catch (error: any) {
        console.error("Error deleting floor:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export default FloorplanSlice.reducer;


