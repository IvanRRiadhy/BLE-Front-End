import axiosServices from "../../../utils/axios";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { floorType } from "./floor";
import { FloorplanDeviceType } from "./floorplanDevice";
import { MaskedAreaType } from "./maskedArea";

const Floorplan_API_URL = '/api/MstFloorplan/';
const Floorplan_DT_URL = '/api/MstFloorplan/filter/';
const Device_API_URL = '/api/FloorplanDevice/';
const Area_API_URL = '/api/FloorplanMaskedArea/';

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    searchValue: string,
}


export type GetFloorplanResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : FloorplanType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

export interface FloorplanType {
    id: string,
    name: string,
    floorId: string,
    applicationId: string,
    floor?: floorType,
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
    floorplanTotalCount: number;
    floorplanFilteredCount: number;
    floorplanFilter: GetFilter;
};

const initialState: StateType = {
    floorplans: [],
    floorplanSearch: '',
    selectedFloorplan: null,
    floorplanTotalCount: 0,
    floorplanFilteredCount: 0,
    floorplanFilter: {
        Draw: 1,
        Start: 0,
        Length: 5,
        SortColumn: "updatedAt",
        SortDir: "desc",
        searchValue: ""
    }
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
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.floorplanFilter = { ...state.floorplanFilter, ...action.payload };
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchFloorplanDT.fulfilled, (state, action) => {
                state.floorplanTotalCount = action.payload.recordsTotal;
                state.floorplanFilteredCount = action.payload.recordsFiltered;
            });
    },
});

export const { GetFloorplan, SelectFloorplan, SearchFloorplan, UpdateFilter } = FloorplanSlice.actions;

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

export const fetchFloorplanDT = createAsyncThunk(
    "floorplans/fetchFloorplanDT",
    async (filter: any, { rejectWithValue }) => {
        try {
            const response = await axiosServices.post(Floorplan_DT_URL, filter);
            dispatch(GetFloorplan(response.data.collection.data || []));
            console.log("Fetch floorplans", response.data.collection);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching floorplans:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

export const addFloorplan = createAsyncThunk("floorplans/addFloorplan", async (formData: FormData, { rejectWithValue }) => {
    try {
        const response = await axiosServices.post(Floorplan_API_URL, formData);
        console.log("Floorplan added: ", response.data);
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


