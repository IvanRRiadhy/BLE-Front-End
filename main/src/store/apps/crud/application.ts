import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = "http://localhost:5034/api/MstApplication";
const getToken = () => localStorage.getItem('token');
const token = getToken();

// Define the TypeScript type
export interface ApplicationType {
  id: string;
  applicationName: string;
  organizationType: string;
  organizationAddress: string;
  applicationType: string;
  applicationRegistered: string;
  applicationExpired: string;
  hostName: string;
  hostPhone: string;
  hostEmail: string;
  hostAddress: string;
  applicationCustomName: string;
  applicationCustomDomain: string;
  applicationCustomPort: string;
  licenseCode: string;
  licenseType: string;
}

// State structure
interface StateType {
  applications: ApplicationType[];
  applicationSearch: string;
  selectedApplication?: ApplicationType | null;
}

const initialState: StateType = {
  applications: [],
  applicationSearch: "",
  selectedApplication: null,
};

export const ApplicationSlice = createSlice({
  name: "applications",
  initialState,

  reducers: {
    GetApplications: (state, action: PayloadAction<ApplicationType[]>) => {
      state.applications = action.payload;
    },

    SelectApplication: (state, action: PayloadAction<string>) => {
      const selected = state.applications.find(
        (app: ApplicationType) => app.id === action.payload
      );
      state.selectedApplication = selected || null;
    },

    SearchApplication: (state, action: PayloadAction<string>) => {
      state.applicationSearch = action.payload;
    },

    UpdateApplication: {
      reducer: (state: StateType, action: PayloadAction<any>) => {
        state.applications = state.applications.map((app) =>
          app.id === action.payload.id
            ? { ...app, [action.payload.field]: action.payload.value }
            : app
        );
      },
      prepare: (id: string, field: keyof ApplicationType, value: any) => {
        return {
          payload: { id, field, value },
        };
      },
    },

    AddApplication: {
      reducer: (state: StateType, action: PayloadAction<ApplicationType>) => {
        state.applications.push(action.payload);
      },
      prepare: (
        applicationName: string,
        organizationType: string,
        organizationAddress: string
      ) => {
        return {
          payload: {
            id: `${Date.now()}`, // Generate unique ID
            applicationName,
            organizationType,
            organizationAddress,
            applicationType: "",
            applicationRegistered: "",
            applicationExpired: "",
            hostName: "",
            hostPhone: "",
            hostEmail: "",
            hostAddress: "",
            applicationCustomName: "",
            applicationCustomDomain: "",
            applicationCustomPort: "",
            licenseCode: "",
            licenseType: "",
          } as ApplicationType,
        };
      },
    },
    
  },
  extraReducers: (builder) => {
    builder
    .addCase(addApplication.fulfilled, (state, action) => {
      state.applications.push(action.payload); // Add new application to state
    })
    .addCase(addApplication.rejected, (_state, action) => {
      console.error("Add App failed: ", action.payload);
    })
    .addCase(editApplication.fulfilled, (state, action) => {
      const index = state.applications.findIndex((app) => app.id === action.payload.id);
      if(index !== -1){
        state.applications[index] = action.payload;
        state.selectedApplication = action.payload;
      }
    })
    .addCase(editApplication.rejected, (_state, action) => {
      console.error("Update failed: ", action.payload);
    })
    .addCase(deleteApplication.fulfilled, (state, action) => {
      state.applications = state.applications.filter(app => app.id !== action.payload);
      if (state.selectedApplication?.id === action.payload) {
        state.selectedApplication = null; // Clear selected app if deleted
      }
    })
    .addCase(deleteApplication.rejected, (_state, action) => {
      console.error("Delete failed: ", action.payload);
    });
  }
});

export const selectApplication =
  (applicationId: string) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    console.log(state)

    const isEditing = false; // Add logic if needed

    if (!isEditing) {
      dispatch(SelectApplication(applicationId));
    } else {
      console.warn("Cannot switch applications while editing.");
    }
  };

export const { GetApplications, SelectApplication, SearchApplication, UpdateApplication, AddApplication } =
  ApplicationSlice.actions;

export const fetchApplications = () => async (dispatch: AppDispatch) => {
  try {
    const response = await axios.get(`${API_URL}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    dispatch(GetApplications(response.data?.collection?.data || []));
  } catch (err: any) {
    console.error("Error fetching applications:", err);
  }
};

export const addApplication = createAsyncThunk(
  "applications/addApplication",
  async (newApplication: ApplicationType, { rejectWithValue }) => {
    try {
      const {id, applicationRegistered, applicationExpired, ...filteredAppData} = newApplication
      const response = await axios.post(API_URL, filteredAppData, {
        headers: {
          Authorization: `Bearer ${token}`
        },
      });
      return response.data;
    } catch (error: any) {
      console.error("Error adding application:", error);
      return rejectWithValue(error.response?.data || "Unknown error");
    }
  }
);


export const editApplication = createAsyncThunk(
  "applications/editApplication",
  async (updateApp: ApplicationType, {rejectWithValue}) => {
    try {
      const { id, applicationRegistered, applicationExpired, ...filteredAppData } = updateApp;
      const response = await axios.put(`${API_URL}/${id}`, filteredAppData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error: any){
      console.error("Error updating app: ", error);
      return rejectWithValue(error.response?.data || "Unknown error");
    }
  }
);

export const deleteApplication = createAsyncThunk(
  "applications/deleteApplication",
  async (applicationId: string, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}/${applicationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return applicationId; // Return the deleted application's ID to update the state
    } catch (error: any) {
      console.error("Error deleting application:", error);
      return rejectWithValue(error.response?.data || "Unknown error");
    }
  },
);


export default ApplicationSlice.reducer;
