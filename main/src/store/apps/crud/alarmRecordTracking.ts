import axios from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { visitorType } from "./visitor";
import { bleReaderType } from "./bleReader";
import { MaskedAreaType } from "./maskedArea";

const API_URL = 'http://192.168.1.173:5000/api/AlarmRecordTracking/';

export interface AlarmType {
    id: string;
    timestamp: string;
    visitorId: string;
    readerId: string;
    floorplanMaskedAreaId: string;
    applicationId: string;
    alarmRecordStatus: string;
    actionStatus: string;
    idleTimestamp: string;
    doneTimestamp: string;
    cancelTimestamp: string;
    waitingTimestamp: string;
    investigatedTimestamp: string;
    investigatedDoneAt: string;
    idlyBy: string;
    doneBy: string;
    cancelBy: string;
    waitingBy: string;
    investigatedBy: string;
    investigatedResult: string;
    visitor?: visitorType;
    reader?: bleReaderType;
    floorplanMaskedArea?: MaskedAreaType; 
};

interface StateType {
    alarmRecordTrackings: AlarmType[];
    alarmRecordTrackingSearch: string;
    selectedAlarmRecordTracking?: AlarmType | null;
};

const initialState: StateType = {
    alarmRecordTrackings: [],
    alarmRecordTrackingSearch: '',
    selectedAlarmRecordTracking: null
};
export const AlarmSlice = createSlice({
    name: 'alarmRecordTrackings',
    initialState,
    reducers: {
        GetAlarms: (state, action:PayloadAction<AlarmType[]>) => {
            state.alarmRecordTrackings = action.payload;
        },
        SelectAlarm: (state, action: PayloadAction<string>) => {
            const selected = state.alarmRecordTrackings.find(
                (alarm: AlarmType) => alarm.id === action.payload
            );
            state.selectedAlarmRecordTracking = selected || null;
        },
        SearchAlarm: (state, action: PayloadAction<string>) => {
            state.alarmRecordTrackingSearch = action.payload;
        }

    },
});


export const {
    GetAlarms, SelectAlarm, SearchAlarm
} = AlarmSlice.actions;


export const fetchAlarm = () => async (dispatch: AppDispatch) => {
    try{
        const response = await axios.get(`${API_URL}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        dispatch(GetAlarms(response.data.collection?.data || []));
    } catch (err: any) {
        console.error("Error fetching Alarm: ", err);
    }
};

export default AlarmSlice.reducer;