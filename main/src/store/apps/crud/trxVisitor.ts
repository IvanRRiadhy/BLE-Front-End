import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

// const API_URL = "/api/TrxVisitor/";
const API_DT_URL = "/api/TrxVisitor/filter/";

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    searchValue: string,
}


export type GetTrxVisitorResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : TrxVisitorType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

export type TrxVisitorType = {
    id: number,
    checkin_at: string,
    checkout_at: string,
    deny_at: string,
    block_at: string,
    unblock_at: string,
    checkin_by: string,
    checkout_by: string,
    deny_by: string,
    deny_reason: string,
    block_by: string,
    block_reason: string,
    visitor_status: string,
    invitation_created_at: string,
    visitor_group_code: string,
    visitor_number: string,
    vehicle_plate_number: string,
    remarks: string,
    site_id: string,
    parking_id: string,
    visitor_id: string,
}

interface StateType {
    TrxVisitors: TrxVisitorType[];
    TrxVisitorSearch: string;
    TrxVisitorTotalCount: number;
    TrxVisitorFilteredCount: number;
    TrxVisitorFilter: GetFilter;
}

const initialState: StateType = {
    TrxVisitors: [],
    TrxVisitorSearch: "",
    TrxVisitorTotalCount: 0,
    TrxVisitorFilteredCount: 0,
    TrxVisitorFilter: {
        Draw: 1,
        Start: 0,
        Length: 5,
        SortColumn: "updatedAt",
        SortDir: "desc",
        searchValue: "",
    }
};

export const TrxVisitorSlice = createSlice({
    name: "TrxVisitors",
    initialState,
    reducers: {
        GetTrxVisitors: (state, action: PayloadAction<TrxVisitorType[]>) => {
            state.TrxVisitors = action.payload;
        },
        setTrxVisitorSearch: (state, action: PayloadAction<string>) => {
            state.TrxVisitorSearch = action.payload;
        },
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.TrxVisitorFilter = { ...state.TrxVisitorFilter, ...action.payload };
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTrxVisitorDT.fulfilled, (state, action) => {
                state.TrxVisitorTotalCount = action.payload.recordsTotal;
                state.TrxVisitorFilteredCount = action.payload.recordsFiltered;
            });
    }
});

export const {
    GetTrxVisitors,
    setTrxVisitorSearch,
    UpdateFilter,
} = TrxVisitorSlice.actions;

export const fetchTrxVisitorDT = createAsyncThunk(
    "TrxVisitor/fetchTrxVisitorDT",
    async (filter: any, { rejectWithValue }) => {
        try{
            const response = await axiosServices.post(`${API_DT_URL}`, filter);
            dispatch(GetTrxVisitors(response.data.collection.data || []));
            console.log("Fetch TrxVisitors", response.data.collection);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching TrxVisitors:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)


export default TrxVisitorSlice.reducer;