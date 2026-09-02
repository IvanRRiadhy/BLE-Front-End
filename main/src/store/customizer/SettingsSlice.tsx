import { createSlice } from '@reduxjs/toolkit';

interface SettingsState {
  activeDir: string;
  activeMode: string;
  activeTheme: string;
  SidebarWidth: number;
  MiniSidebarWidth: number;
  TopbarHeight: number;
  isLayout: string;
  isLanguage: string;
  notificationSetting: 'notify' | 'mute'
  isCardShadow: boolean;
  borderRadius: number;
  beaconIconType: 'person' | 'pin' | 'photo' | 'custom';
  customSvgPath: string;
  customSvgScale: number;
  customSvgOffsetX: number;
  customSvgOffsetY: number;
  trackingMode: "Live" | "Count";
}

const initialState: SettingsState = {
  activeDir: 'ltr',
  activeMode: 'light',
  activeTheme: 'BLUE_THEME',
  SidebarWidth: 280,
  MiniSidebarWidth: 0,
  TopbarHeight: 70,
  isLayout: 'full',
  isLanguage: 'en',
  notificationSetting:'notify',
  isCardShadow: true,
  borderRadius: 7,
  beaconIconType: 'person',
  customSvgPath: '',
  customSvgScale: 1,
  customSvgOffsetX: 0,
  customSvgOffsetY: 0,
  trackingMode: "Live",
};

export const SettingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.activeTheme = action.payload;
    },
    setDarkMode: (state, action) => {
      state.activeMode = action.payload;
    },
    setDir: (state, action) => {
      state.activeDir = action.payload;
    },
    setLanguage: (state, action) => {
      state.isLanguage = action.payload;
    },
    setCardShadow: (state, action) => {
      state.isCardShadow = action.payload;
    },
    toggleLayout: (state, action) => {
      state.isLayout = action.payload;
    },
    setBorderRadius: (state, action) => {
      state.borderRadius = action.payload;
    },
    setBeaconIconType: (state, action) => {
      state.beaconIconType = action.payload;
    },
    setCustomSvgPath: (state, action) => {
      state.customSvgPath = action.payload;
    },
    setCustomSvgScale: (state, action) => {
      state.customSvgScale = action.payload;
    },
    setCustomSvgOffsetX: (state, action) => {
      state.customSvgOffsetX = action.payload;
    },
    setCustomSvgOffsetY: (state, action) => {
      state.customSvgOffsetY = action.payload;
    },
    setNotificationSetting: (state, action) => {
      state.notificationSetting = action.payload;
    },
    setTrackingMode: (state, action) => {
      state.trackingMode = action.payload;
    },
  },
});

export const {
  setTheme,
  setDarkMode,
  setDir,
  setLanguage,
  setCardShadow,
  toggleLayout,
  setBorderRadius,
  setBeaconIconType,
  setCustomSvgPath,
  setCustomSvgScale,
  setCustomSvgOffsetX,
  setCustomSvgOffsetY,
  setNotificationSetting,
  setTrackingMode,
} = SettingsSlice.actions;

export default SettingsSlice.reducer;
