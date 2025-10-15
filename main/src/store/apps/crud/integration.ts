import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { defaultIntegrationFilter } from "../defaultForm";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";

const API_URL = "/api/MstIntegration/";
const API_DT_URL = "/api/MstIntegration/filter/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
}


export type GetIntegrationResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : IntegrationType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

export interface IntegrationType {
    id: string,
    brandId: string,
    integrationType: string,
    apiTypeAuth: string,
    apiUrl: string,
    apiAuthUsername: string,
    apiAuthPasswd: string,
    apiKeyField: string,
    apiKeyValue: string,
    applicationId: string,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string
}

interface StateType {
    integrations: IntegrationType[];
    integrationSearch: string;
    selectedIntegration?: IntegrationType | null;
    IntegrationTotalCount: number;
    IntegrationFilteredCount: number;
    IntegrationFilter: GetFilter;
    lastFilter?: GetFilter;
isLoading: boolean;
hasLoaded: boolean;
}

const initialState: StateType = {
    integrations: [],
    integrationSearch: "",
    selectedIntegration: null,
    IntegrationTotalCount: 0,
    IntegrationFilteredCount: 0,
    IntegrationFilter: defaultIntegrationFilter,
    isLoading: false,
    hasLoaded: false,
};

export const IntegrationSlice = createSlice({
    name: "integrations",
    initialState,

    reducers: {
        GetIntegrations: (state, action: PayloadAction<IntegrationType[]>) => {
            state.integrations = action.payload;
        },
        SearchIntegration: (state, action: PayloadAction<string>) => {
            state.integrationSearch = action.payload;
        },
        SelectIntegration: (state, action: PayloadAction<string | null>) => {
            const selected = state.integrations.find((integration: IntegrationType) => integration.id === action.payload);
            state.selectedIntegration = selected || null;
        },
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.IntegrationFilter = { ...state.IntegrationFilter, ...action.payload };
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(addIntegration.fulfilled, (state, action) => {
                state.integrations.push(action.payload);
            })
            .addCase(addIntegration.rejected, (_state, action) => {
                console.error("Add failed: ", action.payload);
            })
            .addCase(editIntegration.fulfilled, (state, action) => {
                const index = state.integrations.findIndex((integration) => integration.id === action.payload.id);
                if (index !== -1) {
                    state.integrations[index] = action.payload;
                    state.selectedIntegration = action.payload;
                }
            })
            .addCase(editIntegration.rejected, (_state, action) => {
                console.error("Update failed: ", action.payload);
            })
            .addCase(deleteIntegration.fulfilled, (state, action) => {
                state.integrations = state.integrations.filter(integration => integration.id !== action.payload);
                if (state.selectedIntegration?.id === action.payload) {
                    state.selectedIntegration = null;
                }
            })
            .addCase(deleteIntegration.rejected, (_state, action) => {
                console.error("Delete failed: ", action.payload);
            })
            .addCase(fetchIntegrationDT.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchIntegrationDT.fulfilled, (state, action) => {
                state.IntegrationTotalCount = action.payload.recordsTotal;
                state.IntegrationFilteredCount = action.payload.recordsFiltered;

                    state.isLoading = false;
                    state.hasLoaded = true;
            })
            .addCase(fetchIntegrationDT.rejected, (_state, action) => {
                console.error("Fetch failed: ", action.payload);
                // _state.IntegrationTotalCount = 0;
                _state.IntegrationFilteredCount = 0;

                    _state.isLoading = false;
                    _state.hasLoaded = true;
            });
        }
});

export const selectIntegration = (integrationID: string) => 
    (dispatch: AppDispatch) => {
        // const state = getState();
        // console.log(state);
        const isEditing = false;

        if(!isEditing){
            dispatch(SelectIntegration(integrationID));
        } else {
            console.warn("Cannot Switch while editing.");
        }

};

export const {
    GetIntegrations,
    SearchIntegration,
    SelectIntegration,
    UpdateFilter
} = IntegrationSlice.actions;

export const fetchIntegrations = () => async (dispatch: AppDispatch) => {
    try{
        const response = await axiosServices.get(API_URL);
        dispatch(GetIntegrations(response.data?.collection?.data || []));
    } catch (err: any){
        console.error("Error fetching integrations:", err);
    }
};

export const fetchIntegrationDT = createAsyncThunk(
    "integrations/fetchIntegrationDT",
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

    dispatch(GetIntegrations(res.data.collection.data || []));
    await ensureMinLatency(started, 500);
    return res.data.collection;
  }
)

export const addIntegration = createAsyncThunk("integrations/addIntegration", async (integration: IntegrationType, { rejectWithValue }) => {
    try {
        const {id, createdBy, createdAt, updatedBy, updatedAt, ...filteredIntegrationData} = integration
        const response = await axiosServices.post(API_URL, filteredIntegrationData);
        return response.data;
    } catch (error: any) {
        console.error("Error adding integration:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const editIntegration = createAsyncThunk("integrations/editIntegration", async (integration: IntegrationType, { rejectWithValue }) => {
    try {
        const { id, createdBy, createdAt, updatedBy, updatedAt, ...filteredIntegrationData } = integration;
        const response = await axiosServices.put(`${API_URL}${id}`, filteredIntegrationData);
        return response.data;
    } catch (error: any) {
        console.error("Error editing integration:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteIntegration = createAsyncThunk("integrations/deleteIntegration", async (integrationId: string, { rejectWithValue }) => {
    try {
        await axiosServices.delete(`${API_URL}${integrationId}`);
        return integrationId; // Return the deleted integration's ID to update the state
    } catch (error: any) {
        console.error("Error deleting integration:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export default IntegrationSlice.reducer;
