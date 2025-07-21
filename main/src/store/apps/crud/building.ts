import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = '/api/MstBuilding/';
const API_DT_URL = '/api/MstBuilding/filter/';


export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    searchValue: string,
}


export type GetBuildingResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : BuildingType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

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
    buildingAll: BuildingType[];
    buildingSearch: string;
    selectedBuilding?: BuildingType | null;
    buildingTotalCount: number;
    buildingFilteredCount: number;
    buildingFilter: GetFilter;
}

const initialState: StateType = {
    buildings: [],
    buildingAll: [],
    buildingSearch: "",
    selectedBuilding: null,
    buildingTotalCount: 0,
    buildingFilteredCount: 0,
    buildingFilter: {
        Draw: 1,
        Start: 0,
        Length: 5,
        SortColumn: "updatedAt",
        SortDir: "desc",
        searchValue: "",
    }
};

export const BuildingSlice = createSlice({
    name: 'buildings',
    initialState,

    reducers: {
        GetBuildings: (state, action: PayloadAction<BuildingType[]>) => {
            state.buildings = action.payload;
        },
        GetAllBuildings: (state, action: PayloadAction<BuildingType[]>) => {
            state.buildingAll = action.payload;
        },
        SelectBuilding: (state, action: PayloadAction<string>) => {
            const selected = state.buildings.find((building: BuildingType) => building.id === action.payload);
            state.selectedBuilding = selected || null;
        },
        SearchBuilding: (state, action: PayloadAction<string>) => {
            state.buildingSearch = action.payload;
        },
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.buildingFilter = { ...state.buildingFilter, ...action.payload };
        }
    },
    extraReducers: (builder) => {
        builder
        .addCase(fetchBuildingDT.fulfilled, (state, action) => {
            state.buildingTotalCount = action.payload.recordsTotal;
            state.buildingFilteredCount = action.payload.recordsFiltered;
        });
    }
});

export const {
    GetBuildings,
    GetAllBuildings,
    SelectBuilding,
    SearchBuilding,
    UpdateFilter
} = BuildingSlice.actions;

export const fetchBuildings = () => async (dispatch: AppDispatch) => {
    try{
        const response = await axiosServices.get(API_URL);
        dispatch(GetAllBuildings(response.data.collection?.data || []));
    } catch (err: any){
        console.error("Failed to Fetch Building: ", err);
    }
};

export const fetchBuildingDT = createAsyncThunk(
    "buildings/fetchBuildingDT",
    async (filter: any, { rejectWithValue }) => {
        try {
            const response = await axiosServices.post(API_DT_URL, filter);
            dispatch(GetBuildings(response.data.collection.data || []));
            console.log("Fetch buildings", response.data.collection);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching buildings:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

export const addBuilding = createAsyncThunk("buildings/addBuilding", async (formData: FormData, { rejectWithValue }) => {
    try {
        formData.delete('id');
        const response = await axiosServices.post(API_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
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
        const response = await axiosServices.put(`${API_URL}${id}`, formData,{
            headers: {
                'Content-Type': 'multipart/form-data',
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
        await axiosServices.delete(`${API_URL}${buildingId}`);
        return buildingId; // Return the deleted building's ID to update the state
    } catch (error: any) {
        console.error("Error deleting building:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export default BuildingSlice.reducer;