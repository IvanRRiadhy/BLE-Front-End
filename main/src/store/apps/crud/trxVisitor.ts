import axiosServices, { BASE_URL } from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { VisitorType } from "./visitor";
import { MaskedAreaType } from "./maskedArea";
import { defaultTrxVisitorFilter } from "../defaultForm";
import { memberType } from "./member";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";

const API_URL = "/api/TrxVisitor/";
const API_DT_URL = "/api/TrxVisitor/filter/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
    dateFilters: {
        VisitorPeriodStart?: {
            DateFrom?: string | null,
            DateTo?: string | null,
        },
        VisitorPeriodEnd?: {
            DateFrom?: string | null,
            DateTo?: string | null,
        },
    }
    filters:{
        Status?: number,
        Gender?: number,
        VisitorId?: string,
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
    extendedVisitorTime: number,
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
    lastFilter?: GetFilter;
isLoading: boolean;
hasLoaded: boolean;
}

const initialState: StateType = {
    TrxVisitors: [],
    SelectedTrxVisitor: {} as TrxVisitorType,
    TrxVisitorSearch: "",
    TrxVisitorTotalCount: 0,
    TrxVisitorFilteredCount: 0,
    TrxVisitorFilter: defaultTrxVisitorFilter,
    isLoading: false,
    hasLoaded: false,
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
        .addCase(fetchTrxVisitorDT.pending, (state, action) => {
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
            .addCase(fetchTrxVisitorDT.fulfilled, (state, action) => {
                state.TrxVisitorTotalCount = action.payload.recordsTotal;
                state.TrxVisitorFilteredCount = action.payload.recordsFiltered;
                    state.isLoading = false;
                    state.hasLoaded = true;
                    state.lastFilter = { ...state.TrxVisitorFilter };
            })
            .addCase(fetchTrxVisitorDT.rejected, (state, action) => {
                console.error("Error fetching TrxVisitors: ", action.payload);
                state.TrxVisitorTotalCount = 0;
                state.TrxVisitorFilteredCount = 0;
                    state.isLoading = false;
                    state.hasLoaded = true;
            })
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

    dispatch(GetTrxVisitors(res.data.collection.data || []));
    await ensureMinLatency(started, 500);
    return res.data.collection;
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

export const visitorExtend = createAsyncThunk(
    "TrxVisitor/visitorExtend",
    async ({ trxVisitorId, ExtendedVisitorTime }: { trxVisitorId: string; ExtendedVisitorTime: number }) => {
        try{
            console.log("Extending Visitor ", trxVisitorId, " by ", ExtendedVisitorTime, " minutes");
            const response = await axiosServices.post(`${API_URL}${trxVisitorId}/extend`, { ExtendedVisitorTime });
            console.log("response", response.data);
            return response.data;
        } catch (error) {
            console.error("Error extending visitor period:", error);
            throw error;
        }
    }
);


export default TrxVisitorSlice.reducer;