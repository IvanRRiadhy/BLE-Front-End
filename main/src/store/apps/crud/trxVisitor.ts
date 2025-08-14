import axiosServices, { BASE_URL } from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { VisitorType } from "./visitor";
import { MaskedAreaType } from "./maskedArea";
import { defaultTrxVisitorFilter } from "../defaultForm";
import { memberType } from "./member";

const API_URL = "/api/TrxVisitor/";
const API_DT_URL = "/api/TrxVisitor/filter/";

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    searchValue: string,
    dateFilters: {
        VisitorPeriodStart?: {
            DateFrom?: string | null,
            DateTo?: string | null,
        },
    }
    filters:{
        Status?: number,
    }
}


export type GetTrxVisitorResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : TrxVisitorType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};

export type TrxVisitorType = {
    id: string,
    checkinAt: string,
    checkoutAt: string,
    denyAt: string,
    blockAt: string,
    unblockAt: string,
    checkinBy: string,
    checkoutBy: string,
    denyBy: string,
    denyReason: string,
    blockBy: string,
    blockReason: string,
    status: string,
    invitationCreatedAt: string,
    visitorPeriodStart: string,
    visitorPeriodEnd: string,
    vehiclePlateNumber: string,
    isInvitationAccepted: boolean,
    invitationCode: string,
    remarks: string,
    agenda: string,
    maskedAreaId: string,
    parkingId: string,
    visitorId: string,
    memberId: string,
    purposePersonId: string,
    visitor?: VisitorType,
    member?: memberType,
    maskedarea?: MaskedAreaType,
}

interface StateType {
    TrxVisitors: TrxVisitorType[];
    TrxVisitorSearch: string;
    SelectedTrxVisitor: TrxVisitorType;
    TrxVisitorTotalCount: number;
    TrxVisitorFilteredCount: number;
    TrxVisitorFilter: GetFilter;
}

const initialState: StateType = {
    TrxVisitors: [],
    SelectedTrxVisitor: {} as TrxVisitorType,
    TrxVisitorSearch: "",
    TrxVisitorTotalCount: 0,
    TrxVisitorFilteredCount: 0,
    TrxVisitorFilter: defaultTrxVisitorFilter,
};

export const TrxVisitorSlice = createSlice({
    name: "TrxVisitors",
    initialState,
    reducers: {
        GetTrxVisitors: (state, action: PayloadAction<TrxVisitorType[]>) => {
            state.TrxVisitors = action.payload;
        },
        setTrxVisitorSearch: (state, action: PayloadAction<string>) => {
            state.TrxVisitorSearch = action.payload;
        },
        SelectTrxVisitor: (state, action: PayloadAction<string>) => {
            const selected = state.TrxVisitors.find((visitor: TrxVisitorType) => visitor.id === action.payload);
            state.SelectedTrxVisitor = selected || {} as TrxVisitorType;
        },
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.TrxVisitorFilter = { ...state.TrxVisitorFilter, ...action.payload };
        //   console.log(JSON.stringify(state.TrxVisitorFilter, null, 2));
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTrxVisitorDT.fulfilled, (state, action) => {
                state.TrxVisitorTotalCount = action.payload.recordsTotal;
                state.TrxVisitorFilteredCount = action.payload.recordsFiltered;
            });
    }
});

export const {
    GetTrxVisitors,
    SelectTrxVisitor,
    setTrxVisitorSearch,
    UpdateFilter,
} = TrxVisitorSlice.actions;

export const fetchTrxVisitor = () => async(dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
        dispatch(GetTrxVisitors(response.data?.collection?.data || []));
        console.log("Fetch TrxVisitors", response.data.collection);
    } catch (error) {
        console.log(error);
    }
}

export const fetchTrxVisitorDT = createAsyncThunk(
    "TrxVisitor/fetchTrxVisitorDT",
    async (filter: any, { rejectWithValue }) => {
        try{
            const response = await axiosServices.post(`${API_DT_URL}`, filter);
            dispatch(GetTrxVisitors(response.data.collection.data || []));
            console.log("Fetch TrxVisitors", response.data.collection);
            return response.data.collection;
        } catch (error: any) {
            console.error("Error fetching TrxVisitors:", error);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
);

export const fetchTrxVisitorById = (id: string) => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(`${API_URL}public/${id}`);
                console.log("Fetch Trx Visitors", response.data?.collection || []);
        return(response.data.collection.data || []);

    } catch (err) {
        console.log("Error: ", err);
    }
}

export const visitorStatusChange = createAsyncThunk(
  "TrxVisitor/visitorStatusChange",
  async (
    {
      trxVisitorId,
      status,
      reason,
    }: { trxVisitorId: string; status: string; reason?: string },
    { rejectWithValue }
  ) => {
    try {
      console.log("Visitor ", trxVisitorId, " Status: ", status);

      // Prepare body only if needed
      let body: Record<string, string> | undefined;

      if (status.toLowerCase() === "denied") {
        body = { denyReason: reason ?? "" };
      } else if (status.toLowerCase() === "blocked") {
        body = { blockReason: reason ?? "" };
      }

      const response = await axiosServices.post(
        `${API_URL}${trxVisitorId}/${status}`,
        body // will be undefined if not deny/block
      );

      console.log("response", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error changing visitor status:", error);
      return rejectWithValue(error.response?.data || "Unknown error");
    }
  }
);


export const visitorCheckIn = createAsyncThunk(
    "TrxVisitor/visitorCheckIn",
    async (data: any) => {
        try{
            const response = await axiosServices.post(`${API_URL}checkin`, data);
            console.log("response", response.data);
            return response.data;
        } catch (error) {
            console.error("Error checking in visitor:", error);
            throw error;
        }
    }
);

export const visitorCheckOut = createAsyncThunk(
    "TrxVisitor/visitorCheckOut",
    async (trxVisitorId: string) => {
        try{
            const response = await axiosServices.post(`${API_URL}${trxVisitorId}/checkout`);
            console.log("response", response.data);
            return response.data;
        } catch (error) {
            console.error("Error checking out visitor:", error);
            throw error;
        }
    }
);


export default TrxVisitorSlice.reducer;