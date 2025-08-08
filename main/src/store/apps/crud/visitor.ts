import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { OrganizationType } from "./organization";
import { DistrictType } from "./district";
import { DepartmentType } from "./department";
import { defaultVisitorFilter } from "../defaultForm";

const API_URL = "/api/Visitor/";
const API_DT_URL = "/api/Visitor/filter/";
const FILL_FORM_URL = '/api/Visitor/fill-invitation-form';
const SEND_INVITATION_URL = '/api/Visitor/batch/send-invitation/';

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    searchValue: string,
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
    isEmailVerified: boolean,
    emailVerificationSendAt: string,
    emailVerificationToken: string,
    visitorPeriodStart: string,
    visitorPeriodEnd: string,
    address:string,
    applicationId: string,
    identityId: string,
    isEmployee: boolean,
    personId: string,
}

interface StateType {
    // visitors: masterVisitorType[];
    visitors: VisitorType[];
    visitorSearch: string;
    selectedVisitor?: VisitorType;
    currentFilter: string,
    visitorTotalCount: number,
    visitorFilteredCount: number,
    visitorFilter: GetFilter,
}

const initialState: StateType = {
    // visitors: [],
    visitors: [],
    visitorSearch: "",
    selectedVisitor: undefined,
    currentFilter: "show_all",
    visitorTotalCount: 0,
    visitorFilteredCount: 0,
    visitorFilter: defaultVisitorFilter,
};

export const VisitorSlice = createSlice({
    name: "visitor",
    initialState,
    reducers: {
      GetVisitor(state, action: PayloadAction<VisitorType[]>)  {
        state.visitors = action.payload;
      },
    //   GetVisitors(state, action: PayloadAction<VisitorType[]>) {
    //     state.newVisitor = action.payload;
    //     console.log("Get Visitors", JSON.stringify(state.newVisitor, null, 2));
    // },
      SelectVisitor(state, action: PayloadAction<string>) {
        const selected = state.visitors.find((visitor: VisitorType) => visitor.id === action.payload);
        state.selectedVisitor = selected || undefined;
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
        .addCase(fetchVisitorDT.fulfilled, (state, action) => {
            state.visitorTotalCount = action.payload.recordsTotal;
            state.visitorFilteredCount = action.payload.recordsFiltered;
        });
    },

});

export const {
    GetVisitor,
    // GetVisitors,
    SelectVisitor,
    SearchVisitor,
    SetVisibilityFilter,
    UpdateFilter,
} = VisitorSlice.actions;

export const fetchVisitor = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
        dispatch(GetVisitor(response.data?.collection?.data || []));
        console.log("Fetch Visitors", response.data?.collection || []);
    } catch (err) {
        console.log("Error: ", err);
    }
};

export const fetchVisitorDT = createAsyncThunk(
    "visitor/fetchVisitorDT",
    async (filter: any, { rejectWithValue }) => {
        try {
            const response = await axiosServices.post(API_DT_URL, filter);
            dispatch(GetVisitor(response.data.collection.data || []));
            console.log("Fetch Visitors", response.data.collection);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching visitors:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

export const fetchVisitorbyId = (id: string) => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(`${API_URL}public/${id}`);
                console.log("Fetch Visitors", response.data?.collection || []);
        return(response.data.collection.data || []);

    } catch (err) {
        console.log("Error: ", err);
    }
}

export const addVisitor = createAsyncThunk("visitor/addVisitor", async (formData: FormData) => {
    try {
        formData.delete('id');
        const response = await axiosServices.post(API_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error adding member:", error);
        throw error;
    }
});

export const sendInvitation = createAsyncThunk("visitor/sendInvitation", async (payload: any) => {
    try{
        console.log(typeof payload);
        for (const [key, value] of payload.entries()) {
            console.log(key, value);
        }
        const response = await axiosServices.post(`${SEND_INVITATION_URL}`, payload);
        console.log(response.data);
        return response.data;
    } catch (error) {
        console.error("Error sending Invitation:", error);
        throw error;
    }
})

export const editVisitor = createAsyncThunk("visitor/editVisitor", async (formData: FormData) => {
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
        return response.data;
    } catch (error) {
        console.error("Error editing Visitor:", error);
        throw error;
    }
});

export const fillFormVisitor = createAsyncThunk(
    "visitor/fillFormVisitor",
    async ({ code, visitorId, applicationId, trxVisitorId, formData }: { code: string, visitorId: string, applicationId: string, trxVisitorId: string, formData: FormData }, thunkAPI) => {
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
            return response.data;
        } catch (error) {
            console.error("Error submitting form:", error);
            throw error;
        }
    }
)

export const deleteVisitor = createAsyncThunk("visitor/deleteVisitor", async (visitorId: string) => {
    try {
        await axiosServices.delete(`${API_URL}${visitorId}`);
        return visitorId; // Return the deleted visitor's ID to update the state
    } catch (error) {
        console.error("Error deleting visitor:", error);
        throw error;
    }
});

export default VisitorSlice.reducer;