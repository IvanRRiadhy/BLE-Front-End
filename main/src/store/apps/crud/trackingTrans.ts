import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { MaskedAreaType } from "./maskedArea";
import { bleReaderType } from "./bleReader";
import { defaultTrackingTransFilter } from "../defaultForm";
import { CardType } from "./card";
import { VisitorType } from "./visitor";
import { memberType } from "./member";
import { getConfig } from "src/config";

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
    dateFilters?: {
        TransTime?: {
            DateFrom?: string | null,
            DateTo?: string | null,
        }
    }
    timeRange?: string,
    filters: {
        FloorplanMaskedAreaId?: string[],
        ReaderId?: string[],
        VisitorId?: string[],
        MemberId?: string[]
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
    visitor?: VisitorType,
    member?: memberType
}

interface StateType {
    trackingTrans: trackingTransType[];
    trackingTransAll: trackingTransType[];
    trackingTransSearch: string;
    selectedTrackingTrans?: trackingTransType | null;
    trackingTransTotalCount: number;
    trackingTransFilteredCount: number;
    trackingTransFilter: GetFilter;
    lastFilter?: GetFilter;
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
        .addCase(fetchTrackingTransDT.pending, (state, action) => {
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
        .addCase(fetchTrackingTransDT.fulfilled, (state, action) => {
            state.trackingTrans = action.payload.data || [];
            state.trackingTransTotalCount = action.payload.recordsTotal;
            state.trackingTransFilteredCount = action.payload.recordsFiltered;
            state.isLoading = false;
            state.hasLoaded = true;
            state.lastFilter = state.trackingTransFilter;
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
        const elapsed = Date.now() - started;
        if (elapsed < 500) await delay(500 - elapsed);
        return rejectWithValue("Filter contains 'Empty', skipping request");
      }
    //   console.log("🔍 Fetching trackingTrans with filter:", filter);
      const response = await axiosServices.post(API_DT_URL, filter);
    //   console.log("✅ Fetch trackingTrans:", response.data.collection);

      // ⚠️ DO NOT DISPATCH here! return data instead.
      const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
      console.log("✅ Fetch trackingTrans:", response.data.collection);
      return response.data.collection; // returns to the fulfilled case
    } catch (error: any) {
      console.error("❌ Error fetching trackingTrans:", error);
      const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
      return rejectWithValue(error.response?.data || "Unknown error");
    }
  }
);


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





export const ExportTrackingTrans = createAsyncThunk(
    "trackingTrans/exportTrackingTrans",
    async (filter: "pdf" | "excel", { rejectWithValue }) => {
    const config = getConfig();
    const BASE_URL = config.API_BASE_URL;
    const API_KEY = config.API_KEY;
        const url = `${BASE_URL}${API_URL}export/${filter}`;
        const accessToken = localStorage.getItem("token");
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers:{
          'Authorization': `Bearer ${accessToken}`,
          'X-BIOPEOPLETRACKING-API-KEY': API_KEY,
        },
            });
            if(!response.ok) throw new Error('Export failed');
            // console.log('Response content-type:', response.headers.get('content-type'));

                  const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filter === 'pdf' ? 'trackingtrans.pdf' : 'trackingtrans.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      return true; // Indicate success
        }catch (error: any) {
      console.error("Error exporting trackingtrans:", error);
      return rejectWithValue(error.message || "Unknown error");
    }
    }
);

export default TrackingTransSlice.reducer;