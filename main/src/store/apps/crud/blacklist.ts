import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { visitorType } from "./visitor";
import { MaskedAreaType } from "./maskedArea";

const API_URL = 'http://192.168.1.173:5000/api/VisitorBlacklistArea/';

export interface blacklistType {
    id: string,
    floorplanMaskedAreaId: string,
    visitorId: string,
    visitor?: visitorType,
    floorplanMaskedArea?: MaskedAreaType,
}

interface StateType {
    blacklists: blacklistType[];
    blacklistSearch: string;
    selectedBlacklist?: blacklistType | null;
}

const initialState: StateType = {
    blacklists: [],
    blacklistSearch: "",
    selectedBlacklist: null,
};

export const BlacklistSlice = createSlice({
    name: "blacklist",
    initialState,
    reducers: {
        GetBlaclist(state, action: PayloadAction<blacklistType[]>) {
            state.blacklists = action.payload;
        },
        SelectBlacklist(state, action: PayloadAction<string>){
            const selected = state.blacklists.find((blacklist: blacklistType) => blacklist.id === action.payload);
            state.selectedBlacklist = selected || null;
        },
        SearchBlacklist(state, action: PayloadAction<string>){
            state.blacklistSearch = action.payload;
        },

    },
    extraReducers: (builder) => {
        builder
        .addCase(addBlacklist.fulfilled, (state, action) => {
            state.blacklists.push(action.payload);
        })
        .addCase(addBlacklist.rejected, (_state, action) => {
            console.error("Add failed: ", action.payload);
        })
        .addCase(editBlacklist.fulfilled, (state, action) => {
            const index = state.blacklists.findIndex((blacklist: blacklistType) => blacklist.id === action.payload.id);
            if (index !== -1) {
                state.blacklists[index] = action.payload;
            }
        })
        .addCase(editBlacklist.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
        })
        .addCase(deleteBlacklist.fulfilled, (state, action) => {
            state.blacklists = state.blacklists.filter((blacklist: blacklistType) => blacklist.id !== action.payload);
        })
        .addCase(deleteBlacklist.rejected, (_state, action) => {
            console.error("Delete failed: ", action.payload);
        });
    },
});

export const {
    GetBlaclist,
    SelectBlacklist,
    SearchBlacklist,
} = BlacklistSlice.actions;

export const fetchBlacklist = () => async (dispatch: AppDispatch) => {
    try{
        const response = await axios.get(API_URL, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        dispatch(GetBlaclist(response.data?.collection?.data || []));
    } catch (err){
        console.log("Error: ", err);
    }
};

export const addBlacklist = createAsyncThunk("blacklist/addBlacklist", async (formData: FormData) => {
    try {
        formData.delete('id');
        const response = await axios.post(API_URL, formData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error adding blacklist:", error);
        throw error;
    }
});

export const editBlacklist = createAsyncThunk("blacklist/editBlacklist", async (formData: FormData) => {
    try {
        const id = formData.get('id');
        formData.delete('id');
        const response = await axios.put(`${API_URL}/${id}`, formData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error editing blacklist:", error);
        throw error;
    }
});

export const deleteBlacklist = createAsyncThunk("blacklist/deleteBlacklist", async (blacklistId: string) => {
    try {
        await axios.delete(`${API_URL}/${blacklistId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return blacklistId; // Return the deleted blacklist's ID to update the state
    } catch (error) {
        console.error("Error deleting blacklist:", error);
        throw error;
    }
});

export default BlacklistSlice.reducer;