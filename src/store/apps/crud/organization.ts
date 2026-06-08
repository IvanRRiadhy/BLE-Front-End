import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { defaultOrganizationFilter } from "../defaultForm";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";

const API_URL = "/api/MstOrganization/";
const API_DT_URL = "/api/MstOrganization/filter/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
}


export type GetOrganizationResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : OrganizationType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

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
    organizations: OrganizationType[];
    organizationAll: OrganizationType[];
    organizationSearch: string;
    selectedOrganization?: OrganizationType | null;
    organizationTotalCount: number;
    organizationFilteredCount: number;
    organizationFilter: GetFilter;
    lastFilter?: GetFilter;
isLoading: boolean;
hasLoaded: boolean;
}

const initialState: StateType = {
    organizations: [],
    organizationAll: [],
    organizationSearch: "",
    selectedOrganization: null,
    organizationTotalCount: 0,
    organizationFilteredCount: 0,
    organizationFilter: defaultOrganizationFilter,
    isLoading: false,
    hasLoaded: false,
};

export const OrganizationSlice = createSlice({
    name: "organizations",
    initialState,

    reducers: {
        GetOrganization: (state, action: PayloadAction<OrganizationType[]>) => {
            state.organizations = action.payload;
        },
        GetAllOrganization: (state, action: PayloadAction<OrganizationType[]>) => {
            state.organizationAll = action.payload;
        },
        SelectOrganization: (state, action: PayloadAction<string>) => {
            const selected = state.organizations.find((organization: OrganizationType) => organization.id === action.payload);
            state.selectedOrganization = selected || null;
        },
        SearchOrganization: (state, action: PayloadAction<string>) => {
            state.organizationSearch = action.payload;
        },
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.organizationFilter = { ...state.organizationFilter, ...action.payload };
        }
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
            })
            .addCase(fetchOrganizationDT.pending, (state, action) => {
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
            .addCase(fetchOrganizationDT.fulfilled, (state, action) => {
                state.organizationTotalCount = action.payload.recordsTotal;
                state.organizationFilteredCount = action.payload.recordsFiltered;
                    state.isLoading = false;
                    state.hasLoaded = true;
                    state.lastFilter = { ...state.organizationFilter };
            })
            .addCase(fetchOrganizationDT.rejected, (_state, action) => {
                console.error("Fetch failed: ", action.payload);
                // _state.organizationTotalCount = 0;
                _state.organizationFilteredCount = 0;

                    _state.isLoading = false;
                    _state.hasLoaded = true;
            });
    }
});

export const selectOrganization = (organizationID: string) => async (dispatch: AppDispatch) => {
    // const state = getState();
    // console.log(state);
    const isEditing = false;

    if(!isEditing){
        dispatch(SelectOrganization(organizationID));
    } else {
        console.warn("Cannot Switch while editing.");
    }
};

export const {
    GetOrganization,
    GetAllOrganization,
    SelectOrganization, 
    SearchOrganization,
    UpdateFilter
} = OrganizationSlice.actions;

export const fetchOrganizations = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices    .get(API_URL);
        dispatch(GetAllOrganization(response.data?.collection?.data || []));
    } catch (err: any) {
        console.log("Error fetching organizations:", err);
    }
};

export const fetchOrganizationDT = createAsyncThunk(
    "organizations/fetchOrganizationDT",
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
    console.log("Fetched organizations DT:", res.data);
    dispatch(GetOrganization(res.data.collection.data || []));
    await ensureMinLatency(started, 500);
    return res.data.collection;
  }
)

export const addOrganization = createAsyncThunk("organizations/addOrganization", async (organization: OrganizationType) => {
    const started = Date.now();
    try {
        const {id, createdBy, createdAt, updatedBy, updatedAt, ...filteredOrganizationData} = organization
        const response = await axiosServices.post(API_URL, filteredOrganizationData);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error) {
        console.error("Error adding organization:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        throw error;
    }
}); 

export const editOrganization = createAsyncThunk("organizations/editOrganization", async (organization: OrganizationType) => {
    const started = Date.now();
    try {
        const { id, createdBy, createdAt, updatedBy, updatedAt, ...filteredOrganizationData } = organization;
        const response = await axiosServices.put(`${API_URL}${id}`, filteredOrganizationData);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error) {
        console.error("Error editing organization:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        throw error;
    }
});

export const deleteOrganization = createAsyncThunk("organizations/deleteOrganization", async (organizationId: string) => {
    const started = Date.now();
    try {
        await axiosServices.delete(`${API_URL}${organizationId}`);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return organizationId; // Return the deleted organization's ID to update the state
    } catch (error) {
        console.error("Error deleting organization:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        throw error;
    }
});

export default OrganizationSlice.reducer;