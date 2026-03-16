import axiosServices from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { dispatch } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { ensureMinLatency, retryUntilSuccess } from 'src/utils/retry';

type TimeRange = {
    start: string,
    end: string,
    totalDuration: string,
}

type Summary = {
    totalFrames: number,
    preAlarmFrames: number,
    duringAlarmFrames: number,
    postAlarmFrames: number,
    dataSources: {
        database: boolean,
        ndjson: boolean,
    },
};

export type FramesType = {
    time: string,
    x: number,
    y: number,
    areaId: string,
    restricted: boolean,
    phase: string,
    source: string,
    sequence: number,
}
export type metaDataType = {
    alarmTriggerId: string,
    alarmTime: string,
    alarmEndTime: string,
    cardId: string,
    beaconId: string,
    floorplanId: string,
    floorplanName: string,
    floorplanImage: string,
    personType: string,
    personName: string,
    category: string,
    action: string,
    timeRange: TimeRange,
}

export type AlarmPlaybackDataType = {
    meta: metaDataType,
    summary: Summary,
    frames: FramesType[],
}