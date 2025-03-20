import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = "http://localhost:5034/api/MstBrand";

export interface BrandType {
    id: string;
    name: string;
    tag: string;
}

interface StateType {
    brands: BrandType[];
    brandSearch: string;
    selectedBrand?: BrandType | null;
}

const initialState: StateType = {
    brands: [],
    brandSearch: "",
    selectedBrand: null,
};

export const BrandSlice = createSlice({
    name: "brands",
    initialState,

    reducers: {
        GetBrands: (state, action: PayloadAction<BrandType[]>) => {
            state.brands = action.payload;
        },
        SelectBrand: (state, action: PayloadAction<string>) => {
            const selected = state.brands.find((brand: BrandType) => brand.id === action.payload);
            state.selectedBrand = selected || null;
        },
        SearchBrand: (state, action: PayloadAction<string>) => {
            state.brandSearch = action.payload;    
        },

    },

    extraReducers: (builder) => {
        builder
        .addCase(addBrand.fulfilled, (state, action) => {
            state.brands.push(action.payload);
        })
        .addCase(addBrand.rejected, (_state, action) => {
            console.error("Add brand failed: ", action.payload);
        })
        .addCase(editBrand.fulfilled, (state, action) => {
            const index = state.brands.findIndex((brand) => brand.id === action.payload.id);
            if(index !== -1) {
                state.brands[index] = action.payload;
                state.selectedBrand = action.payload;
            }
        })
        .addCase(editBrand.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
        })
        .addCase(deleteBrand.fulfilled, (state, action) => {
            state.brands = state.brands.filter(brand => brand.id !== action.payload);
            if (state.selectedBrand?.id === action.payload) {
                state.selectedBrand = null;
            }
        })
        .addCase(deleteBrand.rejected, (_state, action) => {
            console.error("Delete failed: ", action.payload);
        })
    },
});

export const selectBrand = (brandID: string) => 
(dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    console.log(state);
    const isEditing = false;

    if(!isEditing){
        dispatch(SelectBrand(brandID));
    } else {
        console.warn("Cannot Switch while editing");
    }
};

export const { GetBrands, SelectBrand, SearchBrand } = BrandSlice.actions;

export const fetchBrands = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axios.get(API_URL);
        dispatch(GetBrands(response.data?.collection?.data || []));
    } catch (err: any) {
        console.log("Error fetching brands:", err);
    }
};

export const addBrand = createAsyncThunk("brands/addBrand", async (brand: BrandType, { rejectWithValue }) => {
    try {
        const {id, ...filteredBrandData} = brand
        const response = await axios.post(API_URL, filteredBrandData);
        return response.data;
    } catch (error: any) {
        console.error("Error adding brand:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const editBrand = createAsyncThunk("brands/editBrand", async (brand: BrandType, { rejectWithValue }) => {
    try {
        const { id, ...filteredBrandData } = brand;
        const response = await axios.put(`${API_URL}/${id}`, filteredBrandData);
        return response.data;
    } catch (error: any) {
        console.error("Error editing brand:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteBrand = createAsyncThunk("brands/deleteBrand", async (brandId: string, { rejectWithValue }) => {
    try {
        await axios.delete(`${API_URL}/${brandId}`);
        return brandId; // Return the deleted brand's ID to update the state
    } catch (error: any) {
        console.error("Error deleting brand:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export default BrandSlice.reducer;