import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = "/api/Auth/users";
const REGIST_URL = '/api/Auth/register/';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
    filters: {
        GroupId?: string,
    }
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
    groupId: string
};

interface StateType {
    users : userType[];
    selectedUser : userType;
    userTotalCount: number;
    userFilteredCount: number;
    userFilter: GetFilter;
isLoading: boolean;
hasLoaded: boolean;
}

const initialState: StateType = {
    users: [],
    selectedUser: {} as userType,
    userTotalCount: 0,
    userFilteredCount: 0,
    userFilter: {} as GetFilter,
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
        setSelectedUser: (state, action: PayloadAction<userType>) => {
            state.selectedUser = action.payload;
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

export const { GetUsers, setSelectedUser, UpdateFilter } = UserSlice.actions;

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