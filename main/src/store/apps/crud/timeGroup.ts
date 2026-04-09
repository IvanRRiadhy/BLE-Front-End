import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";
import { uniqueId } from "lodash";

const API_DT_URL = "/api/TimeGroup/filter/";
const API_URL = "/api/TimeGroup/";
const API_URL_TIME_BLOCK = "/api/TimeBlock/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
    filters?: {
      ScheduleType?: string;
      id?:string[];
    };
}

export type TimeBlockType = {
  id?: string;
  dayOfWeek: "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
  startTime: string;   // "HH:mm:ss"
  endTime: string;     // "HH:mm:ss"
};

export type TimeGroupType = {
  id: string; 
  name: string;
  description: string;
  scheduleType: "Shift" | "Patrol"
  timeBlocks: TimeBlockType[];
  cardAccessIds: string[];
};

interface StateType {
    timeGroups: TimeGroupType[],
    timeGroupAll: TimeGroupType[],
    timeGroupTotalCount: number,
    timeGroupFilteredCount: number,
    timeGroupFilter: GetFilter,
    lastFilter?: GetFilter;
    isLoading: boolean,
    hasLoaded: boolean,
    selectedTimeGroup: TimeGroupType | null,
    isNewTimeGroup: boolean,
}

const initialState: StateType = {
    timeGroups: [],
    timeGroupAll: [],
    timeGroupTotalCount: 0,
    timeGroupFilteredCount: 0,
    timeGroupFilter: { Draw: 0, Start: 0, Length: 10, SortColumn: '', SortDir: 'asc', SearchValue: '' },
    isLoading: false,
    hasLoaded: true,
    selectedTimeGroup: null,
    isNewTimeGroup: false,
};

export const TimeGroupSlice = createSlice({
    name: "timeGroups",
    initialState,
  reducers: {
    GetTimeGroups: (state, action: PayloadAction<TimeGroupType[]>) => {
      state.timeGroups = action.payload;
    },
    GetAllTimeGroups: (state, action: PayloadAction<TimeGroupType[]>) => {
      state.timeGroupAll = action.payload;
    },
    UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
      state.timeGroupFilter = { ...state.timeGroupFilter, ...action.payload };
    },
    SelectTimeGroup: (state, action: PayloadAction<TimeGroupType>) => {
      state.selectedTimeGroup = action.payload;
    },
AddNewTimeGroup: (state, action: PayloadAction<TimeGroupType>) => {
  const newGroup = {
    ...action.payload,
    id: `temp-${uniqueId()}`, // give it a temp id
  };
  state.timeGroups.push(newGroup);
  state.selectedTimeGroup = newGroup;
  state.isNewTimeGroup = true;
},
CancelNewTimeGroup: (state) => {
  if (state.isNewTimeGroup && state.selectedTimeGroup) {
    // remove by id instead of object reference
    state.timeGroups = state.timeGroups.filter(
      (tg) => tg.id !== state.selectedTimeGroup?.id
    );
    state.selectedTimeGroup = null;
    state.isNewTimeGroup = false;
  }
},
    SaveNewTimeGroupSuccess: (state, action: PayloadAction<TimeGroupType>) => {
      if (state.isNewTimeGroup) {
        // replace the temporary with actual DB data
        state.timeGroups = state.timeGroups.map((tg) =>
          tg === state.selectedTimeGroup ? action.payload : tg
        );
        state.selectedTimeGroup = null;
        state.isNewTimeGroup = false;
      }
    },
    UpdateSelectedTimeGroup: (state, action: PayloadAction<Partial<TimeGroupType>>) => {
      if (state.selectedTimeGroup) {
        state.selectedTimeGroup = {
          ...state.selectedTimeGroup,
          ...action.payload,
        };
      }
    },
    ResetNewTimeGroupState: (state) => {
      state.isNewTimeGroup = false;
    }
  },
})

export const { GetTimeGroups,GetAllTimeGroups, UpdateFilter, SelectTimeGroup, AddNewTimeGroup, CancelNewTimeGroup, SaveNewTimeGroupSuccess, UpdateSelectedTimeGroup, ResetNewTimeGroupState } = TimeGroupSlice.actions;

export const fetchTimeGroups = () => async (dispatch: AppDispatch) => {
  try {
    const response = await axiosServices.get(API_URL);
    dispatch(GetAllTimeGroups(response.data.collection.data || []));
  } catch (error) {
    console.log(error);
  }
}

export const fetchTimeGroupDT = createAsyncThunk(
  "timeGroups/fetchTimeGroupDT",
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

    console.log("res: ", res);
    dispatch(GetTimeGroups(res.data.collection.data || []));
    await ensureMinLatency(started, 500);

    return res.data.collection;
  }
);

export const saveNewTimeGroup = createAsyncThunk(
  "timeGroups/saveNewTimeGroup",
  async (timeGroup: TimeGroupType, thunkAPI) => {
    const started = Date.now();
    try {
      const { id, ...filteredTimeGroupData } = timeGroup;
      const response = await axiosServices.post(API_URL, filteredTimeGroupData);
      console.log(response.data);
      const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);

      // update redux store
      dispatch(SaveNewTimeGroupSuccess(response.data));

      return response.data;
    } catch (error) {
      throw error;
    }
  }
);

export const editTimeGroup = createAsyncThunk(
  "timeGroups/editTimeGroup",
  async (timeGroup: TimeGroupType, { rejectWithValue }) => {
    const started = Date.now();
    try {
      const payload = buildEditPayload(timeGroup);

      console.log("Edit Payload", JSON.stringify(payload, null, 2));

      const response = await axiosServices.put(`${API_URL}${timeGroup.id}`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      console.log("response", response.data);
      const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);

      return response.data;
    } catch (error: any) {
      const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
      return rejectWithValue(error.response?.data || "Unknown error");
    }
  }
);

export const addTimeBlock = createAsyncThunk(
  "timeGroups/addTimeBlock",
  async (timeBlock: { dayOfWeek: string; startTime: string; endTime: string; TimeGroupId: string }, { rejectWithValue }) => {
    const started = Date.now();
    console.log("addTimeBlock", timeBlock);
    try {
      const response = await axiosServices.post(API_URL_TIME_BLOCK, timeBlock);
      const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
      console.log("response", response.data);
      return response.data;
    } catch (error: any) {
      const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
      return rejectWithValue(error.response?.data || "Unknown error");
    }
  }
);

const buildEditPayload = (tg: TimeGroupType) => {
  return {
    name: tg.name,
    description: tg.description,
        timeBlocks: tg.timeBlocks.map((b) => {
          const normalized = {
            ...b,
            dayOfWeek: b.dayOfWeek.toLowerCase(), // 👈 force lowercase
          };

          // if id is empty or a temp id, exclude it
          if (!b.id || b.id.startsWith("block-")) {
            const { id, ...rest } = normalized;
            return rest;
          }

          return normalized;
        }),
  };
};


export default TimeGroupSlice.reducer;

