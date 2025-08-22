import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { IntegrationType } from "src/store/apps/crud/integration";
import { defaultAccessCCTVFilter } from "../defaultForm";

const API_URL = "/api/MstAccessCctv/";
const API_DT_URL = "/api/MstAccessCctv/filter/";

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
        .addCase(addCCTV.fulfilled, (state, action) => {
            state.cctvs.push(action.payload);
        })
        .addCase(addCCTV.rejected, (_state, action) => {
            console.error("Add CCTV failed: ", action.payload);
        })
        .addCase(editCCTV.fulfilled, (state, action) => {
            const index = state.cctvs.findIndex((cctv) => cctv.id === action.payload.id);
            if(index !== -1) {
                state.cctvs[index] = action.payload;
                state.selectedCCTV = action.payload;
            }
        })
        .addCase(editCCTV.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
        })
        .addCase(deleteCCTV.fulfilled, (state, action) => {
            state.cctvs = state.cctvs.filter(cctv => cctv.id !== action.payload);
            if (state.selectedCCTV?.id === action.payload) {
                state.selectedCCTV = null;
            }
        })
        .addCase(deleteCCTV.rejected, (_state, action) => {
            console.error("Delete failed: ", action.payload);
        })
        .addCase(fetchAccessCCTVDT.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(fetchAccessCCTVDT.fulfilled, (state, action) => {
            state.cctvTotalCount = action.payload.recordsTotal;
            state.cctvFilteredCount = action.payload.recordsFiltered;
            setTimeout(() => {
                state.isLoading = false;
                state.hasLoaded = true;
            }, 1000); // Simulate loading delay
        })
        .addCase(fetchAccessCCTVDT.rejected, (_state, action) => {
            console.error("Fetch failed: ", action.payload);
            // _state.cctvTotalCount = 0;
            _state.cctvFilteredCount = 0;
            setTimeout(() => {
                _state.isLoading = false;
                _state.hasLoaded = true;
            }, 1000); // Simulate loading delay
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
            return rejectWithValue("Filter contains 'Empty', skipping request");
        }
                const response = await axiosServices.post(API_DT_URL, filter);
                dispatch(GetAccessCCTV(response.data?.collection?.data || []));
                // console.log("Fetch cctvs", response.data.collection);
                return response.data.collection;
            } catch (error: any) {
                console.error("Error fetching cctvs:", error);
                return rejectWithValue(error.response?.data || "Unknown error");
            }
        }
    )

    export const addCCTV = createAsyncThunk(
        "cctvs/addCCTV",
        async (newCCTV: CCTVType, { rejectWithValue }) => {
            try {
                const {id, integrationId, createdBy, createdAt, updatedBy, updatedAt, ...filteredCCTVData} = newCCTV
                const response = await axiosServices.post(API_URL, filteredCCTVData);
                return response.data;
            } catch (error: any) {
                console.error("Error adding CCTV:", error);
                return rejectWithValue(error.response?.data || "Unknown error");
            }
        },
    );

    export const editCCTV = createAsyncThunk(
        "cctvs/editCCTV",
        async (updateCCTV: CCTVType, {rejectWithValue}) => {
            try {
                const { id, createdBy, createdAt, updatedBy, updatedAt, ...filteredCCTVData } = updateCCTV;
                const response = await axiosServices.put(`${API_URL}${id}`, filteredCCTVData);
                return response.data;
            } catch (error: any) {
                console.error("Error editing CCTV:", error);
                return rejectWithValue(error.response?.data || "Unknown error");
            }
        },
    );

    export const deleteCCTV = createAsyncThunk(
        "cctvs/deleteCCTV",
        async (cctvId: string, { rejectWithValue }) => {
            try {
                await axiosServices.delete(`${API_URL}${cctvId}`);
                return cctvId; // Return the deleted CCTV's ID to update the state
            } catch (error: any) {
                console.error("Error deleting CCTV:", error);
                return rejectWithValue(error.response?.data || "Unknown error");
            }
        },
    );

    export default CCTVSlice.reducer;