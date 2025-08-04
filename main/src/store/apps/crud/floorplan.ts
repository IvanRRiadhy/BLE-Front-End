import axiosServices from "../../../utils/axios";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { floorType } from "./floor";
import { FloorplanDeviceType } from "./floorplanDevice";
import { MaskedAreaType } from "./maskedArea";
import { defaultFloorplanFilter } from "../defaultForm";

const Floorplan_API_URL = '/api/MstFloorplan/';
const Floorplan_DT_URL = '/api/MstFloorplan/filter/';
const Device_API_URL = '/api/FloorplanDevice/';
const Device_DT_URL = '/api/FloorplanDevice/filter/';
const Area_API_URL = '/api/FloorplanMaskedArea/';
const Area_DT_URL = '/api/FloorplanMaskedArea/filter/';

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    searchValue: string,
    filters: {
        FloorId: string[],
    }
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
    deviceCount?: number,
    maskedAreas?: MaskedAreaType[],
    maskedAreaCount?: number
}

interface StateType {
    floorplans: FloorplanType[];
    floorplanAll: FloorplanType[];
    floorplanSearch: string;
    selectedFloorplan?: FloorplanType | null;
    floorplanTotalCount: number;
    floorplanFilteredCount: number;
    floorplanFilter: GetFilter;
};

const initialState: StateType = {
    floorplans: [],
    floorplanAll: [],
    floorplanSearch: '',
    selectedFloorplan: null,
    floorplanTotalCount: 0,
    floorplanFilteredCount: 0,
    floorplanFilter: defaultFloorplanFilter,
};

export const FloorplanSlice = createSlice({
    name: 'floorplans',
    initialState,
    reducers: {
        GetFloorplan: (state, action) => {
            state.floorplans = action.payload;
            // console.log('Floorplans fetched:', JSON.stringify(state.floorplans, null, 2));
        },
        GetAllFloorplan: (state, action) => {
            state.floorplanAll = action.payload;
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

export const { GetFloorplan, GetAllFloorplan, SelectFloorplan, SearchFloorplan, UpdateFilter } = FloorplanSlice.actions;

export const fetchFloorplan = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(Floorplan_API_URL);
        const floorplans = response.data.collection.data || [];

        dispatch(GetAllFloorplan(floorplans));

    } catch (error) {
        console.error('Error fetching floorplans:', error);
    }
};

export const fetchFloorplanDT = createAsyncThunk(
    "floorplans/fetchFloorplanDT",
    async (filter: any, { rejectWithValue }) => {
        try {
            // console.log("Fetch Floorplan DT: ", filter);
            const response = await axiosServices.post(Floorplan_DT_URL, filter);
            const floorplans = response.data.collection.data || [];
            // console.log("FLOOR :", response.data.collection.data || []);
            // response.data.collection.data.forEach((floorplan: FloorplanType) => {
            //     console.log("Floorplan: ", floorplan);
            // });
            dispatch(GetFloorplan(floorplans));
      // Dispatch after all data is enriched
    //   dispatch(GetFloorplan(enrichedFloorplans));

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
        // console.log("Floorplan added: ", response.data);
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

export const ImportFloorplan = createAsyncThunk(
    "floorplans/importFloorplan",
    async (formData: FormData, { rejectWithValue }) => {
        try {
            const response = await axiosServices.post(`${Floorplan_API_URL}import`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            // console.log("Floorplan imported: ", response.data);
            return response.data;
        } catch (error: any) {
            console.error("Error importing floorplan: ", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export const ExportFloorplan = createAsyncThunk(
    "floorplans/exportFloorplan",
    async (filter: "pdf" | "excel", { rejectWithValue }) => {
        const url = `http://192.168.1.116:5000${Floorplan_API_URL}export/${filter}`;
        const accessToken = localStorage.getItem("token");
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers:{
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-API-KEY-TRACKING-PEOPLE':
            'FujDuGTsyEXVwkKrtRgn52APwAVRGmPOiIRX8cffynDvIW35bJaGeH3NcH6HcSeK',
        },
            });
            if(!response.ok) throw new Error('Export failed');
                  const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filter === 'pdf' ? 'floors.pdf' : 'floors.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      return true; // Indicate success
        } catch (error: any) {
            console.error("Error exporting floorplan: ", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

export default FloorplanSlice.reducer;


