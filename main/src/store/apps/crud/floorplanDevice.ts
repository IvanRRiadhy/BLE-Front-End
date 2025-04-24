import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { bleReaderType } from "./bleReader";
import { MaskedAreaType } from "./maskedArea";
import { CCTVType } from "./accessCCTV";
import { AccessControlType } from "./accessControl";

const API_URL = 'http://192.168.1.116:5000/api/FloorplanDevice/';

export interface FloorplanDeviceType {
    id: string,
    name: string,
    type: string,
    floorplanId: string,
    accessCctvId: string,
    readerId: string,
    accessControlId: string,
    posX: number,
    posY: number,
    posPxX: number,
    posPxY: number,
    floorplanMaskedAreaId: string,
    applicationId: string,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string,
    deviceStatus: string,
    accessCctv?: CCTVType,
    reader?: bleReaderType,
    accessControl?: AccessControlType,
    floorplanMaskedArea?: MaskedAreaType,
};

interface StateType {
    floorplanDevices: FloorplanDeviceType[];
    unsavedFloorplanDevices: FloorplanDeviceType[];
    floorplanDeviceSearch: string;
    selectedFloorplanDevice?: FloorplanDeviceType | null;
    editingFloorplanDevice?: FloorplanDeviceType | null;
};

const initialState: StateType = {
    floorplanDevices: [],
    unsavedFloorplanDevices: [],
    floorplanDeviceSearch: '',
    selectedFloorplanDevice: null,
    editingFloorplanDevice: null,
};

export const FloorplanDeviceSlice = createSlice({
    name: 'floorplanDevice',
    initialState,
    reducers: {
        GetFloorplanDevices: (state, action) => {
            state.floorplanDevices = action.payload;
        },
        GetUnsavedFloorplanDevices: (state) => {
            state.unsavedFloorplanDevices = state.floorplanDevices;
        },
        SelectFloorplanDevice: (state, action) => {
            const selected = state.unsavedFloorplanDevices.find(
                (floorplanDevice: FloorplanDeviceType) => floorplanDevice.id === action.payload
            );
            state.selectedFloorplanDevice = selected || null;
        },
        SelectEditingFloorplanDevice: (state, action) => {
            const selected = state.unsavedFloorplanDevices.find(
                (floorplanDevice: FloorplanDeviceType) => floorplanDevice.id === action.payload
            );
            state.editingFloorplanDevice = selected || null;
        },

        SearchFloorplanDevice: (state, action) => {
            state.floorplanDeviceSearch = action.payload;
        },
        AddUnsavedDevice: (state, action: PayloadAction<FloorplanDeviceType>) => {
            state.unsavedFloorplanDevices.push(action.payload);
          },
        EditUnsavedDevice: (state, action: PayloadAction<FloorplanDeviceType>) => {
        const index = state.unsavedFloorplanDevices.findIndex(
            (device) => device.id === action.payload.id
        );
        if (index !== -1) {
            state.unsavedFloorplanDevices[index] = action.payload;
            state.editingFloorplanDevice = action.payload;
        //   console.log("Updated device: ", action.payload);
        }
        },
        RevertDevice: {
            reducer: (state, action: PayloadAction<{ id: string }>) => {
                const deviceIndex = state.unsavedFloorplanDevices.findIndex(
                    (device) => device.id === action.payload.id
                );
                const device = state.floorplanDevices.find((device) => device.id === action.payload.id);
                if (device) {
                    if(state.selectedFloorplanDevice?.id === action.payload.id) {
                        state.selectedFloorplanDevice = { ...device };
                    }
                }
                if (deviceIndex !== -1 && device) {
                    state.unsavedFloorplanDevices[deviceIndex] = { ...device };
                    state.editingFloorplanDevice = { ...device };
                }
            },
            prepare: (id: string) => ({
                payload: { id },
            }),

        }
    },

    extraReducers: (builder) => {
        builder
            .addCase(addFloorplanDevice.fulfilled, (state, action) => {
                state.floorplanDevices.push(action.payload);
            })
            .addCase(addFloorplanDevice.rejected, (_state, action) => {
                console.error("Add floorplan device failed: ", action.payload);
            })
            .addCase(editFloorplanDevice.fulfilled, (state, action) => {
                const index = state.floorplanDevices.findIndex((device) => device.id === action.payload.id);
                if (index !== -1) {
                    state.floorplanDevices[index] = action.payload;
                }
            })
            .addCase(editFloorplanDevice.rejected, (_state, action) => {
                console.error("Edit floorplan device failed: ", action.payload);
            })
            .addCase(deleteFloorplanDevice.fulfilled, (state, action) => {
                state.floorplanDevices = state.floorplanDevices.filter((device) => device.id !== action.payload.id);
            })
            .addCase(deleteFloorplanDevice.rejected, (_state, action) => {
                console.error("Delete floorplan device failed: ", action.payload);
            });
    },
});


export const {
    GetFloorplanDevices,
    GetUnsavedFloorplanDevices,
    SelectFloorplanDevice,
    SearchFloorplanDevice,
    AddUnsavedDevice,
    EditUnsavedDevice,
    SelectEditingFloorplanDevice,
    RevertDevice,
} = FloorplanDeviceSlice.actions;

export const fetchFloorplanDevices = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axios.get(API_URL, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        dispatch(GetFloorplanDevices(response.data?.collection?.data || []));
    } catch (error) {
        console.error("Error fetching floorplan devices: ", error);
    }    
};

export const addFloorplanDevice = createAsyncThunk(
    'floorplanDevice/addFloorplanDevice',
    async (floorplanDevice: FloorplanDeviceType, { rejectWithValue }) => {
        try {
            const { id, createdAt, createdBy, updatedAt, updatedBy, accessCctv, reader, accessControl, floorplanMaskedArea, ...filteredFloorplanDevice } = floorplanDevice;
            const response = await axios.post(API_URL, filteredFloorplanDevice, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            return response.data;
        } catch (error: any) {
            console.error("Error adding floorplan device: ", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export const editFloorplanDevice = createAsyncThunk(
    'floorplanDevice/editFloorplanDevice',
    async (floorplanDevice: FloorplanDeviceType, { rejectWithValue }) => {
        try {
            const { id, createdAt, createdBy, updatedAt, updatedBy, accessCctv, reader, accessControl, floorplanMaskedArea, ...filteredFloorplanDevice } = floorplanDevice;
             const response = await axios.put(`${API_URL}${floorplanDevice.id}`, filteredFloorplanDevice, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            return response.data;
        } catch (error: any) {
            console.error("Error editing floorplan device: ", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export const deleteFloorplanDevice = createAsyncThunk(
    'floorplanDevice/deleteFloorplanDevice',
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await axios.delete(`${API_URL}${id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            return response.data;
        } catch (error: any) {
            console.error("Error deleting floorplan device: ", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);



export default FloorplanDeviceSlice.reducer;