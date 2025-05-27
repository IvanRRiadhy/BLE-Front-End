import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { IntegrationType } from "src/store/apps/crud/integration";

const API_URL = "http://192.168.1.173:5000/api/MstAccessCctv/";

export interface CCTVType {
    id: string,
    name: string,
    rtsp: string,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string,
    integrationId: string,
    applicationId: string,
    integration: IntegrationType,
}

interface StateType {
    cctvs: CCTVType[];
    cctvSearch: string;
    selectedCCTV?: CCTVType | null;
}

const initialState: StateType = {
    cctvs: [],
    cctvSearch: "",
    selectedCCTV: null,
};

export const CCTVSlice = createSlice({
    name: "cctvs",
    initialState,

    reducers: {
        GetAccessCCTV: (state, action: PayloadAction<CCTVType[]>) => {
            state.cctvs = action.payload;
        },
        SelectAccessCCTV: (state, action: PayloadAction<string>) => {
            const selected = state.cctvs.find(
                (cctv: CCTVType) => cctv.id === action.payload,
            );
            state.selectedCCTV = selected || null;
        },
        SearchAccessCCTV: (state, action: PayloadAction<string>) => {
            state.cctvSearch = action.payload;
        },
    },

    extraReducers: (builder) => {
        builder
        .addCase(addCCTV.fulfilled, (state, action) => {
            state.cctvs.push(action.payload);
        })
        .addCase(addCCTV.rejected, (_state, action) => {
            console.error("Add CCTV failed: ", action.payload);
        })
        .addCase(editCCTV.fulfilled, (state, action) => {
            const index = state.cctvs.findIndex((cctv) => cctv.id === action.payload.id);
            if(index !== -1) {
                state.cctvs[index] = action.payload;
                state.selectedCCTV = action.payload;
            }
        })
        .addCase(editCCTV.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
        })
        .addCase(deleteCCTV.fulfilled, (state, action) => {
            state.cctvs = state.cctvs.filter(cctv => cctv.id !== action.payload);
            if (state.selectedCCTV?.id === action.payload) {
                state.selectedCCTV = null;
            }
        })
        .addCase(deleteCCTV.rejected, (_state, action) => {
            console.error("Delete failed: ", action.payload);
        });
    }

});

export const selectAccessCCTV = 
    (accessCCTVID: string) => (dispatch: AppDispatch, getState: () => RootState) => {
        const state = getState();
        console.log(state);
        const isEditing = false;

        if(!isEditing) {
            dispatch(SelectAccessCCTV(accessCCTVID));
        } else {
            console.warn("Cannot Switch while editing.");
        }
    };

    export const {
        GetAccessCCTV,
        SelectAccessCCTV,
        SearchAccessCCTV,
    } = CCTVSlice.actions;


    export const fetchAccessCCTV = () => async (dispatch: AppDispatch) => {
        try {
            const response = await axios.get(API_URL, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            dispatch(GetAccessCCTV(response.data?.collection?.data || []));
        } catch (error) {
            console.log(error);
        }
    };

    export const addCCTV = createAsyncThunk(
        "cctvs/addCCTV",
        async (newCCTV: CCTVType, { rejectWithValue }) => {
            try {
                const {id, createdBy, createdAt, updatedBy, updatedAt, ...filteredCCTVData} = newCCTV
                const response = await axios.post(API_URL, filteredCCTVData, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                });
                return response.data;
            } catch (error: any) {
                console.error("Error adding CCTV:", error);
                return rejectWithValue(error.response?.data || "Unknown error");
            }
        },
    );

    export const editCCTV = createAsyncThunk(
        "cctvs/editCCTV",
        async (updateCCTV: CCTVType, {rejectWithValue}) => {
            try {
                const { id, createdBy, createdAt, updatedBy, updatedAt, ...filteredCCTVData } = updateCCTV;
                const response = await axios.put(`${API_URL}/${id}`, filteredCCTVData, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                });
                return response.data;
            } catch (error: any) {
                console.error("Error editing CCTV:", error);
                return rejectWithValue(error.response?.data || "Unknown error");
            }
        },
    );

    export const deleteCCTV = createAsyncThunk(
        "cctvs/deleteCCTV",
        async (cctvId: string, { rejectWithValue }) => {
            try {
                await axios.delete(`${API_URL}/${cctvId}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                });
                return cctvId; // Return the deleted CCTV's ID to update the state
            } catch (error: any) {
                console.error("Error deleting CCTV:", error);
                return rejectWithValue(error.response?.data || "Unknown error");
            }
        },
    );

    export default CCTVSlice.reducer;