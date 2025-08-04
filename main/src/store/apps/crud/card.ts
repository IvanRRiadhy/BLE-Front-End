import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { defaultCardFilter } from "../defaultForm";

const API_URL = "/api/Card/";
const API_DT_URL = "/api/Card/filter/";

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    searchValue: string,
    fiilters: {
        IsUsed: string,
        // RegisteredArea: string[],
    }
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
    dmac: string,
    isMultiArea: boolean,
    registeredArea: string[],
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
    cardActiveCount: number;
    cardNonActiveCount: number;
    cardActiveData: CardType[];
    cardNonActiveData: CardType[];
};

const initialState: StateType = {
    cards: [],
    cardAll: [],
    cardSearch: '',
    cardFilter: defaultCardFilter,
    cardTotalCount: 0,
    cardFilteredCount: 0,
    cardActiveCount: 0,
    cardNonActiveCount: 0,
    cardActiveData: [],
    cardNonActiveData: [],
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
        },
        UpdateActiveCardCount: (state, action: PayloadAction<number>) => {
            state.cardActiveCount = action.payload;
        },
        UpdateNonActiveCardCount: (state, action: PayloadAction<number>) => {
            state.cardNonActiveCount = action.payload;
        },
        SetActiveCardData: (state, action: PayloadAction<CardType[]>) => {
            state.cardActiveData = action.payload;
        },
        SetNonActiveCardData: (state, action: PayloadAction<CardType[]>) => {
            state.cardNonActiveData = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
.addCase(fetchCardDT.fulfilled, (state, action) => {
    const cardData: CardType[] = action.payload.data || [];

    // Update list
    state.cards = cardData;

    // Update counts
    state.cardFilteredCount = action.payload.recordsFiltered || 0;
    state.cardTotalCount = action.payload.recordsTotal || 0;

    // // Count active and inactive
    // state.cardActiveCount = cardData.filter(card => card.isUsed).length;
    // state.cardNonActiveCount = cardData.filter(card => !card.isUsed).length;
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
    UpdateActiveCardCount,
    UpdateNonActiveCardCount,
    SetActiveCardData,
    SetNonActiveCardData
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
            console.log(filter);
            if(filter.IsUsed === "true"){
                console.log("UpdateActiveCardCount", response.data.collection.recordsFiltered);
                dispatch(UpdateActiveCardCount(response.data.collection.recordsFiltered));
                dispatch(SetActiveCardData(response.data.collection.data || []));
            };
            if(filter.IsUsed === "false"){
                console.log("UpdateNonActiveCardCount", response.data.collection.recordsFiltered);
                dispatch(UpdateNonActiveCardCount(response.data.collection.recordsFiltered));
                dispatch(SetNonActiveCardData(response.data.collection.data || []));
            };
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

export const ImportCard = createAsyncThunk(
    "card/importCard",
    async (formData: FormData, { rejectWithValue }) => {
        try {
            const response = await axiosServices.post(`${API_URL}import`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            console.log("Card imported: ", response.data);
            return response.data;
        } catch (error: any) {
            console.error("Error importing Card:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export const ExportCard = createAsyncThunk(
    "card/exportCard",
    async (filter: "pdf" | "excel", { rejectWithValue }) => {
        const url = `http://192.168.1.116:5000${API_URL}export/${filter}`;
        const accessToken = localStorage.getItem("token");
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers:{
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-API-KEY-TRACKING-PEOPLE':
            'FujDuGTsyEXVwkKrtRgn52APwAVRGmPOiIRX8cffynDvIW35bJaGeH3NcH6HcSeK',
        },
            });
            if(!response.ok) throw new Error('Export failed');
                  const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filter === 'pdf' ? 'card.pdf' : 'card.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
        } catch (error: any) {
            console.error("Error exporting Card:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

export default CardSlice.reducer;