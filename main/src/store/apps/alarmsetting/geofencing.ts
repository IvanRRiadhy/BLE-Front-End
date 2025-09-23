import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, dispatch, RootState } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { ensureMinLatency } from "src/utils/retry";
import { Save } from "@mui/icons-material";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type GeoFencingAlarmType = {
    id: string;
    name: string;
    remarks: string;
    areaShape: string;
    colorArea: string;
    behavior: string;
    isActive: boolean;
}

export type GetGeoFencingResponse = {
    RecordsTotal : number;
    RecordsFiltered : number;
    Draw : number;
    status : string;
    status_code : number;
    title : string;
    msg : string;
    collection : {
        data : GeoFencingAlarmType[];
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
};

interface StateType {
    geoFencingAlarms: GeoFencingAlarmType[];
    geoFencingAlarmFilter: GetFilter;
    geoFencingAlarmAll: GeoFencingAlarmType[];
    selectedGeoFencingAlarm: GeoFencingAlarmType | null;
    isLoading: boolean;
    hasLoaded: boolean;
        geoFencingAlarmTotalCount: number;
    geoFencingAlarmFilteredCount: number;
    geoFencingAlarmActiveCount: number;
};

const initialState: StateType = {
    geoFencingAlarms: [],
    geoFencingAlarmFilter: {
        Draw: 0,
        Start: 0,
        Length: 10,
        SortColumn: 'Name',
        SortDir: 'asc',
        SearchValue: '',
    },
    geoFencingAlarmAll: [],
    selectedGeoFencingAlarm: null,
    isLoading: false,
    hasLoaded: false,
    geoFencingAlarmTotalCount: 0,
    geoFencingAlarmFilteredCount: 0,
    geoFencingAlarmActiveCount: 0,
};

export const GeoFencingAlarmSlice = createSlice({
    name: "GeoFencingAlarm",
    initialState,
    reducers: {
        GetGeoFencingAlarms: (state, action: PayloadAction<GeoFencingAlarmType[]>) => {
            state.geoFencingAlarms = action.payload;
        },
        UpdateFilter: (state, action: PayloadAction<Partial<GetFilter>>) => {
            state.geoFencingAlarmFilter = {...state.geoFencingAlarmFilter, ...action.payload};
        },
        ChangeActiveStatus: (state, action: PayloadAction<{id: string; isActive: boolean}>) => {
            const index = state.geoFencingAlarms.findIndex(item => item.id === action.payload.id);
            if (index !== -1) {
                state.geoFencingAlarms[index].isActive = action.payload.isActive;
            }
        },  
        SetSelectedGeoFencingAlarm: (state, action: PayloadAction<GeoFencingAlarmType | null>) => {
            state.selectedGeoFencingAlarm = action.payload;
        },
        UpdateSelectedGeoFencingAlarm: (state, action: PayloadAction<Partial<GeoFencingAlarmType>>) => {
            if (state.selectedGeoFencingAlarm) {
                state.selectedGeoFencingAlarm = {...state.selectedGeoFencingAlarm, ...action.payload};
            }
        },
        SaveSelectedGeoFencingAlarm: (state) => {
            if (state.selectedGeoFencingAlarm) {
                const index = state.geoFencingAlarms.findIndex(item => item.id === state.selectedGeoFencingAlarm?.id);
                if (index !== -1) {
                    state.geoFencingAlarms[index] = state.selectedGeoFencingAlarm;
                }
            }
        },
    },
    extraReducers: (builder) => {
        builder
        .addCase(fetchGeoFencingAlarms.pending, (state) => {
            state.isLoading = true;
            state.hasLoaded = false;
        })
        .addCase(fetchGeoFencingAlarms.fulfilled, (state, action: PayloadAction<GeoFencingAlarmType[]>) => {
            state.isLoading = false;
            state.hasLoaded = true;
            state.geoFencingAlarms = action.payload;
            state.geoFencingAlarmTotalCount = action.payload.length;
            state.geoFencingAlarmFilteredCount = action.payload.length;
            state.geoFencingAlarmActiveCount = action.payload.filter(item => item.isActive).length;
        })
        .addCase(fetchGeoFencingAlarms.rejected, (state) => {
            state.isLoading = false;
            state.hasLoaded = false;
        });
    }
});

export const { 
    GetGeoFencingAlarms, 
    UpdateFilter, 
    ChangeActiveStatus,
    SetSelectedGeoFencingAlarm,
    UpdateSelectedGeoFencingAlarm,
    SaveSelectedGeoFencingAlarm
} = GeoFencingAlarmSlice.actions;

export const fetchGeoFencingAlarms = createAsyncThunk(
    'geoFencingAlarm/fetchGeoFencingAlarms',
    async (filter: GetFilter, thunkAPI) => {
        const started = Date.now();
        dispatch(GetGeoFencingAlarms(geofencingDummyData));

        await ensureMinLatency(started, 500);
        return geofencingDummyData;
    }
)


export default GeoFencingAlarmSlice.reducer;

const geofencingDummyData: GeoFencingAlarmType[] = [
    {
        id: '1',
        name: 'Geofencing Alarm 1',
        remarks: 'This is geofencing alarm 1',
        areaShape: '[{"id":"360","x":7.083787173969308,"y":3.0557261440590167,"x_px":502.3567774936061,"y_px":216.70113753181784},{"id":"675","x":7.083787173969308,"y":3.9144286547952056,"x_px":502.3567774936061,"y_px":277.59723950736395},{"id":"179","x":0.03325721677919863,"y":3.8902398516758767,"x_px":2.35848252344416,"y_px":275.8818563531232},{"id":"170","x":1.500852514919011,"y":0.5628600974852411,"x_px":1.500852514919011,"y_px":0.5628600974852412},{"id":"171","x":196.18286445012788,"y":1.4205516746056086,"x_px":196.18286445012788,"y_px":1.4205516746056088},{"id":"172","x":198.75575447570333,"y":217.5588291089382,"x_px":198.75575447570333,"y_px":217.55882910893823}]',
        colorArea: '#FF0000',
        behavior: 'Enter',
        isActive: true,
    },
    {
        id: '2',
        name: 'Geofencing Alarm 2',
        remarks: 'This is geofencing alarm 2',
        areaShape: '[{"id":"306","x":15.858521548096716,"y":2.9637521227652406,"x_px":1259.2839396628217,"y_px":235.34384576901425},{"id":"261","x":15.874176554560787,"y":3.7782811189478123,"x_px":1260.5270629991132,"y_px":300.02347433158326},{"id":"178","x":12.946690345780837,"y":3.7782811189478123,"x_px":1028.0629991126889,"y_px":300.02347433158326},{"id":"635","x":7.404818057502219,"y":3.7312890614757404,"x_px":587.9973380656611,"y_px":296.2919572991273},{"id":"425","x":7.436128070430348,"y":3.026408199394669,"x_px":590.4835847382433,"y_px":240.3192018122888},{"id":"472","x":12.93103533931677,"y":3.0577362377093835,"x_px":1026.8198757763976,"y_px":242.80687983392608},{"id":"169","x":1025.965344447458,"y":4.609862530962457,"x_px":1027.1928127772849,"y_px":3.3816875393011596},{"id":"170","x":1378.6394349532256,"y":6.461803759228113,"x_px":1379.8669032830526,"y_px":5.233628767566815},{"id":"171","x":1377.3963116169346,"y":239.0596987823128,"x_px":1378.6237799467615,"y_px":237.83152379065152}]',   
        colorArea: '#FF0000',
        behavior: 'Exit',
        isActive: false,
    }
]
