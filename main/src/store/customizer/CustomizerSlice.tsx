import { createSlice } from '@reduxjs/toolkit';

interface StateType {
  isCollapse?: boolean;
  isSidebarHover?: boolean;
  isMobileSidebar?: boolean;
  isHorizontal?: boolean;
  customizer?: boolean;
  isMonitor?: boolean;
  isMonitorSidebar?: boolean;
  isMainMenu?: boolean;
  dashboardFilter?: {
    TimeRange?: string;
    BuildingId: string[];
    FloorId: string[];
    FloorplanId: string[];
    FloorplanMaskedAreaId: string[];
  };
  evacState?: 'idle' | 'running' | 'finished';
}

const initialState: StateType = {
  isCollapse: true, // to make sidebar Mini by default
  isSidebarHover: false,
  isMobileSidebar: false,
  isHorizontal: true,
  customizer: true,
  isMonitor: false,
  isMonitorSidebar: false,
  isMainMenu: false,
  dashboardFilter: {
    TimeRange: 'daily',
    BuildingId: [],
    FloorId: [],
    FloorplanId: [],
    FloorplanMaskedAreaId: [],
  },
  evacState: 'idle',
};

export const CustomizerSlice = createSlice({
  name: 'customizer',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.isCollapse = !state.isCollapse;
    },
    hoverSidebar: (state: StateType, action) => {
      state.isSidebarHover = action.payload;
    },
    toggleMobileSidebar: (state) => {
      state.isMobileSidebar = !state.isMobileSidebar;
    },
    toggleHorizontal: (state: StateType, action) => {
      state.isHorizontal = action.payload;
    },
    setCustomizer: (state: StateType, action) => {
      state.customizer = action.payload;
    },
    setMonitor: (state: StateType, action) => {
      state.isMonitor = action.payload;
    },
    setMonitorSidebar: (state: StateType, action) => {
      state.isMonitorSidebar = action.payload;
    },
    setMainMenu: (state: StateType, action) => {
      state.isMainMenu = action.payload;
    },
    setDashboardFilter: (state: StateType, action) => {
      state.dashboardFilter = action.payload;
      console.log('Dashboard Filter Set:', state.dashboardFilter);
    },
    setEvacuationState: (state: StateType, action) => {
      state.evacState = action.payload;
      // Save to localStorage for persistence
      localStorage.setItem('evacState', JSON.stringify(action.payload));
    },
    hydrateEvacState: (state: StateType, action) => {
      state.evacState = action.payload;
    },
    setCollapse: (state: StateType, action) => {
      state.isCollapse = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  hoverSidebar,
  toggleMobileSidebar,
  toggleHorizontal,
  setCustomizer,
  setMonitor,
  setMonitorSidebar,
  setMainMenu,
  setDashboardFilter,
  setEvacuationState,
  hydrateEvacState,
  setCollapse,
} = CustomizerSlice.actions;

export default CustomizerSlice.reducer;

