import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { defaultDepartmentFilter } from "../defaultForm";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";

const API_URL = "/api/MstDepartment/";
const API_DT_URL = "/api/MstDepartment/filter/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
}


export type GetDepartmentResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : DepartmentType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

export interface DepartmentType {
    id: string,
    code: string,
    name: string,
    departmentHost: string,
    applicationId: string,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string
}

interface StateType {
    departments: DepartmentType[];
    departmentAll: DepartmentType[];
    departmentSearch: string;
    selectedDepartment?: DepartmentType | null;
    departmentTotalCount: number;
    departmentFilteredCount: number;
    departmentFilter: GetFilter;
    lastFilter?: GetFilter;
isLoading: boolean;
hasLoaded: boolean;
}

const initialState: StateType = {
    departments: [],
    departmentAll: [],
    departmentSearch: "",
    selectedDepartment: null,
    departmentTotalCount: 0,
    departmentFilteredCount: 0,
    departmentFilter: defaultDepartmentFilter,
    isLoading: false,
    hasLoaded: false,
};

export const DepartmentSlice = createSlice({
    name: "departments",
    initialState,

    reducers: {
        GetDepartments: (state, action: PayloadAction<DepartmentType[]>) => {
            state.departments = action.payload;
        },     
        GetAllDepartment: (state, action: PayloadAction<DepartmentType[]>) => {
            state.departmentAll = action.payload;
        },
        SelectDepartment: (state, action: PayloadAction<string>) => {
            const selected = state.departments.find((department: DepartmentType) => department.id === action.payload);
            state.selectedDepartment = selected || null;
        },
        SearchDepartment: (state, action: PayloadAction<string>) => {
            state.departmentSearch = action.payload;
        },
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.departmentFilter = { ...state.departmentFilter, ...action.payload };
        }
    },

    extraReducers: (builder) => {
        builder
        .addCase(addDepartment.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(addDepartment.fulfilled, (state, action) => {
            state.departments.push(action.payload);
            state.isLoading = false;
        })
        .addCase(addDepartment.rejected, (_state, action) => {
            console.error("Add department failed: ", action.payload);
            _state.isLoading = false;
        })
        .addCase(editDepartment.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(editDepartment.fulfilled, (state, action) => {
            const index = state.departments.findIndex((department) => department.id === action.payload.id);
            if(index !== -1) {
                state.departments[index] = action.payload;
                state.selectedDepartment = action.payload;
            }
            state.isLoading = false;
        })
        .addCase(editDepartment.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
            _state.isLoading = false;
        })
        .addCase(deleteDepartment.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(deleteDepartment.fulfilled, (state, action) => {
            state.departments = state.departments.filter(department => department.id !== action.payload);
            if (state.selectedDepartment?.id === action.payload) {
                state.selectedDepartment = null;
            }
            state.isLoading = false;
        })
        .addCase(deleteDepartment.rejected, (_state, action) => {
            console.error("Delete failed: ", action.payload);
            _state.isLoading = false;
        })
        .addCase(fetchDepartmentDT.pending, (state, action) => {
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
        .addCase(fetchDepartmentDT.fulfilled, (state, action) => {
            state.departmentTotalCount = action.payload.recordsTotal;
            state.departmentFilteredCount = action.payload.recordsFiltered;
                state.isLoading = false;
                state.hasLoaded = true;
                state.lastFilter = { ...state.departmentFilter };
        })
        .addCase(fetchDepartmentDT.rejected, (_state, action) => {
            console.error("Error fetching departments: ", action.payload);
            _state.departmentFilteredCount = 0;
                _state.isLoading = false;
                _state.hasLoaded = false;
        });
    }
});

export const selectDepartment = (departmentID : string) => 
(dispatch: AppDispatch) => {
    // const state = getState();
    // console.log(state);
    const isEditing = false;

    if(!isEditing){
        dispatch(SelectDepartment(departmentID));
    } else {
        dispatch(SelectDepartment(""));
        console.warn("Cannot Switch while editing.");
    }
};

export const {
    GetDepartments,
    GetAllDepartment,
    SelectDepartment,
    SearchDepartment,
    UpdateFilter
} = DepartmentSlice.actions;

export const fetchDepartments = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
        dispatch(GetAllDepartment(response.data?.collection?.data || []));
    } catch (err: any) {
        console.log("Error fetching departments:", err);
    }
};

export const fetchDepartmentDT = createAsyncThunk(
    "departments/fetchDepartmentDT",
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

    dispatch(GetDepartments(res.data.collection.data || []));
    await ensureMinLatency(started, 500);
    return res.data.collection;
  }
)

export const addDepartment = createAsyncThunk("departments/addDepartment", async (department: DepartmentType, { rejectWithValue }) => {
    const started = Date.now();
    try {
        const {id,createdBy, createdAt, updatedBy, updatedAt, ...filteredDepartmentData} = department
        console.log(filteredDepartmentData)
        const response = await axiosServices.post(API_URL, filteredDepartmentData);
                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error: any) {
        console.error("Error adding department:", error);
                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const editDepartment = createAsyncThunk("departments/editDepartment", async (department: DepartmentType, { rejectWithValue }) => {
    const started = Date.now();
    try {
        const { id, createdBy, createdAt, updatedBy, updatedAt, ...filteredDepartmentData } = department;
        const response = await axiosServices.put(`${API_URL}${id}`, filteredDepartmentData);
                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error: any) {
        console.error("Error editing department:", error);
                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteDepartment = createAsyncThunk("departments/deleteDepartment", async (departmentId: string, { rejectWithValue }) => {
    const started = Date.now();
    try {
        await axiosServices.delete(`${API_URL}${departmentId}`);
                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return departmentId; // Return the deleted department's ID to update the state
    } catch (error: any) {
        console.error("Error deleting department:", error);
                const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export default DepartmentSlice.reducer;