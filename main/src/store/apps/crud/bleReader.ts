import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = "/api/MstBleReader/";

export interface bleReaderType {
    id: string,
    brandId: string,
    name: string,
    mac: string,
    gmac: string,
    ip: string,
    locationX: number,
    locationY: number,
    locationPxX: number,
    locationPxY: number,
    engineReaderId: string,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string,
}

interface StateType {
    bleReaders: bleReaderType[];
    unsavedReaders: bleReaderType[];
    bleReaderSearch: string;
    selectedBleReader?: bleReaderType | null;
    editedBleReader?: string;
}

const initialState: StateType = {
    bleReaders: [],
    unsavedReaders: [],
    bleReaderSearch: "",
    selectedBleReader: null,
    editedBleReader: "",
};

export const BleReaderSlice = createSlice({
    name: "bleReaders",
    initialState,
    reducers: {
        GetBleReader: (state, action: PayloadAction<bleReaderType[]>) => {
            state.bleReaders = action.payload;
            state.unsavedReaders = action.payload;
        },

        SelectBleReader: (state, action: PayloadAction<string>) => {
            const selected = state.bleReaders.find((bleReader: bleReaderType) => bleReader.id === action.payload);
            state.selectedBleReader = selected || null;
        },

        SearchBleReader: (state, action: PayloadAction<string>) => {
            state.bleReaderSearch = action.payload;
        },

        SetEditBleReader: (state, action: PayloadAction<string>) => {
            state.editedBleReader = action.payload;
            
        },

        UpdateBleReader: {
            reducer: (
                state: StateType,
                action: PayloadAction<{ id: string; updates: Partial<bleReaderType> }>,
            ) => {
                if(state.selectedBleReader?.id === action.payload.id) {
                    state.selectedBleReader = {...state.selectedBleReader, ...action.payload.updates};
                    state.bleReaders = state.bleReaders.map((bleReader) => 
                        bleReader.id === action.payload.id ? {...bleReader, ...action.payload.updates} : bleReader
                    );
                }

            },
            prepare: (id: string, updates: Partial<bleReaderType>) => ({
                payload: { id, updates },
            }),
        },

        RevertBleReader: {
            reducer: (state: StateType, action: PayloadAction<{id: string}>) => {
                const readerIndex = state.unsavedReaders.findIndex(
                    (bleReader) => bleReader.id === action.payload.id
                )
                const baseReader = state.bleReaders.find((bleReader) => bleReader.id === action.payload.id);
                if(baseReader){
                    if (state.selectedBleReader?.id === action.payload.id) {
                        state.selectedBleReader = { ...baseReader };
                    }
                }
                if(readerIndex !== -1 && baseReader) {
                    state.unsavedReaders[readerIndex] = {...baseReader};
                }
            },
            prepare: (id: string) => ({
                payload: {id},
            }),
        },

    },
    extraReducers: (builder) => {
        builder
        .addCase(addBleReader.fulfilled, (state, action) => {
            state.bleReaders.push(action.payload);
        })
        .addCase(addBleReader.rejected, (_state, action) => {
            console.error("Add bleReader failed: ", action.payload);
        })
        .addCase(editBleReader.fulfilled, (state, action) => {
            const index = state.bleReaders.findIndex((bleReader) => bleReader.id === action.payload.id);
            if(index !== -1) {
                state.bleReaders[index] = action.payload;
                state.selectedBleReader = action.payload;
            }
        })
        .addCase(editBleReader.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
        })
        .addCase(deleteBleReader.fulfilled, (state, action) => {
            state.bleReaders = state.bleReaders.filter(bleReader => bleReader.id !== action.payload);
            if (state.selectedBleReader?.id === action.payload) {
                state.selectedBleReader = null;
            }
        })
        .addCase(deleteBleReader.rejected, (_state, action) => {
            console.error("Delete failed: ", action.payload);
        })
    },
});




export const {
    GetBleReader,
    SelectBleReader,
    SearchBleReader,
    SetEditBleReader,
    UpdateBleReader,
    RevertBleReader,
} = BleReaderSlice.actions;

export const fetchBleReaders = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
        dispatch(GetBleReader(response.data?.collection?.data || []));
    } catch (error) {
        console.log(error);
    }
}

export const addBleReader = createAsyncThunk(
    "bleReaders/addBleReader",
    async (newBleReader: bleReaderType, { rejectWithValue }) => {
        try {
            const {id, createdBy, createdAt, updatedBy, updatedAt, ...filteredBleReaderData} = newBleReader
            const response = await axiosServices.post(API_URL, filteredBleReaderData);
            return response.data;
        } catch (error: any) {
            console.error("Error adding bleReader:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    },
);

export const editBleReader = createAsyncThunk(
    "bleReaders/editBleReader",
    async (updateBleReader: bleReaderType, {rejectWithValue}) => {
        try {
            const { id, createdBy, createdAt, updatedBy, updatedAt, ...filteredBleReaderData } = updateBleReader;
            const response = await axiosServices.put(`${API_URL}${id}`, filteredBleReaderData);
            return response.data;
        } catch (error: any) {
            console.error("Error editing bleReader:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    },
);

export const deleteBleReader = createAsyncThunk(
    "bleReaders/deleteBleReader",
    async (bleReaderId: string, { rejectWithValue }) => {
        try {
            await axiosServices.delete(`${API_URL}${bleReaderId}`);
            return bleReaderId; // Return the deleted bleReader's ID to update the state
        } catch (error: any) {
            console.error("Error deleting bleReader:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    },
);

export default BleReaderSlice.reducer;