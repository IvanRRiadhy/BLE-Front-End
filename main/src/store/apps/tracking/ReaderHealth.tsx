import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from 'src/store/Store';
import { startMQTTclient } from './MQTT';

export interface healthCheckMessage {
  msg: string;
  utc: number;
  hver: string;
  ver: string;
  wanIP: string;
  model: string;
  gmac: string;
  temp: number;
  lowVoltage: number;
  voltageDjk: number;
  load: number;
  mem_free: number;
  uptime: number;
  state: number;
  blever: string;
  subaction: string;
  pubaction: string;
}

interface StateType {
  readerHealthByTopic: {
    [readerId: string]: healthCheckMessage;
  };
}

const initialState: StateType = {
  readerHealthByTopic: {},
};

export const ReaderHealthSlice = createSlice({
  name: 'readerHealth',
  initialState,
  reducers: {
    UpdateReaderHealth: (state, action: PayloadAction<any>) => {
      const data = action.payload;
      // console.log("ini data RHC", data);

      if (!data || typeof data !== 'object') return;

      // Case 1: Data is a single health message with gmac
      if (data.gmac) {
        // console.log("ini readerId from gmac", data.gmac);
        state.readerHealthByTopic[data.gmac] = data;
        return;
      }

      // Case 2: Data is an object where keys are reader IDs and contain a 'health' object
      Object.entries(data).forEach(([readerId, content]: [string, any]) => {
        if (content && content.health) {
          // console.log("ini readerId from loop", readerId);
          state.readerHealthByTopic[readerId] = content.health;
        } else if (content && content.gmac) {
          // Alternative: content itself is a health object
          state.readerHealthByTopic[content.gmac] = content;
        }
      });
    },
  },
});

export const { UpdateReaderHealth } = ReaderHealthSlice.actions;

/**
 * Thunk to subscribe to reader health MQTT topic
 */
export const fetchReaderHealth = () => (dispatch: AppDispatch) => {
  const topic = 'people_tracking/gateway/+/+';
  let lastDispatch = 0;

  const unsubscribe = startMQTTclient((data: any) => {
    const now = Date.now();
    if (now - lastDispatch < 500) return;
    lastDispatch = now;

    // If the MQTT message is a string, parse it
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    
    dispatch(UpdateReaderHealth(parsedData));
  }, topic);

  return unsubscribe;
};

// Helper selector to get health by readerId
export const getReaderHealth = (state: RootState, readerId: string) => 
  state.ReaderHealthReducer.readerHealthByTopic[readerId.toUpperCase()] || 
  state.ReaderHealthReducer.readerHealthByTopic[readerId.toLowerCase()] || 
  null;

export default ReaderHealthSlice.reducer;
