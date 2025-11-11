import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { IntegrationType } from "src/store/apps/crud/integration";
import { defaultAccessCCTVFilter } from "../defaultForm";

const API_URL = "/api/MstAccessCctv/";
const API_DT_URL = "/api/MstAccessCctv/filter/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type GetCCTVResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : CCTVType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
}

export interface CCTVType {
    id: string,
    name: string,
    rtsp: string,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string,
    integrationId: string,
    applicationId: string,
    integration?: IntegrationType,
}

interface StateType {
    cctvs: CCTVType[];
    cctvSearch: string;
    selectedCCTV?: CCTVType | null;
    cctvTotalCount: number;
    cctvFilteredCount: number;
    cctvFilter: GetFilter;
    lastFilter?: GetFilter;
isLoading: boolean;
hasLoaded: boolean;
}

const initialState: StateType = {
    cctvs: [],
    cctvSearch: "",
    selectedCCTV: null,
    cctvTotalCount: 0,
    cctvFilteredCount: 0,
    cctvFilter: defaultAccessCCTVFilter,
    isLoading: false,
    hasLoaded: false,
};

export const CCTVSlice = createSlice({
    name: "cctvs",
    initialState,

    reducers: {
        GetAccessCCTV: (state, action: PayloadAction<CCTVType[]>) => {
            state.cctvs = action.payload;
        },
        SelectAccessCCTV: (state, action: PayloadAction<string>) => {
            const selected = state.cctvs.find(
                (cctv: CCTVType) => cctv.id === action.payload,
            );
            state.selectedCCTV = selected || null;
        },
        SearchAccessCCTV: (state, action: PayloadAction<string>) => {
            state.cctvSearch = action.payload;
        },
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.cctvFilter = { ...state.cctvFilter, ...action.payload };
        }
    },

    extraReducers: (builder) => {
        builder
        .addCase(addCCTV.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(addCCTV.fulfilled, (state, action) => {
            state.cctvs.push(action.payload);
            state.isLoading = false;
        })
        .addCase(addCCTV.rejected, (_state, action) => {
            console.error("Add CCTV failed: ", action.payload);
            _state.isLoading = false;
        })
        .addCase(editCCTV.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(editCCTV.fulfilled, (state, action) => {
            const index = state.cctvs.findIndex((cctv) => cctv.id === action.payload.id);
            if(index !== -1) {
                state.cctvs[index] = action.payload;
                state.selectedCCTV = action.payload;
            }
            state.isLoading = false;
        })
        .addCase(editCCTV.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
            _state.isLoading = false;
        })
        .addCase(deleteCCTV.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(deleteCCTV.fulfilled, (state, action) => {
            state.cctvs = state.cctvs.filter(cctv => cctv.id !== action.payload);
            if (state.selectedCCTV?.id === action.payload) {
                state.selectedCCTV = null;
            }
            state.isLoading = false;
        })
        .addCase(deleteCCTV.rejected, (_state, action) => {
            console.error("Delete failed: ", action.payload);
            _state.isLoading = false;
        })
        .addCase(fetchAccessCCTVDT.pending, (state, action) => {
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
        .addCase(fetchAccessCCTVDT.fulfilled, (state, action) => {
            state.cctvTotalCount = action.payload.recordsTotal;
            state.cctvFilteredCount = action.payload.recordsFiltered;
                state.isLoading = false;
                state.hasLoaded = true;
                state.lastFilter = { ...state.cctvFilter };
        })
        .addCase(fetchAccessCCTVDT.rejected, (_state, action) => {
            console.error("Fetch failed: ", action.payload);
            // _state.cctvTotalCount = 0;
            _state.cctvFilteredCount = 0;
                _state.isLoading = false;
                _state.hasLoaded = false;
        });
    }

});

export const selectAccessCCTV = 
    (accessCCTVID: string) => (dispatch: AppDispatch) => {
        // const state = getState();
        // console.log(state);
        const isEditing = false;

        if(!isEditing) {
            dispatch(SelectAccessCCTV(accessCCTVID));
        } else {
            console.warn("Cannot Switch while editing.");
        }
    };

    export const {
        GetAccessCCTV,
        SelectAccessCCTV,
        SearchAccessCCTV,
        UpdateFilter,
    } = CCTVSlice.actions;


    export const fetchAccessCCTV = () => async (dispatch: AppDispatch) => {
        try {
            const response = await axiosServices.get(API_URL);
            dispatch(GetAccessCCTV(response.data?.collection?.data || []));
        } catch (error) {
            console.log(error);
        }
    };

    export const fetchAccessCCTVDT = createAsyncThunk(
        "cctvs/fetchAccessCCTVDT",
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
                dispatch(GetAccessCCTV(response.data?.collection?.data || []));
                                  const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
                console.log("Fetch cctvs", response.data.collection);
                return response.data.collection;
            } catch (error: any) {
                                  const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
                console.error("Error fetching cctvs:", error);
                return rejectWithValue(error.response?.data || "Unknown error");
            }
        }
    )

    export const addCCTV = createAsyncThunk(
        "cctvs/addCCTV",
        async (newCCTV: CCTVType, { rejectWithValue }) => {
            const started = Date.now();
            try {
                const {id, integrationId, createdBy, createdAt, updatedBy, updatedAt, ...filteredCCTVData} = newCCTV
                const response = await axiosServices.post(API_URL, filteredCCTVData);
                                  const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
                return response.data;
            } catch (error: any) {
                console.error("Error adding CCTV:", error);
                                  const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
                return rejectWithValue(error.response?.data || "Unknown error");
            }
        },
    );

    export const editCCTV = createAsyncThunk(
        "cctvs/editCCTV",
        async (updateCCTV: CCTVType, {rejectWithValue}) => {
            const started = Date.now();
            try {
                const { id, createdBy, createdAt, updatedBy, updatedAt, ...filteredCCTVData } = updateCCTV;
                const response = await axiosServices.put(`${API_URL}${id}`, filteredCCTVData);
                                  const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
                return response.data;
            } catch (error: any) {
                console.error("Error editing CCTV:", error);
                                  const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
                return rejectWithValue(error.response?.data || "Unknown error");
            }
        },
    );

    export const deleteCCTV = createAsyncThunk(
        "cctvs/deleteCCTV",
        async (cctvId: string, { rejectWithValue }) => {
            const started = Date.now();
            try {
                await axiosServices.delete(`${API_URL}${cctvId}`);
                                  const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
                return cctvId; // Return the deleted CCTV's ID to update the state
            } catch (error: any) {
                console.error("Error deleting CCTV:", error);
                                  const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
                return rejectWithValue(error.response?.data || "Unknown error");
            }
        },
    );

    export default CCTVSlice.reducer;