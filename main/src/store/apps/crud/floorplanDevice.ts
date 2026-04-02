
import axiosServices, { BASE_URL } from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { bleReaderType } from "./bleReader";
import { MaskedAreaType } from "./maskedArea";
import { CCTVType } from "./accessCCTV";
import { AccessControlType } from "./accessControl";
import { DeviceType } from "src/types/crud/input";
import { defaultFloorplanDeviceFilter } from "../defaultForm";
import {v4 as uuidv4} from 'uuid';
import { FloorplanType } from "./floorplan";

const API_URL = '/api/FloorplanDevice/';
const API_DT_URL = '/api/FloorplanDevice/filter/';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function generateUUID(): string {
    return uuidv4();
}

export type PathNodeType = {
  id: string;
  posX?: number;
  posY?: number;
  posPxX?: number;
  posPxY?: number;
  deviceId?: string;
};

export type PathsType = {
    id: string,
    fromDeviceId: string,
    toDeviceId: string,
    paths: PathNodeType[],
}

export type GetFilter = {
    Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
    filters: {
        FloorplanId: string[],
        FloorplanMaskedAreaId?: string[],
        Type?: number,
    }
}

export type GetFloorplanDeviceResponse = {
    RecordsTotal: number;
    RecordsFiltered: number;
    Draw: number;
    status: string;
    status_code: number;
    title: string;
    msg: string;
    collection: {
        data: FloorplanDeviceType[];
        draw: number;
        recordsTotal: number;
        recordsFiltered: number;
    };
};

export interface FloorplanDeviceType {
    id: string,
    name: string,
    type: string,
    floorplanId: string,
    accessCctvId: string | null,
    readerId: string | null,
    accessControlId: string | null,
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
    path?: string,
    floorplan?: FloorplanType,
    devicePath?: PathsType[],
    status?:number,
};

interface StateType {
    // Layer 1: Original from DB
    floorplanDeviceAll: FloorplanDeviceType[];
    
    // Layer 2: Applied changes (saved via DeviceDetailList)
    savedFloorplanDevices: FloorplanDeviceType[];
    
    // Layer 3: Current editing changes
    unsavedFloorplanDevices: FloorplanDeviceType[];
    
    // UI state
    floorplanDevices: FloorplanDeviceType[];
    floorplanDeviceSearch: string;
    selectedFloorplanDevice?: FloorplanDeviceType | null;
    editingFloorplanDevice?: FloorplanDeviceType | null;
    drawingDevicePath?: string;
    selectDevicePath?: string;
    
    // Filter and loading state
    floorplanDeviceTotalCount: number;
    floorplanDeviceFilteredCount: number;
    floorplanDeviceFilter: GetFilter;


    lastFilter?: GetFilter;
    isLoading: boolean;
    hasLoaded: boolean;

        //Device to Disable
    deviceToDisable: string[];

};

const initialState: StateType = {
    floorplanDeviceAll: [],
    savedFloorplanDevices: [],
    unsavedFloorplanDevices: [],
    floorplanDevices: [],
    floorplanDeviceSearch: '',
    selectedFloorplanDevice: null,
    editingFloorplanDevice: null,
    drawingDevicePath: '',
    selectDevicePath: '',
    floorplanDeviceTotalCount: 0,
    floorplanDeviceFilteredCount: 0,
    floorplanDeviceFilter: defaultFloorplanDeviceFilter,
    isLoading: false,
    hasLoaded: false,
    deviceToDisable: [],
};

export const FloorplanDeviceSlice = createSlice({
    name: 'floorplanDevice',
    initialState,
    reducers: {
        GetFloorplanDevices: (state, action) => {
            state.floorplanDevices = action.payload;
        },
        
        // Initialize all three layers from DB data
        InitializeAllLayers: (state, action) => {
            const devices = action.payload;
            state.floorplanDeviceAll = [...devices];
            state.savedFloorplanDevices = [...devices];
            state.unsavedFloorplanDevices = [...devices];
        },
        
        // When starting to edit a device, copy from saved to unsaved layer
        StartEditingDevice: (state, action: PayloadAction<string>) => {
            const deviceId = action.payload;
            
            // Find device in saved layer
            const savedDevice = state.savedFloorplanDevices.find(d => d.id === deviceId);
            if (!savedDevice) return;
            
            // Copy to unsaved layer (or update if exists)
            const unsavedIndex = state.unsavedFloorplanDevices.findIndex(d => d.id === deviceId);
            if (unsavedIndex !== -1) {
                state.unsavedFloorplanDevices[unsavedIndex] = { ...savedDevice };
            } else {
                state.unsavedFloorplanDevices.push({ ...savedDevice });
            }
            
            // Set as editing device (from unsaved layer)
            const editingDevice = state.unsavedFloorplanDevices.find(d => d.id === deviceId);
            state.editingFloorplanDevice = editingDevice ? { ...editingDevice } : null;
            state.selectedFloorplanDevice = editingDevice ? { ...editingDevice } : null;
        },

        // Save all device changes from unsaved layer to saved layer
SaveAllDevicesToSavedLayer: (state) => {
    // Update saved layer with all devices from unsaved layer
    state.unsavedFloorplanDevices.forEach(unsavedDevice => {
        const savedIndex = state.savedFloorplanDevices.findIndex(d => d.id === unsavedDevice.id);
        if (savedIndex !== -1) {
            state.savedFloorplanDevices[savedIndex] = { ...unsavedDevice };
        } else {
            state.savedFloorplanDevices.push({ ...unsavedDevice });
        }
    });
    
    // Also update any devices that are in saved but not in unsaved (handle deletions)
    const unsavedDeviceIds = new Set(state.unsavedFloorplanDevices.map(d => d.id));
    state.savedFloorplanDevices = state.savedFloorplanDevices.filter(device => 
        unsavedDeviceIds.has(device.id)
    );
    
    // Update editing and selected devices if they exist
    if (state.editingFloorplanDevice) {
        const updatedEditingDevice = state.unsavedFloorplanDevices.find(
            d => d.id === state.editingFloorplanDevice?.id
        );
        if (updatedEditingDevice) {
            state.editingFloorplanDevice = { ...updatedEditingDevice };
        }
    }
    
    if (state.selectedFloorplanDevice) {
        const updatedSelectedDevice = state.unsavedFloorplanDevices.find(
            d => d.id === state.selectedFloorplanDevice?.id
        );
        if (updatedSelectedDevice) {
            state.selectedFloorplanDevice = { ...updatedSelectedDevice };
        }
    }
},

// Cancel editing for all devices - revert unsaved layer to saved layer
CancelAllDevicesEditing: (state) => {
    // Revert all devices in unsaved layer to their saved state
    const updatedUnsavedDevices: FloorplanDeviceType[] = [];
    
    // For each device in saved layer, copy to unsaved
    state.savedFloorplanDevices.forEach(savedDevice => {
        updatedUnsavedDevices.push({ ...savedDevice });
    });
    
    // For devices that are in unsaved but not in saved (newly added devices), remove them
    const savedDeviceIds = new Set(state.savedFloorplanDevices.map(d => d.id));
    state.unsavedFloorplanDevices.forEach(unsavedDevice => {
        if (!savedDeviceIds.has(unsavedDevice.id)) {
            // This is a newly added device that hasn't been saved yet
            // It will be removed from unsaved layer
        }
    });
    
    // Update unsaved layer
    state.unsavedFloorplanDevices = updatedUnsavedDevices;
    
    // Update editing device if it exists
    if (state.editingFloorplanDevice) {
        const savedEditingDevice = state.savedFloorplanDevices.find(
            d => d.id === state.editingFloorplanDevice?.id
        );
        if (savedEditingDevice) {
            state.editingFloorplanDevice = { ...savedEditingDevice };
        } else {
            // If editing device doesn't exist in saved layer (was newly added), clear editing
            state.editingFloorplanDevice = null;
        }
    }
    
    // Update selected device if it exists
    if (state.selectedFloorplanDevice) {
        const savedSelectedDevice = state.savedFloorplanDevices.find(
            d => d.id === state.selectedFloorplanDevice?.id
        );
        if (savedSelectedDevice) {
            state.selectedFloorplanDevice = { ...savedSelectedDevice };
        } else {
            state.selectedFloorplanDevice = null;
        }
    }
    
    // Clear editing state
    state.editingFloorplanDevice = null;
},
        
        // Save device from unsaved to saved layer (via DeviceDetailList Save)
        SaveDeviceToSavedLayer: (state, action: PayloadAction<FloorplanDeviceType>) => {
            const updatedDevice = action.payload;
            
            // Update in unsaved layer
            const unsavedIndex = state.unsavedFloorplanDevices.findIndex(d => d.id === updatedDevice.id);
            if (unsavedIndex !== -1) {
                state.unsavedFloorplanDevices[unsavedIndex] = { ...updatedDevice };
            } else {
                state.unsavedFloorplanDevices.push({ ...updatedDevice });
            }
            
            // Update in saved layer
            const savedIndex = state.savedFloorplanDevices.findIndex(d => d.id === updatedDevice.id);
            if (savedIndex !== -1) {
                state.savedFloorplanDevices[savedIndex] = { ...updatedDevice };
            } else {
                state.savedFloorplanDevices.push({ ...updatedDevice });
            }
            
            // Update editing device
            if (state.editingFloorplanDevice?.id === updatedDevice.id) {
                state.editingFloorplanDevice = { ...updatedDevice };
            }
            
            // Also update selection if it's the same device
            if (state.selectedFloorplanDevice?.id === updatedDevice.id) {
                state.selectedFloorplanDevice = { ...updatedDevice };
            }
        },
        
        // Cancel editing - revert unsaved device to saved layer
        CancelDeviceEditing: (state, action: PayloadAction<string>) => {
            const deviceId = action.payload;
            
            // Find device in saved layer
            const savedDevice = state.savedFloorplanDevices.find(d => d.id === deviceId);
            if (!savedDevice) return;
            
            // Revert unsaved layer to saved state
            const unsavedIndex = state.unsavedFloorplanDevices.findIndex(d => d.id === deviceId);
            if (unsavedIndex !== -1) {
                state.unsavedFloorplanDevices[unsavedIndex] = { ...savedDevice };
            }
            
            // Clear editing state but keep selection
            state.editingFloorplanDevice = null;
        },
        
        // Add new device to unsaved layer
        AddUnsavedDevice: (state, action: PayloadAction<FloorplanDeviceType>) => {
            state.unsavedFloorplanDevices.push({ ...action.payload });
            
            // Also add to saved layer (for consistency)
            state.savedFloorplanDevices.push({ ...action.payload });
        },
        
        // Edit device in unsaved layer during editing
        EditUnsavedDevice: (state, action: PayloadAction<FloorplanDeviceType>) => {
            const index = state.unsavedFloorplanDevices.findIndex(
                (device) => device.id === action.payload.id
            );
            
            if (index !== -1) {
                state.unsavedFloorplanDevices[index] = {
                    ...state.unsavedFloorplanDevices[index],
                    ...action.payload
                };
                
                // Update editing device
                if (state.editingFloorplanDevice?.id === action.payload.id) {
                    state.editingFloorplanDevice = {
                        ...state.editingFloorplanDevice,
                        ...action.payload
                    };
                }
            }
        },
        
        // Update device position
        editDevicePosition: (state, action: PayloadAction<FloorplanDeviceType>) => {
            const index = state.unsavedFloorplanDevices.findIndex((device) => device.id === action.payload.id);
            if (index !== -1) {
                state.unsavedFloorplanDevices[index] = {
                    ...state.unsavedFloorplanDevices[index],
                    floorplanMaskedAreaId: action.payload.floorplanMaskedAreaId,
                    deviceStatus: action.payload.deviceStatus,
                    posX: action.payload.posX,
                    posY: action.payload.posY,
                    posPxX: action.payload.posPxX,
                    posPxY: action.payload.posPxY
                };

                if (state.editingFloorplanDevice?.id === action.payload.id) {
                    state.editingFloorplanDevice = {
                        ...state.editingFloorplanDevice,
                        floorplanMaskedAreaId: action.payload.floorplanMaskedAreaId,
                        deviceStatus: action.payload.deviceStatus,
                        posX: action.payload.posX,
                        posY: action.payload.posY,
                        posPxX: action.payload.posPxX,
                        posPxY: action.payload.posPxY
                    };
                }
            }
        },
        
        // Delete device from unsaved layer
        DeleteUnsavedDevice: (state, action: PayloadAction<string>) => {
            const index = state.unsavedFloorplanDevices.findIndex(
                (device) => device.id === action.payload
            );
        
            if (index !== -1) {
                state.unsavedFloorplanDevices.splice(index, 1);
                
                // Also remove from saved layer if it was a newly added device
                const savedIndex = state.savedFloorplanDevices.findIndex(d => d.id === action.payload);
                if (savedIndex !== -1) {
                    const originalIndex = state.floorplanDeviceAll.findIndex(d => d.id === action.payload);
                    if (originalIndex === -1) {
                        // This was a newly added device, remove from saved layer too
                        state.savedFloorplanDevices.splice(savedIndex, 1);
                    }
                }
                
                // Clear selection if it's the deleted device
                if (state.selectedFloorplanDevice?.id === action.payload) {
                    state.selectedFloorplanDevice = null;
                }
                
                // Clear editing if it's the deleted device
                if (state.editingFloorplanDevice?.id === action.payload) {
                    state.editingFloorplanDevice = null;
                }
            }
        },
        
        // Select device for viewing
        SelectFloorplanDevice: (state, action) => {
            const selected = state.unsavedFloorplanDevices.find(
                (floorplanDevice: FloorplanDeviceType) => floorplanDevice.id === action.payload
            );
            state.selectedFloorplanDevice = selected || null;
        },
        
        // Select device for editing
        SelectEditingFloorplanDevice: (state, action: PayloadAction<FloorplanDeviceType | null>) => {
            state.editingFloorplanDevice = action.payload || null;
        },
        
        SearchFloorplanDevice: (state, action) => {
            state.floorplanDeviceSearch = action.payload;
        },
        
        // Start drawing a path
        DrawingDevicePath: (state, action: PayloadAction<string>) => {
            state.drawingDevicePath = action.payload;
        },
        
        // Add path pair to unsaved layer (affects both devices)
        AddPathPairToUnsaved: (state, action: PayloadAction<{
            forward: { deviceId: string; paths: PathNodeType[] };
            backward: { deviceId: string; paths: PathNodeType[] };
        }>) => {
            const { forward, backward } = action.payload;
            const pairingId = generateUUID();
            
            // Helper to add path to device in unsaved layer
            const addPathToDevice = (fromDeviceId: string, toDeviceId: string, paths: PathNodeType[]) => {
                const deviceIndex = state.unsavedFloorplanDevices.findIndex(d => d.id === fromDeviceId);
                if (deviceIndex === -1) return;
                
                const device = state.unsavedFloorplanDevices[deviceIndex];
                const newPath: PathsType = {
                    id: pairingId,
                    fromDeviceId,
                    toDeviceId,
                    paths,
                };
                
                // Check if path already exists
                const existingPathIndex = device.devicePath?.findIndex(p => p.id === pairingId) ?? -1;
                let updatedDevicePath: PathsType[];
                
                if (existingPathIndex !== -1 && device.devicePath) {
                    // Replace existing path
                    updatedDevicePath = [...device.devicePath];
                    updatedDevicePath[existingPathIndex] = newPath;
                } else {
                    // Add new path
                    updatedDevicePath = [...(device.devicePath || []), newPath];
                }
                
                const updatedDevice = {
                    ...device,
                    devicePath: updatedDevicePath,
                    path: JSON.stringify(updatedDevicePath),
                };
                
                state.unsavedFloorplanDevices[deviceIndex] = updatedDevice;
                
                // Update editing device if it's this one
                if (state.editingFloorplanDevice?.id === fromDeviceId) {
                    state.editingFloorplanDevice = updatedDevice;
                }
            };
            
            // Add paths to both devices
            addPathToDevice(forward.deviceId, backward.deviceId, forward.paths);
            addPathToDevice(backward.deviceId, forward.deviceId, backward.paths);
        },
        
        // Remove path pair from unsaved layer
        RemovePathPairFromUnsaved: (state, action: PayloadAction<string>) => {
            const pathId = action.payload;
            
            // Find devices that have this path
            const devicesWithPath = state.unsavedFloorplanDevices.filter(
                device => device.devicePath?.some(path => path.id === pathId)
            );
            
            // Remove path from each device
            devicesWithPath.forEach(device => {
                const deviceIndex = state.unsavedFloorplanDevices.findIndex(d => d.id === device.id);
                if (deviceIndex !== -1) {
                    const updatedDevicePath = device.devicePath?.filter(path => path.id !== pathId) || [];
                    
                    const updatedDevice = {
                        ...device,
                        devicePath: updatedDevicePath,
                        path: JSON.stringify(updatedDevicePath),
                    };
                    
                    state.unsavedFloorplanDevices[deviceIndex] = updatedDevice;
                    
                    // Update editing device if it's this one
                    if (state.editingFloorplanDevice?.id === device.id) {
                        state.editingFloorplanDevice = updatedDevice;
                    }
                }
            });
        },
        
        // Update device path (for backward compatibility)
        editDevicePath: (state, action: PayloadAction<FloorplanDeviceType>) => {
            const index = state.unsavedFloorplanDevices.findIndex(
                (device) => device.id === action.payload.id
            );

            if (index !== -1) {
                state.unsavedFloorplanDevices[index] = {
                    ...state.unsavedFloorplanDevices[index],
                    path: action.payload.path,
                    devicePath: action.payload.devicePath,
                };

                if (state.editingFloorplanDevice?.id === action.payload.id) {
                    state.editingFloorplanDevice = {
                        ...state.editingFloorplanDevice,
                        path: action.payload.path,
                        devicePath: action.payload.devicePath,
                    };
                }
            }
        },
        
        // Select a specific path for highlighting
        selectDevicePath: (state, action: PayloadAction<string>) => {
            state.selectDevicePath = action.payload;
        },
        
        // Apply all unsaved changes to saved layer (via main Save in DeviceList)
        ApplyUnsavedToSaved: (state) => {
            // Update saved layer from unsaved layer
            state.unsavedFloorplanDevices.forEach(unsavedDevice => {
                const savedIndex = state.savedFloorplanDevices.findIndex(d => d.id === unsavedDevice.id);
                if (savedIndex !== -1) {
                    state.savedFloorplanDevices[savedIndex] = { ...unsavedDevice };
                } else {
                    state.savedFloorplanDevices.push({ ...unsavedDevice });
                }
            });
            
            // Also update original layer
            state.floorplanDeviceAll = [...state.savedFloorplanDevices];
        },
        
        // Reset all editing state
        ResetState: (state) => {
            state.selectedFloorplanDevice = null;
            state.editingFloorplanDevice = null;
            state.drawingDevicePath = '';
            state.selectDevicePath = '';
        },

        //Device to Disable
        addDeviceToDisable: (state, action: PayloadAction<string>) => {
            state.deviceToDisable.push(action.payload);
            console.log("Device to Disable: ", action.payload);
        },
        removeDeviceToDisable: (state, action: PayloadAction<string>) => {
            state.deviceToDisable = state.deviceToDisable.filter((device) => device !== action.payload);
        },
    },

    extraReducers: (builder) => {
        builder
            .addCase(addFloorplanDevice.fulfilled, (state, action) => {
                state.floorplanDeviceAll.push(action.payload);
            })
            .addCase(addFloorplanDevice.rejected, (_state, action) => {
                console.error("Add floorplan device failed: ", action.payload);
            })
            .addCase(editFloorplanDevice.fulfilled, (state, action) => {
                const index = state.floorplanDeviceAll.findIndex((device) => device.id === action.payload.id);
                if (index !== -1) {
                    state.floorplanDeviceAll[index] = action.payload;
                }
            })
            .addCase(editFloorplanDevice.rejected, (_state, action) => {
                console.error("Edit floorplan device failed: ", action.payload);
            })
            .addCase(deleteFloorplanDevice.fulfilled, (state, action) => {
                state.floorplanDeviceAll = state.floorplanDeviceAll.filter((device) => device.id !== action.payload.id);
            })
            .addCase(deleteFloorplanDevice.rejected, (_state, action) => {
                console.error("Delete floorplan device failed: ", action.payload);
            })
            .addCase(fetchFloorplanDeviceDT.pending, (state, action) => {
                const newFilter = action.meta.arg as GetFilter;
                const prevFilter = state.lastFilter;
    
                // If no previous filter (first load), always reset
                if (!prevFilter) {
                    state.isLoading = true;
                    state.hasLoaded = false;
                    return;
                }
    
                // Detect only sorting change
                const onlySortingChanged =
                    prevFilter.SortColumn !== newFilter.SortColumn ||
                    prevFilter.SortDir !== newFilter.SortDir;
    
                const filtersUnchanged =
                    JSON.stringify({
                    ...prevFilter,
                    SortColumn: undefined,
                    SortDir: undefined,
                    }) ===
                    JSON.stringify({
                    ...newFilter,
                    SortColumn: undefined,
                    SortDir: undefined,
                    });
    
                const isOnlySortChange = onlySortingChanged && filtersUnchanged;
    
                // ✅ If sorting only, keep hasLoaded true
                state.isLoading = true;
                if (!isOnlySortChange) {
                    state.hasLoaded = false;
                }
            })
            .addCase(fetchFloorplanDeviceDT.fulfilled, (state, action) => {
                state.floorplanDeviceTotalCount = action.payload.recordsTotal;
                state.floorplanDeviceFilteredCount = action.payload.recordsFiltered;
                state.isLoading = false;
                state.hasLoaded = true;
                state.lastFilter = { ...state.floorplanDeviceFilter };
            })
            .addCase(fetchFloorplanDeviceDT.rejected, (_state, action) => {
                console.error("Fetch floorplan device DT failed: ", action.payload);
                _state.floorplanDeviceFilteredCount = 0;
                _state.isLoading = false;
                _state.hasLoaded = false;
            })
    },
});

export const {
    GetFloorplanDevices,
    InitializeAllLayers,
    StartEditingDevice,
    SaveAllDevicesToSavedLayer,
    CancelAllDevicesEditing,
    SaveDeviceToSavedLayer,
    CancelDeviceEditing,
    AddUnsavedDevice,
    EditUnsavedDevice,
    editDevicePosition,
    DeleteUnsavedDevice,
    SelectFloorplanDevice,
    SelectEditingFloorplanDevice,
    SearchFloorplanDevice,
    DrawingDevicePath,
    AddPathPairToUnsaved,
    RemovePathPairFromUnsaved,
    editDevicePath,
    selectDevicePath,
    ApplyUnsavedToSaved,
    ResetState,
    addDeviceToDisable,
    removeDeviceToDisable,
} = FloorplanDeviceSlice.actions;

export const fetchFloorplanDevices = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
        const devices = response.data?.collection?.data || [];
        dispatch(InitializeAllLayers(devices));
    } catch (error) {
        console.error("Error fetching floorplan devices: ", error);
    }    
};

export const fetchFloorplanDeviceDT = createAsyncThunk(
    'floorplanDevice/fetchFloorplanDeviceDT',
    async (filter: any, { rejectWithValue }) => {
        const started = Date.now();
        try {
            if (
                filter?.filters &&
                Object.values(filter.filters).some(
                    (arr: any) => Array.isArray(arr) && arr.includes("Empty")
                )
            ) {
                const elapsed = Date.now() - started;
                if (elapsed < 500) await delay(500 - elapsed);
                return rejectWithValue("Filter contains 'Empty', skipping request");
            }
            
            const response = await axiosServices.post(API_DT_URL, filter);
            dispatch(GetFloorplanDevices(response.data.collection.data || []));
            
            const elapsed = Date.now() - started;
            if (elapsed < 500) await delay(500 - elapsed);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching floorplan devices:", error);
            const elapsed = Date.now() - started;
            if (elapsed < 500) await delay(500 - elapsed);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export const addFloorplanDevice = createAsyncThunk(
    'floorplanDevice/addFloorplanDevice',
    async (floorplanDevice: FloorplanDeviceType, { rejectWithValue }) => {
        const started = Date.now();
        try {
            const { id, createdAt, createdBy, updatedAt, updatedBy, accessCctv, reader, accessControl, floorplanMaskedArea, ...filteredFloorplanDevice } = floorplanDevice;
            
            const response = await axiosServices.post(API_URL, filteredFloorplanDevice);
            
            const elapsed = Date.now() - started;
            if (elapsed < 500) await delay(500 - elapsed);
            return response.data;
        } catch (error: any) {
            console.error("Error adding floorplan device: ", error);
            const elapsed = Date.now() - started;
            if (elapsed < 500) await delay(500 - elapsed);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export const editFloorplanDevice = createAsyncThunk(
    'floorplanDevice/editFloorplanDevice',
    async (floorplanDevice: FloorplanDeviceType, { rejectWithValue }) => {
        const started = Date.now();
        try {
            const { id, createdAt, createdBy, updatedAt, updatedBy, accessCctv, reader, accessControl, floorplanMaskedArea, ...filteredFloorplanDevice } = floorplanDevice;
            
            const response = await axiosServices.put(`${API_URL}${floorplanDevice.id}`, filteredFloorplanDevice);
            
            const elapsed = Date.now() - started;
            if (elapsed < 500) await delay(500 - elapsed);
            return response.data;
        } catch (error: any) {
            console.error("Error editing floorplan device: ", error);
            const elapsed = Date.now() - started;
            if (elapsed < 500) await delay(500 - elapsed);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export const deleteFloorplanDevice = createAsyncThunk(
    'floorplanDevice/deleteFloorplanDevice',
    async (id: string, { rejectWithValue }) => {
        const started = Date.now();
        try {
            const response = await axiosServices.delete(`${API_URL}${id}`);
            
            const elapsed = Date.now() - started;
            if (elapsed < 500) await delay(500 - elapsed);
            return response.data;
        } catch (error: any) {
            console.error("Error deleting floorplan device: ", error);
            const elapsed = Date.now() - started;
            if (elapsed < 500) await delay(500 - elapsed);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export default FloorplanDeviceSlice.reducer;