import axiosServices from "../../../utils/axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { defaultAlarmTriggerFilter } from "../defaultForm";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";
import { FloorplanType } from "./floorplan";
import { CardType } from "./card";
import { VisitorType } from "./visitor";
import { memberType } from "./member";

const API_DT_URL = "/api/AlarmTriggers/filter";
const API_URL = "/api/AlarmTriggers/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));



export type GetAlarmRecordResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : AlarmTriggerType[];
        draw : number;
        recordsTotal : number;
        recordsFiltered : number;
    };
};
export type GetFilter = {
        Draw: number,
    Start: number,
    Length: number,
    SortColumn: string,
    SortDir: 'asc' | 'desc',
    SearchValue: string,
    // timeRange: string,
    dateFilters: {
        TriggerTime?: {
            DateFrom: string | null;
            DateTo: string | null;
        }
    }
    filters: {
        isActive?: boolean;
        alarm?: string[];
        buildingId?: string[];
        floorId?: string[];
        floorplanId?: string[];
        action?: string[];
        visitorId?: string[];
        memberId?: string[];
    }
}

export interface AlarmTriggerType {
    acceptedBy: string | null;
    action: string;
    actionUpdatedAt: string | null;
    alarm: string;
    alarmColor: string;
    applicationId: string;
    beaconId: string;
    buildingId: string;
    buildingName: string;
    cancelBy: string | null;
    cancelTimestamp: string | null;
    dispatchedBy: string | null;
    dispatchedTimestamp: string | null;
    doneBy: string | null;
    doneTimestamp: string | null;
    firstDistance: number;
    firstGatewayId: string;
    floorplanImage: string;
    floorplanId: string;
    floorplanName: string;
    floorplan?: FloorplanType;
    floorId: string;
    floorName: string;
    id: string;
    idleBy: string | null;
    idleTimestamp: string | null;
    investigatedDoneAt: string | null;
    investigatedDoneBy: string | null;
    investigatedResult: string | null;
    isActive: boolean;
    isInRestrictedArea: boolean;
    lastNotifiedAt: string | null;
    lastSeenAt: string;
    memberCardNumber: string | null;
    memberFaceImage: string | null;
    memberId: string | null;
    memberIdentityId: string | null;
    memberName: string | null;
    posX: number;
    posY: number;
    secondDistance: number;
    secondGatewayId: string;
    securityEmail: string | null;
    securityId: string | null;
    securityName: string | null;
    triggerTime: string;
    visitorCardNumber: string | null;
    visitorFaceImage: string | null;
    visitorId: string | null;
    visitorIdentityId: string | null;
    visitorName: string | null;
    waitingBy: string | null;
    waitingTimestamp: string | null;
    card?: CardType;
    visitor?: VisitorType;
    member?: memberType
};

export type IntruderType = {
    id: string;
    beaconId: string;
    cardNumber: string;
    visitorId: string;
    visitorName: string;
    visitorFaceImage: string;
    memberId: string;
    memberName: string;
    memberFaceImage: string;
    personGuid: string;
    personName: string;
    personImage: string;
    personType: string;
}

export type LocationType = {
    floorplanId: string;
    floorplanName: string;
    floorplanmaskedAreaId: string;
    areaName: string;
    position: {
        x: number;
        y: number;
        beaconId: string;
    };
};

export type PersonType = {
    type: string;
    id: string;
    name: string;
    identityId: string;
    cardNumber: string;
};
export type SecurityType = {
    id: string;
    name: string;
    email: string;
};

export type attachmentType ={
    id: string;
    fileUrl: string;
    fileType: string;
    mimeType: string;
    uploadedAt: string;
    uploadedBy: string;
}

export type IncidentType = {
    alarmTriggerId: string;
    triggerTime: string;
    alarmColor: string;
    alarmStatus: string;
    actionStatus: string;
    isActive: boolean;
    isInRestrictedArea: boolean;
    location: LocationType;
    person: PersonType;
    security: SecurityType;
    attachments: attachmentType[];
};

export type TimelineItemType = {
    stage: string;
    timestamp: string;
    actor: string;
    actorId: string;
    durationInSeconds: number;
    durationFormatted: string;
    description: string;
};

export type DurationType = {
    totalSeconds: number;
    totalFormatted: string;
    responseTimeSeconds: number;
    responseTimeFormatted: string;
    resolutionTimeSeconds: number;
    resolutionTimeFormatted: string;
};

export type investigationType = {
    result: string;
    dispatchedPerson: string;
    dispatchedPersonId: string;
    investigatedAt: string;
    doneAt: string;
    notes: string;
    wasInvestigated: boolean;
};

export type AlarmTimelineType = {
    incidentInfo: IncidentType;
    timeline: TimelineItemType[];
    duration: DurationType;
    investigation: investigationType;
};


export type NearestSecurityType = {
    securityId: string;
    securityName: string;
    email: string;
    phone: string;
    floorplanId: string;
    floorplanName: string;
    floorId: string;
    floorName: string;
    buildingId: string;
    buildingName: string;
    maskedAreaId: string;
    maskedAreaName: string;
    coordinateX: number;
    coordinateY: number;
    distanceInMeters: number | null;
    proximityLevel: 'SameArea' | 'SameFloorplan' | 'SameFloor' | 'SameBuilding' | 'DifferentBuilding';
    lastLocationUpdate: string;
    isDispatched: boolean;
}


interface StateType {
    alarmTriggers: AlarmTriggerType[];
    alarmTriggerAll: AlarmTriggerType[];
    alarmTriggerSearch: string;
    selectedAlarmTrigger?: AlarmTriggerType | null;
    selectedIntruder?: IntruderType | null;
    alarmTriggerTotalCount: number;
    alarmTriggerFilteredCount: number;
    alarmTriggerFilter: GetFilter;
    lastFilter?: GetFilter;
    isLoading: boolean;
    hasLoaded: boolean;
};

const initialState: StateType = {
    alarmTriggers: [],
    alarmTriggerAll: [],
    alarmTriggerSearch: "",
    selectedAlarmTrigger: null,
    selectedIntruder: null,
    alarmTriggerTotalCount: 0,
    alarmTriggerFilteredCount: 0,
    alarmTriggerFilter: defaultAlarmTriggerFilter,
    isLoading: false,
    hasLoaded: false,
};

export const AlarmTriggerSlice = createSlice({
    name: 'alarmTriggers',
    initialState,
    reducers: {
        GetAllAlarmTrigger: (state, action: PayloadAction<AlarmTriggerType[]>) => {
            state.alarmTriggerAll = action.payload;
        },
        GetAlarmTriggers: (state, action:PayloadAction<AlarmTriggerType[]>) => {
            state.alarmTriggers = action.payload;
        },
        SearchAlarmTrigger: (state, action: PayloadAction<string>) => {
            state.alarmTriggerSearch = action.payload;
        },
        SelectAlarmTrigger: (state, action: PayloadAction<AlarmTriggerType | null>) => {
            // const selected = state.alarmTriggers.find((alarmTrigger: AlarmTriggerType) => alarmTrigger.id === action.payload);
            console.log("Selected Alarm Trigger: ", JSON.stringify(action.payload));
            state.selectedAlarmTrigger = action.payload;
        },
        SelectIntruder: (state, action: PayloadAction<IntruderType | null>) => {
            state.selectedIntruder = action.payload;
        },
        UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
            state.alarmTriggerFilter = {...state.alarmTriggerFilter, ...action.payload};
            console.log("Updated AlarmTrigger Filter: ", JSON.stringify(state.alarmTriggerFilter));
        },
    },
    extraReducers: (builder) => {
        builder
        .addCase(fetchAlarmTriggerDT.pending, (state, action) => {
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
        .addCase(fetchAlarmTriggerDT.fulfilled, (state, action) => {
            state.alarmTriggerTotalCount = action.payload.recordsTotal;
            state.alarmTriggerFilteredCount = action.payload.recordsFiltered;
            state.isLoading = false;
            state.hasLoaded = true;
            state.lastFilter = { ...state.alarmTriggerFilter };
        })
        .addCase(fetchAlarmTriggerDT.rejected, (_state, action) => {
            console.error("Error fetching AlarmTriggers: ", action.payload);
            _state.alarmTriggerTotalCount = 0;
            _state.alarmTriggerFilteredCount = 0;
            _state.isLoading = false;
            _state.hasLoaded = false;           
        })
        .addCase(editAlarmTrigger.pending, (state) => {
            state.isLoading = true;
        })
        .addCase(editAlarmTrigger.fulfilled, (state, action) => {
            state.isLoading = false;
        })
        .addCase(editAlarmTrigger.rejected, (_state, action) => {
            console.error("Update failed: ", action.payload);
            _state.isLoading = false;
        });
    }
});

export const {
    GetAllAlarmTrigger,
    GetAlarmTriggers,
    SearchAlarmTrigger,
    SelectAlarmTrigger,
    SelectIntruder,
    UpdateFilter,
} = AlarmTriggerSlice.actions;

export const fetchAlarmTrigger = () => async (dispatch: AppDispatch) => {
    try {
        const response = await axiosServices.get(API_URL);
        dispatch(GetAllAlarmTrigger(response.data.collection.data || []));
        // console.log("Response: ", response);
    } catch (err: any) {
        console.log("Error: ", err);
    }
};

export const fetchAlarmTriggerDT = createAsyncThunk(
    "alarmTriggers/fetchAlarmTriggerDT",
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
    console.log("Alarm Trigger: ", res);
    dispatch(GetAlarmTriggers(res.data.collection.data || []));
    await ensureMinLatency(started, 500);
    return res.data.collection;
  }
    
)


export const editAlarmTrigger = createAsyncThunk(
    "alarmTriggers/editAlarmTrigger",
    async ({dmac, actionStatus} : {dmac: string, actionStatus: string}, {rejectWithValue}) => {
        const started = Date.now();
        try {
            console.log("Editing AlarmTrigger:", dmac, actionStatus);
            const response = await axiosServices.put(`${API_URL}tag/${dmac}`, {actionStatus});
            console.log(response);
            const elapsed = Date.now() - started;
            if (elapsed < 500) await delay(500 - elapsed);
            return response.data;
        } catch (error: any) {
            console.error("Error editing AlarmTrigger:", error);
            const elapsed = Date.now() - started;
            if (elapsed < 500) await delay(500 - elapsed);
            return rejectWithValue(error.response?.data || "Unknown error");
        }
    }
)


export default AlarmTriggerSlice.reducer;
