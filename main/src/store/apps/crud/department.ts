import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = "http://192.168.1.173:5000/api/MstDepartment/";

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
    departmentSearch: string;
    selectedDepartment?: DepartmentType | null;
}

const initialState: StateType = {
    departments: [],
    departmentSearch: "",
    selectedDepartment: null,
};

export const DepartmentSlice = createSlice({
    name: "departments",
    initialState,

    reducers: {
        GetDepartments: (state, action: PayloadAction<DepartmentType[]>) => {
            state.departments = action.payload;
        },     
        SelectDepartment: (state, action: PayloadAction<string>) => {
            const selected = state.departments.find((department: DepartmentType) => department.id === action.payload);
            state.selectedDepartment = selected || null;
        },
        SearchDepartment: (state, action: PayloadAction<string>) => {
            state.departmentSearch = action.payload;
        },
    },

    extraReducers: (builder) => {
        builder
        .addCase(addDepartment.fulfilled, (state, action) => {
            state.departments.push(action.payload);
        })
        .addCase(addDepartment.rejected, (_state, action) => {
            console.error("Add department failed: ", action.payload);
        })
        .addCase(editDepartment.fulfilled, (state, action) => {
            const index = state.departments.findIndex((department) => department.id === action.payload.id);
            if(index !== -1) {
                state.departments[index] = action.payload;
                state.selectedDepartment = action.payload;
            }
        })
        .addCase(editDepartment.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
        })
        .addCase(deleteDepartment.fulfilled, (state, action) => {
            state.departments = state.departments.filter(department => department.id !== action.payload);
            if (state.selectedDepartment?.id === action.payload) {
                state.selectedDepartment = null;
            }
        })
        .addCase(deleteDepartment.rejected, (_state, action) => {
            console.error("Delete failed: ", action.payload);
        })
    }
});

export const selectDepartment = (departmentID : string) => 
(dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    console.log(state);
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
    SelectDepartment,
    SearchDepartment
} = DepartmentSlice.actions;

export const fetchDepartments = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axios.get(API_URL, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        dispatch(GetDepartments(response.data?.collection?.data || []));
    } catch (err: any) {
        console.log("Error fetching departments:", err);
    }
};

export const addDepartment = createAsyncThunk("departments/addDepartment", async (department: DepartmentType, { rejectWithValue }) => {
    try {
        const {id,createdBy, createdAt, updatedBy, updatedAt, ...filteredDepartmentData} = department
        const response = await axios.post(API_URL, filteredDepartmentData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error: any) {
        console.error("Error adding department:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const editDepartment = createAsyncThunk("departments/editDepartment", async (department: DepartmentType, { rejectWithValue }) => {
    try {
        const { id, createdBy, createdAt, updatedBy, updatedAt, ...filteredDepartmentData } = department;
        const response = await axios.put(`${API_URL}/${id}`, filteredDepartmentData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error: any) {
        console.error("Error editing department:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export const deleteDepartment = createAsyncThunk("departments/deleteDepartment", async (departmentId: string, { rejectWithValue }) => {
    try {
        await axios.delete(`${API_URL}/${departmentId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return departmentId; // Return the deleted department's ID to update the state
    } catch (error: any) {
        console.error("Error deleting department:", error);
        return rejectWithValue(error.response?.data || "Unknown error");
    }
});

export default DepartmentSlice.reducer;