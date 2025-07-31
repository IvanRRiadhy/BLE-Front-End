import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { masterVisitorType } from "./visitor";
import { MaskedAreaType } from "./maskedArea";
import { defaultBlaclistFilter } from "../defaultForm";

const API_URL = '/api/VisitorBlacklistArea/';
const API_DT_URL = '/api/VisitorBlacklistArea/filter/';

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    searchValue: string,
    filters: {
        FloorplanMaskedAreaId: string[],
        VisitorId: string[],
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
    visitorId: string,
    visitor?: masterVisitorType,
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
}

const initialState: StateType = {
    blacklists: [],
    blacklistSearch: "",
    selectedBlacklist: null,
    blacklistTotalCount: 0,
    blacklistFilteredCount: 0,
    blacklistFilter: defaultBlaclistFilter,
};

export const BlacklistSlice = createSlice({
    name: "blacklist",
    initialState,
    reducers: {
        GetBlaclist(state, action: PayloadAction<blacklistType[]>) {
            console.log(action.payload);
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
        .addCase(addBlacklist.fulfilled, (state, action) => {
            state.blacklists.push(action.payload);
        })
        .addCase(addBlacklist.rejected, (_state, action) => {
            console.error("Add failed: ", action.payload);
        })
        .addCase(editBlacklist.fulfilled, (state, action) => {
            const index = state.blacklists.findIndex((blacklist: blacklistType) => blacklist.id === action.payload.id);
            if (index !== -1) {
                state.blacklists[index] = action.payload;
            }
        })
        .addCase(editBlacklist.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
        })
        .addCase(deleteBlacklist.fulfilled, (state, action) => {
            state.blacklists = state.blacklists.filter((blacklist: blacklistType) => blacklist.id !== action.payload);
        })
        .addCase(deleteBlacklist.rejected, (_state, action) => {
            console.error("Delete failed: ", action.payload);
        })
        .addCase(fetchBlacklistDT.fulfilled, (state, action) => {
            state.blacklistTotalCount = action.payload.recordsTotal;
            state.blacklistFilteredCount = action.payload.recordsFiltered;
        })
        .addCase(fetchBlacklistDT.rejected, (_state, action) => {
            console.error("Error fetching blacklists: ", action.payload);
            // _state.blacklistTotalCount = 0;
            _state.blacklistFilteredCount = 0;
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
        console.log("Blaclist :", response);
    } catch (err){
        console.log("Error: ", err);
    }
};

export const fetchBlacklistDT = createAsyncThunk(
    "blacklist/fetchBlacklistDT",
    async (filter: any, { rejectWithValue }) => {
        try {
                                if (
            filter?.filters &&
            Object.values(filter.filters).some(
                (arr: any) => Array.isArray(arr) && arr.includes("Empty")
            )
        ) {
            console.log("Filter contains 'Empty', skipping request");
            // Option 1: just return null (success, no data)
            // return null;
            // Option 2: reject, if you want to treat as error
            return rejectWithValue("Filter contains 'Empty', skipping request");
        }
            const response = await axiosServices.post(API_DT_URL, filter);
            dispatch(GetBlaclist(response.data.collection.data || []));
            console.log("Fetch blacklists", response.data.collection);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching blacklists:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

export const addBlacklist = createAsyncThunk("blacklist/addBlacklist", async (formData: FormData) => {
    try {
        formData.delete('id');
        const response = await axiosServices.post(API_URL, formData);
        return response.data;
    } catch (error) {
        console.error("Error adding blacklist:", error);
        throw error;
    }
});

export const editBlacklist = createAsyncThunk("blacklist/editBlacklist", async (formData: FormData) => {
    try {
        const id = formData.get('id');
        formData.delete('id');
        const response = await axiosServices.put(`${API_URL}${id}`, formData);
        return response.data;
    } catch (error) {
        console.error("Error editing blacklist:", error);
        throw error;
    }
});

export const deleteBlacklist = createAsyncThunk("blacklist/deleteBlacklist", async (blacklistId: string) => {
    try {
        await axiosServices.delete(`${API_URL}${blacklistId}`);
        return blacklistId; // Return the deleted blacklist's ID to update the state
    } catch (error) {
        console.error("Error deleting blacklist:", error);
        throw error;
    }
});

export default BlacklistSlice.reducer;