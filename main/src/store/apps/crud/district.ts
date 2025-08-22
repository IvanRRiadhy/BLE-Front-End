import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { defaultDistrictFilter } from "../defaultForm";

const API_URL = "/api/MstDistrict/";
const API_DT_URL = "/api/MstDistrict/filter/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
isLoading: boolean;
hasLoaded: boolean;
}

const initialState: StateType = {
    districts: [],
    districtSearch: "",
    selectedDistrict: null,
    districtTotalCount: 0,
    districtFilteredCount: 0,
    districtFilter: defaultDistrictFilter,
    isLoading: false,
    hasLoaded: false,
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
        .addCase(addDistrict.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(addDistrict.fulfilled, (state, action) => {
            state.districts.push(action.payload);
            state.isLoading = false;
        })
        .addCase(addDistrict.rejected, (_state, action) => {
            console.error("Add district failed: ", action.payload);
            _state.isLoading = false;
        })
        .addCase(editDistrict.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(editDistrict.fulfilled, (state, action) => {
            const index = state.districts.findIndex((district) => district.id === action.payload.id);
            if(index !== -1) {
                state.districts[index] = action.payload;
                state.selectedDistrict = action.payload;
            }
            state.isLoading = false;
        })

        .addCase(editDistrict.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
            _state.isLoading = false;
        })
        .addCase(deleteDistrict.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(deleteDistrict.fulfilled, (state, action) => {
            state.districts = state.districts.filter(district => district.id !== action.payload);
            if (state.selectedDistrict?.id === action.payload) {
                state.selectedDistrict = null;
            }
            state.isLoading = false;
        })
        .addCase(deleteDistrict.rejected, (_state, action) => {
            console.error("Delete failed: ", action.payload);
            _state.isLoading = false;
        })
        .addCase(fetchDistrictDT.pending, (state) => {

            state.isLoading = true;
            state.hasLoaded = false;
        })
        .addCase(fetchDistrictDT.fulfilled, (state, action) => {
            state.districtTotalCount = action.payload.recordsTotal;
            state.districtFilteredCount = action.payload.recordsFiltered;
                state.isLoading = false;
                state.hasLoaded = true;
        })
        .addCase(fetchDistrictDT.rejected, (_state, action) => {
            console.error("Error fetching districts: ", action.payload);
            _state.districtFilteredCount = 0;
                _state.isLoading = false;
                _state.hasLoaded = false;
        });
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
        const started = Date.now();
        try {
            const response = await axiosServices.post(API_DT_URL, filter);
            dispatch(GetDistricts(response.data.collection.data || []));
            // console.log("Fetch districts", response.data.collection);
                    const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching districts:", error);
                    const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

export const addDistrict = createAsyncThunk("districts/addDistrict", async (district: DistrictType, { rejectWithValue }) => {
    const started = Date.now();
    try {
        const {id, createdBy, createdAt, updatedBy, updatedAt, ...filteredDistrictData} = district
        const response = await axiosServices.post(API_URL, filteredDistrictData);
                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error: any) {
        console.error("Error adding district:", error);
                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const addBatchDistrict = createAsyncThunk("districts/addBatchDistrict", async (districts: DistrictType[], { rejectWithValue }) => {
    const started = Date.now();
    try {
      const cleanedDistricts = districts.map(({ id, createdBy, createdAt, updatedBy, updatedAt, ...rest }) => rest);

      const response = await axiosServices.post(`${API_URL}batch/`, cleanedDistricts);
              const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
      return response.data;
    } catch (error: any) {
        console.error("Error adding district:", error);
                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
})

export const editDistrict = createAsyncThunk("districts/editDistrict", async (district: DistrictType, { rejectWithValue }) => {
    const started = Date.now();
    try {
        const { id, createdBy, createdAt, updatedBy, updatedAt, ...filteredDistrictData } = district;
        const response = await axiosServices.put(`${API_URL}${id}`, filteredDistrictData);
                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error: any) {
        console.error("Error editing district:", error);
                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteDistrict = createAsyncThunk("districts/deleteDistrict", async (districtId: string, { rejectWithValue }) => {
    const started = Date.now();
    try {
        await axiosServices.delete(`${API_URL}${districtId}`);
                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return districtId; // Return the deleted district's ID to update the state
    } catch (error: any) {
        console.error("Error deleting district:", error);
                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export default DistrictSlice.reducer;