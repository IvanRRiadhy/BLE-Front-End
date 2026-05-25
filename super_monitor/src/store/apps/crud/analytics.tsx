import axiosServices from "../../../utils/axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { defaultAlarmTriggerFilter } from "../defaultForm";
import { ensureMinLatency, retryUntilSuccess } from "src/utils/retry";
import { FloorplanType } from "./floorplan";

const API_ALARM_URL = "/api/AlarmAnalytics";
const API_URL = "/api/AlarmTriggers/";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type GetFilter = {
    from: string,   
    to: string,
    floorplanMaskedAreaId: string | null,
    operatorName: string | null,
    visitorId: string | null,
    buildingId: string | null,
    floorId: string | null,
}

export const fetchDailyReport = createAsyncThunk(
    "alarmAnalytics/fetchDailyReport",
    async(filter: GetFilter, thunkApi) => {
        const started = Date.now();
        const res = await retryUntilSuccess( 
            () => axiosServices.post(`${API_ALARM_URL}/daily`, filter),
            {
                signal: thunkApi.signal,
                timeoutMs: 2 * 60 * 1000,
                minDelay: 500,
                maxDelay: 8000,
            }
        );
        await ensureMinLatency(started, 500);
        return res.data.data;
})