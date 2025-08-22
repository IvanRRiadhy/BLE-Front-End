import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { memberType } from "./member";
import { VisitorType } from "./visitor";
import { CardType } from "./card";

const API_URL = "/api/VisitorCard/";
const API_DT_URL = "/api/VisitorCard/filter/";

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
}

export type GetVisitorCardResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : VisitorCardType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

export type VisitorCardType = {
    id: string,
    name: string,
    number: string,
    cardType: string,
    qrCode: string,
    mac: string,
    checkinStatus: number,
    enableStatus: number,
    siteId: string,
    visitorId: string,
    memberId: string,
    cardId: string,
    isVisitor: number,
    member?: memberType,
    visitor?: VisitorType,
    card?: CardType,
    applicationId: string,
};

interface StateType {
    visitorCards: VisitorCardType[];
    visitorCardAll: VisitorCardType[];
    visitorCardSearch: string;
    visitorCardFilter: GetFilter;
    visitorCardTotalCount: number;
    visitorCardFilteredCount: number;
};

const initialState: StateType = {
    visitorCards: [],
    visitorCardAll: [],
    visitorCardSearch: '',
    visitorCardFilter: {
        Draw: 0,
        Start: 0,
        Length: 10,
        SortColumn: 'name', 
        SortDir: 'asc',
        SearchValue: '',
    },
    visitorCardTotalCount: 0,
    visitorCardFilteredCount: 0,
};

export const VisitorCardSlice = createSlice({
    name: 'VisitorCard',
    initialState,
    reducers: {
        GetVisitorCards: (state, action: PayloadAction<VisitorCardType[]>) => {
            state.visitorCards = action.payload;
        },
        GetAllVisitorCards: (state, action: PayloadAction<VisitorCardType[]>) => {
            state.visitorCardAll = action.payload;
            console.log("Get All Visitor Cards", JSON.stringify(state.visitorCardAll, null, 2));
        },
        setVisitorCardSearch: (state, action: PayloadAction<string>) => {
            state.visitorCardSearch = action.payload;
        },
        UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
            state.visitorCardFilter = { ...state.visitorCardFilter, ...action.payload };
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchVisitorCardDT.fulfilled, (state, action) => {
                const { data, recordsTotal, recordsFiltered } = action.payload;
                state.visitorCards = data;
                state.visitorCardTotalCount = recordsTotal;
                state.visitorCardFilteredCount = recordsFiltered;
            })
            .addCase(addVisitorCard.fulfilled, (state, action) => {
                state.visitorCards.push(action.payload);
            })
            .addCase(editVisitorCard.fulfilled, (state, action) => {
                const index = state.visitorCards.findIndex(card => card.id === action.payload.id);
                if (index !== -1) {
                    state.visitorCards[index] = action.payload;
                }
            })
            .addCase(deleteVisitorCard.fulfilled, (state, action) => {
                state.visitorCards = state.visitorCards.filter(card => card.id !== action.payload.id);
            });
    },
});

export const {
    GetVisitorCards,
    GetAllVisitorCards,
    setVisitorCardSearch,
    UpdateFilter,
} = VisitorCardSlice.actions;

export const fetchVisitorCard = () => async (dispatch: any) => {
    try {
        const response = await axiosServices.get(API_URL);
        console.log("Response from fetchVisitorCard:", response.data);
        dispatch(GetAllVisitorCards(response.data.collection.data || []));
    } catch (error) {
        console.error("Error fetching visitor cards:", error);
    }
};

export const fetchVisitorCardDT = createAsyncThunk(
    'visitorCard/fetchVisitorCardDT',
    async (filter: GetFilter, { rejectWithValue }) => {
        try {
            const response = await axiosServices.post(API_DT_URL, filter);
            console.log("Visitor Card Data:", response.data);
            dispatch(GetVisitorCards(response.data.collection.data || []));
            return response.data;
        } catch (error: any) {
            console.error("Error fetching visitor card data:", error);
            return rejectWithValue(error.response.data);
        }
    }
);

export const addVisitorCard = createAsyncThunk(
    'visitorCard/addVisitorCard',
    async (formData: FormData, { rejectWithValue }) => {
        try {
            formData.delete('id'); // Ensure 'id' is not sent in the request
            const response = await axiosServices.post(API_URL, formData);
            return response.data;
        } catch (error: any) {
            console.error("Error adding visitor card:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }   
    }
);

export const editVisitorCard = createAsyncThunk(
    'visitorCard/editVisitorCard',
    async (formData: FormData, { rejectWithValue }) => {
        try {
            const id = formData.get('id');
            formData.delete('id'); // Ensure 'id' is not sent in the request
            const response = await axiosServices.put(`${API_URL}${id}`, formData);
            return response.data;
        } catch (error: any) {
            console.error("Error editing visitor card:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export const deleteVisitorCard = createAsyncThunk(
    'visitorCard/deleteVisitorCard',
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await axiosServices.delete(`${API_URL}${id}`);
            return response.data;
        } catch (error: any) {
            console.error("Error deleting visitor card:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export default VisitorCardSlice.reducer;