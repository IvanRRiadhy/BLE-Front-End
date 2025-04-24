import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = "http://192.168.1.116:5000/api/MstDistrict/";

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
}

const initialState: StateType = {
    districts: [],
    districtSearch: "",
    selectedDistrict: null,
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
    },
}); 

export const selectDistrict = (districtID: string) => (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    console.log(state);
    const isEditing = false;

    if(!isEditing){
        dispatch(SelectDistrict(districtID));
    } else {
        console.warn("Cannot Switch while editing.");
    }
};

export const { GetDistricts, SelectDistrict, SearchDistrict } = DistrictSlice.actions;

export const fetchDistricts = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axios.get(API_URL, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        dispatch(GetDistricts(response.data?.collection?.data || []));
    } catch (err: any) {
        console.log("Error fetching districts:", err);
    }
};

export const addDistrict = createAsyncThunk("districts/addDistrict", async (district: DistrictType, { rejectWithValue }) => {
    try {
        const {id, createdBy, createdAt, updatedBy, updatedAt, ...filteredDistrictData} = district
        const response = await axios.post(API_URL, filteredDistrictData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error: any) {
        console.error("Error adding district:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const editDistrict = createAsyncThunk("districts/editDistrict", async (district: DistrictType, { rejectWithValue }) => {
    try {
        const { id, createdBy, createdAt, updatedBy, updatedAt, ...filteredDistrictData } = district;
        const response = await axios.put(`${API_URL}/${id}`, filteredDistrictData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error: any) {
        console.error("Error editing district:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteDistrict = createAsyncThunk("districts/deleteDistrict", async (districtId: string, { rejectWithValue }) => {
    try {
        await axios.delete(`${API_URL}/${districtId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return districtId; // Return the deleted district's ID to update the state
    } catch (error: any) {
        console.error("Error deleting district:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export default DistrictSlice.reducer;