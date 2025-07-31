import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { defaultFloorFilter } from "../defaultForm";

const API_URL = "/api/MstFloor/";
const API_DT_URL = "/api/MstFloor/filter/";

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    searchValue: string,
    filters: {
        BuildingId: string[],
    }
}


export type GetFloorResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : floorType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

export interface floorType {
    id: string,
    buildingId: string,
    name: string,
    floorImage: string,
    pixelX: number,
    pixelY: number,
    floorX: number,
    floorY: number,
    meterPerPx: number,
    engineFloorId: number,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string,
}

interface StateType {
    floors: floorType[];
    floorAll: floorType[];
    floorSearch: string;
    selectedFloor?: floorType | null;
    floorTotalCount: number;
    floorFilteredCount: number;
    floorFilter: GetFilter;
}

const initialState: StateType = {
    floors: [],
    floorAll: [],
    floorSearch: "",
    selectedFloor: null,
    floorTotalCount: 0,
    floorFilteredCount: 0,
    floorFilter: defaultFloorFilter,
};

export const FloorSlice = createSlice({
    name: "floors",
    initialState,

    reducers: {
        GetFloor: (state, action: PayloadAction<floorType[]>) => {
            state.floors = action.payload;
            // console.log('Floors fetched:', JSON.stringify(state.floors, null, 2));
        },
        GetAllFloor: (state, action: PayloadAction<floorType[]>) => {
            state.floorAll = action.payload;
        },
        SelectFloor: (state, action: PayloadAction<string>) => {
            const selected = state.floors.find((floor: floorType) => floor.id === action.payload);
            state.selectedFloor = selected || null;
        },
        SearchFloor: (state, action: PayloadAction<string>) => {
            state.floorSearch = action.payload;
        },
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.floorFilter = { ...state.floorFilter, ...action.payload };
        }
    },

    extraReducers: (builder) => {
        builder
            .addCase(addFloor.fulfilled, (state, action) => {
                state.floors.push(action.payload);
            })
            .addCase(addFloor.rejected, (_state, action) => {
                console.error("Add floor failed: ", action.payload);
            })
            .addCase(editFloor.fulfilled, (state, action) => {
                const index = state.floors.findIndex((floor) => floor.id === action.payload.id);
                if (index !== -1) {
                    state.floors[index] = action.payload;
                    state.selectedFloor = action.payload;
                }
            })
            .addCase(editFloor.rejected, (_state, action) => {
                console.error("Update failed: ", action.payload);
            })
            .addCase(deleteFloor.fulfilled, (state, action) => {
                state.floors = state.floors.filter(floor => floor.id !== action.payload);
                if (state.selectedFloor?.id === action.payload) {
                    state.selectedFloor = null;
                }
            })
            .addCase(deleteFloor.rejected, (_state, action) => {
                console.error("Delete failed: ", action.payload);
            })
            .addCase(fetchFloorDT.fulfilled, (state, action) => {
                state.floorTotalCount = action.payload.recordsTotal;
                state.floorFilteredCount = action.payload.recordsFiltered;
            })
        }
});

export const {
    GetFloor,
    GetAllFloor,
    SelectFloor,
    SearchFloor,
    UpdateFilter
} = FloorSlice.actions;

export const fetchFloors = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL)
        dispatch(GetAllFloor(response.data?.collection?.data || []));
        // console.log("Fetch Floors",response.data?.collection?.data || []);
    } catch (error) {
        console.log(error);
    }
}

export const fetchFloorDT = createAsyncThunk(
    "floors/fetchFloorDT",
    async (filter: any, { rejectWithValue }) => {
        try {
            console.log("Fetch Floor DT: ", filter);
            const response = await axiosServices.post(API_DT_URL, filter);
            dispatch(GetFloor(response.data.collection.data || []));
            console.log("Fetch floors", response.data.collection);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching floors:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

export const addFloor = createAsyncThunk("floors/addFloor", async (formData: FormData, { rejectWithValue }) => {
    try {
        for (const [key, value] of formData.entries()) {
  console.log(`${key}:`, value);
}
        const response = await axiosServices.post(API_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error: any) {
        console.error("Error adding floor:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const editFloor = createAsyncThunk("floors/editFloor", async (formData: FormData, { rejectWithValue }) => {
    try {
        const id = formData.get('id'); // Extract ID from FormData
        console.log("Form Data", JSON.stringify(Object.fromEntries(formData.entries())));
        formData.delete('id'); // Remove ID from FormData to avoid sending it again
        const response = await axiosServices.put(`${API_URL}${id}`, formData,{
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error: any) {
        console.error("Error editing floor:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteFloor = createAsyncThunk("floors/deleteFloor", async (floorId: string, { rejectWithValue }) => {
    try {
        await axiosServices.delete(`${API_URL}${floorId}`);
        return floorId; // Return the deleted floor's ID to update the state
    } catch (error: any) {
        console.error("Error deleting floor:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const ImportFloor = createAsyncThunk(
    "floors/importFloor",
    async (formData: FormData, { rejectWithValue }) => {
        try {
            const response = await axiosServices.post(`${API_URL}import`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error: any) {
            console.error("Error importing floor:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export const ExportFloor = createAsyncThunk(
    "floors/exportFloor",
    async (filter: "pdf" | "excel", { rejectWithValue }) => {
        const url = `http://192.168.1.116:5000${API_URL}export/${filter}`;
        const accessToken = localStorage.getItem("token");
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers:{
          'Authorization': `Bearer ${accessToken}`,
          'X-API-KEY-TRACKING-PEOPLE':
            'FujDuGTsyEXVwkKrtRgn52APwAVRGmPOiIRX8cffynDvIW35bJaGeH3NcH6HcSeK',
        },
            });
            if(!response.ok) throw new Error('Export failed');
            console.log('Response content-type:', response.headers.get('content-type'));

                  const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filter === 'pdf' ? 'floors.pdf' : 'floors.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      return true; // Indicate success
        }catch (error: any) {
      console.error("Error exporting floors:", error);
      return rejectWithValue(error.message || "Unknown error");
    }
    }
);

export default FloorSlice.reducer;