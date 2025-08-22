import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { defaultMemberFilter } from "../defaultForm";

const API_URL = "/api/MstMember/";
const API_DT_URL = "/api/MstMember/filter/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
    filters: {
        OrganizationId: string[],
        DistrictId: string[],
        DepartmentId: string[],
    }
}


export type GetMemberResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : memberType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

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
    memberAll: memberType[];
    memberSearch: string;
    selectedMember?: memberType;
    curentFilter: string;
    memberTotalCount: number;
    memberFilteredCount: number;
    memberFilter: GetFilter;
isLoading: boolean;
hasLoaded: boolean;
}

const initialState: StateType = {
    members: [],
    memberAll: [],
    memberSearch: "",
    selectedMember: undefined,
    curentFilter: "show_all",
    memberTotalCount: 0,
    memberFilteredCount: 0,
    memberFilter: defaultMemberFilter,
    isLoading: false,
    hasLoaded: false,
};

export const MemberSlice = createSlice({
    name: "members",
    initialState,
    reducers: {
        GetMember(state, action: PayloadAction<memberType[]>) {
            state.members = action.payload;
        },
        GetAllMember(state, action: PayloadAction<memberType[]>) {
            state.memberAll = action.payload;
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
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.memberFilter = { ...state.memberFilter, ...action.payload };
        }
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
            })
            .addCase(fetchMemberDT.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchMemberDT.fulfilled, (state, action) => {
                state.memberTotalCount = action.payload.recordsTotal;
                state.memberFilteredCount = action.payload.recordsFiltered;
                    state.isLoading = false;
                    state.hasLoaded = true;
            })
            .addCase(fetchMemberDT.rejected, (_state, action) => {
                console.error("Fetch failed: ", action.payload);
                // _state.memberTotalCount = 0;
                _state.memberFilteredCount = 0;
                    _state.isLoading = false;
                    _state.hasLoaded = true;
            });
    },
});

export const { GetMember, GetAllMember, SelectMember, SearchMember, SetVisibilityFilter, UpdateFilter } = MemberSlice.actions;

export const fetchMembers = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
        dispatch(GetAllMember(response.data?.collection?.data || []));
                    // console.log("Fetch members", response.data.collection);
    } catch (error) {
        console.log(error);
    }
};

export const fetchMemberDT = createAsyncThunk(
    "members/fetchMemberDT",
    async (filter: any, { rejectWithValue }) => {
        try {
            const response = await axiosServices.post(API_DT_URL, filter);
            dispatch(GetMember(response.data.collection.data || []));
            console.log("Fetch members", response.data.collection);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching members:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)

export const addMember = createAsyncThunk("member/addMember", async (formData: FormData) => {
    try {
        formData.delete('id');
        const response = await axiosServices.post(API_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
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
//         for (const [key, value] of formData.entries()) {
//    console.log(`${key}:`, value);
// }
        const response = await axiosServices.put(`${API_URL}${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error editing member:", error);
        throw error;
    }
});

export const deleteMember = createAsyncThunk("member/deleteMember", async (memberId: string) => {
    try {
        await axiosServices.delete(`${API_URL}${memberId}`);
        return memberId; // Return the deleted member's ID to update the state
    } catch (error) {
        console.error("Error deleting member:", error);
        throw error;
    }
});

export default MemberSlice.reducer;