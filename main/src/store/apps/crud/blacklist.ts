import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { masterVisitorType, VisitorType } from "./visitor";
import { MaskedAreaType } from "./maskedArea";
import { defaultBlaclistFilter } from "../defaultForm";
import { stat } from "fs";
import { memberType } from "./member";

const API_URL = '/api/BlacklistArea/';
const API_DT_URL = '/api/BlacklistArea/filter/';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
    filters: {
        FloorplanMaskedAreaId?: string[],
        VisitorId?: string[],
        MemberId?: string[]
    }
}


export type GetBlacklistResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : blacklistType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

export interface blacklistType {
    id: string,
    floorplanMaskedAreaId: string,
    visitorId?: string,
    visitor?: VisitorType,
    memberId?: string,
    member?: memberType,
    floorplanMaskedArea?: MaskedAreaType,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string,
}

interface StateType {
    blacklists: blacklistType[];
    blacklistSearch: string;
    selectedBlacklist?: blacklistType | null;
    blacklistTotalCount: number;
    blacklistFilteredCount: number;
    blacklistFilter: GetFilter;
    lastFilter?: GetFilter;
isLoading: boolean;
hasLoaded: boolean;
}

const initialState: StateType = {
    blacklists: [],
    blacklistSearch: "",
    selectedBlacklist: null,
    blacklistTotalCount: 0,
    blacklistFilteredCount: 0,
    blacklistFilter: defaultBlaclistFilter,
    isLoading: false,
    hasLoaded: false,
};

export const BlacklistSlice = createSlice({
    name: "blacklist",
    initialState,
    reducers: {
        GetBlaclist(state, action: PayloadAction<blacklistType[]>) {
            // console.log(action.payload);
            state.blacklists = action.payload;
        },
        SelectBlacklist(state, action: PayloadAction<string>){
            const selected = state.blacklists.find((blacklist: blacklistType) => blacklist.id === action.payload);
            state.selectedBlacklist = selected || null;
        },
        SearchBlacklist(state, action: PayloadAction<string>){
            state.blacklistSearch = action.payload;
        },
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.blacklistFilter = { ...state.blacklistFilter, ...action.payload };
        }

    },
    extraReducers: (builder) => {
        builder
        .addCase(addBlacklist.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(addBlacklist.fulfilled, (state, action) => {
            state.blacklists.push(action.payload);

            state.isLoading = false;
        })
        .addCase(addBlacklist.rejected, (_state, action) => {
            console.error("Add failed: ", action.payload);
            _state.isLoading = false;
        })
        .addCase(editBlacklist.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(editBlacklist.fulfilled, (state, action) => {
            const index = state.blacklists.findIndex((blacklist: blacklistType) => blacklist.id === action.payload.id);
            if (index !== -1) {
                state.blacklists[index] = action.payload;
            }
            state.selectedBlacklist = action.payload;
        })
        .addCase(editBlacklist.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
            _state.isLoading = false;
        })
        .addCase(deleteBlacklist.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(deleteBlacklist.fulfilled, (state, action) => {
            state.blacklists = state.blacklists.filter((blacklist: blacklistType) => blacklist.id !== action.payload);
            state.isLoading = false;
        })
        .addCase(deleteBlacklist.rejected, (_state, action) => {
            console.error("Delete failed: ", action.payload);
            _state.isLoading = false;
        })
        .addCase(fetchBlacklistDT.pending, (state, action) => {
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
        .addCase(fetchBlacklistDT.fulfilled, (state, action) => {
            state.blacklistTotalCount = action.payload.recordsTotal;
            state.blacklistFilteredCount = action.payload.recordsFiltered;
                state.isLoading = false;
                state.hasLoaded = true;
                state.lastFilter = { ...state.blacklistFilter };
        })
        .addCase(fetchBlacklistDT.rejected, (_state, action) => {
            console.error("Error fetching blacklists: ", action.payload);
            // _state.blacklistTotalCount = 0;
            _state.blacklistFilteredCount = 0;
                _state.isLoading = false;
                _state.hasLoaded = false;
        });
    },
});

export const {
    GetBlaclist,
    SelectBlacklist,
    SearchBlacklist,
    UpdateFilter,
} = BlacklistSlice.actions;

export const fetchBlacklist = () => async (dispatch: AppDispatch) => {
    try{
        const response = await axiosServices.get(API_URL);
        dispatch(GetBlaclist(response.data?.collection?.data || []));
        // console.log("Blaclist :", response);
    } catch (err){
        console.log("Error: ", err);
    }
};

export const fetchBlacklistDT = createAsyncThunk(
    "blacklist/fetchBlacklistDT",
    async (filter: any, { rejectWithValue }) => {
        const started = Date.now();
        try {
                                if (
            filter?.filters &&
            Object.values(filter.filters).some(
                (arr: any) => Array.isArray(arr) && arr.includes("Empty")
            )
        ) {
            // console.log("Filter contains 'Empty', skipping request");
            // Option 1: just return null (success, no data)
            // return null;
            // Option 2: reject, if you want to treat as error
                              const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return rejectWithValue("Filter contains 'Empty', skipping request");
        }
            const response = await axiosServices.post(API_DT_URL, filter);
            dispatch(GetBlaclist(response.data.collection.data || []));
            // console.log("Fetch blacklists", response.data.collection);
                              const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching blacklists:", error);
                              const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

export const addBlacklist = createAsyncThunk("blacklist/addBlacklist", async (formData: FormData) => {
    const started = Date.now();
    try {
        formData.delete('id');
        const response = await axiosServices.post(API_URL, formData);
                          const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error) {
        console.error("Error adding blacklist:", error);
                          const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        throw error;
    }
});

export const editBlacklist = createAsyncThunk("blacklist/editBlacklist", async (formData: FormData) => {
    const started = Date.now();
    try {
        const id = formData.get('id');
        formData.delete('id');
        const response = await axiosServices.put(`${API_URL}${id}`, formData);
                          const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error) {
        console.error("Error editing blacklist:", error);
                          const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        throw error;
    }
});

export const deleteBlacklist = createAsyncThunk("blacklist/deleteBlacklist", async (blacklistId: string) => {
    const started = Date.now();
    try {
        await axiosServices.delete(`${API_URL}${blacklistId}`);
                          const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return blacklistId; // Return the deleted blacklist's ID to update the state
    } catch (error) {
        console.error("Error deleting blacklist:", error);
                          const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        throw error;
    }
});

export default BlacklistSlice.reducer;