import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
// import { PersistPartial } from 'redux-persist/es/persistReducer';
import localForage from 'localforage';
// import storage from 'redux-persist/lib/storage';
import CustomizerReducer from './customizer/CustomizerSlice';
import SettingsReducer from "./customizer/SettingsSlice";
// import EcommerceReducer from './apps/eCommerce/ECommerceSlice';
// import ChatsReducer from './apps/chat/ChatSlice';
// import NotesReducer from './apps/notes/NotesSlice';
// import EmailReducer from './apps/email/EmailSlice';
// import TicketReducer from './apps/tickets/TicketSlice';
// import ContactsReducer from './apps/contacts/ContactSlice';
// import UserProfileReducer from './apps/userProfile/UserProfileSlice';
// import GatesReducer from './apps/tracking/GatesSlice';
// import FloorplanReducer2 from './apps/tracking/FloorPlanSlice';
// import BlogReducer from './apps/blog/BlogSlice';
import applicationReducer from './apps/crud/application';
import integrationReducer from './apps/crud/integration';
import CCTVReducer from './apps/crud/accessCCTV';
import accessControlReducer from './apps/crud/accessControl';
import brandReducer from './apps/crud/brand';
import DepartmentReducer from './apps/crud/department';
import DistrictReduce from './apps/crud/district';
import organizationReducer from './apps/crud/organization';
import maskedAreaReducer from './apps/crud/maskedArea';
import bleReaderReducer from './apps/crud/bleReader';
import floorReducer from './apps/crud/floor';
import memberReducer from './apps/crud/member';
import trackingTransReducer from './apps/crud/trackingTrans';
import visitorReducer from './apps/crud/visitor';
import blacklistReducer from './apps/crud/blacklist';
import alarmReducer from './apps/crud/alarmRecordTracking';
import alarmTriggerReducer from './apps/crud/alarmTrigger';
import buildingReducer from './apps/crud/building';
import FloorplanDeviceReducer from './apps/crud/floorplanDevice';
import FloorplanReducer from './apps/crud/floorplan';
import CardReducer from './apps/crud/card';
import VisitorCardReducer from './apps/crud/visitorCard';
import CardRecordReducer from './apps/crud/cardRecord';
import TrxVisitorReducer from './apps/crud/trxVisitor';
import layoutReducer from './apps/monitoring/layout';
// import BleNodeReducer from './apps/crud/bleNode';
import RulesNodeReducer from './apps/rules/RulesNodes';
import RulesConnectorReducer from './apps/rules/RulesConnectors';
import BeaconReducer from './apps/tracking/Beacon';
import AlarmActiveReducer from './apps/tracking/Alarm';
import AlarmUIReducer from './apps/monitoring/AlarmUI';
import TimeGroupReducer from './apps/crud/timeGroup';
import NotifyReducer from './apps/monitoring/NotifySlice';
import UserReducer from './apps/crud/users';
import CardAccessReducer from './apps/crud/cardAccess';
import CardGroupReducer from './apps/crud/cardGroup';
import AlarmSettingReducer from './apps/alarmsetting/alarmSettings';
import GeoFencingReducer from './apps/alarmsetting/geofencing';
import OverPopulatingReducer from './apps/alarmsetting/overpopulating';
import StayOnAreaReducer from './apps/alarmsetting/stayonarea';
import BoundaryReducer from './apps/alarmsetting/boundary';
import EngineReducer from './apps/crud/engine';
import DashboardReducer from './apps/dashboard/Dashboard';
import VisitorFilterPresetReducer from './apps/crud/visitorFilterPreset';
import VisitorSessionReducer from './apps/crud/visitorSession';
import InvestigateReducer from './apps/crud/investigate';
import PatrolAreaReducer from './apps/crud/patrolArea';
import PatrolRouteReducer from './apps/crud/patrolRoute';
import PatrolSessionReducer from './apps/crud/patrolSession';
import ReaderHealthReducer from './apps/tracking/ReaderHealth';
import EventLogReducer from './apps/tracking/Event';
import SessionReducer from './apps/session';
import EvacuationReducer from './apps/tracking/Evacuation';
import {
  useDispatch as useAppDispatch,
  useSelector as useAppSelector,
  TypedUseSelectorHook,
} from 'react-redux';

const rootReducer = combineReducers({
  customizer: CustomizerReducer,
  settings: SettingsReducer,
  // ecommerceReducer: EcommerceReducer,
  // chatReducer: ChatsReducer,
  // emailReducer: EmailReducer,
  // notesReducer: NotesReducer,
  // contactsReducer: ContactsReducer,
  // ticketReducer: TicketReducer,
  // userpostsReducer: UserProfileReducer,
  // blogReducer: BlogReducer,
  // gateReducer: GatesReducer,
  // floorplanReducer2: FloorplanReducer2,
  applicationReducer: applicationReducer,
  integrationReducer: integrationReducer,
  CCTVReducer: CCTVReducer,
  accessControlReducer: accessControlReducer,
  brandReducer: brandReducer,
  departmentReducer: DepartmentReducer,
  districtReducer: DistrictReduce,
  organizationReducer: organizationReducer,
  maskedAreaReducer: maskedAreaReducer,
  bleReaderReducer: bleReaderReducer,
  floorReducer: floorReducer,
  memberReducer: memberReducer,
  trackingTransReducer: trackingTransReducer,
  visitorReducer: visitorReducer,
  blacklistReducer: blacklistReducer,
  alarmReducer: alarmReducer,
  alarmTriggerReducer: alarmTriggerReducer,
  buildingReducer: buildingReducer,
  floorplanDeviceReducer: FloorplanDeviceReducer,
  layoutReducer: layoutReducer,
  floorplanReducer: FloorplanReducer,
  CardReducer: CardReducer,
  EngineReducer: EngineReducer,
  VisitorCardReducer: VisitorCardReducer,
  CardRecordReducer: CardRecordReducer,
  TrxVisitorReducer: TrxVisitorReducer,
  // bleNodeReducer: BleNodeReducer,
  RulesNodeReducer: RulesNodeReducer,
  RulesConnectorReducer: RulesConnectorReducer,
  BeaconReducer: BeaconReducer,
  AlarmActiveReducer: AlarmActiveReducer,
  AlarmUIReducer: AlarmUIReducer,
  TimeGroupReducer: TimeGroupReducer,
  NotifyReducer: NotifyReducer,
  userReducer: UserReducer,
  sessionReducer: SessionReducer,
  CardAccessReducer: CardAccessReducer,
  CardGroupReducer: CardGroupReducer,
  AlarmSettingReducer: AlarmSettingReducer,
  GeoFencingReducer: GeoFencingReducer,
  OverPopulatingReducer: OverPopulatingReducer,
  StayOnAreaReducer: StayOnAreaReducer,
  BoundaryReducer: BoundaryReducer,
  DashboardReducer: DashboardReducer,
  VisitorFilterPresetReducer: VisitorFilterPresetReducer,
  VisitorSessionReducer: VisitorSessionReducer,
  PatrolAreaReducer: PatrolAreaReducer,
  PatrolRouteReducer: PatrolRouteReducer,
  PatrolSessionReducer: PatrolSessionReducer,
  ReaderHealthReducer: ReaderHealthReducer,
  InvestigateReducer: InvestigateReducer,
  EventLogReducer: EventLogReducer,
  evacuationReducer: EvacuationReducer,
});

const storage = localForage.createInstance({
  name: "Modernize-ERP",
  storeName: "root-state"
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['layoutReducer', 'AlarmActiveReducer', 'settings'], // Persist layout, alarms, and settings
};

// Create persisted root reducer
const persistedReducer = persistReducer<ReturnType<typeof rootReducer>>(persistConfig, rootReducer);
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});
// export const store = configureStore({
//   reducer: {
//     customizer: CustomizerReducer,
//     ecommerceReducer: EcommerceReducer,
//     chatReducer: ChatsReducer,
//     emailReducer: EmailReducer,
//     notesReducer: NotesReducer,
//     contactsReducer: ContactsReducer,
//     ticketReducer: TicketReducer,
//     userpostsReducer: UserProfileReducer,
//     blogReducer: BlogReducer,
//     gateReducer: GatesReducer,
//     floorplanReducer2: FloorplanReducer2,
//     applicationReducer: applicationReducer,
//     integrationReducer: integrationReducer,
//     CCTVReducer: CCTVReducer,
//     accessControlReducer: accessControlReducer,
//     brandReducer: brandReducer,
//     departmentReducer: DepartmentReducer,
//     districtReducer: DistrictReduce,
//     organizationReducer: organizationReducer,
//     maskedAreaReducer: maskedAreaReducer,
//     bleReaderReducer: bleReaderReducer,
//     floorReducer: floorReducer,
//     memberReducer: memberReducer,
//     trackingTransReducer: trackingTransReducer,
//     visitorReducer: visitorReducer,
//     blacklistReducer: blacklistReducer,
//     alarmReducer: alarmReducer,
//     buildingReducer: buildingReducer,
//     floorplanDeviceReducer: FloorplanDeviceReducer,
//     layoutReducer: layoutReducer,
//     floorplanReducer: FloorplanReducer,
//     bleNodeReducer: BleNodeReducer,
//     RulesNodeReducer: RulesNodeReducer,
//     RulesConnectorReducer: RulesConnectorReducer,
//     BeaconReducer: BeaconReducer,
//     sessionReducer: SessionReducer,
//   },
// });

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useDispatch = () => useAppDispatch<AppDispatch>();
export const useSelector: TypedUseSelectorHook<RootState> = useAppSelector;
export const { dispatch } = store;

export default store;
