import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { defaultUserFilter } from "../defaultForm";

const API_URL = "/api/users";
const REGIST_URL = '/api/Auth/register/';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
    filters?: {
        GroupId?: string,
    } | null,
}

export type userType = {
    id: string,
    username: string,
    email: string,
    groupId: string,
    lastLoginAt: string,
    isEmailConfirmation: boolean,
};
export type userRegistrationType = {
    username: string,
    email: string,
    password?: string,
    GroupId: string,
    canAlarmAction: boolean | null;
    canApprovePatrol: boolean | null;
    canCreateMonitoringConfig: boolean | null;
    canUpdateMonitoringConfig: boolean | null;
};
export type userMinType = {
    id: string;
    username: string;
    email: string;
    fullName: string;
    status: number;
}
export type accessibleBuildingType = {
    id: string;
    name: string;
    image: string;
    status: number;
    applicationId: string;
}

export type userGroupType = {
    id: string;
    name: string;
    levelPriority: string;
    applicationId: string;
    members: userMinType[];
    accessibleBuildings: accessibleBuildingType[];
    memberCount: number;
    accessibleBuildingCount: number;
    isHead: boolean;
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
}

// src/constants/levelPriority.ts
export const LEVEL_PRIORITY_ORDER = [
//   'System',
  'SuperAdmin',
  'PrimaryAdmin',
  'Primary',
  'Secondary',
  'UserCreated',
] as const;

export type LevelPriorityType = typeof LEVEL_PRIORITY_ORDER[number];


interface StateType {
    users : userType[];
    userGroups : userGroupType[];
    selectedUser : userType;
    selectedUserGroup : userGroupType;
    userTotalCount: number;
    userFilteredCount: number;
    userFilter: GetFilter;
    userGroupTotalCount: number;
    userGroupFilteredCount: number;
    lastFilter?: GetFilter;
isLoading: boolean;
hasLoaded: boolean;
}

const initialState: StateType = {
    users: [],
    userGroups: [],
    selectedUser: {} as userType,
    selectedUserGroup: {} as userGroupType,
    userTotalCount: 0,
    userFilteredCount: 0,
    userFilter: defaultUserFilter,
    userGroupTotalCount: 0,
    userGroupFilteredCount: 0,

    isLoading: false,
    hasLoaded: false,
};

export const UserSlice = createSlice({
    name: "users",
    initialState,
    reducers: {
        GetUsers: (state, action: PayloadAction<userType[]>) => {
            state.users = action.payload;
        },
        GetUserGroups: (state, action: PayloadAction<userGroupType[]>) => {
            state.userGroups = action.payload;
        },
        setSelectedUser: (state, action: PayloadAction<userType>) => {
            state.selectedUser = action.payload;
        },
        setSelectedUserGroup: (state, action: PayloadAction<userGroupType>) => {
            state.selectedUserGroup = action.payload;
        },
        UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
            state.userFilter = {...state.userFilter, ...action.payload};
        },
    },
    extraReducers: (builder) => {

        builder.addCase(userRegistration.fulfilled, (state, action) => {
            state.users.push(action.payload);
        });
    },
});

export const { GetUsers, setSelectedUser, UpdateFilter, GetUserGroups, setSelectedUserGroup } = UserSlice.actions;

export const fetchUser = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
        dispatch(GetUsers(response.data.collection.data || []));
        // console.log("Fetch Users", response.data.collection || []);
    } catch (err: any) {
        console.log("Error: ", err);
    }
};

export const userRegistration = createAsyncThunk(
    "users/userRegistration",
    async(user: userRegistrationType) => {
        try {
            const response = await axiosServices.post(REGIST_URL, user);
            return response.data;
        } catch (error) {
            console.error("Error adding user:", error);
            throw error;
        }
    }
)

export default UserSlice.reducer;