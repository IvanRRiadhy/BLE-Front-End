import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { defaultCardFilter } from "../defaultForm";
import { MaskedAreaType } from "./maskedArea";
import { CardAccessType } from "./cardAccess";
import { BASE_URL } from "../../../utils/axios";

const API_URL_V1 = "/api/Card/";
const API_URL = "/api/Card/v2/";
const API_DT_URL = "/api/Card/filter/";
const ASSIGN_CARD_URL = "/api/CardRecord/";
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
    remarks: string | null,
    cardNumber: string,
    cardType: string,
    cardBarcode: string,
    dmac: string,
    isMultiMaskedArea: boolean,
    registeredMaskedAreaId: string | null,
    registeredMaskedArea?: MaskedAreaType,
    cardAccessIds: string[],
    cardAccesses?: CardAccessType[],
    
    isUsed: boolean,
    lastUsed: string,
    statusCard: number,
};

interface StateType {
    cards: CardType[];
    cardAll: CardType[];
    cardSearch: string;
    cardFilter: GetFilter;
    lastFilter?: GetFilter;
isLoading: boolean;
hasLoaded: boolean;
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
    isLoading: false,
    hasLoaded: false,
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
            // console.log("GetAllCard action payload:", JSON.stringify(state.cardAll, null, 2));
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

        .addCase(fetchCardDT.pending, (state, action) => {
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
.addCase(fetchCardDT.fulfilled, (state, action) => {
    const cardData: CardType[] = action.payload.data || [];

    // Update list
    // state.cards = cardData;
    // console.log("Fetch cards", action.payload);
    // Update counts
    state.cardFilteredCount = action.payload.recordsFiltered || 0;
    state.cardTotalCount = action.payload.recordsTotal || 0;

        state.isLoading = false;
        state.hasLoaded = true;
state.lastFilter = { ...state.cardFilter };
})
            .addCase(fetchCardDT.rejected, (state, action) => {
                console.error("Error fetching card data:", action.error, state);
                state.cardFilteredCount = 0;
            
                    state.isLoading = false;
                    state.hasLoaded = false;
            
            })
            .addCase(addCard.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(addCard.fulfilled, (state, action) => {
                state.cards.push(action.payload);
                state.isLoading = false;
            })
            .addCase(addCard.rejected, (state, action) => {
                console.error("Error adding card:", action.error);
                state.isLoading = false;
            })
            .addCase(editCard.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(editCard.fulfilled, (state, action) => {
                const index = state.cards.findIndex(card => card.id === action.payload.id);
                if (index !== -1) {
                    state.cards[index] = action.payload;
                }
                state.isLoading = false;
            })
            .addCase(editCard.rejected, (state, action) => {
                console.error("Error editing card:", action.error);
                state.isLoading = false;
            })
            .addCase(deleteCard.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(deleteCard.fulfilled, (state, action) => {
                state.cards = state.cards.filter(card => card.id !== action.payload.id);
                state.isLoading = false;
            })
            .addCase(deleteCard.rejected, (state, action) => {
                console.error("Error deleting card:", action.error);
                state.isLoading = false;
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
        // console.log("Response from fetchCard:", response.data);
        dispatch(GetAllCard(response.data.collection.data || []));
    } catch (error) {
        console.error("Error fetching cards:", error);
    }
}

export const fetchCardDT = createAsyncThunk(
    "cards/fetchCardDT",
    async (filter: any, { rejectWithValue }) => {
        const started = Date.now();
        try {
            console.log("Filter:", filter);
            const response = await axiosServices.post(API_DT_URL, filter);
            const normalizedData: CardType[] = (response.data.collection.data || []).map((item: any) => {
                const cardAccesses = item.cardAccesses || [];
                return {
                    ...item,
                    cardAccessIds: cardAccesses.map((cardAccess: any) => cardAccess.id),
                } as CardType;
            })  
            dispatch(GetCard(normalizedData));
            // console.log("Response from fetchCardDT:", normalizedData);
            // console.log(filter);
            if(filter.filters.IsUsed === true){
                console.log("UpdateActiveCardCount", response.data.collection.recordsFiltered);
                dispatch(UpdateActiveCardCount(response.data.collection.recordsFiltered));
                dispatch(SetActiveCardData(normalizedData));
            };
            if(filter.filters.IsUsed === false){
                console.log("UpdateNonActiveCardCount", response.data.collection.recordsFiltered);
                dispatch(UpdateNonActiveCardCount(response.data.collection.recordsFiltered));
                dispatch(SetNonActiveCardData(normalizedData));
            };
            // console.log("Fetch cards", response.data.collection);
            const elapsed = Date.now() - started;
            if (elapsed < 500) await delay(500 - elapsed);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching cards:", error);
                    const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export const addCard = createAsyncThunk("card/addCard", async (formData: CardType, { rejectWithValue }) => {
    const started = Date.now();
    try {
        const { id, ...data } = formData;
        console.log(data)
        const response = await axiosServices.post(API_URL, data);
                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error: any) {
        console.error("Error adding card:", error);
                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const assignCard = createAsyncThunk(
    "card/assignCard",
    async(data: any, {rejectWithValue}) => {
        const started = Date.now();
        try {
            console.log(data);
            const response = await axiosServices.post(`${ASSIGN_CARD_URL}`, data);
            console.log(response.data);
                    const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return response.data;
        } catch (error: any) {
            console.error("Error assigning card:", error);
                    const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

export const editCard = createAsyncThunk("card/editCard", async (formData: CardType, { rejectWithValue }) => {
    const started = Date.now();
    try {
        const { id, ...data } = formData;
        console.log("Edit Card: ", id,data)
        const response = await axiosServices.put(`${API_URL}${id}`, data);
                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error: any) {
        console.error("Error editing card:", error);
                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteCard = createAsyncThunk("card/deleteCard", async (id: string, { rejectWithValue }) => {
    const started = Date.now();
    try {
        const response = await axiosServices.delete(`${API_URL}${id}`);
                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error: any) {
        console.error("Error deleting card:", error);
                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const ImportCard = createAsyncThunk(
    "card/importCard",
    async (formData: FormData, { rejectWithValue }) => {
        try {
            const response = await axiosServices.post(`${API_URL_V1}import`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            // console.log("Card imported: ", response.data);
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
        const url = `${BASE_URL}${API_URL_V1}export/${filter}`;
        const accessToken = localStorage.getItem("token");
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers:{
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-BIOPEOPLETRACKING-API-KEY':
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