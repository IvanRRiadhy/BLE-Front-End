import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = "/api/Visitor/";
const API_DT_URL = "/api/Visitor/filter/";

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
    name: string,
    email: string,
    gender: string,
    phone: string,
    faceImage: string,
    bleCardNumber:string,
    organizationId:string,
    districtId: string,
    departmentId: string,
    isVip: boolean,
    isEmailVerified: boolean,
    emailVerificationSendAt: string,
    emailVerificationToken: string,
    visitorPeriodStart: string,
    visitorPeriodEnd: string,
    adress:string,
    applicationId: string,
    cardNumber: string,
    identityId: string,
    isEmployee: string,
    personId: string,
}

interface StateType {
    visitors: masterVisitorType[];
    visitorSearch: string;
    selectedVisitor?: masterVisitorType;
    currentFilter: string,
    visitorTotalCount: number,
    visitorFilteredCount: number,
    visitorFilter: GetFilter,
}

const initialState: StateType = {
    visitors: [],
    visitorSearch: "",
    selectedVisitor: undefined,
    currentFilter: "show_all",
    visitorTotalCount: 0,
    visitorFilteredCount: 0,
    visitorFilter: {
        Draw: 1,
        Start: 0,
        Length: 10,
        SortColumn: "name",
        SortDir: "asc",
        searchValue: "",
    }
};

export const VisitorSlice = createSlice({
    name: "visitor",
    initialState,
    reducers: {
      GetVisitor(state, action: PayloadAction<masterVisitorType[]>)  {
        state.visitors = action.payload;
      },
      SelectVisitor(state, action: PayloadAction<string>) {
        const selected = state.visitors.find((visitor: masterVisitorType) => visitor.id === action.payload);
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
            const index = state.visitors.findIndex((visitor: masterVisitorType) => visitor.id === action.payload.id);
            if (index !== -1) {
                state.visitors[index] = action.payload;
            }
        })
        .addCase(editVisitor.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
        })
        .addCase(deleteVisitor.fulfilled, (state, action) => {
            state.visitors = state.visitors.filter((visitor: masterVisitorType) => visitor.id !== action.payload);
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
            console.error("Error fetching members:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

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

export const editVisitor = createAsyncThunk("visitor/editVisitor", async (formData: FormData) => {
    try {
        const id = formData.get('id');
        formData.delete('id');
        const response = await axiosServices.put(`${API_URL}${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error editing member:", error);
        throw error;
    }
});

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