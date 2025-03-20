import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = "http://localhost:5034/api/MstOrganization";

export interface OrganizationType {
    id: string,
    code: string,
    name: string,
    organizationHost: string,
    applicationId: string,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string
}

interface StateType {
    organizations: OrganizationType[],
    organizationSearch: string,
    selectedOrganization?: OrganizationType | null
}

const initialState: StateType = {
    organizations: [],
    organizationSearch: "",
    selectedOrganization: null
};

export const OrganizationSlice = createSlice({
    name: "organizations",
    initialState,

    reducers: {
        GetOrganization: (state, action: PayloadAction<OrganizationType[]>) => {
            state.organizations = action.payload;
        },
        SelectOrganization: (state, action: PayloadAction<string>) => {
            const selected = state.organizations.find((organization: OrganizationType) => organization.id === action.payload);
            state.selectedOrganization = selected || null;
        },
        SearchOrganization: (state, action: PayloadAction<string>) => {
            state.organizationSearch = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(addOrganization.fulfilled, (state, action) => {
                state.organizations.push(action.payload);
            })
            .addCase(addOrganization.rejected, (_state, action) => {
                console.error("Add failed: ", action.payload);
            })
            .addCase(editOrganization.fulfilled, (state, action) => {
                const index = state.organizations.findIndex((organization) => organization.id === action.payload.id);
                if (index !== -1) {
                    state.organizations[index] = action.payload;
                }
            })
            .addCase(editOrganization.rejected, (_state, action) => {
                console.error("Update failed: ", action.payload);
            })
            .addCase(deleteOrganization.fulfilled, (state, action) => {
                state.organizations = state.organizations.filter((organization) => organization.id !== action.payload);
            })
            .addCase(deleteOrganization.rejected, (_state, action) => {
                console.error("Delete failed: ", action.payload);
            });
    }
});

export const selectOrganization = (organizationID: string) => async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    console.log(state);
    const isEditing = false;

    if(!isEditing){
        dispatch(SelectOrganization(organizationID));
    } else {
        console.warn("Cannot Switch while editing.");
    }
};

export const {
    GetOrganization,
    SelectOrganization, 
    SearchOrganization
} = OrganizationSlice.actions;

export const fetchOrganizations = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axios.get(API_URL);
        dispatch(GetOrganization(response.data?.collection?.data || []));
    } catch (err: any) {
        console.log("Error fetching organizations:", err);
    }
};

export const addOrganization = createAsyncThunk("organizations/addOrganization", async (organization: OrganizationType) => {
    try {
        const {id, createdBy, createdAt, updatedBy, updatedAt, ...filteredOrganizationData} = organization
        const response = await axios.post(API_URL, filteredOrganizationData);
        return response.data;
    } catch (error) {
        console.error("Error adding organization:", error);
        throw error;
    }
}); 

export const editOrganization = createAsyncThunk("organizations/editOrganization", async (organization: OrganizationType) => {
    try {
        const { id, createdBy, createdAt, updatedBy, updatedAt, ...filteredOrganizationData } = organization;
        const response = await axios.put(`${API_URL}/${id}`, filteredOrganizationData);
        return response.data;
    } catch (error) {
        console.error("Error editing organization:", error);
        throw error;
    }
});

export const deleteOrganization = createAsyncThunk("organizations/deleteOrganization", async (organizationId: string) => {
    try {
        await axios.delete(`${API_URL}/${organizationId}`);
        return organizationId; // Return the deleted organization's ID to update the state
    } catch (error) {
        console.error("Error deleting organization:", error);
        throw error;
    }
});

export default OrganizationSlice.reducer;