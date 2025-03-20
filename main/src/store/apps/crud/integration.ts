import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = "http://localhost:5034/api/MstIntegration";

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
}

const initialState: StateType = {
    integrations: [],
    integrationSearch: "",
    selectedIntegration: null,
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
        }
});

export const selectIntegration = (integrationID: string) => 
    (dispatch: AppDispatch, getState: () => RootState) => {
        const state = getState();
        console.log(state);
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
} = IntegrationSlice.actions;

export const fetchIntegrations = () => async (dispatch: AppDispatch) => {
    try{
        const response = await axios.get(API_URL);
        dispatch(GetIntegrations(response.data?.collection?.data || []));
    } catch (err: any){
        console.error("Error fetching integrations:", err);
    }
};

export const addIntegration = createAsyncThunk("integrations/addIntegration", async (integration: IntegrationType, { rejectWithValue }) => {
    try {
        const {id, createdBy, createdAt, updatedBy, updatedAt, ...filteredIntegrationData} = integration
        const response = await axios.post(API_URL, filteredIntegrationData);
        return response.data;
    } catch (error: any) {
        console.error("Error adding integration:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const editIntegration = createAsyncThunk("integrations/editIntegration", async (integration: IntegrationType, { rejectWithValue }) => {
    try {
        const { id, createdBy, createdAt, updatedBy, updatedAt, ...filteredIntegrationData } = integration;
        const response = await axios.put(`${API_URL}/${id}`, filteredIntegrationData);
        return response.data;
    } catch (error: any) {
        console.error("Error editing integration:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteIntegration = createAsyncThunk("integrations/deleteIntegration", async (integrationId: string, { rejectWithValue }) => {
    try {
        await axios.delete(`${API_URL}/${integrationId}`);
        return integrationId; // Return the deleted integration's ID to update the state
    } catch (error: any) {
        console.error("Error deleting integration:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export default IntegrationSlice.reducer;
