import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { bleReaderType } from "./bleReader";
import { MaskedAreaType } from "./maskedArea";
import { CCTVType } from "./accessCCTV";
import { AccessControlType } from "./accessControl";
import { DeviceType } from "src/types/crud/input";

const API_URL = '/api/FloorplanDevice/';

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
    deletedFloorplanDevice?: FloorplanDeviceType[];
    addedFloorplanDevice?: FloorplanDeviceType[];
};

const initialState: StateType = {
    floorplanDevices: [],
    unsavedFloorplanDevices: [],
    floorplanDeviceSearch: '',
    selectedFloorplanDevice: null,
    editingFloorplanDevice: null,
    deletedFloorplanDevice: [],
    addedFloorplanDevice: [],
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
                state.unsavedFloorplanDevices = state.unsavedFloorplanDevices.map((device, i) => 
                    i === index ? { ...device, ...action.payload } : device
                );
                // state.unsavedFloorplanDevices[index] = action.payload;
                state.editingFloorplanDevice = {
                    ...state.editingFloorplanDevice,
                    ...action.payload};
            }   
        },
        editDevicePosition: (state, action: PayloadAction<FloorplanDeviceType>) => {
            const index = state.unsavedFloorplanDevices.findIndex((device) => device.id === action.payload.id);
            if (index !== -1) {
                state.unsavedFloorplanDevices = state.unsavedFloorplanDevices.map((device, i) =>
                    i === index ? { ...device, posX: action.payload.posX, posY: action.payload.posY, posPxX: action.payload.posPxX, posPxY: action.payload.posPxY } : device
                );

                if(state.editingFloorplanDevice){
                    state.editingFloorplanDevice = {
                        ...state.editingFloorplanDevice,
                        posX: action.payload.posX,
                        posY: action.payload.posY,
                        posPxX: action.payload.posPxX,
                        posPxY: action.payload.posPxY
                    }
                }
            }
        },
        SaveDevice: (state, action: PayloadAction<string>) => {
            const index = state.unsavedFloorplanDevices.findIndex((device) => device.id === action.payload);
            console.log(index);
            if(index !== -1 && state.floorplanDevices[index]) {
                if(state.floorplanDevices[index].id === state.unsavedFloorplanDevices[index].id) {
                    state.floorplanDevices[index] = state.unsavedFloorplanDevices[index];
                    console.log(JSON.stringify(state.floorplanDevices[index], null, 2));
                }
            }
            else {
                console.log("New device added");
                state.floorplanDevices.push(state.unsavedFloorplanDevices[index]);
                state.addedFloorplanDevice?.push(state.unsavedFloorplanDevices[index]);
            }
        },
        DeleteUnsavedDevice: (state, action: PayloadAction<string>) => {
            // Find the index of the device to delete
            const index = state.unsavedFloorplanDevices.findIndex(
                (device) => device.id === action.payload
            );
        
            // If the device exists, remove it from the list
            if (index !== -1) {
                state.deletedFloorplanDevice?.push(state.unsavedFloorplanDevices[index]);
                state.unsavedFloorplanDevices.splice(index, 1);
                console.log(`Device with ID ${action.payload} deleted from unsaved devices.`);
            } else {
                console.warn(`Device with ID ${action.payload} not found in unsaved devices.`);
            }
        },
        RevertDevice: {
            reducer: (state, action: PayloadAction<{ id: string }>) => {
                const deviceIndex = state.unsavedFloorplanDevices.findIndex(
                    (device) => device.id === action.payload.id
                );
                const device = state.floorplanDevices.find((device) => device.id === action.payload.id);
                if (deviceIndex !== -1) {
                    const unsavedDevice = state.unsavedFloorplanDevices[deviceIndex];
                    // Check if the device type is valid
                    const validDeviceTypes = DeviceType.map((type) => type.value); // Extract valid types from DeviceType
                    console.log(unsavedDevice);
                    if (unsavedDevice.type === "" || !validDeviceTypes.includes(unsavedDevice.type) ) {
                        // Remove the device if its type is invalid
                        state.unsavedFloorplanDevices.splice(deviceIndex, 1);
                        // console.warn(`Device with ID ${action.payload.id} removed due to invalid type.`);
                        return;
                    }
                }
                if (device) {
                    if(state.selectedFloorplanDevice?.id === action.payload.id) {
                        state.selectedFloorplanDevice = device;
                    }
                }
                if (deviceIndex !== -1 && device) {
                    console.log(JSON.stringify(device, null, 2));
                    state.unsavedFloorplanDevices[deviceIndex] = device;
                    state.editingFloorplanDevice = null ;
                }
            },
            prepare: (id: string) => ({
                payload: { id },
            }),

        },
        ResetState: (state) => {
            state.deletedFloorplanDevice = [];
            state.addedFloorplanDevice = [];
            state.selectedFloorplanDevice = null;
            state.editingFloorplanDevice = null;
        },
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
    DeleteUnsavedDevice,
    RevertDevice,
    SaveDevice,
    ResetState,
    editDevicePosition,
} = FloorplanDeviceSlice.actions;

export const fetchFloorplanDevices = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
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
            console.log(filteredFloorplanDevice.applicationId);
            console.log("Filtered Floorplan Device: ", filteredFloorplanDevice);
            const response = await axiosServices.post(API_URL, filteredFloorplanDevice);
            console.log("Floorplan device added: ", response.data);
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
             const response = await axiosServices.put(`${API_URL}${floorplanDevice.id}`, filteredFloorplanDevice);
            console.log("Floorplan device edited: ", response.data);
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
            const response = await axiosServices.delete(`${API_URL}${id}`);
            console.log("Floorplan device deleted: ", response.data);
            return response.data;
        } catch (error: any) {
            console.error("Error deleting floorplan device: ", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);



export default FloorplanDeviceSlice.reducer;