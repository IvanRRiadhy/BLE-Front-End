import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AlarmType } from 'src/store/apps/tracking/Alarm';

export type AlarmToast = {
  id: string;
  alarm: AlarmType;
  title?: string;
  message?: string;
};

type State = {
  open: boolean;
  items: AlarmToast[];
  unread: number;
};

const initialState: State = { open: false, items: [], unread: 0 };

const slice = createSlice({
  name: 'notifyUi',
  initialState,
  reducers: {
    openPanel(s) { s.open = true; },
    closePanel(s) { s.open = false; s.unread = 0; },
    pushItem(s, a: PayloadAction<AlarmToast>) {
      s.items.unshift(a.payload);
      s.unread += 1;
      // keep last 50
      if (s.items.length > 50) s.items.pop();
    },
    dismissItem(s, a: PayloadAction<string>) {
      s.items = s.items.filter(i => i.id !== a.payload);
    },
    clearAll(s) { s.items = []; s.unread = 0; },
  },
});

export const { openPanel, closePanel, pushItem, dismissItem, clearAll } = slice.actions;
export default slice.reducer;
