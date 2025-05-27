import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = "http://192.168.1.173:5000/api/Visitor/";

export interface visitorType {
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

interface StateType {
    visitors: visitorType[];
    visitorSearch: string;
    selectedVisitor?: visitorType;
    currentFilter: string,
}

const initialState: StateType = {
    visitors: [],
    visitorSearch: "",
    selectedVisitor: undefined,
    currentFilter: "show_all",
};

export const VisitorSlice = createSlice({
    name: "visitor",
    initialState,
    reducers: {
      GetVisitor(state, action: PayloadAction<visitorType[]>)  {
        state.visitors = action.payload;
      },
      SelectVisitor(state, action: PayloadAction<string>) {
        const selected = state.visitors.find((visitor: visitorType) => visitor.id === action.payload);
        state.selectedVisitor = selected || undefined;
      },
      SearchVisitor(state, action: PayloadAction<string>) {
        state.visitorSearch = action.payload;
      },
        SetVisibilityFilter(state: StateType, action: PayloadAction<string>) {
            state.currentFilter = action.payload;
        },
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
            const index = state.visitors.findIndex((visitor: visitorType) => visitor.id === action.payload.id);
            if (index !== -1) {
                state.visitors[index] = action.payload;
            }
        })
        .addCase(editVisitor.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
        })
        .addCase(deleteVisitor.fulfilled, (state, action) => {
            state.visitors = state.visitors.filter((visitor: visitorType) => visitor.id !== action.payload);
        })
        .addCase(deleteVisitor.rejected, (_state, action) => {
            console.error("Delete failed: ", action.payload);
        });
    },

});

export const {
    GetVisitor,
    SelectVisitor,
    SearchVisitor,
    SetVisibilityFilter,
} = VisitorSlice.actions;

export const fetchVisitor = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axios.get(API_URL, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        dispatch(GetVisitor(response.data?.collection?.data || []));
    } catch (err) {
        console.log("Error: ", err);
    }
};

export const addVisitor = createAsyncThunk("visitor/addVisitor", async (formData: FormData) => {
    try {
        formData.delete('id');
        const response = await axios.post(API_URL, formData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                'Content-Type' : 'multipart/form-data',
            }
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
        const response = await axios.put(`${API_URL}/${id}`, formData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                'Content-Type' : 'multipart/form-data',
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error editing member:", error);
        throw error;
    }
});

export const deleteVisitor = createAsyncThunk("visitor/deleteVisitor", async (visitorId: string) => {
    try {
        await axios.delete(`${API_URL}/${visitorId}`, {
            headers: {    
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return visitorId; // Return the deleted visitor's ID to update the state
    } catch (error) {
        console.error("Error deleting visitor:", error);
        throw error;
    }
});

export default VisitorSlice.reducer;