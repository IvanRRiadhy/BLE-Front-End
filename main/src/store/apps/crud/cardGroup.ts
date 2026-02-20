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
    accessScope: string, //all, specific, none
    cards: CardType[],
    cardAccesses: CardAccessType[],
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
    lastFilter?: GetFilter;
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
        Length: 999,
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
        .addCase(fetchCardGroupDT.pending, (state, action) => {
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
        .addCase(fetchCardGroupDT.fulfilled, (state, action) => {
            state.cardGroupTotalCount = action.payload.recordsTotal;
            state.cardGroupFilteredCount = action.payload.recordsFiltered;
            state.isLoading = false;
            state.hasLoaded = true;
            state.lastFilter = { ...state.cardGroupFilter };
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

export const fetchCardGroup = () => async (dispatch: any) => {
    try {
            const res = await axiosServices.get(API_URL);
    dispatch(GetAllCardGroup(res.data.collection.data || []));
    } catch (error) {
        console.error("Error fetching card groups:", error);
    }
}

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

export const addCardGroup = createAsyncThunk(
  "cardGroups/addCardGroup",
  async (payload: {
    name: string;
    remarks: string;
    accessScope: string;
    cardIds: string[];
    cardAccessIds: string[];
  }, { rejectWithValue }) => {
    const started = Date.now();
    try {
      const response = await axiosServices.post(API_URL, payload);
      const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  }
);

export const editCardGroup = createAsyncThunk(
  "cardGroups/editCardGroup",
  async (payload: {
    id: string;
    name: string;
    remarks: string;
    accessScope: string;
    cardIds: string[];
    cardAccessIds: string[];
  }, { rejectWithValue }) => {
    const started = Date.now();
    try {
      const response = await axiosServices.put(`${API_URL}${payload.id}`, payload);
      const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  }
);



export const deleteCardGroup = createAsyncThunk(
    "cardGroups/deleteCardGroup",
    async (cardGroupId: string, { rejectWithValue }) => {
        const started = Date.now();
        try {
            await axiosServices.delete(`${API_URL}${cardGroupId}`);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return cardGroupId; // Return the deleted cardGroup's ID to update the state
        } catch (error: any) {
            return rejectWithValue(error.response.data);
        }
    }
)

export default CardGroupSlice.reducer