import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { OrganizationType } from "./organization";
import { DistrictType } from "./district";
import { DepartmentType } from "./department";
import { defaultVisitorFilter } from "../defaultForm";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";

const API_URL = "/api/Visitor/";
const API_DT_URL = "/api/Visitor/filter/";
const FILL_FORM_URL = '/api/Visitor/fill-invitation-form';
const SEND_INVITATION_URL = '/api/Visitor/batch/send-invitation/';
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


export type GetVisitorResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : VisitorType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

export interface masterVisitorType {
    id: string, //
    personId: string,
    identityId: string,
    cardNumber: string,
    bleCardNumber: string,
    name: string,
    phone: string,
    email: string,
    gender: string,
    address: string,
    faceImage: string,
    uploadFr: number,
    uploadFrError: string,
    applicationId: string,
    registeredDate: string, //
    visitorArrival: string, //
    visitorEnd: string, //
    portalKey: number,
    timestampPreRegistration: string, //
    timestampCheckedIn: string, //
    timestampCheckedOut: string, //
    timestampDeny: string, //
    timestampBlocked: string,//
    timestampUnblocked: string, //
    checkinBy: string,
    checkoutBy: string,
    denyBy: string,
    blockBy: string,
    unblockBy: string,
    reasonDeny: string,
    reasonBlock: string,
    reasonUnblock: string,
    status: string
}

export type VisitorType = {
    id: string,
    visitorType: string;
    identityType: string;
    name: string,
    email: string,
    gender: string,
    phone: string,
    faceImage: string,
        cardNumber: string,
    bleCardNumber:string,
    organizationName:string,
    districtName: string,
    departmentName: string,
    isVip: boolean,
    address:string,
    applicationId: string,
    identityId: string,
    personId: string,
    isBlacklist: boolean,
}

interface StateType {
    // visitors: masterVisitorType[];
    visitors: VisitorType[];
    visitorAll: VisitorType[];
    visitorSearch: string;
    selectedVisitor: VisitorType | null;
    currentFilter: string,
    visitorTotalCount: number,
    visitorFilteredCount: number,
    visitorFilter: GetFilter,
    lastFilter?: GetFilter;
    isLoading: boolean;
    hasLoaded: boolean;
}

const initialState: StateType = {
    // visitors: [],
    visitors: [],
    visitorAll: [],
    visitorSearch: "",
    selectedVisitor: null,
    currentFilter: "show_all",
    visitorTotalCount: 0,
    visitorFilteredCount: 0,
    visitorFilter: defaultVisitorFilter,
    isLoading: false,
    hasLoaded: false,
};

export const VisitorSlice = createSlice({
    name: "visitor",
    initialState,
    reducers: {
      GetVisitor(state, action: PayloadAction<VisitorType[]>)  {
        state.visitors = action.payload;
      },
      GetAllVisitor(state, action: PayloadAction<VisitorType[]>)  {
        state.visitorAll = action.payload;
      },
      SelectVisitor(state, action: PayloadAction<VisitorType | null>) {
        state.selectedVisitor = action.payload;
      },
      SearchVisitor(state, action: PayloadAction<string>) {
        state.visitorSearch = action.payload;
      },
        SetVisibilityFilter(state: StateType, action: PayloadAction<string>) {
            state.currentFilter = action.payload;
        },
UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
  state.visitorFilter = { ...state.visitorFilter, ...action.payload };
}

    },
    extraReducers: (builder) => {
        builder
        .addCase(addVisitor.fulfilled, (state, action) => {
            state.visitors.push(action.payload);
        })
        .addCase(addVisitor.rejected, (_state, action) => {
            console.error("Add failed: ", action.payload);
        })
        .addCase(editVisitor.fulfilled, (state, action) => {
            const index = state.visitors.findIndex((visitor: VisitorType) => visitor.id === action.payload.id);
            if (index !== -1) {
                state.visitors[index] = action.payload;
            }
        })
        .addCase(editVisitor.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
        })
        .addCase(deleteVisitor.fulfilled, (state, action) => {
            state.visitors = state.visitors.filter((visitor: VisitorType) => visitor.id !== action.payload);
        })
        .addCase(deleteVisitor.rejected, (_state, action) => {
            console.error("Delete failed: ", action.payload);
        })
        .addCase(fetchVisitorDT.pending, (state, action) => {
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
        .addCase(fetchVisitorDT.fulfilled, (state, action) => {
            state.visitorTotalCount = action.payload.recordsTotal;
            state.visitorFilteredCount = action.payload.recordsFiltered;
                state.isLoading = false;
                state.hasLoaded = true;
                state.lastFilter = { ...state.visitorFilter };
        })
        .addCase(fetchVisitorDT.rejected, (_state, action) => {
            console.error("Error fetching visitors: ", action.payload);
            // _state.visitorTotalCount = 0;
            _state.visitorFilteredCount = 0;
                _state.isLoading = false;
                _state.hasLoaded = false;
        })
    },

});

export const {
    GetVisitor,
    GetAllVisitor,
    SelectVisitor,
    SearchVisitor,
    SetVisibilityFilter,
    UpdateFilter,
} = VisitorSlice.actions;

export const fetchVisitor = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
        dispatch(GetAllVisitor(response.data?.collection?.data || []));
        console.log("Fetch Visitors", response.data?.collection || []);
        return response.data.collection.data || [];
    } catch (err) {
        console.log("Error: ", err);
    }
};

export const fetchVisitorDT = createAsyncThunk(
    "visitor/fetchVisitorDT",
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
    console.log("Fetch Visitors DT", res.data?.collection || []);
    dispatch(GetVisitor(res.data.collection.data || []));
    await ensureMinLatency(started, 500);
    return res.data.collection;
  }
)

export const fetchVisitorbyId = (id: string) => async (dispatch: AppDispatch) => {
    const started = Date.now();
    try {
        const response = await axiosServices.get(`${API_URL}public/${id}`);
                console.log("Fetch Visitors", response.data?.collection || []);
                                    const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return(response.data.collection.data || []);

    } catch (err) {
        const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        console.log("Error: ", err);
    }
}

export const addVisitor = createAsyncThunk("visitor/addVisitor", async (formData: FormData) => {
    const started = Date.now();
    try {
        formData.delete('id');
        const response = await axiosServices.post(API_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error) {
        console.error("Error adding member:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        throw error;
    }
});

export const sendInvitation = createAsyncThunk("visitor/sendInvitation", async (payload: any) => {
    const started = Date.now();
    try{
        console.log(typeof payload);
        for (const [key, value] of payload.entries()) {
            console.log(key, value);
        }
        const response = await axiosServices.post(`${SEND_INVITATION_URL}`, payload);
        console.log(response.data);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error) {
        console.error("Error sending Invitation:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        throw error;
    }
})

export const declineInvitation = createAsyncThunk("visitor/declineInvitation", async (payload: string) => {
    const started = Date.now();
    try{
        console.log( payload);

        const response = await axiosServices.post(`${API_URL}public/${payload}/decline-invitation`);
        console.log(response.data);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error) {
        console.error("Error declining Invitation:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        throw error;
    }
})

export const editVisitor = createAsyncThunk("visitor/editVisitor", async (formData: FormData) => {
    const started = Date.now();
    try {
        Object.keys(formData).forEach((key) => {
            console.log(`${key}:`, formData.get(key));
        })
        const id = formData.get('id');
        formData.delete('id');
        const response = await axiosServices.put(`${API_URL}${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error) {
        console.error("Error editing Visitor:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        throw error;
    }
});

export const fillFormVisitor = createAsyncThunk(
    "visitor/fillFormVisitor",
    async ({ code, visitorId, applicationId, trxVisitorId, formData }: { code: string, visitorId: string, applicationId: string, trxVisitorId: string, formData: FormData }, thunkAPI) => {
        const started = Date.now();
        try {
            console.log(code,visitorId, applicationId, trxVisitorId);
            for (const [key, value] of formData.entries()) {
                console.log(key, value);
            }
            const response = await axiosServices.post(`${FILL_FORM_URL}`, formData, {
                params:{
                    code: code,
                    visitorId: visitorId,
                    applicationId: applicationId,
                    trxVisitorId: trxVisitorId
                },
                headers: {
                    'Content-Type': 'multipart/form-data',
                },

            });
            console.log("Fill Form Visitor", response.data);
                                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return response.data;
        } catch (error) {
            console.error("Error submitting form:", error);
                                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            throw error;
        }
    }
)

export const deleteVisitor = createAsyncThunk("visitor/deleteVisitor", async (visitorId: string) => {
    const started = Date.now();
    try {
        await axiosServices.delete(`${API_URL}${visitorId}`);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return visitorId; // Return the deleted visitor's ID to update the state
    } catch (error) {
        console.error("Error deleting visitor:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        throw error;
    }
});

export default VisitorSlice.reducer;