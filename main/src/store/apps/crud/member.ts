import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { defaultMemberFilter } from "../defaultForm";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";
import { OrganizationType } from "./organization";
import { DepartmentType } from "./department";
import { DistrictType } from "./district";

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
        OrganizationId?: string[];
        DepartmentId?: string[];
        DistrictId?: string[];
        isHead?: boolean;
        // cardNumber?: string;
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
    organization?: OrganizationType,
    department?: DepartmentType,
    district?: DistrictType,
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
    isHead?: boolean,
    headMember1: string,
    headMember2: string,
    applicationId: string,
    statusEmployee: string,
    cardId: string,
    isBlacklist: boolean,
    blacklistAt: string,
    blacklistReason: string,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string
}

interface StateType {
    members: memberType[];
    memberAll: memberType[];
    memberSearch: string;
    selectedMember: memberType | null;
    selectedMemberId?: string;
    curentFilter: string;
    memberTotalCount: number;
    memberFilteredCount: number;
    memberFilter: GetFilter;
    lastFilter?: GetFilter;
isLoading: boolean;
hasLoaded: boolean;
}

const initialState: StateType = {
    members: [],
    memberAll: [],
    memberSearch: "",
    selectedMember: null,
    selectedMemberId: "",
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
        SelectMemberId(state, action: PayloadAction<string>) {
            state.selectedMemberId = action.payload;
        },
        SelectMember(state, action: PayloadAction<memberType | null>) {
            state.selectedMember = action.payload;
        },
        SearchMember(state, action: PayloadAction<string>) {
            state.memberSearch = action.payload;
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
            .addCase(fetchMemberDT.pending, (state, action) => {
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
            .addCase(fetchMemberDT.fulfilled, (state, action) => {
                state.memberTotalCount = action.payload.recordsTotal;
                state.memberFilteredCount = action.payload.recordsFiltered;
                    state.isLoading = false;
                    state.hasLoaded = true;
                    state.lastFilter = { ...state.memberFilter };
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

export const { GetMember, GetAllMember, SelectMemberId, SelectMember, SearchMember, UpdateFilter } = MemberSlice.actions;

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

    dispatch(GetMember(res.data.collection.data || []));
    await ensureMinLatency(started, 500);
    return res.data.collection;
  }
)

export const addMember = createAsyncThunk("member/addMember", async (formData: FormData) => {
    const started = Date.now();
    try {
        const response = await axiosServices.post(API_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error) {
        console.error("Error adding member:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        throw error;
    }
});


export const editMember = createAsyncThunk("member/editMember", async (formData: FormData) => {
    const started = Date.now();
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
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return response.data;
    } catch (error) {
        console.error("Error editing member:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        throw error;
    }
});

export const blacklistMember = createAsyncThunk(
  'member/blacklistMember',
  async ({ memberId, blacklistReason }: { memberId: string; blacklistReason: string }) => {
    const started = Date.now();
    try {
        console.log("Blacklisting member: ",memberId, blacklistReason);
      const response = await axiosServices.put(`${API_URL}${memberId}/blacklist`, {
        blacklistReason,
      });
      console.log('Response Blacklist: ', response.data);
      const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
      return response.data;
    } catch (error) {
      console.error('Error blacklisting member:', error);
      const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
      throw error;
    }
  },
);
export const deleteMember = createAsyncThunk("member/deleteMember", async (memberId: string) => {
    const started = Date.now();
    try {
        await axiosServices.delete(`${API_URL}${memberId}`);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        return memberId; // Return the deleted member's ID to update the state
    } catch (error) {
        console.error("Error deleting member:", error);
                            const elapsed = Date.now() - started;
      if (elapsed < 500) await delay(500 - elapsed);
        throw error;
    }
});

export default MemberSlice.reducer;