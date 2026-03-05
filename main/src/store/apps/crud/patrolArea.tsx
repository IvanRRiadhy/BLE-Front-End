import axiosServices, { BASE_URL } from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch, dispatch } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { isValidJsonString } from 'src/utils/isJsonObject';

const API_URL = '/api/patrol-area/';
const API_URL_FILTER = '/api/patrol-area/filter/';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type GetFilter = {
  Draw: number;
  Start: number;
  Length: number;
  SortColumn: string;
  SortDir: 'asc' | 'desc';
  SearchValue: string;
  filters: {
    FloorplanId: string;
    FloorId: string;
  };
};

type Nodes = {
  id: string;
  type: string;
  x: number;
  y: number;
  x_px: number;
  y_px: number;
};

export type PatrolAreaType = {
  id: string;
  name: string;
  remarks: string;
  areaShape: string;
  color: string;
  floorplanId: string;
  floorplanName?: string;
  floorId: string;
  floorName?: string;
  isActive: boolean;
  nodes?: Nodes[];
  status?: number;
  applicationId?: string;
};

interface StateType {
  patrolAreas: PatrolAreaType[];
  patrolAreaAll: PatrolAreaType[];
  originalPatrolAreas: PatrolAreaType[];
  unsavedPatrolAreas: PatrolAreaType[];
  patrolAreaSearch: string;
  isDrawing: boolean;
  selectedPatrolArea: PatrolAreaType | null;
  editingPatrolArea?: PatrolAreaType | null;
  deletedPatrolArea?: PatrolAreaType[];
  addedPatrolArea: PatrolAreaType[];
  drawingPatrolArea?: string;
  patrolAreaTotalCount: number;
  patrolAreaFilteredCount: number;
  patrolAreaFilter: GetFilter;
  lastFilter?: GetFilter;
  isLoading: boolean;
  hasLoaded: boolean;
}

const initialState: StateType = {
  patrolAreas: [],
  patrolAreaAll: [],
  originalPatrolAreas: [],
  unsavedPatrolAreas: [],
  patrolAreaSearch: '',
  isDrawing: false,
  selectedPatrolArea: null,
  editingPatrolArea: null,
  deletedPatrolArea: [],
  addedPatrolArea: [],
  drawingPatrolArea: '',
  patrolAreaTotalCount: 0,
  patrolAreaFilteredCount: 0,
  patrolAreaFilter: {
    Draw: 0,
    Start: 0,
    Length: 999,
    SortColumn: '',
    SortDir: 'asc',
    SearchValue: '',
    filters: {
      FloorplanId: "",
      FloorId: "",
    },
  },
  lastFilter: {
    Draw: 0,
    Start: 0,
    Length: 999,
    SortColumn: '',
    SortDir: 'asc',
    SearchValue: '',
    filters: {
      FloorplanId: "",
      FloorId: "",
    },
  },
  isLoading: false,
  hasLoaded: false,
};
 
export const PatrolAreaSlice = createSlice({
    name: "patrolArea",
    initialState,
    reducers: {
        GetPatrolArea: (state, action: PayloadAction<PatrolAreaType[]>) => {
            state.patrolAreas = action.payload;
             console.log("Patrol Areas: ", JSON.stringify(state.patrolAreas, null, 2));
        },
        GetAllPatrolArea: (state, action: PayloadAction<PatrolAreaType[]>) => {
            state.patrolAreaAll = action.payload;
                        state.originalPatrolAreas = action.payload;
        },
        GetUnsavedPatrolArea: (state) => {
            state.unsavedPatrolAreas = state.patrolAreaAll;
        },
        SelectPatrolArea: (state, action) => {
            const selected = state.unsavedPatrolAreas.find((patrolAreaAll: PatrolAreaType) => patrolAreaAll.id === action.payload);
            state.selectedPatrolArea = selected || null;
        },
        SelectEditingPatrolArea: (state, action) => {
            const selected = state.unsavedPatrolAreas.find((patrolAreaAll: PatrolAreaType) => patrolAreaAll.id === action.payload);
            state.editingPatrolArea = selected || null;
        },
        SearchPatrolArea: (state, action: PayloadAction<string>) => {
            state.patrolAreaSearch = action.payload;
        },
        AddUnsavedPatrolArea: (state, action: PayloadAction<PatrolAreaType>) => {
            state.unsavedPatrolAreas.push(action.payload);
        },
        EditUnsavedPatrolArea: (state, action: PayloadAction<PatrolAreaType>) => {
            const index = state.unsavedPatrolAreas.findIndex((patrolAreaAll) => patrolAreaAll.id === action.payload.id);
            if (index !== -1) {
                // Create a new array with the updated area
                state.unsavedPatrolAreas = state.unsavedPatrolAreas.map((patrolAreaAll, i) =>
                    i === index ? {...patrolAreaAll, ...action.payload} : patrolAreaAll
                );
                // Update the editingPatrolArea immutably
                state.editingPatrolArea = {
                    ...state.editingPatrolArea,
                    ...action.payload,
                };
            }
        },
        EditPatrolAreaPosition: (state, action: PayloadAction<PatrolAreaType>) => {
            const index = state.unsavedPatrolAreas.findIndex((patrolAreaAll) => patrolAreaAll.id === action.payload.id);
            if (index !== -1) {
                // Create a new array with the updated area
                state.unsavedPatrolAreas = state.unsavedPatrolAreas.map((patrolAreaAll, i) =>
                    i === index ? {...patrolAreaAll, areaShape: action.payload.areaShape, nodes: action.payload.nodes} : patrolAreaAll
                );
        
                // Update the editingPatrolArea immutably   
                if(state.editingPatrolArea) {
                state.editingPatrolArea = {
                    ...state.editingPatrolArea,
                    areaShape: action.payload.areaShape,
                    nodes: action.payload.nodes,
                };
            };
            }
        },
        SavePatrolArea: (state, action: PayloadAction<string>) => {
            const index = state.unsavedPatrolAreas.findIndex((patrolAreaAll) => patrolAreaAll.id === action.payload);
            if (index !== -1 && state.patrolAreaAll[index] ) {
                if(state.patrolAreaAll[index].id !== action.payload)return;
                if(state.patrolAreaAll[index].id === state.unsavedPatrolAreas[index].id) {
                    state.patrolAreaAll[index] = state.unsavedPatrolAreas[index];
                }
            }
            else {
                state.patrolAreaAll.push(state.unsavedPatrolAreas[index]);
                state.addedPatrolArea.push(state.unsavedPatrolAreas[index]);
            }
        },
        DeleteUnsavedPatrolArea: (state, action: PayloadAction<string>) => {
            const index = state.unsavedPatrolAreas.findIndex((patrolAreaAll) => patrolAreaAll.id === action.payload);
            if (index !== -1) {
                state.deletedPatrolArea?.push(state.unsavedPatrolAreas[index]);
                state.unsavedPatrolAreas.splice(index, 1);                
            } else {
                console.warn(`Area with ID ${action.payload} not found in unsaved Area.`);
            }
        },
        RevertPatrolArea: {
            reducer: (state, action: PayloadAction<{id: string}>) => {
                const index = state.unsavedPatrolAreas.findIndex((patrolAreaAll) => patrolAreaAll.id === action.payload.id);
                const area = state.patrolAreas.find((patrolAreaAll) => patrolAreaAll.id === action.payload.id);
                if(index !== -1) {
                    const area = state.unsavedPatrolAreas[index];
                    //Check if status is valid
                    // const validStatus = restrictedStatus.map((status) => status.value);
                    console.log("Status", area.areaShape);
                    if( area.areaShape === "" || !isValidJsonString(area.areaShape)) {
                        state.unsavedPatrolAreas.splice(index, 1);
                        console.log("area", area.areaShape,  isValidJsonString(area.areaShape));
                        return;
                    }
                }
                if(area) {
                    if(state.selectedPatrolArea?.id === action.payload.id) {
                        state.selectedPatrolArea = area;
                    }
                    if(index !== -1) {

                        state.unsavedPatrolAreas[index] = area;
                        state.editingPatrolArea = null; 
                    }
                }
            },
            prepare: (id: string) => ({
                payload: {id},
            })
        },
        ResetAreaState: (state) => {
            state.deletedPatrolArea = [];
            state.addedPatrolArea = [];
            state.selectedPatrolArea = null;
            state.editingPatrolArea = null;
        },
        DrawingPatrolArea: (state, action: PayloadAction<string>) => {
            state.drawingPatrolArea = action.payload;
        },
        UpdateFilter: (state: StateType, action: PayloadAction<Partial<GetFilter>>) => {
          state.patrolAreaFilter = { ...state.patrolAreaFilter, ...action.payload };
        },
        SetIsDrawing: (state: StateType, action: PayloadAction<boolean>) => {
            state.isDrawing = action.payload;
        }
    },
});

export const {
    GetPatrolArea,
    GetAllPatrolArea,
    SelectPatrolArea,
    SearchPatrolArea,
    AddUnsavedPatrolArea,
    EditUnsavedPatrolArea,
    DeleteUnsavedPatrolArea,
    RevertPatrolArea,
    SelectEditingPatrolArea,
    GetUnsavedPatrolArea,
    SavePatrolArea,
    DrawingPatrolArea,
    ResetAreaState,
    EditPatrolAreaPosition,
    UpdateFilter,
    SetIsDrawing,
} = PatrolAreaSlice.actions;

export default PatrolAreaSlice.reducer; 