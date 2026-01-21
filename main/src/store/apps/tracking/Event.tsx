import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from 'src/store/Store';
import { startMQTTclient } from './MQTT';
import { uniqueId } from 'lodash';

// EventLog types
export interface AuditActor {
  name: string;
  role: string;
  type: string; // User, System, etc
}

export interface AuditEventLog {
  id: string;
  event: 'CREATE' | 'UPDATE' | 'DELETE' | string;
  entity: string;
  eventTime: string;
  serverTime: string;
  actor: AuditActor;
  details: string;
  metadata?: Record<string, any>;
  type: 'Audit';
}

interface EventLogState {
  logs: AuditEventLog[];
}

const initialState: EventLogState = {
  logs: [],
};

export const EventLogSlice = createSlice({
  name: 'eventLog',
  initialState,
  reducers: {
    AppendEventLogs: (state, action: PayloadAction<AuditEventLog[]>) => {
      const existingIds = new Set(state.logs.map((x) => x.id));

      action.payload.forEach((log) => {
        if (!existingIds.has(log.id)) {
          state.logs.push(log);
        }
      });

      // newest first
      state.logs.sort(
        (a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime(),
      );

      // cap list
      if (state.logs.length > 100) {
        state.logs = state.logs.slice(0, 100);
      }
    },

    ClearEventLogs: (state) => {
      state.logs = [];
    },
  },
});

export const { AppendEventLogs, ClearEventLogs } = EventLogSlice.actions;

export const fetchEventLogs = () => (dispatch: AppDispatch) => {
  const topic = 'audit/action';
  let lastDispatch = 0;

  const unsubscribe = startMQTTclient((data: any) => {
    const now = Date.now();
    if (now - lastDispatch < 200) return;
    lastDispatch = now;

    try {
      const payload = typeof data === 'string' ? JSON.parse(data) : data;
      const events = Array.isArray(payload) ? payload : [payload];

      const logs: AuditEventLog[] = events.map((e) => ({
        id: `audit-${e.event}-${e.entity}-${e.eventTime}-${uniqueId()}`,
        event: e.event,
        entity: e.entity,
        eventTime: e.eventTime,
        serverTime: e.serverTime,
        actor: e.actor,
        details: e.details,
        metadata: e.metadata,
        type: 'Audit',
      }));
    //   console.log('[MQTT][audit/action] logs:', logs);
      dispatch(AppendEventLogs(logs));
    } catch (err) {
      console.error('[MQTT][audit/action] parse error:', err);
    }
  }, topic);

  return unsubscribe;
};


export default EventLogSlice.reducer;