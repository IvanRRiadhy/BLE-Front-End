import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { defaultBleReaderFilter } from "../defaultForm";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";
import { BASE_URL } from "../../../utils/axios";
const API_URL = "/api/MstBleReader/";
const API_DT_URL = "/api/MstBleReader/filter/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
    filters: {
        BrandId: string[],
        EngineReaderId: string[],
    }
}


export type GetBleReaderResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : bleReaderType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

export interface bleReaderType {
    id: string,
    brandId: string,
    name: string,
    gmac: string,
    ip: string,
    readerType: 'Outdoor' | 'Indoor',
    measuredPower: number,
    pathLossExponent: number,
    heightMeter: number,
    forceReading: boolean,
    forceRadiusThreshold: number,
    forceRadiusMeter: number,
    // engineReaderId: string,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string,
}

interface StateType {
    bleReaders: bleReaderType[];
    bleReaderAll: bleReaderType[];
    unsavedReaders: bleReaderType[];
    bleReaderSearch: string;
    selectedBleReader?: bleReaderType | null;
    editedBleReader?: string;
    bleReaderTotalCount: number;
    bleReaderFilterCount: number;
    bleReaderFilter: GetFilter;
    lastFilter?: GetFilter;
    isLoading: boolean;
    hasLoaded: boolean;
}

const initialState: StateType = {
    bleReaders: [],
    bleReaderAll: [],
    unsavedReaders: [],
    bleReaderSearch: "",
    selectedBleReader: null,
    editedBleReader: "",
    bleReaderTotalCount: 0,
    bleReaderFilterCount: 0,
    bleReaderFilter: defaultBleReaderFilter,
    isLoading: false,
    hasLoaded: false,
};

export const BleReaderSlice = createSlice({
    name: "bleReaders",
    initialState,
    reducers: {
        GetBleReader: (state, action: PayloadAction<bleReaderType[]>) => {
            state.bleReaders = action.payload;
            state.unsavedReaders = action.payload;
        },
        GetAllBleReader: (state, action: PayloadAction<bleReaderType[]>) => {
          state.bleReaderAll = action.payload;  
        },
        // SetBleReaderCount: (state, action: PayloadAction<number[]>) => {
        //     state.bleReaderTotalCount = action.payload[0];
        //     state.bleReaderFilterCount = action.payload[1];
        // },
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
UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
    // console.log("UpdateFilter: ", action.payload);
  state.bleReaderFilter = { ...state.bleReaderFilter, ...action.payload };
}

    },
    extraReducers: (builder) => {
        builder
        .addCase(addBleReader.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(addBleReader.fulfilled, (state, action) => {
            state.bleReaders.push(action.payload);
            state.isLoading = false;
        })
        .addCase(addBleReader.rejected, (_state, action) => {
            console.error("Add bleReader failed: ", action.payload);
            _state.isLoading = false;
        })
        .addCase(editBleReader.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(editBleReader.fulfilled, (state, action) => {
            const index = state.bleReaders.findIndex((bleReader) => bleReader.id === action.payload.id);
            if(index !== -1) {
                state.bleReaders[index] = action.payload;
                state.selectedBleReader = action.payload;
            }
            state.isLoading = false;
        })
        .addCase(editBleReader.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
            _state.isLoading = false;
        })
        .addCase(deleteBleReader.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(deleteBleReader.fulfilled, (state, action) => {
            state.bleReaders = state.bleReaders.filter(bleReader => bleReader.id !== action.payload);
            if (state.selectedBleReader?.id === action.payload) {
                state.selectedBleReader = null;
            }
            state.isLoading = false;
        })
        .addCase(deleteBleReader.rejected, (_state, action) => {
            console.error("Delete failed: ", action.payload);
            _state.isLoading = false;
        })
        .addCase(fetchBleReaderDT.pending, (state, action) => {
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
        .addCase(fetchBleReaderDT.fulfilled, (state, action) => {
            // console.log("Ble reader DT: ", action.payload.recordsTotal);
    state.bleReaderTotalCount = action.payload.recordsTotal;
    state.bleReaderFilterCount = action.payload.recordsFiltered;
            state.isLoading = false;
            state.hasLoaded = true;
            state.lastFilter = { ...state.bleReaderFilter };
  })
  .addCase(fetchBleReaderDT.rejected, (_state, action) => {
            console.error("Error fetching bleReaders: ", action.payload);
            _state.bleReaderFilterCount = 0;
            _state.isLoading = false;
            _state.hasLoaded = false;
        });
    },
});




export const {
    GetBleReader,
    GetAllBleReader,
    SelectBleReader,
    SearchBleReader,
    SetEditBleReader,
    UpdateBleReader,
    RevertBleReader,
    UpdateFilter,
} = BleReaderSlice.actions;

export const fetchBleReaders = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
        dispatch(GetAllBleReader(response.data?.collection?.data || []));

        // console.log("Ble reader: ", response.data?.collection?.data || []);
    } catch (error) {
        console.log(error);
    }
}

export const fetchBleReaderDT = createAsyncThunk(
  "bleReaders/fetchBleReaderDT",
    async (filter: any, thunkAPI) => {
        const started = Date.now();
    const res = await retryUntilSuccess(
      () => axiosServices.post(API_DT_URL, filter),
      {
        signal: thunkAPI.signal,     
        timeoutMs: 2 * 60 * 1000,    
        minDelay: 500,
        maxDelay: 8000,
      }
    );
    console.log("Ble Reader: ", res);
    dispatch(GetBleReader(res.data.collection.data || []));
    await ensureMinLatency(started, 500);
    return res.data.collection;
  }
);


export const addBleReader = createAsyncThunk(
    "bleReaders/addBleReader",
    async (newBleReader: bleReaderType, { rejectWithValue }) => {
        const started = Date.now();
        try {
            const {id, createdBy, createdAt, updatedBy, updatedAt, ...filteredBleReaderData} = newBleReader
            const response = await axiosServices.post(API_URL, filteredBleReaderData);
                    const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return response.data;
        } catch (error: any) {
            console.error("Error adding bleReader:", error);
                    const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    },
);

export const editBleReader = createAsyncThunk(
    "bleReaders/editBleReader",
    async (updateBleReader: bleReaderType, {rejectWithValue}) => {
        const started = Date.now();
        try {
            const { id, createdBy, createdAt, updatedBy, updatedAt, ...filteredBleReaderData } = updateBleReader;
            const response = await axiosServices.put(`${API_URL}${id}`, filteredBleReaderData);
                    const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return response.data;
        } catch (error: any) {
            console.error("Error editing bleReader:", error);
                    const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    },
);

export const deleteBleReader = createAsyncThunk(
    "bleReaders/deleteBleReader",
    async (bleReaderId: string, { rejectWithValue }) => {
        const started = Date.now();
        try {
            await axiosServices.delete(`${API_URL}${bleReaderId}`);
                    const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return bleReaderId; // Return the deleted bleReader's ID to update the state
        } catch (error: any) {
            console.error("Error deleting bleReader:", error);
                    const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    },
);

export const ImportBleReader = createAsyncThunk(
    "bleReaders/importBleReader",
    async (formData: FormData, { rejectWithValue }) => {
        try {
            const response = await axiosServices.post(`${API_URL}import`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data
        } catch (error: any) {
            console.error("Error importing bleReader:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

export const ExportBleReader = createAsyncThunk(
  "bleReaders/ExportBleReader",
  async (filter: 'pdf' | 'excel', { rejectWithValue }) => {
    const url = `${BASE_URL}${API_URL}export/${filter}`;
    const accessToken = localStorage.getItem('token');
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-BIOPEOPLETRACKING-API-KEY':
            'FujDuGTsyEXVwkKrtRgn52APwAVRGmPOiIRX8cffynDvIW35bJaGeH3NcH6HcSeK',
        },
      });
      console.log("Export response: ", response);
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filter === 'pdf' ? 'bleReader.pdf' : 'bleReader.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      return true; // Indicate success
    } catch (error: any) {
      console.error("Error exporting bleReader:", error);
      return rejectWithValue(error.message || "Unknown error");
    }
  }
);

export default BleReaderSlice.reducer;