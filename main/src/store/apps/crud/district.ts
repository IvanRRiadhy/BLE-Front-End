import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { defaultDistrictFilter } from "../defaultForm";

const API_URL = "/api/MstDistrict/";
const API_DT_URL = "/api/MstDistrict/filter/";

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
}


export type GetDistrictResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : DistrictType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

export interface DistrictType {
    id: string,
    code: string,
    name: string,
    districtHost: string,
    applicationId: string,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string
}

interface StateType {
    districts: DistrictType[];
    districtSearch: string;
    selectedDistrict?: DistrictType | null;
    districtTotalCount: number;
    districtFilteredCount: number;
    districtFilter: GetFilter;
}

const initialState: StateType = {
    districts: [],
    districtSearch: "",
    selectedDistrict: null,
    districtTotalCount: 0,
    districtFilteredCount: 0,
    districtFilter: defaultDistrictFilter,
};

export const DistrictSlice = createSlice({
    name: "districts",
    initialState,

    reducers: {
        GetDistricts: (state, action: PayloadAction<DistrictType[]>) => {
            state.districts = action.payload;
        },
        SelectDistrict: (state, action: PayloadAction<string>) => {
            const selected = state.districts.find((district: DistrictType) => district.id === action.payload);
            state.selectedDistrict = selected || null;
        },
        SearchDistrict: (state, action: PayloadAction<string>) => {
            state.districtSearch = action.payload;
        },
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.districtFilter = { ...state.districtFilter, ...action.payload };
        }
    },

    extraReducers: (builder) => {
        builder
        .addCase(addDistrict.fulfilled, (state, action) => {
            state.districts.push(action.payload);
        })
        .addCase(addDistrict.rejected, (_state, action) => {
            console.error("Add district failed: ", action.payload);
        })
        .addCase(editDistrict.fulfilled, (state, action) => {
            const index = state.districts.findIndex((district) => district.id === action.payload.id);
            if(index !== -1) {
                state.districts[index] = action.payload;
                state.selectedDistrict = action.payload;
            }
        })
        .addCase(editDistrict.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
        })
        .addCase(deleteDistrict.fulfilled, (state, action) => {
            state.districts = state.districts.filter(district => district.id !== action.payload);
            if (state.selectedDistrict?.id === action.payload) {
                state.selectedDistrict = null;
            }
        })
        .addCase(deleteDistrict.rejected, (_state, action) => {
            console.error("Delete failed: ", action.payload);
        })
        .addCase(fetchDistrictDT.fulfilled, (state, action) => {
            state.districtTotalCount = action.payload.recordsTotal;
            state.districtFilteredCount = action.payload.recordsFiltered;
        })
    },
}); 

export const selectDistrict = (districtID: string) => (dispatch: AppDispatch) => {
    // const state = getState();
    // console.log(state);
    const isEditing = false;

    if(!isEditing){
        dispatch(SelectDistrict(districtID));
    } else {
        console.warn("Cannot Switch while editing.");
    }
};

export const { GetDistricts, SelectDistrict, SearchDistrict, UpdateFilter } = DistrictSlice.actions;

export const fetchDistricts = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
        dispatch(GetDistricts(response.data?.collection?.data || []));
    } catch (err: any) {
        console.log("Error fetching districts:", err);
    }
};

export const fetchDistrictDT = createAsyncThunk(
    "districts/fetchDistrictDT",
    async (filter: any, { rejectWithValue }) => {
        try {
            const response = await axiosServices.post(API_DT_URL, filter);
            dispatch(GetDistricts(response.data.collection.data || []));
            // console.log("Fetch districts", response.data.collection);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching districts:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

export const addDistrict = createAsyncThunk("districts/addDistrict", async (district: DistrictType, { rejectWithValue }) => {
    try {
        const {id, createdBy, createdAt, updatedBy, updatedAt, ...filteredDistrictData} = district
        const response = await axiosServices.post(API_URL, filteredDistrictData);
        return response.data;
    } catch (error: any) {
        console.error("Error adding district:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const addBatchDistrict = createAsyncThunk("districts/addBatchDistrict", async (districts: DistrictType[], { rejectWithValue }) => {
    try {
      const cleanedDistricts = districts.map(({ id, createdBy, createdAt, updatedBy, updatedAt, ...rest }) => rest);

      const response = await axiosServices.post(`${API_URL}batch/`, cleanedDistricts);
      return response.data;
    } catch (error: any) {
        console.error("Error adding district:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
})

export const editDistrict = createAsyncThunk("districts/editDistrict", async (district: DistrictType, { rejectWithValue }) => {
    try {
        const { id, createdBy, createdAt, updatedBy, updatedAt, ...filteredDistrictData } = district;
        const response = await axiosServices.put(`${API_URL}${id}`, filteredDistrictData);
        return response.data;
    } catch (error: any) {
        console.error("Error editing district:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteDistrict = createAsyncThunk("districts/deleteDistrict", async (districtId: string, { rejectWithValue }) => {
    try {
        await axiosServices.delete(`${API_URL}${districtId}`);
        return districtId; // Return the deleted district's ID to update the state
    } catch (error: any) {
        console.error("Error deleting district:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export default DistrictSlice.reducer;