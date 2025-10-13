import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { MaskedAreaType } from "./maskedArea";
import { bleReaderType } from "./bleReader";
import { defaultTrackingTransFilter } from "../defaultForm";
import { CardType } from "./card";

const API_URL = "/api/TrackingTransaction/";
const API_DT_URL = "/api/TrackingTransaction/filter/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
    filters: {
        FloorplanMaskedAreaId: string[],
        ReaderId: string[],
    }
}


export type GetTrackingTransResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : trackingTransType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

export interface trackingTransType {
    id: string,
    transTime: string,
    floorplanMaskedAreaId: string,
    readerId: string,
    cardId: string,
    coordinateX: number,
    coordinateY: number,
    coordinatePxX: number,
    coordinatePxY: number,
    alarmStatus: string,
    battery: number,
    floorplanMaskedArea?: MaskedAreaType,
    reader?: bleReaderType,
    card?: CardType,
    visitorId?: string,
    memberId?: string,
}

interface StateType {
    trackingTrans: trackingTransType[];
    trackingTransAll: trackingTransType[];
    trackingTransSearch: string;
    selectedTrackingTrans?: trackingTransType | null;
    trackingTransTotalCount: number;
    trackingTransFilteredCount: number;
    trackingTransFilter: GetFilter;
isLoading: boolean;
hasLoaded: boolean;
}

const initialState: StateType = {
    trackingTrans: [],
    trackingTransAll: [],
    trackingTransSearch: "",
    selectedTrackingTrans: null,
    trackingTransTotalCount: 0,
    trackingTransFilteredCount: 0,
    trackingTransFilter: defaultTrackingTransFilter,
    isLoading: false,
    hasLoaded: false,
};

export const TrackingTransSlice = createSlice({
    name: "trackingTrans",
    initialState,
    reducers: {
        GetTrackingTrans: (state, action: PayloadAction<trackingTransType[]>) => {
            state.trackingTrans = action.payload;
        },
        GetAllTrackingTrans: (state, action: PayloadAction<trackingTransType[]>) => {
            state.trackingTransAll = action.payload;
        },
        SelectTrackingTrans: (state, action: PayloadAction<trackingTransType>) => {
            const selected = state.trackingTrans.find((trackingTrans: trackingTransType) => trackingTrans.id === action.payload.id);
            state.selectedTrackingTrans = selected || null;
        },
        SearchTrackingTrans: (state, action: PayloadAction<string>) => {
            state.trackingTransSearch = action.payload;
        },
        UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
            state.trackingTransFilter = { ...state.trackingTransFilter, ...action.payload };
        }
    },
    extraReducers: (builder) => {
        builder
        .addCase(addTrackingTrans.fulfilled, (state, action) => {
            state.trackingTrans.push(action.payload);
        })
        .addCase(addTrackingTrans.rejected, (_state, action) => {
            console.error("Add failed: ", action.payload);
        })
        .addCase(editTrackingTrans.fulfilled, (state, action) => {
            const index = state.trackingTrans.findIndex((trackingTrans: trackingTransType) => trackingTrans.id === action.payload.id);
            if (index !== -1) {
                state.trackingTrans[index] = action.payload;
            }
        })
        .addCase(editTrackingTrans.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
        })
        .addCase(deleteTrackingTrans.fulfilled, (state, action) => {
            state.trackingTrans = state.trackingTrans.filter((trackingTrans: trackingTransType) => trackingTrans.id !== action.payload);
        })
        .addCase(deleteTrackingTrans.rejected, (_state, action) => {
            console.error("Delete failed: ", action.payload);
        })
        .addCase(fetchTrackingTransDT.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(fetchTrackingTransDT.fulfilled, (state, action) => {
            state.trackingTransTotalCount = action.payload.recordsTotal;
            state.trackingTransFilteredCount = action.payload.recordsFiltered;
                state.isLoading = false;
                state.hasLoaded = true;
        })
        .addCase(fetchTrackingTransDT.rejected, (_state, action) => {
            console.error("Error fetching tracking transactions: ", action.payload);
            _state.trackingTrans = [];
            _state.trackingTransTotalCount = 0;
            _state.trackingTransFilteredCount = 0;
                _state.isLoading = false;
                _state.hasLoaded = true;
        });
    },
});

export const { GetTrackingTrans, GetAllTrackingTrans, SelectTrackingTrans, SearchTrackingTrans, UpdateFilter } = TrackingTransSlice.actions;

export const fetchTrackingTrans = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(`${API_URL}`);
        dispatch(GetAllTrackingTrans(response.data?.collection?.data || []));
        console.log("Tracking transactions fetched successfully: ", response.data);
    } catch (error) {
        console.log(error);
    }
};

export const fetchTrackingTransDT = createAsyncThunk(
    "trackingTrans/fetchTrackingTransDT", 
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
            console.log("Fetch trackingTrans", response.data.collection);
            dispatch(GetTrackingTrans(response.data.collection.data || []));
                                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching trackingTrans:", error);
                                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

export const addTrackingTrans = createAsyncThunk("trackingTrans/addTrackingTrans", async (trackingTrans: trackingTransType) => {
    const started = Date.now();
    try {
        const {id, ...filteredTrackingTransData} = trackingTrans
        const response = await axiosServices.post(API_URL, filteredTrackingTransData);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error) {
        console.error("Error adding trackingTrans:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        throw error;
    }
});

export const editTrackingTrans = createAsyncThunk("trackingTrans/editTrackingTrans", async (trackingTrans: trackingTransType) => {
    const started = Date.now();
    try {
        const { id, ...filteredTrackingTransData } = trackingTrans;
        const response = await axiosServices.put(`${API_URL}${id}`, filteredTrackingTransData);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error) {
        console.error("Error editing trackingTrans:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        throw error;
    }
});

export const deleteTrackingTrans = createAsyncThunk("trackingTrans/deleteTrackingTrans", async (trackingTransId: string) => {
    const started = Date.now();
    try {
        await axiosServices.delete(`${API_URL}${trackingTransId}`);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return trackingTransId; // Return the deleted trackingTrans's ID to update the state
    } catch (error) {
        console.error("Error deleting trackingTrans:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        throw error;
    }
});

export default TrackingTransSlice.reducer;