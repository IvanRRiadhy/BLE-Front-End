import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { MaskedAreaType } from "./maskedArea";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";
import { defaultCardAccessFilter } from "../defaultForm";


const API_DT_URL = "/api/CardAccess/filter/";
const API_URL = "/api/CardAccess/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
    filters: {
    }
}

export type CardAccessType = {
    id: string,
    name: string,
    applicationId?: string,
    accessNumber: string,
    remarks: string,
    accessScope: string,
    maskedAreaIds: string[],
    maskedArea: MaskedAreaType[],
    timeGroupIds: string[],
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string,
    status?: number,
};

interface StateType {
    cardAccess: CardAccessType[],
    cardAccessAll: CardAccessType[],
    cardAccessTotalCount: number,
    cardAccessFilteredCount: number,
    cardAccessFilter: GetFilter,
    lastFilter?: GetFilter;
    isLoading: boolean,
    hasLoaded: boolean
    selectedCardAccess: CardAccessType | null,
}

const initialState: StateType = {
    cardAccess: [],
    cardAccessAll: [],
    cardAccessTotalCount: 0,
    cardAccessFilteredCount: 0,
    cardAccessFilter: defaultCardAccessFilter,
    isLoading: false,
    hasLoaded: false,
    selectedCardAccess: null
}

export const CardAccessSlice = createSlice ({

    name: 'cardAccess',
    initialState,
    reducers: {
        GetCardAccess: (state, action: PayloadAction<CardAccessType[]>) => {
            state.cardAccess = action.payload
        },
        GetAllCardAccess: (state, action: PayloadAction<CardAccessType[]>) => {
            state.cardAccessAll = action.payload
        },
        UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
            state.cardAccessFilter = { ...state.cardAccessFilter, ...action.payload };
        },
        SelectCardAccess: (state, action: PayloadAction<string>) => {
            const selected = state.cardAccess.find((cardAccess: CardAccessType) => cardAccess.id === action.payload);
            state.selectedCardAccess = selected || null;
        },
    },
    extraReducers: (builder) => {
        builder
        .addCase(fetchCardAccessDT.pending, (state, action) => {
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
        .addCase(fetchCardAccessDT.fulfilled, (state, action) => {
            state.cardAccessTotalCount = action.payload.recordsTotal;
            state.cardAccessFilteredCount = action.payload.recordsFiltered;
            state.isLoading = false;
            state.hasLoaded = true;
            state.lastFilter = { ...state.cardAccessFilter };
        })
        .addCase(fetchCardAccessDT.rejected, (state, action) => {
            console.error("Error fetching card accesses:", action.error);
            state.cardAccessTotalCount = 0;
            state.cardAccessFilteredCount = 0;
            state.isLoading = false;
            state.hasLoaded = false;
        })
    }   
})

export const {
    GetCardAccess,
    GetAllCardAccess,
    UpdateFilter,
    SelectCardAccess
} = CardAccessSlice.actions

export const fetchCardAccess = () => async (dispatch: any) => {
    try {
            const res = await axiosServices.get(API_URL);
    dispatch(GetAllCardAccess(res.data.collection.data || []));
    } catch (error) {
        console.error("Error fetching card access:", error);
    }
}

export const fetchCardAccessDT = createAsyncThunk(
    "cardAccess/fetchCardAccessDT",
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

        console.log("res: ", res);
        dispatch(GetCardAccess(res.data.collection.data || []));
        await ensureMinLatency(started, 500);

        return res.data.collection;
      }
);

export const addCardAccess = createAsyncThunk("cardAccess/addCardAccess", async (formData: CardAccessType, { rejectWithValue }) => {
    const started = Date.now();
    try {
        
        const response = await axiosServices.post(API_URL, formData);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error: any) {
        console.error("Error adding card access:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const editCardAccess = createAsyncThunk("cardAccess/editCardAccess", async (formData: CardAccessType, { rejectWithValue }) => {
    const started = Date.now();
    try {
       const {id, updatedAt, updatedBy, createdAt, createdBy, ...filteredCardAccessData} = formData;
       console.log("filteredCardAccessData: ", filteredCardAccessData, formData);
        const response = await axiosServices.put(`${API_URL}${id}`, filteredCardAccessData);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error: any) {
        console.error("Error editing card access:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
})

export const deleteCardAccess = createAsyncThunk("cardAccess/deleteCardAccess", async (cardAccessId: string, { rejectWithValue }) => {
    try {
        await axiosServices.delete(`${API_URL}${cardAccessId}`);
        return cardAccessId; // Return the deleted card access's ID to update the state
    } catch (error: any) {
        console.error("Error deleting card access:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export default CardAccessSlice.reducer
