import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { VisitorType } from "./visitor";
import { MaskedAreaType } from "./maskedArea";
import { defaultTrxVisitorFilter } from "../defaultForm";
import { memberType } from "./member";

const API_URL = "/api/TrxVisitor/";
const API_DT_URL = "/api/TrxVisitor/filter/";

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    searchValue: string,
    filters:{
        Status?: number,
    }
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
    id: string,
    checkinAt: string,
    checkoutAt: string,
    denyAt: string,
    blockAt: string,
    unblockAt: string,
    checkinBy: string,
    checkoutBy: string,
    denyBy: string,
    denyReason: string,
    blockBy: string,
    blockReason: string,
    status: string,
    invitationCreatedAt: string,
    visitorPeriodStart: string,
    visitorPeriodEnd: string,
    vehiclePlateNumber: string,
    isInvitationAccepted: boolean,
    invitationCode: string,
    remarks: string,
    maskedAreaId: string,
    parkingId: string,
    visitorId: string,
    memberId: string,
    visitor?: VisitorType,
    member?: memberType,
    maskedarea?: MaskedAreaType,
}

interface StateType {
    TrxVisitors: TrxVisitorType[];
    TrxVisitorSearch: string;
    SelectedTrxVisitor: TrxVisitorType;
    TrxVisitorTotalCount: number;
    TrxVisitorFilteredCount: number;
    TrxVisitorFilter: GetFilter;
}

const initialState: StateType = {
    TrxVisitors: [],
    SelectedTrxVisitor: {} as TrxVisitorType,
    TrxVisitorSearch: "",
    TrxVisitorTotalCount: 0,
    TrxVisitorFilteredCount: 0,
    TrxVisitorFilter: defaultTrxVisitorFilter,
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
        SelectTrxVisitor: (state, action: PayloadAction<string>) => {
            const selected = state.TrxVisitors.find((visitor: TrxVisitorType) => visitor.id === action.payload);
            state.SelectedTrxVisitor = selected || {} as TrxVisitorType;
        },
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.TrxVisitorFilter = { ...state.TrxVisitorFilter, ...action.payload };
        //   console.log(JSON.stringify(state.TrxVisitorFilter, null, 2));
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
    SelectTrxVisitor,
    setTrxVisitorSearch,
    UpdateFilter,
} = TrxVisitorSlice.actions;

export const fetchTrxVisitor = () => async(dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
        dispatch(GetTrxVisitors(response.data?.collection?.data || []));
        console.log("Fetch TrxVisitors", response.data.collection);
    } catch (error) {
        console.log(error);
    }
}

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