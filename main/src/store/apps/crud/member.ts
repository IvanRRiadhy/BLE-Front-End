import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = "http://192.168.1.173:5000/api/MstMember/";

export interface memberType {
    id: string,
    personId: string,
    organizationId: string,
    departmentId: string,
    districtId: string,
    identityId: string,
    cardNumber: string,
    bleCardNumber: string,
    name: string,
    phone: string,
    email: string,
    gender: string,
    address: string,
    faceImage: string,
    uploadFr: number,
    uploadFrError: string ,
    birthDate: string,
    joinDate: string,
    exitDate: string,
    headMember1: string,
    headMember2: string,
    applicationId: string,
    statusEmployee: string,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string
}

interface StateType {
    members: memberType[];
    memberSearch: string;
    selectedMember?: memberType;
    curentFilter: string;
}

const initialState: StateType = {
    members: [],
    memberSearch: "",
    selectedMember: undefined,
    curentFilter: "show_all",
};

export const MemberSlice = createSlice({
    name: "members",
    initialState,
    reducers: {
        GetMember(state, action: PayloadAction<memberType[]>) {
            state.members = action.payload;
        },
        SelectMember(state, action: PayloadAction<string>) {
            const selected = state.members.find((member: memberType) => member.id === action.payload);
            state.selectedMember = selected || undefined;
        },
        SearchMember(state, action: PayloadAction<string>) {
            state.memberSearch = action.payload;
        },
        SetVisibilityFilter(state: StateType, action: PayloadAction<string>) {
            state.curentFilter = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(addMember.fulfilled, (state, action) => {
                state.members.push(action.payload);
            })
            .addCase(addMember.rejected, (_state, action) => {
                console.error("Add failed: ", action.payload);
            })
            .addCase(editMember.fulfilled, (state, action) => {
                const index = state.members.findIndex((member: memberType) => member.id === action.payload.id);
                if (index !== -1) {
                    state.members[index] = action.payload;
                }
            })
            .addCase(editMember.rejected, (_state, action) => {
                console.error("Update failed: ", action.payload);
            })
            .addCase(deleteMember.fulfilled, (state, action) => {
                state.members = state.members.filter((member: memberType) => member.id !== action.payload);
            })
            .addCase(deleteMember.rejected, (_state, action) => {
                console.error("Delete failed: ", action.payload);
            });
    },
});

export const { GetMember, SelectMember, SearchMember, SetVisibilityFilter } = MemberSlice.actions;

export const fetchMembers = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axios.get(API_URL, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        dispatch(GetMember(response.data?.collection?.data || []));
    } catch (error) {
        console.log(error);
    }
};

export const addMember = createAsyncThunk("member/addMember", async (formData: FormData) => {
    try {
        formData.delete('id');
        const response = await axios.post(API_URL, formData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                'Content-Type' : 'multipart/form-data',
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error adding member:", error);
        throw error;
    }
});


export const editMember = createAsyncThunk("member/editMember", async (formData: FormData) => {
    try {
        const id = formData.get('id');
        formData.delete('id');
        const response = await axios.put(`${API_URL}/${id}`, formData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                'Content-Type' : 'multipart/form-data',
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error editing member:", error);
        throw error;
    }
});

export const deleteMember = createAsyncThunk("member/deleteMember", async (memberId: string) => {
    try {
        await axios.delete(`${API_URL}/${memberId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return memberId; // Return the deleted member's ID to update the state
    } catch (error) {
        console.error("Error deleting member:", error);
        throw error;
    }
});

export default MemberSlice.reducer;