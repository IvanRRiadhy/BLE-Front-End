import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { floor } from 'lodash';
import { AppDispatch } from 'src/store/Store';
import axiosServices from 'src/utils/axios';
import { v4 as uuidv4 } from 'uuid';

const API_URL = '/api/MonitoringConfig/';

export const screenOrderMap: { [grid: number]: Array<[number, number?, number?]> } = {
  1: [[0]],
  2: [[0], [1]],
  3: [[0], [1, 0], [1, 1]],
  4: [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  5: [
    [0, 0],
    [1, 0],
    [0, 1, 0],
    [0, 1, 1],
    [1, 1],
  ],
  6: [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1, 0],
    [0, 1, 1],
    [1, 2],
  ],
};
export interface LayoutItem {
  size: { xs: number; lg?: number };
  floorId?: number;
  height?: string;
  isColumn?: boolean;
  children?: LayoutItem[];
  isScrollableRow?: boolean;
}

export const gridLayoutConfig: Record<number, LayoutItem[]> = {
  1: [{ size: { xs: 12 }, floorId: 0, height: '78vh' }],

  2: [
    { size: { xs: 12, lg: 6 }, floorId: 0, height: '78vh' },
    { size: { xs: 12, lg: 6 }, floorId: 1, height: '78vh' },
  ],

  3: [
    { size: { xs: 12, lg: 6 }, floorId: 0, height: '78vh' },
    {
      size: { xs: 12, lg: 6 },
      isColumn: true,
      children: [
        { size: { xs: 12 }, floorId: 1, height: '38.5vh' },
        { size: { xs: 12 }, floorId: 2, height: '38.5vh' },
      ],
    },
  ],

  4: [
    {
      size: { xs: 12, lg: 6 },
      isColumn: true,
      children: [
        { size: { xs: 12 }, floorId: 0, height: '38.5vh' },
        { size: { xs: 12 }, floorId: 1, height: '38.5vh' },
      ],
    },
    {
      size: { xs: 12, lg: 6 },
      isColumn: true,
      children: [
        { size: { xs: 12 }, floorId: 2, height: '38.5vh' },
        { size: { xs: 12 }, floorId: 3, height: '38.5vh' },
      ],
    },
  ],

  5: [
    {
      size: { xs: 12, lg: 8 },
      isColumn: true,
      children: [
        { size: { xs: 12 }, floorId: 0, height: '50vh' },
        {
          size: { xs: 12 },
          isColumn: false,
          children: [
            { size: { xs: 12, lg: 6 }, floorId: 2, height: '27vh' },
            { size: { xs: 12, lg: 6 }, floorId: 3, height: '27vh' },
          ],
        },
      ],
    },
    {
      size: { xs: 12, lg: 4 },
      isColumn: true,
      children: [
        { size: { xs: 12 }, floorId: 1, height: '38.5vh' },
        { size: { xs: 12 }, floorId: 4, height: '38.5vh' },
      ],
    },
  ],

  6: [
    {
      size: { xs: 12, lg: 8 },
      isColumn: true,
      children: [
        { size: { xs: 12 }, floorId: 0, height: '50vh' },
        {
          size: { xs: 12 },
          isColumn: false,
          children: [
            { size: { xs: 12, lg: 6 }, floorId: 3, height: '27vh' },
            { size: { xs: 12, lg: 6 }, floorId: 4, height: '27vh' },
          ],
        },
      ],
    },
    {
      size: { xs: 12, lg: 4 },
      isColumn: true,
      children: [
        { size: { xs: 12 }, floorId: 1, height: '24.5vh' },
        { size: { xs: 12 }, floorId: 2, height: '24.5vh' },
        { size: { xs: 12 }, floorId: 5, height: '27vh' },
      ],
    },
  ],
  7: [
    {
      size: { xs: 12 }, // full width wrapper
      isColumn: true,
      children: [
        // Large main screen
        {
          size: { xs: 12 },
          floorId: 0,
          height: '60vh',
        },

        // Dynamic horizontal scroll list of screens
        {
          size: { xs: 12 },
          isScrollableRow: true, // <-- our custom flag
        },
      ],
    },
  ],
};

export type ScreenSettings = {
  scale: number;
  translateX: number;
  translateY: number;
};

export type ScreenDisplay = {
  displayType: number; // 0: floorplan, 1: masked area, 2: CCTV, 3: Beacon Follow
  displayOutput: string;
};

export type ScreenItem = {
  id: string; // unique per screen
  floorplanId?: string;
  display: ScreenDisplay;
  settings: ScreenSettings;
};

export type LayoutSet = {
  id: string; // unique identifier for this saved layout
  name: string; // user-friendly name
  description: string;
  grid: number; // number of screens (1-6)
  screens: ScreenItem[]; // list of screen items
  focus?: { type: string; id: string }; // optional focus info
};

const defaultScreen = (): ScreenItem => ({
  id: uuidv4(),
  floorplanId: '',
  display: { displayType: 0, displayOutput: '' },
  settings: { scale: 1, translateX: 0, translateY: 0 },
});

export interface LayoutState {
  activeLayoutId: string | null;
  layouts: LayoutSet[];
  selectedScreen: number | null;
  selectedFloorplanId: string | null;
  isLoading: boolean;
  hasLoaded: boolean;
}

export const initialState: LayoutState = {
  activeLayoutId: null,
  layouts: [
    {
      id: uuidv4(),
      name: 'Default Layout',
      description: '',
      grid: 2,
      screens: [defaultScreen(), defaultScreen()],
      focus: { type: '', id: '' },
    },
  ],
  selectedScreen: null,
  selectedFloorplanId: null,
  isLoading: false,
  hasLoaded: false,
};

export const LayoutSlice = createSlice({
  name: 'layout',
  initialState,
  reducers: {
    // Set active layout
    setActiveLayout: (state, action: PayloadAction<string>) => {
      state.activeLayoutId = action.payload;
    },

    getLayouts: (state, action: PayloadAction<LayoutSet[]>) => {
      state.layouts = action.payload;
    },

    // Add a new layout
    addLayout: (state, action: PayloadAction<{ name: string; grid: number }>) => {
      const newId = uuidv4();
      const newLayout: LayoutSet = {
        id: `layout-${newId}`,
        name: action.payload.name,
        description: '',
        grid: action.payload.grid,
        screens: Array.from({ length: action.payload.grid }, () => defaultScreen()),
      };

      // ensure layouts exists
      if (!state.layouts) state.layouts = [];
      state.layouts.push(newLayout);
      state.activeLayoutId = newId;
    },

    // Update layout name
    updateLayoutName: (state, action: PayloadAction<{ layoutId: string; name: string }>) => {
      const layout = state.layouts.find((l) => l.id === action.payload.layoutId);
      if (layout) layout.name = action.payload.name;
    },

    // Update grid (add/remove screens as needed)
    updateLayoutGrid: (state, action: PayloadAction<{ layoutId: string; grid: number }>) => {
      const layout = state.layouts.find((l) => l.id === action.payload.layoutId);
      if (layout) {
        layout.grid = action.payload.grid;
        layout.screens = Array.from(
          { length: action.payload.grid },
          (_, i) => layout.screens[i] ?? defaultScreen(),
        );
      }
    },

    // Update screen's floorplanId
    setScreenFloorplan: (
      state,
      action: PayloadAction<{ layoutId: string; screenId: string; floorplanId: string }>,
    ) => {
      const layout = state.layouts.find((l) => l.id === action.payload.layoutId);
      const screen = layout?.screens.find((s) => s.id === action.payload.screenId);
      if (screen) screen.floorplanId = action.payload.floorplanId.toLowerCase();
    },

    // Update screen display
    setScreenDisplay: (
      state,
      action: PayloadAction<{ layoutId: string; screenId: string; display: ScreenDisplay }>,
    ) => {
      const layout = state.layouts.find((l) => l.id === action.payload.layoutId);
      const screen = layout?.screens.find((s) => s.id === action.payload.screenId);
      if (screen) screen.display = action.payload.display;
    },

    // Update screen settings
    setScreenSettings: (
      state,
      action: PayloadAction<{ layoutId: string; screenId: string; settings: ScreenSettings }>,
    ) => {
      const layout = state.layouts.find((l) => l.id === action.payload.layoutId);
      const screen = layout?.screens.find((s) => s.id === action.payload.screenId);
      if (screen) screen.settings = action.payload.settings;
    },

    // Reset a screen
    resetScreen: (state, action: PayloadAction<{ layoutId: string; screenId: string }>) => {
      const layout = state.layouts.find((l) => l.id === action.payload.layoutId);
      const screenIndex = layout?.screens.findIndex((s) => s.id === action.payload.screenId);
      if (screenIndex !== undefined && screenIndex >= 0 && layout) {
        layout.screens[screenIndex] = defaultScreen();
      }
    },

    // Remove a layout
    removeLayout: (state, action: PayloadAction<string>) => {
      state.layouts = state.layouts.filter((l) => l.id !== action.payload);
      if (state.activeLayoutId === action.payload) state.activeLayoutId = null;
    },
    setFocus: (state, action: PayloadAction<{ type: string; id: string }>) => {
      const activeLayout = state.layouts.find((l) => l.id === state.activeLayoutId);
      if (activeLayout) {
        activeLayout.focus = { type: action.payload.type, id: action.payload.id };
      }
    },
    setSelectedScreen: (state, action: PayloadAction<number | null>) => {
      state.selectedScreen = action.payload;
    },

    setSelectedFloorplan: (state, action: PayloadAction<string | null>) => {
      state.selectedFloorplanId = action.payload;
    },
    updateActiveLayoutInfo: (
      state,
      action: PayloadAction<{
        name?: string;
        description?: string;
        screens?: ScreenItem[];
        grid?: number;
      }>,
    ) => {
      const activeLayout = state.layouts.find((l) => l.id === state.activeLayoutId);
      if (!activeLayout) return;

      if (typeof action.payload.name !== 'undefined') activeLayout.name = action.payload.name;
      if (typeof action.payload.description !== 'undefined')
        activeLayout.description = action.payload.description;

      if (typeof action.payload.screens !== 'undefined')
        activeLayout.screens = action.payload.screens;
    },
    clearActiveLayout: (state) => {
      const activeLayout = state.layouts.find((l) => l.id === state.activeLayoutId);
      if (activeLayout) {
        activeLayout.screens = activeLayout.screens.map((s) => ({
          ...s,
          floorplanId: '',
          display: { displayType: 0, displayOutput: '' },
        }));
      }
    },
    // Swap selected screen with the first screen (index 0)
    swapScreen: (state, action: PayloadAction<number>) => {
      const activeLayout = state.layouts.find((l) => l.id === state.activeLayoutId);
      if (!activeLayout) return;

      const targetIndex = action.payload - 1;
      if (targetIndex < 0 || targetIndex >= activeLayout.screens.length) return;
      console.log('Swapping screens before:', JSON.stringify(activeLayout.screens));
      // Swap the two screens
      const temp = activeLayout.screens[0];
      activeLayout.screens[0] = activeLayout.screens[targetIndex];
      activeLayout.screens[targetIndex] = temp;
      console.log('Swapping screens after:', JSON.stringify(activeLayout.screens));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(editMonitoringLayout.fulfilled, (state, action) => {
        const updatedLayout = action.payload;
        const index = state.layouts.findIndex((l) => l.id === updatedLayout.id);
        if (index !== -1) {
          state.layouts[index] = updatedLayout;
        }
      })
      .addCase(deleteMonitoringLayout.fulfilled, (state, action) => {
        const deletedId = action.payload;
        state.layouts = state.layouts.filter((l) => l.id !== deletedId);
        if (state.activeLayoutId === deletedId) {
          state.activeLayoutId = null;
        }
      });
  },
});

export const {
  setActiveLayout,
  getLayouts,
  addLayout,
  updateLayoutName,
  updateLayoutGrid,
  setScreenFloorplan,
  setScreenDisplay,
  setScreenSettings,
  resetScreen,
  removeLayout,
  setFocus,
  setSelectedScreen,
  setSelectedFloorplan,
  updateActiveLayoutInfo,
  clearActiveLayout,
  swapScreen,
} = LayoutSlice.actions;

export const fetchMonitoringLayouts = () => async (dispatch: AppDispatch) => {
  try {
    const response = await axiosServices.get(`${API_URL}`);
    const data = response.data.collection.data || [];

    // Deserialize config JSON
    const layouts: LayoutSet[] = data.map((item: any) => {
      let parsedConfig = { grid: 1, screens: [], focus: undefined };
      try {
        parsedConfig = JSON.parse(item.config ?? '{}');
      } catch (err) {
        console.warn('Invalid layout config JSON:', err);
      }

      return {
        id: item.id,
        floorplanId: item.floorplanId,
        name: item.name,
        description: item.description ?? '',
        grid: parsedConfig.grid ?? 1,
        screens: parsedConfig.screens ?? [],
        focus: parsedConfig.focus,
      };
    });
    console.log('Fetched monitoring layouts:', layouts);
    dispatch(getLayouts(layouts));
  } catch (err: any) {
    console.error('Fetch monitoring layouts failed:', err);
    throw new Error(err);
  }
};

export const addMonitoringLayout = createAsyncThunk(
  'layout/addMonitoringLayout',
  async (layout: LayoutSet, thunkAPI) => {
    try {
      // Build config JSON
      const configObj = {
        grid: layout.grid,
        screens: layout.screens,
        focus: layout.focus,
      };

      const payload = {
        name: layout.name,
        description: layout.description ?? '',
        config: JSON.stringify(configObj),
      };
      console.log('Add monitoring layout payload:', payload);
      const response = await axiosServices.post(`${API_URL}`, payload);
      return response.data;
    } catch (err: any) {
      console.error('Add monitoring layout failed:', err);
      throw new Error(err);
    }
  },
);

export const editMonitoringLayout = createAsyncThunk(
  'layout/editMonitoringLayout',
  async (layout: LayoutSet, thunkAPI) => {
    try {
      // Build config JSON
      const configObj = {
        grid: layout.grid,
        screens: layout.screens,
        focus: layout.focus,
      };

      const payload = {
        name: layout.name,
        description: layout.description ?? '',
        config: JSON.stringify(configObj),
      };
      console.log('Edit monitoring layout payload:', payload);
      const response = await axiosServices.put(`${API_URL}${layout.id}`, payload);
      return response.data;
    } catch (err: any) {
      console.error('Edit monitoring layout failed:', err);
      throw new Error(err);
    }
  },
);

export const deleteMonitoringLayout = createAsyncThunk(
  'layout/deleteMonitoringLayout',
  async (layoutId: string, thunkAPI) => {
    try {
      await axiosServices.delete(`${API_URL}${layoutId}`);
      return layoutId;
    } catch (err: any) {
      console.error('Delete monitoring layout failed:', err);
      throw new Error(err);
    }
  },
);

export default LayoutSlice.reducer;
