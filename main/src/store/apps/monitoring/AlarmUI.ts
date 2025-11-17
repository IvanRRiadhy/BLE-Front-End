import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AlarmType, MQTTAlarmType } from 'src/store/apps/tracking/Alarm';

type AlarmUiState = {
  latest: MQTTAlarmType | null;
  open: boolean;
};

const initialState: AlarmUiState = { latest: null, open: false };

const alarmUiSlice = createSlice({
  name: 'alarmUi',
  initialState,
  reducers: {
    showAlarmPopup(state, action: PayloadAction<MQTTAlarmType>) {
      state.latest = action.payload;
      state.open = true;
    },
    hideAlarmPopup(state) {
      state.open = false;
    },
    clearAlarm(state) {
      state.latest = null;
      state.open = false;
    },
  },
});

export const { showAlarmPopup, hideAlarmPopup, clearAlarm } = alarmUiSlice.actions;
export default alarmUiSlice.reducer;
