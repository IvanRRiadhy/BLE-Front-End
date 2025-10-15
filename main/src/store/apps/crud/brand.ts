
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosServices from "../../../utils/axios";
import { defaultBrandFilter } from "../defaultForm";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";

const API_URL = "/api/MstBrand/";
const API_DT_URL = "/api/MstBrand/filter/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    lastFilter?: GetFilter;
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
        .addCase(fetchBrandDT.pending, (state, action) => {
                             const newFilter = action.meta.arg as GetFilter;
                                        const prevFilter = state.lastFilter;
                            
                                        // If no previous filter (first load), always reset
                                        if (!prevFilter) {
                                            state.isLoading = true;
                                            state.hasLoaded = false;
                                            return;
                                        }
                            
                                        // Detect only sorting change
                                        const onlySortingChanged =
                                            prevFilter.SortColumn !== newFilter.SortColumn ||
                                            prevFilter.SortDir !== newFilter.SortDir;
                            
                                        const filtersUnchanged =
                                            JSON.stringify({
                                            ...prevFilter,
                                            SortColumn: undefined,
                                            SortDir: undefined,
                                            }) ===
                                            JSON.stringify({
                                            ...newFilter,
                                            SortColumn: undefined,
                                            SortDir: undefined,
                                            });
                            
                                        const isOnlySortChange = onlySortingChanged && filtersUnchanged;
                            
                                        // ✅ If sorting only, keep hasLoaded true
                                        state.isLoading = true;
                                        if (!isOnlySortChange) {
                                            state.hasLoaded = false;
                                        }
                                    })
        .addCase(fetchBrandDT.fulfilled, (state, action) => {
            state.brandTotalCount = action.payload.recordsTotal;
            state.brandFilteredCount = action.payload.recordsFiltered;
                state.isLoading = false;
                state.hasLoaded = true;
                state.lastFilter = { ...state.brandFilter };
        })
        .addCase(fetchBrandDT.rejected, (_state, action) => {
            console.error("Error fetching brands: ", action.payload);
            // _state.brandTotalCount = 0;
            _state.brandFilteredCount = 0;
                _state.isLoading = false;
                _state.hasLoaded = true;
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
    async (filter: any, thunkAPI) => {
        const started = Date.now();
    const res = await retryUntilSuccess(
      () => axiosServices.post(API_DT_URL, filter),
      {
        signal: thunkAPI.signal,     
        timeoutMs: 2 * 60 * 1000,    
        minDelay: 500,
        maxDelay: 8000,
      }
    );

    dispatch(GetBrands(res.data.collection.data || []));
    await ensureMinLatency(started, 500);
    return res.data.collection;
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