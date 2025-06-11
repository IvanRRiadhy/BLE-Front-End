import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { IntegrationType } from "./integration";
import { BrandType } from "./brand";

const API_URL = "/api/MstAccessControl/";

export interface AccessControlType {
    id: string,
    controllerBrandId: string,
    name: string,
    type: string,
    description: string,
    channel: string,
    doorId: string,
    raw: string,
    integrationId: string,
    applicationId: string,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string
    integration?: IntegrationType,
    brand?: BrandType,
}   

interface StateType {
    accessControls: AccessControlType[];
    accessControlSearch: string;
    selectedAccessControl?: AccessControlType | null;
}

const initialState: StateType = {
    accessControls: [],
    accessControlSearch: "",
    selectedAccessControl: null,
};

export const AccessControlSlice = createSlice({
    name: "accessControls",
    initialState,

    reducers: {
        GetAccessControls: (state, action: PayloadAction<AccessControlType[]>) => {
            state.accessControls = action.payload;
        },
        SelectAccessControl: (state, action: PayloadAction<string>) => {
            const selected = state.accessControls.find(
                (accessControl: AccessControlType) => accessControl.id === action.payload
            )
            state.selectedAccessControl = selected;
        },
        SearchAccessControl: (state, action: PayloadAction<string>) => {
            state.accessControlSearch = action.payload;
        },
    },

    extraReducers: (builder) => {
        builder
        .addCase(addAccessControl.fulfilled, (state, action) => {
            state.accessControls.push(action.payload);
        })
        .addCase(addAccessControl.rejected, (_state, action) => {
            console.error("Add AccessControl failed: ", action.payload);
        })
        .addCase(editAccessControl.fulfilled, (state, action) => {
            const index = state.accessControls.findIndex((accessControl) => accessControl.id === action.payload.id);
            if(index !== -1) {
                state.accessControls[index] = action.payload;
                state.selectedAccessControl = action.payload;
            }
        })
        .addCase(editAccessControl.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
        })
        .addCase(deleteAccessControl.fulfilled, (state, action) => {
            state.accessControls = state.accessControls.filter(accessControl => accessControl.id !== action.payload);
            if (state.selectedAccessControl?.id === action.payload) {
                state.selectedAccessControl = null;
            }
        })
        .addCase(deleteAccessControl.rejected, (_state, action) => {
            console.error("Delete failed: ", action.payload);
        });
    }
});

export const selectAccessControl = (accessControlID: string) =>
(dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    const isEditing = false;
    console.log(state);
    if (!isEditing) {
        dispatch(SelectAccessControl(accessControlID));
    } else {
        console.warn("Cannot Switch while editing.");
    }
}
    
export const { GetAccessControls, SelectAccessControl, SearchAccessControl } = AccessControlSlice.actions;

export const fetchAccessControls = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
        dispatch(GetAccessControls(response.data?.collection?.data || []));
    } catch (err: any) {
        console.log("Error fetching accessControls:",err);
    }
}

export const addAccessControl = createAsyncThunk(
    "accessControls/addAccessControl",
    async (newAccessControl: AccessControlType, { rejectWithValue }) => {
        try {
            const {id, createdBy, createdAt, updatedBy, updatedAt, ...filteredAccessControlData} = newAccessControl
            const response = await axiosServices.post(API_URL, filteredAccessControlData);
            return response.data;
        } catch (error: any) {
            console.error("Error adding accessControl:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    },
);

export const editAccessControl = createAsyncThunk(
    "accessControls/editAccessControl",
    async (updateAccessControl: AccessControlType, {rejectWithValue}) => {
        try {
            const { id, createdBy, createdAt, updatedBy, updatedAt, ...filteredAccessControlData } = updateAccessControl;
            const response = await axiosServices.put(`${API_URL}${id}`, filteredAccessControlData);
            return response.data;
        } catch (error: any) {
            console.error("Error editing accessControl:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    },
);

export const deleteAccessControl = createAsyncThunk(
    "accessControls/deleteAccessControl",
    async (accessControlId: string, { rejectWithValue }) => {
        try {
            await axiosServices.delete(`${API_URL}${accessControlId}`);
            return accessControlId; // Return the deleted accessControl's ID to update the state
        } catch (error: any) {
            console.error("Error deleting accessControl:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    },
);

export default AccessControlSlice.reducer;