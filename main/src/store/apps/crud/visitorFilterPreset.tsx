import axiosServices from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { dispatch } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { ensureMinLatency, retryUntilSuccess } from 'src/utils/retry';

const API_URL = '/api/VisitorFilterPreset/';
const API_DT_URL = '/api/VisitorFilterPreset/filter/';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type GetFilter = {
  Draw: number;
  Start: number;
  Length: number;
  SortColumn: string;
  SortDir: 'asc' | 'desc';
  SearchValue: string;
};

export type GetVisitorFilterPreset = {
  RecordsTotal: number;
  RecordsFiltered: number;
  Draw: number;
  status: string;
  status_code: number;
  title: string;
  msg: string;
  collection: {
    data: VisitorFilterPresetType[];
    draw: number;
    recordsTotal: number;
    recordsFiltered: number;
  };
};

export type VisitorFilterPresetType = {
  id: string;
  name: string;
  timeRange: string;
  fromDate: string | null;
  toDate: string | null;
  areaId?: string | null;
  floorplanId?: string | null;
  floorId?: string | null;
  buildingId?: string | null;
  hostName?: string | null;
  visitorId?: string | null;
  memberId?: string | null;
  areaIds?: string[];
  floorplanIds?: string[];
  floorIds?: string[];
  buildingIds?: string[];
  visitorIds?: string[];
  memberIds?: string[];
};

interface StateType {
  visitorFilterPresets: VisitorFilterPresetType[];
  visitorFilterPresetAll: VisitorFilterPresetType[];
  visitorFilterPresetSearch: string;
  selectedVisitorFilterPreset?: VisitorFilterPresetType | null;
  visitorFilterPresetTotalCount: number;
  visitorFilterPresetFilteredCount: number;
  visitorFilterPresetFilter: GetFilter;
  lastFilter?: GetFilter;
  isLoading: boolean;
  hasLoaded: boolean;
}

const initialState: StateType = {
  visitorFilterPresets: [],
  visitorFilterPresetAll: [],
  visitorFilterPresetSearch: '',
  selectedVisitorFilterPreset: null,
  visitorFilterPresetTotalCount: 0,
  visitorFilterPresetFilteredCount: 0,
  visitorFilterPresetFilter: {
    Draw: 0,
    Start: 0,
    Length: 10,
    SortColumn: 'name',
    SortDir: 'asc',
    SearchValue: '',
  },
  isLoading: false,
  hasLoaded: false,
};

export const VisitorFilterPresetSlice = createSlice({
  name: 'VisitorFilterPreset',
  initialState,
  reducers: {
    GetVisitorFilterPreset: (state, action: PayloadAction<VisitorFilterPresetType[]>) => {
      state.visitorFilterPresets = action.payload;
    },
    GetAllVisitorFilterPreset: (state, action: PayloadAction<VisitorFilterPresetType[]>) => {
      state.visitorFilterPresetAll = action.payload;
    },
    SetVisitorFilterPresetSearch: (state, action: PayloadAction<string>) => {
      state.visitorFilterPresetSearch = action.payload;
    },
    UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
      state.visitorFilterPresetFilter = { ...state.visitorFilterPresetFilter, ...action.payload };
    },
    SetSelectedVisitorFilterPreset: (
      state,
      action: PayloadAction<VisitorFilterPresetType | null>,
    ) => {
      state.selectedVisitorFilterPreset = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVisitorFilterPresetDT.fulfilled, (state, action) => {
        const { data, recordsTotal, recordsFiltered } = action.payload;
        state.visitorFilterPresets = data;
        state.visitorFilterPresetTotalCount = recordsTotal;
        state.visitorFilterPresetFilteredCount = recordsFiltered;
        state.hasLoaded = true;
        state.isLoading = false;
      })
      .addCase(fetchVisitorFilterPresetDT.pending, (state, action) => {
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
      .addCase(fetchVisitorFilterPresetDT.rejected, (state, action) => {
        state.visitorFilterPresetTotalCount = 0;
        state.visitorFilterPresetFilteredCount = 0;
        state.hasLoaded = false;
        state.isLoading = false;
      })
  },
});

export const {
  GetVisitorFilterPreset,
  GetAllVisitorFilterPreset,
  SetVisitorFilterPresetSearch,
  UpdateFilter,
  SetSelectedVisitorFilterPreset,
} = VisitorFilterPresetSlice.actions;

export const fetchVisitorFilterPreset = () => async (dispatch: any) => {
  try {
    const response = await axiosServices.get(API_URL);
    dispatch(GetAllVisitorFilterPreset(response.data.collection.data || []));
  } catch (error) {
    console.error('Error fetching visitor filter presets:', error);
  }
};

export const fetchVisitorFilterPresetDT = createAsyncThunk(
  'visitorFilterPreset/fetchVisitorFilterPresetDT',
  async (filter: GetFilter, thunkAPI) => {
    const started = Date.now();
    const res = await retryUntilSuccess(() => axiosServices.post(API_DT_URL, filter), {
      signal: thunkAPI.signal,
      timeoutMs: 2 * 60 * 1000,
      minDelay: 500,
      maxDelay: 8000,
    });
    console.log('res: ', res.data);
    // dispatch(GetVisitorFilterPreset(res.data.collection.data || []));
    await ensureMinLatency(started, 500);
    return res.data.collection;
  },
);

export const addVisitorFilterPreset = createAsyncThunk(
  'visitorFilterPreset/addVisitorFilterPreset',
  async (visitorFilterPreset: VisitorFilterPresetType) => {
    const started = Date.now();
    try {
      const { id, ...filteredVisitorFilterPresetData } = visitorFilterPreset;
      const response = await axiosServices.post(API_URL, filteredVisitorFilterPresetData);
      const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
      return response.data;
    } catch (error) {
      console.error('Error adding visitor filter preset:', error);
      const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
      throw error;
    }
  },
);

export const deleteVisitorFilterPreset = createAsyncThunk(
  'visitorFilterPreset/deleteVisitorFilterPreset',
  async (visitorFilterPresetId: string) => {
    const started = Date.now();
    try {
      await axiosServices.delete(`${API_URL}${visitorFilterPresetId}`);
      const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
      return visitorFilterPresetId; // Return the deleted visitor filter preset's ID to update the state
    } catch (error) {
      console.error('Error deleting visitor filter preset:', error);
      const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
      throw error;
    }
  },
);

export default VisitorFilterPresetSlice.reducer;