import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { floorType } from "./floor";
import { FloorplanDeviceType } from "./floorplanDevice";
import { MaskedAreaType } from "./maskedArea";

const Floorplan_API_URL = 'http://192.168.1.173:5000/api/MstFloorplan/';
const Device_API_URL = 'http://192.168.1.173:5000/api/FloorplanDevice/';
const Area_API_URL = 'http://192.168.1.173:5000/api/FloorplanMaskedArea/';

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
    devices: FloorplanDeviceType[],
    maskedAreas: MaskedAreaType[]
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
        const response = await axios.get(Floorplan_API_URL, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        const deviceResponse = await axios.get(Device_API_URL, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        const areaResponse = await axios.get(Area_API_URL, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        })

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

export default FloorplanSlice.reducer;


