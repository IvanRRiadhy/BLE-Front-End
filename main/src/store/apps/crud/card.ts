import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = "/api/Card/";
const API_DT_URL = "/api/Card/filter/";

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    searchValue: string,
}

export type GetCardResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : CardType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

export type CardType = {
    id: string,
    name: string,
    remarks: string,
    cardNumber: string,
    cardType: string,
    cardBarcode: string,
    isMultiSite: boolean,
    registeredSite: string,
    enableStatus: number,
    isUsed: boolean,
    lastUsed: string,
    statusCard: boolean,
};

interface StateType {
    cards: CardType[];
    cardAll: CardType[];
    cardSearch: string;
    cardFilter: GetFilter;
    cardTotalCount: number;
    cardFilteredCount: number;
};

const initialState: StateType = {
    cards: [],
    cardAll: [],
    cardSearch: '',
    cardFilter: {
        Draw: 0,
        Start: 0,
        Length: 10,
        SortColumn: 'id',
        SortDir: 'asc',
        searchValue: '',
    },
    cardTotalCount: 0,
    cardFilteredCount: 0,
};

export const CardSlice = createSlice({
    name: 'Card',
    initialState,
    reducers: {
        GetCard: (state, action: PayloadAction<CardType[]>) => {
            state.cards = action.payload;
        },
        GetAllCard: (state, action: PayloadAction<CardType[]>) => {
            state.cardAll = action.payload;
            console.log("GetAllCard action payload:", JSON.stringify(state.cardAll, null, 2));
        },
        SetCardSearch: (state, action: PayloadAction<string>) => {
            state.cardSearch = action.payload;
        },
        UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
            state.cardFilter = { ...state.cardFilter, ...action.payload };
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCardDT.fulfilled, (state, action) => {
                state.cardFilteredCount = action.payload.recordsFiltered || 0;
                state.cardTotalCount = action.payload.recordsTotal || 0;
            })
            .addCase(fetchCardDT.rejected, (state, action) => {
                console.error("Error fetching card data:", action.error, state);
            })
            .addCase(addCard.fulfilled, (state, action) => {
                state.cards.push(action.payload);
            })
            .addCase(editCard.fulfilled, (state, action) => {
                const index = state.cards.findIndex(card => card.id === action.payload.id);
                if (index !== -1) {
                    state.cards[index] = action.payload;
                }
            })
            .addCase(deleteCard.fulfilled, (state, action) => {
                state.cards = state.cards.filter(card => card.id !== action.payload.id);
            });
    },
});

export const {
    GetCard,
    GetAllCard,
    SetCardSearch,
    UpdateFilter,
} = CardSlice.actions;

export const fetchCard = () => async (dispatch: any) => {
    try {
        const response = await axiosServices.get(API_URL);
        console.log("Response from fetchCard:", response.data);
        dispatch(GetAllCard(response.data.collection.data || []));
    } catch (error) {
        console.error("Error fetching cards:", error);
    }
}

export const fetchCardDT = createAsyncThunk(
    "cards/fetchCardDT",
    async (filter: any, { rejectWithValue }) => {
        try {
            const response = await axiosServices.post(API_DT_URL, filter);
            dispatch(GetCard(response.data.collection.data || []));
            console.log("Fetch cards", response.data.collection);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching cards:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export const addCard = createAsyncThunk("card/addCard", async (formData: FormData, { rejectWithValue }) => {
    try {
        formData.delete('id');
        const response = await axiosServices.post(API_URL, formData);
        return response.data;
    } catch (error: any) {
        console.error("Error adding card:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const editCard = createAsyncThunk("card/editCard", async (formData: FormData, { rejectWithValue }) => {
    try {
        const id = formData.get('id');
        formData.delete('id');
        const response = await axiosServices.put(`${API_URL}${id}`, formData);
        return response.data;
    } catch (error: any) {
        console.error("Error editing card:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteCard = createAsyncThunk("card/deleteCard", async (id: string, { rejectWithValue }) => {
    try {
        const response = await axiosServices.delete(`${API_URL}${id}`);
        return response.data;
    } catch (error: any) {
        console.error("Error deleting card:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export default CardSlice.reducer;