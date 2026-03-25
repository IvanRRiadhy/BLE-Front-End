import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from 'src/store/Store';
import { startMQTTclient } from './MQTT';
import { uniqueId } from 'lodash';
import { SecurityAlarmLogItem } from 'src/components/security-view/AlarmInvestigate/AlarmInvestigation';

export type AlarmPriority = 'low' | 'medium' | 'high' | 'critical';

export interface BeaconType {
  beaconId: string; // This is the dmac
  pair: string;
  first: string;
  second: string;
  firstDist: number;
  secondDist: number;
  point: {
    x: number;
    y: number;
  };
  firstReaderCoord: {
    id: string;
    x: number;
    y: number;
  };
  secondReaderCoord: {
    id: string;
    x: number;
    y: number;
  };
  time: string;
  floorplanId: string;
  inRestrictedArea: boolean;
  floorplanName: string;
  maskedAreaName: string;
  fromFloorplanId: string | null;
  toFloorplanId: string | null;
  // Additional fields from the message
  cardId?: string;
  cardName?: string;
  cardNumber?: string;
  firstReaderId?: string;
  secondReaderId?: string;
  source?: string;
  transitionMessage?: string | null;
  visitorCardId?: string;
  visitorCardName?: string;
  memberCardId?: string | null;
  memberCardName?: string | null;
  qrCode?: string | null;
}

export type TrackingLogItem = {
  id: string;
  personId: string;
  // device: string;
  target: string;
  image: string;
  dmac: string;
  floor: string;
  area: string;
  alarmType?: string;
  time: string;
  status?: string;
  type: 'Alarm' | 'Tracking';
  personType?: 'Member' | 'Visitor';
};

export type AlarmLogItem = {
  id: string;
  dmac: string;
  target: string;
  image: string;
  floor: string;
  floorplanId: string;
  area: string;
  time: string;
  color?: string;
  alarmStatus: string; // blacklist, restricted, etc
  action: string; // active, acknowledged, investigate, done
  priority?: AlarmPriority;
  personId: string;
  personType?: 'Visitor' | 'Member' | 'Security';
  type: 'Alarm';
  triggerId: string;
  seen: boolean;
};

interface StoredBeacon extends BeaconType {
  lastSeen: number;
  dmac: string; // Set to beaconId since they're the same
}

// Types for counting data
interface EntityCount {
  count: number;
  name: string;
  persons: {
    // Add this
    visitor: string[];
    member: string[];
  };
}

interface CountingData {
  building: { [buildingId: string]: EntityCount };
  floor: { [floorId: string]: EntityCount };
  floorplan: { [floorplanId: string]: EntityCount };
  area: { [areaId: string]: EntityCount };
  time: string;
}

interface StateType {
  beacons: BeaconType[];
  beaconsByTopic: {
    [topic: string]: {
      [beaconId: string]: StoredBeacon;
    };
  };
  allBeacons: {
    [topic: string]: {
      [beaconId: string]: StoredBeacon;
    };
  };
  countingData: CountingData | null;
  refreshTrigger: boolean;
  trackingBeacon: string;
  selectedBeacon: {
    active: boolean;
    id: string;
    area: string;
    floorplan: string;
    time: string;
    dmac: string;
    sourceScreenId?: number;
  };
  trackingLogs: TrackingLogItem[];
  showTracking: TrackingLogItem | null;
  alarmLogs: AlarmLogItem[];
  alarmPopupId: string | null;
  showAlarm: AlarmLogItem | null;
  focusAlarm: SecurityAlarmLogItem | null;
  focusPosition: {
    floorplanName: string;
    areaName: string;
    time: string;
  };
}

const initialState: StateType = {
  beacons: [],
  beaconsByTopic: {},
  allBeacons: {},
  countingData: null,
  refreshTrigger: false,
  trackingBeacon: '',
  selectedBeacon: {
    active: false,
    id: '',
    area: '',
    floorplan: '',
    time: '',
    dmac: '',
  },
  trackingLogs: [],
  showTracking: null,
  alarmLogs: [],
  alarmPopupId: null,
  showAlarm: null,
  focusAlarm: null,
  focusPosition: {
    floorplanName: '',
    areaName: '',
    time: '',
  },
};

export const BeaconSlice = createSlice({
  name: 'beacon',
  initialState,
  reducers: {
    UpdateBeacon: (state, action) => {
      const { topic, beacons } = action.payload;
      const now = Date.now();

      // Initialize topic if it doesn't exist
      if (!state.beaconsByTopic[topic]) {
        state.beaconsByTopic[topic] = {};
      }
      if (!state.allBeacons[topic]) {
        state.allBeacons[topic] = {};
      }

      // Update or add each beacon
      beacons.forEach((beacon: any) => {
        if (!beacon.beaconId) return;

        // Create stored beacon with dmac = beaconId
        const storedBeacon: StoredBeacon = {
          ...beacon,
          dmac: beacon.beaconId, // Set dmac to beaconId
          lastSeen: now,
        };

        state.beaconsByTopic[topic][beacon.beaconId] = storedBeacon;
        state.allBeacons[topic][beacon.beaconId] = storedBeacon;
      });
    },

    // Update counting data
    UpdateCountingData: (state, action) => {
      const countingData = action.payload;
      state.countingData = countingData;
    },

    // Clean up old beacons for a specific topic
    CleanupTopicBeacons: (state, action) => {
      const { topic, maxAge = 10000 } = action.payload; // Default 10 seconds
      const now = Date.now();

      if (!state.beaconsByTopic[topic]) return;

      // Remove beacons older than maxAge
      Object.keys(state.beaconsByTopic[topic]).forEach((beaconId) => {
        const beacon = state.beaconsByTopic[topic][beaconId];
        if (now - beacon.lastSeen > maxAge) {
          delete state.beaconsByTopic[topic][beaconId];
        }
      });

      // Remove empty topics
      if (Object.keys(state.beaconsByTopic[topic]).length === 0) {
        delete state.beaconsByTopic[topic];
      }
    },

    // Clean up ALL old beacons across all topics
    CleanupAllBeacons: (state, action) => {
      const { maxAge = 10000 } = action.payload;
      const now = Date.now();

      Object.keys(state.beaconsByTopic).forEach((topic) => {
        Object.keys(state.beaconsByTopic[topic]).forEach((beaconId) => {
          const beacon = state.beaconsByTopic[topic][beaconId];
          if (now - beacon.lastSeen > maxAge) {
            delete state.beaconsByTopic[topic][beaconId];
          }
        });

        // Remove empty topics
        if (Object.keys(state.beaconsByTopic[topic]).length === 0) {
          delete state.beaconsByTopic[topic];
        }
      });
    },

    RefreshTrigger: (state) => {
      state.refreshTrigger = true;
    },

    RefreshBeaconState: (state) => {
      state.beacons = [];
      state.beaconsByTopic = {};
      state.refreshTrigger = false;
    },

    SetTrackingBeacon: (state, action) => {
      state.trackingBeacon = action.payload;
    },

    SetSelectedBeacon: (state, action) => {
      state.selectedBeacon = action.payload;
    },
    AppendTrackingLogs: (state: StateType, action) => {
      const newLogs: TrackingLogItem[] = action.payload;

      const existingIds = new Set(state.trackingLogs.map((x) => x.id));

      newLogs.forEach((log) => {
        if (!existingIds.has(log.id)) {
          state.trackingLogs.push(log);
          // console.log('Added Tracking Log:', log);
        } else {
          // console.log('Duplicate Tracking Log ignored:', log, existingIds.has(log.id));
        }
      });

      // sort newest first
      state.trackingLogs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      // cap list (same logic you already use)
      if (state.trackingLogs.length > 100) {
        state.trackingLogs = state.trackingLogs.slice(0, 100);
      }
    },

    AppendAlarmLogs: (state: StateType, action: PayloadAction<AlarmLogItem[]>) => {
      const existing = new Set(state.alarmLogs.map((x) => x.id));

      action.payload.forEach((log) => {
        if (!existing.has(log.id)) {
          state.alarmLogs.push(log);
          // console.log('Added Alarm Log:', log);
        } else {
          // console.log('Duplicate Alarm Log ignored:', log, existing.has(log.id));
        }
      });

      state.alarmLogs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      // state.alarmLogs = state.alarmLogs.slice(0, 100);
      // console.log('Updated Alarm Logs:', JSON.stringify(state.alarmLogs, null, 2));
    },

    NotifyAlarmPopup: (state, action: PayloadAction<string | null>) => {
      state.alarmPopupId = action.payload;
    },

    ClearTrackingLogs: (state: StateType) => {
      state.trackingLogs = [];
    },
    ClearAlarmLogs: (state: StateType) => {
      state.alarmLogs = [];
    },
    ClearAlarmPopup: (state) => {
      state.alarmPopupId = null;
    },
    MarkAlarmSeen: (state, action: PayloadAction<string>) => {
      const alarmId = action.payload;
      const alarm = state.alarmLogs.find((a) => a.id === alarmId);
      if (alarm) {
        alarm.seen = true;
      }
    },
    MarkAllAlarmsSeen: (state: StateType) => {
      state.alarmLogs.forEach((alarm) => {
        alarm.seen = true;
      });
    },

    ClearSeenAlarms: (state: StateType) => {
      state.alarmLogs = state.alarmLogs.filter((alarm) => !alarm.seen);
    },
    ShowAlarmPopup: (state, action: PayloadAction<AlarmLogItem | null>) => {
      state.showAlarm = action.payload;
    },
    SetFocusAlarm: (state, action: PayloadAction<SecurityAlarmLogItem | null>) => {
      state.focusAlarm = action.payload;
    },
    SetFocusPosition: (
      state,
      action: PayloadAction<{ floorplanName: string; areaName: string; time: string }>,
    ) => {
      state.focusPosition = action.payload;
    },
    ShowTrackingDetail: (state, action: PayloadAction<TrackingLogItem | null>) => {
      state.showTracking = action.payload;
    },
  },
});

export const {
  UpdateBeacon,
  UpdateCountingData,
  CleanupTopicBeacons,
  CleanupAllBeacons,
  RefreshTrigger,
  RefreshBeaconState,
  SetTrackingBeacon,
  SetSelectedBeacon,
  AppendTrackingLogs,
  AppendAlarmLogs,
  NotifyAlarmPopup,
  ClearTrackingLogs,
  ClearAlarmLogs,
  ClearAlarmPopup,
  MarkAlarmSeen,
  MarkAllAlarmsSeen,
  ClearSeenAlarms,
  ShowAlarmPopup,
  SetFocusAlarm,
  SetFocusPosition,
  ShowTrackingDetail,
} = BeaconSlice.actions;

export const selectAlarmPopupId = (state: RootState) => state.BeaconReducer.alarmPopupId;

export const selectAlarmById = (id: string | null) => (state: RootState) =>
  id ? state.BeaconReducer.alarmLogs.find((a: AlarmLogItem) => a.id === id) : null;

export const fetchBeacon = (topic: string) => (dispatch: AppDispatch) => {
  let lastDispatch = 0;
  const prevAreaByBeacon: Record<string, string | undefined> = {};
  const unsubscribe = startMQTTclient((data: any) => {
    const now = Date.now();
    if (now - lastDispatch > 200) {
      lastDispatch = now;

      // Ensure data is an array
      const beaconArray = Array.isArray(data) ? data : [data];

      // Filter to only include beacons for this floorplan
      const filteredBeacons = beaconArray.filter(
        (beacon: any) =>
          beacon.floorplanId && `tracking/${beacon.floorplanId.toUpperCase()}` === topic,
      );

      if (filteredBeacons.length > 0) {
        // console.log(`[MQTT] Received ${filteredBeacons.length} beacons for topic ${topic}`);
        dispatch(
          UpdateBeacon({
            topic,
            beacons: filteredBeacons,
          }),
        );
        const newLogs: TrackingLogItem[] = [];
        // console.log('🟡 filteredBeacons', filteredBeacons);
        filteredBeacons.forEach((b: any) => {
          const beaconId = b.beaconId;
          if (!beaconId) return;

          const currentArea = b.maskedAreaName || 'Unknown Area';
          const prevArea = prevAreaByBeacon[beaconId];

          // 🔥 only log when area changes
          if (prevArea !== currentArea) {
            prevAreaByBeacon[beaconId] = currentArea;
            // console.log(`[MQTT] Beacon ${beaconId} moved to area: ${currentArea}, from ${prevArea || 'N/A'}`);
            newLogs.push({
              id: `trk-${beaconId}-${b.time}`, // keep unique
              // device: 'Tracking Event',
              type: 'Tracking',
              target: b.cardName, // raw, will be enriched later
              personId: b.memberCardNumber || b.visitorCardNumber || 'unk',
              image: '',
              dmac: beaconId,
              floor: b.floorplanName || 'Unknown Floor',
              area: currentArea,
              time: b.time || new Date().toISOString(),
              personType: b.visitorCardName ? 'Visitor' : b.memberCardName ? 'Member' : undefined,
            });
          }
        });

        if (newLogs.length > 0) {
          dispatch(AppendTrackingLogs(newLogs));
        }
      }
    }
  }, topic);
  return unsubscribe;
};

// Thunk to subscribe to counting data
export const fetchCountingData = () => (dispatch: AppDispatch) => {
  const countingTopic = 'tracking/counting'; // Adjust the topic as needed

  // console.log(`[MQTT] Subscribing to counting topic: ${countingTopic}`);

  const unsubscribe = startMQTTclient((data: any) => {
    try {
      // Parse the counting data
      const countingData = parseCountingData(data);

      // console.log(`[MQTT] Received counting data:`, countingData);

      dispatch(UpdateCountingData(countingData));
    } catch (error) {
      console.error('[MQTT] Error parsing counting data:', error);
    }
  }, countingTopic);

  return unsubscribe;
};

// Helper function to parse counting data
const parseCountingData = (data: any): CountingData => {
  // If data is a string, parse it as JSON
  const rawData = typeof data === 'string' ? JSON.parse(data) : data;

  return {
    building: parseEntityCounts(rawData.building || {}),
    floor: parseEntityCounts(rawData.floor || {}),
    floorplan: parseEntityCounts(rawData.floorplan || {}),
    area: parseEntityCounts(rawData.area || {}),
    time: rawData.time || new Date().toISOString(),
  };
};

// Helper function to parse entity counts with comma-separated IDs
const parseEntityCounts = (entities: any): { [id: string]: EntityCount } => {
  const result: { [id: string]: EntityCount } = {};

  // If entities is an object with the structure you showed
  if (typeof entities === 'object' && entities !== null) {
    Object.keys(entities).forEach((key) => {
      const entity = entities[key];

      // Create the EntityCount with persons
      const entityCount: EntityCount = {
        count: entity.count || 0,
        name: entity.name || 'Unknown',
        persons: {
          visitor: entity.persons?.visitor || [],
          member: entity.persons?.member || [],
        },
      };

      // Check if the key contains multiple IDs separated by commas
      if (key.includes(',')) {
        // Split by comma and create individual entries for each ID
        const ids = key.split(',').map((id) => id.trim());

        ids.forEach((id) => {
          result[id] = entityCount;
        });
      } else {
        // Single ID
        result[key] = entityCount;
      }
    });
  }

  return result;
};

// Thunk to cleanup old beacons for a topic
export const cleanupTopicBeacons = (topic: string) => (dispatch: AppDispatch) => {
  dispatch(CleanupTopicBeacons({ topic, maxAge: 10000 }));
};

// Thunk to cleanup all old beacons
export const cleanupAllBeacons = () => (dispatch: AppDispatch) => {
  dispatch(CleanupAllBeacons({ maxAge: 10000 }));
};

// Helper functions to get specific counts
export const getBuildingCount = (state: RootState, buildingId: string): number => {
  return state.BeaconReducer.countingData?.building?.[buildingId]?.count || 0;
};

export const getFloorCount = (state: RootState, floorId: string): number => {
  return state.BeaconReducer.countingData?.floor?.[floorId]?.count || 0;
};

export const getFloorplanCount = (state: RootState, floorplanId: string): number => {
  return state.BeaconReducer.countingData?.floorplan?.[floorplanId]?.count || 0;
};

export const getAreaCount = (state: RootState, areaId: string): number => {
  return state.BeaconReducer.countingData?.area?.[areaId]?.count || 0;
};

// Helper to get all buildings with counts
export const getAllBuildings = (
  state: RootState,
): { id: string; name: string; count: number }[] => {
  const buildingData = state.BeaconReducer.countingData?.building || {};
  return Object.keys(buildingData).map((id) => ({
    id,
    name: buildingData[id].name,
    count: buildingData[id].count,
  }));
};

// Helper to get all floors with counts
export const getAllFloors = (state: RootState): { id: string; name: string; count: number }[] => {
  const floorData = state.BeaconReducer.countingData?.floor || {};
  return Object.keys(floorData).map((id) => ({
    id,
    name: floorData[id].name,
    count: floorData[id].count,
  }));
};

// Helper to get all floorplans with counts
export const getAllFloorplans = (
  state: RootState,
): { id: string; name: string; count: number }[] => {
  const floorplanData = state.BeaconReducer.countingData?.floorplan || {};
  return Object.keys(floorplanData).map((id) => ({
    id,
    name: floorplanData[id].name,
    count: floorplanData[id].count,
  }));
};

// Helper to get all areas with counts
export const getAllAreas = (state: RootState): { id: string; name: string; count: number }[] => {
  const areaData = state.BeaconReducer.countingData?.area || {};
  return Object.keys(areaData).map((id) => ({
    id,
    name: areaData[id].name,
    count: areaData[id].count,
  }));
};

export default BeaconSlice.reducer;
