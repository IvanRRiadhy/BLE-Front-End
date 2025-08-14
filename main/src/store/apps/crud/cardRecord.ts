import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { VisitorType } from "./visitor";
import { memberType } from "./member";
import { CardType } from "./card";
import { defaultCardRecordFilter } from "../defaultForm";
import { create } from "lodash";

const API_URL = "/api/CardRecord/";
const API_DT_URL = "/api/CardRecord/filter/";

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    searchValue: string,
    filters?: {
        MaskedAreaId?: string[],
    }
}

export type GetCardRecordResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : CardRecordType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

export type CardRecordType = {
    id: string,
    visitorName: string,
    cardId: string,
    visitorId: string,
    memberId: string,
    type: string,
    timestamp: string,
    checkinAt: string,
    checkoutAt: string,
    visitor?: VisitorType,
    member?: memberType,
    card?: CardType
    checkoutMaskedArea: string,
    checkinMaskedArea: string,

    visitorType: string,
    cardId1: string,
    mstMemberId1: string,
    visitorId1: string,

}

interface StateType {
    cardRecords: CardRecordType[];
    cardRecordAll: CardRecordType[];
    cardRecordSearch: string;
    cardRecordFilter: GetFilter;
    cardRecordTotalCount: number;
    cardRecordFilteredCount: number;
};

const initialState: StateType = {
    cardRecords: [],
    cardRecordAll: [],
    cardRecordSearch: '',
    cardRecordFilter: defaultCardRecordFilter,
    cardRecordTotalCount: 0,
    cardRecordFilteredCount: 0,
};

export const CardRecordSlice = createSlice({
    name: "CardRecord",
    initialState,
    reducers: {
        GetCardRecord: (state, action: PayloadAction<CardRecordType[]>) => {
            state.cardRecords = action.payload;
        },
        UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
            state.cardRecordFilter = { ...state.cardRecordFilter, ...action.payload };
        }
    },
    extraReducers: (builder) => {
        builder
        .addCase(fetchCardRecordDt.fulfilled, (state, action) => {
            state.cardRecordTotalCount = action.payload.recordsTotal;
            state.cardRecordFilteredCount = action.payload.recordsFiltered;
        })
    }
});

export const {
    GetCardRecord,
    UpdateFilter,
} = CardRecordSlice.actions;


export const fetchCardRecordDt = createAsyncThunk(
    "CardRecord/fetchCardRecordDt",
    async (filter: GetFilter, { rejectWithValue }) => {
        try {
            console.log("Filter:", filter);
            const response = await axiosServices.post(API_DT_URL, filter);
            dispatch(GetCardRecord(response.data.collection.data || []));
            console.log("Fetch card Records", response.data.collection);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching card Records:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);  

export default CardRecordSlice.reducer;