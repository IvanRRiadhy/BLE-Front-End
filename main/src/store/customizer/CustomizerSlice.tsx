import { createSlice } from '@reduxjs/toolkit';

interface StateType {
  activeDir?: string | any;
  activeMode?: string; // This can be light or dark
  activeTheme?: string; // BLUE_THEME, GREEN_THEME, BLACK_THEME, PURPLE_THEME, ORANGE_THEME
  SidebarWidth?: number;
  MiniSidebarWidth?: number;
  TopbarHeight?: number;
  isCollapse?: boolean;
  isLayout?: string;
  isSidebarHover?: boolean;
  isMobileSidebar?: boolean;
  isHorizontal?: boolean;
  isLanguage?: string;
  isCardShadow?: boolean;
  borderRadius?: number | any;
  customizer?: boolean;
  isMonitor?: boolean;
  isMonitorSidebar?: boolean;
  isMainMenu?: boolean;
  dashboardFilter?:{
    BuildingId: string[];
    FloorId: string[];
    FloorplanId: string[];
    FloorplanMaskedAreaId: string[];
  }
    evacState?: 'idle' | 'running' | 'finished';
}

const initialState: StateType = {
  activeDir: 'ltr',
  activeMode: 'light', // This can be light or dark
  activeTheme: 'BLUE_THEME', // BLUE_THEME, GREEN_THEME, BLACK_THEME, PURPLE_THEME, ORANGE_THEME
  SidebarWidth: 270,
  MiniSidebarWidth: 0,
  TopbarHeight: 70,
  isLayout: 'full', // This can be full or boxed
  isCollapse: false, // to make sidebar Mini by default
  isSidebarHover: false,
  isMobileSidebar: false,
  isHorizontal: true,
  isLanguage: 'en',
  isCardShadow: true,
  borderRadius: 7,
  customizer: true,
  isMonitor: false,
  isMonitorSidebar: false,
  isMainMenu: false,
    evacState: 'idle',
};

export const CustomizerSlice = createSlice({
  name: 'customizer',
  initialState,
  reducers: {
    setTheme: (state: StateType, action) => {
      state.activeTheme = action.payload;
    },
    setDarkMode: (state: StateType, action) => {
      state.activeMode = action.payload;
    },

    setDir: (state: StateType, action) => {
      state.activeDir = action.payload;
    },
    setLanguage: (state: StateType, action) => {
      state.isLanguage = action.payload;
    },
    setCardShadow: (state: StateType, action) => {
      state.isCardShadow = action.payload;
    },
    toggleSidebar: (state) => {
      state.isCollapse = !state.isCollapse;
    },
    hoverSidebar: (state: StateType, action) => {
      state.isSidebarHover = action.payload;
    },
    toggleMobileSidebar: (state) => {
      state.isMobileSidebar = !state.isMobileSidebar;
    },
    toggleLayout: (state: StateType, action) => {
      state.isLayout = action.payload;
    },
    toggleHorizontal: (state: StateType, action) => {
      state.isHorizontal = action.payload;
    },
    setBorderRadius: (state: StateType, action) => {
      state.borderRadius = action.payload;
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
  },
});

export const {
  setTheme,
  setDarkMode,
  setDir,
  toggleSidebar,
  hoverSidebar,
  toggleMobileSidebar,
  toggleLayout,
  setBorderRadius,
  toggleHorizontal,
  setLanguage,
  setCardShadow,
  setCustomizer,
  setMonitor,
  setMonitorSidebar,
  setMainMenu,
  setDashboardFilter,
    setEvacuationState,
      hydrateEvacState,
} = CustomizerSlice.actions;

export default CustomizerSlice.reducer;
