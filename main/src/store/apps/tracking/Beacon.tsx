import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch } from 'src/store/Store';
import { startMQTTclient } from './MQTT';

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

interface StoredBeacon extends BeaconType {
  lastSeen: number;
  dmac: string; // Set to beaconId since they're the same
}

interface StateType {
  beacons: BeaconType[];
  beaconsByTopic: {
    [topic: string]: {
      [beaconId: string]: StoredBeacon;
    };
  };
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
}

const initialState: StateType = {
  beacons: [],
  beaconsByTopic: {},
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
      });
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
    }
  },
});

export const { 
  UpdateBeacon, 
  CleanupTopicBeacons, 
  CleanupAllBeacons,
  RefreshTrigger, 
  RefreshBeaconState, 
  SetTrackingBeacon, 
  SetSelectedBeacon 
} = BeaconSlice.actions;

export const fetchBeacon = (topic: string) => (dispatch: AppDispatch) => {
  let lastDispatch = 0;
  const unsubscribe = startMQTTclient((data: any) => {
    const now = Date.now();
    if (now - lastDispatch > 200) {
      lastDispatch = now;
      
      // Ensure data is an array
      const beaconArray = Array.isArray(data) ? data : [data];
      
      // Filter to only include beacons for this floorplan
      const filteredBeacons = beaconArray.filter((beacon: any) => 
        beacon.floorplanId && `tracking/${beacon.floorplanId.toUpperCase()}` === topic
      );
      
      if (filteredBeacons.length > 0) {
        console.log(`[MQTT] Received ${filteredBeacons.length} beacons for topic ${topic}`);
        dispatch(
          UpdateBeacon({
            topic,
            beacons: filteredBeacons,
          }),
        );
      }
    }
  }, topic);
  return unsubscribe;
};

// Thunk to cleanup old beacons for a topic
export const cleanupTopicBeacons = (topic: string) => (dispatch: AppDispatch) => {
  dispatch(CleanupTopicBeacons({ topic, maxAge: 10000 }));
};

// Thunk to cleanup all old beacons
export const cleanupAllBeacons = () => (dispatch: AppDispatch) => {
  dispatch(CleanupAllBeacons({ maxAge: 10000 }));
};

export default BeaconSlice.reducer;