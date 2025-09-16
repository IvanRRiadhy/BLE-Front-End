import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { CardType } from "./card";
import { CardAccessType } from "./cardAccess";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";


const API_URL = "/api/CardGroup/";
const API_DT_URL = "/api/CardGroup/filter/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
    filters: {  
    }
}

export type CardGroupType ={
    id: string,
    name: string,
    remarks: string,
    cards: CardType[],
    cardAccess: CardAccessType[],
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string
}

interface StateType {
    cardGroups: CardGroupType[],
    cardGroupAll: CardGroupType[],
    cardGroupTotalCount: number,
    cardGroupFilteredCount: number,
    cardGroupFilter: GetFilter,
    isLoading: boolean,
    hasLoaded: boolean,
    selectedCardGroup?: CardGroupType | null
}

const initialState: StateType = {
    cardGroups: [],
    cardGroupAll: [],
    cardGroupTotalCount: 0,
    cardGroupFilteredCount: 0,
    cardGroupFilter: {
        Draw: 0,
        Start: 0,
        Length: 0,
        SortColumn: '',
        SortDir: 'asc',
        SearchValue: '',
        filters: {}
    },
    isLoading: false,
    hasLoaded: false,
    selectedCardGroup: null
}


export const CardGroupSlice = createSlice ({
    name: 'cardGroups',
    initialState,
    reducers : {
        GetCardGroup: (state, action: PayloadAction<CardGroupType[]>) => {
            state.cardGroups = action.payload
        },
        GetAllCardGroup: (state, action: PayloadAction<CardGroupType[]>) => {
            state.cardGroupAll = action.payload
        },
        UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
            state.cardGroupFilter = { ...state.cardGroupFilter, ...action.payload };
        },

    },
    extraReducers: (builder) => {
        builder
        .addCase(fetchCardGroupDT.pending, (state) => {
            state.isLoading = true;
            state.hasLoaded = false;
        })
        .addCase(fetchCardGroupDT.fulfilled, (state, action) => {
            state.cardGroupTotalCount = action.payload.recordsTotal;
            state.cardGroupFilteredCount = action.payload.recordsFiltered;
            state.isLoading = false;
            state.hasLoaded = true;
        })
        .addCase(fetchCardGroupDT.rejected, (state, action) => {
            console.error("Error fetching card groups:", action.error);
            state.cardGroupTotalCount = 0;
            state.cardGroupFilteredCount = 0;
            state.isLoading = false;
            state.hasLoaded = false;
        })
    }
})

export const { GetCardGroup, GetAllCardGroup, UpdateFilter } = CardGroupSlice.actions

export const fetchCardGroupDT = createAsyncThunk(
    "cardGroups/fetchCardGroupDT",
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

        console.log("res: ", res);
        dispatch(GetCardGroup(res.data.collection.data || []));
        await ensureMinLatency(started, 500);

        return res.data.collection;
      }
)

export default CardGroupSlice.reducer