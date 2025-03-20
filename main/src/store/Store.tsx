import { configureStore } from '@reduxjs/toolkit';
import CustomizerReducer from './customizer/CustomizerSlice';
import EcommerceReducer from './apps/eCommerce/ECommerceSlice';
import ChatsReducer from './apps/chat/ChatSlice';
import NotesReducer from './apps/notes/NotesSlice';
import EmailReducer from './apps/email/EmailSlice';
import TicketReducer from './apps/tickets/TicketSlice';
import ContactsReducer from './apps/contacts/ContactSlice';
import UserProfileReducer from './apps/userProfile/UserProfileSlice';
import GatesReducer from './apps/tracking/GatesSlice';
import FloorplanReducer from './apps/tracking/FloorPlanSlice';
import BlogReducer from './apps/blog/BlogSlice';
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
import buildingReducer from './apps/crud/building';
import { combineReducers } from 'redux';
import {
  useDispatch as useAppDispatch,
  useSelector as useAppSelector,
  TypedUseSelectorHook,
} from 'react-redux';

export const store = configureStore({
  reducer: {
    customizer: CustomizerReducer,
    ecommerceReducer: EcommerceReducer,
    chatReducer: ChatsReducer,
    emailReducer: EmailReducer,
    notesReducer: NotesReducer,
    contactsReducer: ContactsReducer,
    ticketReducer: TicketReducer,
    userpostsReducer: UserProfileReducer,
    blogReducer: BlogReducer,
    gateReducer: GatesReducer,
    floorplanReducer: FloorplanReducer,
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
    buildingReducer: buildingReducer,
  },
});

const rootReducer = combineReducers({
  customizer: CustomizerReducer,
  ecommerceReducer: EcommerceReducer,
  chatReducer: ChatsReducer,
  emailReducer: EmailReducer,
  notesReducer: NotesReducer,
  contactsReducer: ContactsReducer,
  ticketReducer: TicketReducer,
  userpostsReducer: UserProfileReducer,
  blogReducer: BlogReducer,
  gateReducer: GatesReducer,
  floorplanReducer: FloorplanReducer,
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
  buildingReducer: buildingReducer,
});

export type AppState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
export const { dispatch } = store;
export const useDispatch = () => useAppDispatch<AppDispatch>();
export const useSelector: TypedUseSelectorHook<AppState> = useAppSelector;
export type RootState = ReturnType<typeof store.getState>;

export default store;
