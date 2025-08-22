
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosServices from "../../../utils/axios";
import { defaultBrandFilter } from "../defaultForm";

const API_URL = "/api/MstBrand/";
const API_DT_URL = "/api/MstBrand/filter/";

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
}


export type GetBrandResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : BrandType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

export interface BrandType {
    id: string;
    name: string;
    tag: string;
}

interface StateType {
    brands: BrandType[];
    brandAll: BrandType[];
    brandSearch: string;
    selectedBrand?: BrandType | null;
    brandTotalCount: number;
    brandFilteredCount: number;
    brandFilter: GetFilter;
isLoading: boolean;
hasLoaded: boolean;
}

const initialState: StateType = {
    brands: [],
    brandAll: [],
    brandSearch: "",
    selectedBrand: null,
    brandTotalCount: 0,
    brandFilteredCount: 0,
    brandFilter: defaultBrandFilter,
    isLoading: false,
    hasLoaded: false,
};

export const BrandSlice = createSlice({
    name: "brands",
    initialState,

    reducers: {
        GetBrands: (state, action: PayloadAction<BrandType[]>) => {
            state.brands = action.payload;
        },
        GetAllBrand: (state, action: PayloadAction<BrandType[]>) => {
            state.brandAll = action.payload;
        },
        SelectBrand: (state, action: PayloadAction<string>) => {
            const selected = state.brands.find((brand: BrandType) => brand.id === action.payload);
            state.selectedBrand = selected || null;
        },
        SearchBrand: (state, action: PayloadAction<string>) => {
            state.brandSearch = action.payload;    
        },
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.brandFilter = { ...state.brandFilter, ...action.payload };
        }
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
        .addCase(fetchBrandDT.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(fetchBrandDT.fulfilled, (state, action) => {
            state.brandTotalCount = action.payload.recordsTotal;
            state.brandFilteredCount = action.payload.recordsFiltered;
            setTimeout(() => {
                state.isLoading = false;
                state.hasLoaded = true;
            }, 1000); // Simulate loading delay
        })
        .addCase(fetchBrandDT.rejected, (_state, action) => {
            console.error("Error fetching brands: ", action.payload);
            // _state.brandTotalCount = 0;
            _state.brandFilteredCount = 0;
            setTimeout(() => {
                _state.isLoading = false;
                _state.hasLoaded = true;
            }, 1000); // Simulate loading delay
        });
    },
});

export const selectBrand = (brandID: string) => 
(dispatch: AppDispatch) => {
    // const state = getState();
    // console.log(state);
    const isEditing = false;

    if(!isEditing){
        dispatch(SelectBrand(brandID));
    } else {
        console.warn("Cannot Switch while editing");
    }
};

export const { GetBrands, GetAllBrand, SelectBrand, SearchBrand, UpdateFilter } = BrandSlice.actions;

export const fetchBrands = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
        dispatch(GetAllBrand(response.data?.collection?.data || []));
        // console.log("Brands fetched successfully:", response);
    } catch (err: any) {
        console.log("Error fetching brands:", err);
    }
};

export const fetchBrandDT = createAsyncThunk(
    "brands/fetchBrandDT",
    async (filter: any, { rejectWithValue }) => {
        try {
            const response = await axiosServices.post(API_DT_URL, filter);
            dispatch(GetBrands(response.data.collection.data || []));
            // console.log("Fetch brands", response.data.collection);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching brands:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

export const addBrand = createAsyncThunk("brands/addBrand", async (brand: BrandType, { rejectWithValue }) => {
    try {
        const {id, ...filteredBrandData} = brand
        const response = await axiosServices.post(API_URL, filteredBrandData);
        return response.data;
    } catch (error: any) {
        console.error("Error adding brand:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const editBrand = createAsyncThunk("brands/editBrand", async (brand: BrandType, { rejectWithValue }) => {
    try {
        const { id, ...filteredBrandData } = brand;
        const response = await axiosServices.put(`${API_URL}${id}`, filteredBrandData);
        return response.data;
    } catch (error: any) {
        console.error("Error editing brand:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteBrand = createAsyncThunk("brands/deleteBrand", async (brandId: string, { rejectWithValue }) => {
    try {
        await axiosServices.delete(`${API_URL}${brandId}`);
        return brandId; // Return the deleted brand's ID to update the state
    } catch (error: any) {
        console.error("Error deleting brand:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export default BrandSlice.reducer;