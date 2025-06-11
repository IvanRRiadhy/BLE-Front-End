import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { MaskedAreaType } from "./maskedArea";
import { bleReaderType } from "./bleReader";

const API_URL = "/api/TrackingTransaction/";

export interface trackingTransType {
    id: string,
    transTime: string,
    floorplanMaskedAreaId: string,
    readerId: string,
    coordinateX: number,
    coordinateY: number,
    coordinatePxX: number,
    coordinatePxY: number,
    alarmStatus: string,
    battery: number
    floorplanMaskedArea?: MaskedAreaType,
    reader?: bleReaderType
}

interface StateType {
    trackingTrans: trackingTransType[];
    trackingTransSearch: string;
    selectedTrackingTrans?: trackingTransType | null;
}

const initialState: StateType = {
    trackingTrans: [],
    trackingTransSearch: "",
    selectedTrackingTrans: null,
};

export const TrackingTransSlice = createSlice({
    name: "trackingTrans",
    initialState,
    reducers: {
        GetTrackingTrans: (state, action: PayloadAction<trackingTransType[]>) => {
            state.trackingTrans = action.payload;
        },
        SelectTrackingTrans: (state, action: PayloadAction<trackingTransType>) => {
            const selected = state.trackingTrans.find((trackingTrans: trackingTransType) => trackingTrans.id === action.payload.id);
            state.selectedTrackingTrans = selected || null;
        },
        SearchTrackingTrans: (state, action: PayloadAction<string>) => {
            state.trackingTransSearch = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
        .addCase(addTrackingTrans.fulfilled, (state, action) => {
            state.trackingTrans.push(action.payload);
        })
        .addCase(addTrackingTrans.rejected, (_state, action) => {
            console.error("Add failed: ", action.payload);
        })
        .addCase(editTrackingTrans.fulfilled, (state, action) => {
            const index = state.trackingTrans.findIndex((trackingTrans: trackingTransType) => trackingTrans.id === action.payload.id);
            if (index !== -1) {
                state.trackingTrans[index] = action.payload;
            }
        })
        .addCase(editTrackingTrans.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
        })
        .addCase(deleteTrackingTrans.fulfilled, (state, action) => {
            state.trackingTrans = state.trackingTrans.filter((trackingTrans: trackingTransType) => trackingTrans.id !== action.payload);
        })
        .addCase(deleteTrackingTrans.rejected, (_state, action) => {
            console.error("Delete failed: ", action.payload);
        })
    },
});

export const { GetTrackingTrans, SelectTrackingTrans, SearchTrackingTrans } = TrackingTransSlice.actions;

export const fetchTrackingTrans = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(`${API_URL}`);
        dispatch(GetTrackingTrans(response.data?.collection?.data || []));
    } catch (error) {
        console.log(error);
    }
};

export const addTrackingTrans = createAsyncThunk("trackingTrans/addTrackingTrans", async (trackingTrans: trackingTransType) => {
    try {
        const {id, ...filteredTrackingTransData} = trackingTrans
        const response = await axiosServices.post(API_URL, filteredTrackingTransData);
        return response.data;
    } catch (error) {
        console.error("Error adding trackingTrans:", error);
        throw error;
    }
});

export const editTrackingTrans = createAsyncThunk("trackingTrans/editTrackingTrans", async (trackingTrans: trackingTransType) => {
    try {
        const { id, ...filteredTrackingTransData } = trackingTrans;
        const response = await axiosServices.put(`${API_URL}${id}`, filteredTrackingTransData);
        return response.data;
    } catch (error) {
        console.error("Error editing trackingTrans:", error);
        throw error;
    }
});

export const deleteTrackingTrans = createAsyncThunk("trackingTrans/deleteTrackingTrans", async (trackingTransId: string) => {
    try {
        await axiosServices.delete(`${API_URL}${trackingTransId}`);
        return trackingTransId; // Return the deleted trackingTrans's ID to update the state
    } catch (error) {
        console.error("Error deleting trackingTrans:", error);
        throw error;
    }
});

export default TrackingTransSlice.reducer;