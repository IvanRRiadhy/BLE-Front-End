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
  isCardShadow: boolean;
  borderRadius: number;
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
  isCardShadow: true,
  borderRadius: 7,
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
} = SettingsSlice.actions;

export default SettingsSlice.reducer;
