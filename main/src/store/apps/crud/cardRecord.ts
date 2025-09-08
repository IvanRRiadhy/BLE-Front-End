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
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";

const API_URL = "/api/CardRecord/";
const API_DT_URL = "/api/CardRecord/filter/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
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
isLoading: boolean;
hasLoaded: boolean;
    cardRecordTotalCount: number;
    cardRecordFilteredCount: number;
};

const initialState: StateType = {
    cardRecords: [],
    cardRecordAll: [],
    cardRecordSearch: '',
    cardRecordFilter: defaultCardRecordFilter,
    isLoading: false,
    hasLoaded: false,
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
        .addCase(fetchCardRecordDt.pending, (state) => {
            state.isLoading = true;
            state.hasLoaded = false;
        })
        .addCase(fetchCardRecordDt.fulfilled, (state, action) => {
            state.cardRecordTotalCount = action.payload.recordsTotal;
            state.cardRecordFilteredCount = action.payload.recordsFiltered;
                state.isLoading = false;
                state.hasLoaded = true;
        })
        .addCase(fetchCardRecordDt.rejected, (state, action) => {
            console.error("Error fetching card records:", action.error);
            state.cardRecordTotalCount = 0;
            state.cardRecordFilteredCount = 0;
                state.isLoading = false;
                state.hasLoaded = false;
        })
    }
});

export const {
    GetCardRecord,
    UpdateFilter,
} = CardRecordSlice.actions;


export const fetchCardRecordDt = createAsyncThunk(
    "CardRecord/fetchCardRecordDt",
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

    dispatch(GetCardRecord(res.data.collection.data || []));
    await ensureMinLatency(started, 500);
    return res.data.collection;
  }
);  

export default CardRecordSlice.reducer;