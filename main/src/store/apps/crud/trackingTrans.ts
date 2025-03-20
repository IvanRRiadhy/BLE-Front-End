import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = "http://localhost:5034/api/TrackingTransaction";

export interface trackingTransType {
    id: string,
    transTime: string,
    readerId: string,
    cardId: number,
    floorplanId: string,
    coordinateX: number,
    coordinateY: number,
    coordinatePxX: number,
    coordinatePxY: number,
    alarmStatus: string,
    battery: number
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
        const response = await axios.get(API_URL);
        dispatch(GetTrackingTrans(response.data?.collection?.data || []));
    } catch (error) {
        console.log(error);
    }
};

export const addTrackingTrans = createAsyncThunk("trackingTrans/addTrackingTrans", async (trackingTrans: trackingTransType) => {
    try {
        const {id, ...filteredTrackingTransData} = trackingTrans
        const response = await axios.post(API_URL, filteredTrackingTransData);
        return response.data;
    } catch (error) {
        console.error("Error adding trackingTrans:", error);
        throw error;
    }
});

export const editTrackingTrans = createAsyncThunk("trackingTrans/editTrackingTrans", async (trackingTrans: trackingTransType) => {
    try {
        const { id, ...filteredTrackingTransData } = trackingTrans;
        const response = await axios.put(`${API_URL}/${id}`, filteredTrackingTransData);
        return response.data;
    } catch (error) {
        console.error("Error editing trackingTrans:", error);
        throw error;
    }
});

export const deleteTrackingTrans = createAsyncThunk("trackingTrans/deleteTrackingTrans", async (trackingTransId: string) => {
    try {
        await axios.delete(`${API_URL}/${trackingTransId}`);
        return trackingTransId; // Return the deleted trackingTrans's ID to update the state
    } catch (error) {
        console.error("Error deleting trackingTrans:", error);
        throw error;
    }
});

export default TrackingTransSlice.reducer;