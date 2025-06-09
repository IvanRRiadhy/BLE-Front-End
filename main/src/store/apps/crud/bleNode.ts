import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { bleReaderType } from "./bleReader";

const API_URL = 'http://192.168.1.173:5000/api/BleReaderNode/';

export interface BleNodeType {
    id: string,
    applicationId: string,
    readerId: string,
    distance: number,
    distancePx: number,
    startPos: string,
    endPos: string,
    reader?: bleReaderType,
}

interface StateType {
    bleNodes: BleNodeType[];
    unsavedNodes: BleNodeType[];
    bleNodeSearch: string;
    selectedBleNode?: BleNodeType | null;
    editedBleNode?: string;
}

const initialState: StateType = {
    bleNodes: [],
    unsavedNodes: [],
    bleNodeSearch: "",
    selectedBleNode: null,
    editedBleNode: "",
};

export const BleNodeSlice = createSlice({
    name: "bleNodes",
    initialState,
    reducers: {
        GetBleNode: (state, action: PayloadAction<BleNodeType[]>) => {
            state.bleNodes = action.payload;
            state.unsavedNodes = action.payload;
        },

        SelectBleNode: (state, action: PayloadAction<string>) => {
            const selected = state.bleNodes.find((bleNode: BleNodeType) => bleNode.id === action.payload);
            state.selectedBleNode = selected || null;
        },

        SearchBleNode: (state, action: PayloadAction<string>) => {
            state.bleNodeSearch = action.payload;
        },

        SetEditBleNode: (state, action: PayloadAction<string>) => {
            state.editedBleNode = action.payload;
        },
    },

    extraReducers: (builder) => {
        builder
        .addCase(addBleNode.fulfilled, (state, action) => {
            state.bleNodes.push(action.payload);
            state.unsavedNodes.push(action.payload);
        })
        .addCase(addBleNode.rejected, (state, action) => {
            console.error("Error adding bleNode:", action.payload);
        })
        .addCase(editBleNode.fulfilled, (state, action) => {
            const index = state.bleNodes.findIndex((bleNode) => bleNode.id === action.payload.id);
            if (index !== -1) {
                state.bleNodes[index] = action.payload;
                state.unsavedNodes[index] = action.payload;
            }
        })
        .addCase(editBleNode.rejected, (state, action) => {
            console.error("Error editing bleNode:", action.payload);
        })
        .addCase(deleteBleNode.fulfilled, (state, action) => {
            state.bleNodes = state.bleNodes.filter((bleNode) => bleNode.id !== action.payload);
            state.unsavedNodes = state.unsavedNodes.filter((bleNode) => bleNode.id !== action.payload);
            if (state.selectedBleNode?.id === action.payload) {
                state.selectedBleNode = null;
            }
        })
        .addCase(deleteBleNode.rejected, (state, action) => {
            console.error("Error deleting bleNode:", action.payload);
        })
    },
});

export const { GetBleNode, SelectBleNode, SearchBleNode, SetEditBleNode } = BleNodeSlice.actions;

export const fetchNodes = () =>  async (dispatch: AppDispatch) => {
    try {
        const response = await axios.get(API_URL, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        dispatch(GetBleNode(response.data?.collection?.data || []));
    } catch (error) {
        console.error("Error fetching nodes:", error);
    }
};

export const addBleNode = createAsyncThunk(
    "bleNodes/addBleNode",
    async (newBleNode: BleNodeType, { rejectWithValue }) => {
        try {
            const { id, reader, ...filteredBleNodeData } = newBleNode;
            const response = await axios.post(API_URL, filteredBleNodeData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            return response.data;
        } catch (error: any) {
            console.error("Error adding bleNode:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    },
);

export const editBleNode = createAsyncThunk(
    "bleNodes/editBleNode",
    async (updateBleNode: BleNodeType, { rejectWithValue }) => {
        try {
            const { id, reader, ...filteredBleNodeData } = updateBleNode;
            const response = await axios.put(`${API_URL}/${id}`, filteredBleNodeData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            return response.data;
        } catch (error: any) {
            console.error("Error editing bleNode:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    },
);

export const deleteBleNode = createAsyncThunk(
    "bleNodes/deleteBleNode",
    async (bleNodeId: string, { rejectWithValue }) => {
        try {
            await axios.delete(`${API_URL}/${bleNodeId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
        } catch (error: any) {
            console.error("Error deleting bleNode:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    },
);



export default BleNodeSlice.reducer;
