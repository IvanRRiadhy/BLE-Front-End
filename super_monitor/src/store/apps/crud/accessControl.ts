import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { IntegrationType } from "./integration";
import { BrandType } from "./brand";
import { defaultAccessControlFilter } from "../defaultForm";

const API_URL = "/api/MstAccessControl/";
const API_DT_URL = "/api/MstAccessControl/filter/";

export type GetAccessControlResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : AccessControlType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};
export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
}


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
    accessControlTotalCount: number;
    accessControlFilteredCount: number;
    accessControlFilter: GetFilter
}

const initialState: StateType = {
    accessControls: [],
    accessControlSearch: "",
    selectedAccessControl: null,
    accessControlTotalCount: 0,
    accessControlFilteredCount: 0,
    accessControlFilter: defaultAccessControlFilter,
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
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.accessControlFilter = { ...state.accessControlFilter, ...action.payload };
        }
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
        })
        .addCase(fetchAccessControlsDT.fulfilled, (state, action) => {
            state.accessControlTotalCount = action.payload.recordsTotal;
            state.accessControlFilteredCount = action.payload.recordsFiltered;
        })
        .addCase(fetchAccessControlsDT.rejected, (_state, action) => {
            console.error("Fetch failed: ", action.payload);
            // _state.accessControlTotalCount = 0;
            _state.accessControlFilteredCount = 0;
        });
    }
});

export const selectAccessControl = (accessControlID: string) =>
(dispatch: AppDispatch) => {
    // const state = getState();
    const isEditing = false;
    // console.log(state);
    if (!isEditing) {
        dispatch(SelectAccessControl(accessControlID));
    } else {
        console.warn("Cannot Switch while editing.");
    }
}
    
export const { GetAccessControls, SelectAccessControl, SearchAccessControl, UpdateFilter } = AccessControlSlice.actions;

export const fetchAccessControls = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
        dispatch(GetAccessControls(response.data?.collection?.data || []));
    } catch (err: any) {
        console.log("Error fetching accessControls:",err);
    }
}

export const fetchAccessControlsDT = createAsyncThunk(
    "accessControls/fetchAccessControlsDT",
    async (filter: any, { rejectWithValue }) => {
        try {
                                if (
            filter?.filters &&
            Object.values(filter.filters).some(
                (arr: any) => Array.isArray(arr) && arr.includes("Empty")
            )
        ) {
            // console.log("Filter contains 'Empty', skipping request");
            // Option 1: just return null (success, no data)
            // return null;
            // Option 2: reject, if you want to treat as error
            return rejectWithValue("Filter contains 'Empty', skipping request");
        }
            const response = await axiosServices.post(API_DT_URL, filter);
            dispatch(GetAccessControls(response.data?.collection?.data || []));
            // console.log("Fetch accessControls", response.data.collection);
            return response.data.collection; // or just response.data if needed
        } catch (error: any) {
            console.error("Error fetching accessControls:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

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