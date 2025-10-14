// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import VisitorCard from 'src/views/master/tag/VisitorCard';
import ProtectedRoute from './ProtectedRoute';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));
const MyVisitLayout = Loadable(lazy(() => import('../layouts/MyVisit/MyVisitLayout')));

/* ****Pages***** */
const MainMenuDash = Loadable(lazy(() => import('../views/dashboard/Main')));
const MonitoringDash = Loadable(lazy(() => import('../views/dashboard/Monitoring')));
const MonitoringConfig = Loadable(lazy(() => import('../views/dashboard/MonitoringConfig')));
const MyVisitDashboard = Loadable(lazy(() => import('../views/MyVisit/MyVisitDashboard')));
const WebView = Loadable(lazy(() => import('../components/dashboards/monitoring/FloorView')));

/* ****Invitation***** */
const InvitationForm = Loadable(lazy(() => import('../components/InvitationForm/InvitationForm')));
const InvitationInfo = Loadable(lazy(() => import('../components/InvitationForm/InvitationInfo')));
const ThankYouPage = Loadable(lazy(() => import('../components/InvitationForm/ThankYouPage')));
const InvitationPage = Loadable(
  lazy(() => import('../views/MyVisit/MyVisitInvitation/InvitationPage')),
);

/* ***Master**** */
const GatewayApp = Loadable(lazy(() => import('../views/master/gateway/gateway')));
const MemberTag = Loadable(lazy(() => import('../views/master/tag/memberTag')));
const VisitorTag = Loadable(lazy(() => import('../views/master/tag/visitorTag')));

/* ***Alarm Setting*** */
const AlarmSetting = Loadable(lazy(() => import('../views/master/alarmSetting/MainList')));
const GeoFencing = Loadable(
  lazy(() => import('../views/master/alarmSetting/GeoFencing/GeoFencing')),
);
const GeoFencingEdit = Loadable(
  lazy(() => import('../views/master/alarmSetting/GeoFencing/GeoFencingEdit')),
);
const OverPopulating = Loadable(
  lazy(() => import('../views/master/alarmSetting/OverPopulating/OverPopulating')),
);
const OverPopulatingEdit = Loadable(
  lazy(() => import('../views/master/alarmSetting/OverPopulating/OverPopulatingEdit')),
);
const StayOnArea = Loadable(
  lazy(() => import('../views/master/alarmSetting/StayOnArea/StayOnArea')),
);
const StayOnAreaEdit = Loadable(
  lazy(() => import('../views/master/alarmSetting/StayOnArea/StayOnAreaEdit')),
);
const Boundary = Loadable(lazy(() => import('../views/master/alarmSetting/Boundary/Boundary')));
const BoundaryEdit = Loadable(
  lazy(() => import('../views/master/alarmSetting/Boundary/BoundaryEdit')),
);

/* ****CRUD**** */
const Application = Loadable(lazy(() => import('../views/master/crud/Application')));
const Integration = Loadable(lazy(() => import('../views/master/crud/Integration')));
const AccessCCTV = Loadable(lazy(() => import('../views/master/crud/AccessCCTV')));
const AccessControl = Loadable(lazy(() => import('../views/master/crud/AccessControl')));
const Brand = Loadable(lazy(() => import('../views/master/crud/Brand')));
const Department = Loadable(lazy(() => import('../views/master/crud/Department')));
const District = Loadable(lazy(() => import('../views/master/crud/District')));
const Organization = Loadable(lazy(() => import('../views/master/crud/Organization')));
const FloorplanMaskedArea = Loadable(lazy(() => import('../views/master/crud/MaskedArea')));
const BleReader = Loadable(lazy(() => import('../views/master/crud/BleReader')));
const Floor = Loadable(lazy(() => import('../views/master/crud/Floor')));
const Member = Loadable(lazy(() => import('../views/master/crud/Member')));
const TrackingTransaction = Loadable(lazy(() => import('../views/master/crud/TrackingTrans')));
const Visitor = Loadable(lazy(() => import('../views/master/crud/Visitor')));
const Blacklist = Loadable(lazy(() => import('../views/master/crud/Blacklist')));
const Building = Loadable(lazy(() => import('../views/master/crud/Building')));
const FloorplanDevice = Loadable(lazy(() => import('../views/master/crud/FloorplanDevice')));
const AlarmRecord = Loadable(lazy(() => import('../views/master/crud/AlarmRecord')));
const AlarmTrigger = Loadable(lazy(() => import('../views/master/crud/AlarmTrigger')));
const CardRecord = Loadable(lazy(() => import('../views/master/crud/CardRecord')));
const Card = Loadable(lazy(() => import('../views/master/tag/card')));
const TimeGroup = Loadable(lazy(() => import('../views/master/crud/TimeGroup')));
const Floorplan = Loadable(lazy(() => import('../views/master/crud/Floorplan')));
const User = Loadable(lazy(() => import('../views/master/user/User')));
const CardAccess = Loadable(lazy(() => import('../views/master/crud/CardAccess')));
const CardGroup = Loadable(lazy(() => import('../views/master/crud/CardGroup')));

const FloorplanDeviceEdit = Loadable(
  lazy(() => import('../views/master/crud/FloorplanDeviceEdit')),
);
const MaskedAreaEdit = Loadable(lazy(() => import('../views/master/crud/MaskedAreaEdit')));
const RulesEdit = Loadable(lazy(() => import('../views/master/rules/rulesEdit')));

/* ****Apps***** */
// const Blog = Loadable(lazy(() => import('../views/apps/blog/Blog')));
// const BlogDetail = Loadable(lazy(() => import('../views/apps/blog/BlogPost')));
const Contacts = Loadable(lazy(() => import('../views/apps/contacts/Contacts')));
const Chats = Loadable(lazy(() => import('../views/apps/chat/Chat')));
const Notes = Loadable(lazy(() => import('../views/apps/notes/Notes')));
const Tickets = Loadable(lazy(() => import('../views/apps/tickets/Tickets')));
const Ecommerce = Loadable(lazy(() => import('../views/apps/eCommerce/Ecommerce')));
const EcommerceDetail = Loadable(lazy(() => import('../views/apps/eCommerce/EcommerceDetail')));
const EcommerceAddProduct = Loadable(
  lazy(() => import('../views/apps/eCommerce/EcommerceAddProduct')),
);
const EcommerceEditProduct = Loadable(
  lazy(() => import('../views/apps/eCommerce/EcommerceEditProduct')),
);
const EcomProductList = Loadable(lazy(() => import('../views/apps/eCommerce/EcomProductList')));
const EcomProductCheckout = Loadable(
  lazy(() => import('../views/apps/eCommerce/EcommerceCheckout')),
);
const Calendar = Loadable(lazy(() => import('../views/apps/calendar/BigCalendar')));
const UserProfile = Loadable(lazy(() => import('../views/apps/user-profile/UserProfile')));
const Followers = Loadable(lazy(() => import('../views/apps/user-profile/Followers')));
const Friends = Loadable(lazy(() => import('../views/apps/user-profile/Friends')));
const Gallery = Loadable(lazy(() => import('../views/apps/user-profile/Gallery')));
const Email = Loadable(lazy(() => import('../views/apps/email/Email')));
const InvoiceList = Loadable(lazy(() => import('../views/apps/invoice/List')));
const InvoiceCreate = Loadable(lazy(() => import('../views/apps/invoice/Create')));
const InvoiceDetail = Loadable(lazy(() => import('../views/apps/invoice/Detail')));
const InvoiceEdit = Loadable(lazy(() => import('../views/apps/invoice/Edit')));
const Kanban = Loadable(lazy(() => import('../views/apps/kanban/Kanban')));
const Tracking = Loadable(lazy(() => import('../views/apps/Tracking/Tracking')));

// Evacuation
const EvacuationDashboard = Loadable(
  lazy(() => import('../views/dashboard/Evacuation/Evacuation')),
);

// ui components
const MuiAlert = Loadable(lazy(() => import('../views/ui-components/MuiAlert')));
const MuiAccordion = Loadable(lazy(() => import('../views/ui-components/MuiAccordion')));
const MuiAvatar = Loadable(lazy(() => import('../views/ui-components/MuiAvatar')));
const MuiChip = Loadable(lazy(() => import('../views/ui-components/MuiChip')));
const MuiDialog = Loadable(lazy(() => import('../views/ui-components/MuiDialog')));
const MuiList = Loadable(lazy(() => import('../views/ui-components/MuiList')));
const MuiPopover = Loadable(lazy(() => import('../views/ui-components/MuiPopover')));
const MuiRating = Loadable(lazy(() => import('../views/ui-components/MuiRating')));
const MuiTabs = Loadable(lazy(() => import('../views/ui-components/MuiTabs')));
const MuiTooltip = Loadable(lazy(() => import('../views/ui-components/MuiTooltip')));
const MuiTransferList = Loadable(lazy(() => import('../views/ui-components/MuiTransferList')));
const MuiTypography = Loadable(lazy(() => import('../views/ui-components/MuiTypography')));

// form elements
const MuiAutoComplete = Loadable(
  lazy(() => import('../views/forms/form-elements/MuiAutoComplete')),
);
const MuiButton = Loadable(lazy(() => import('../views/forms/form-elements/MuiButton')));
const MuiCheckbox = Loadable(lazy(() => import('../views/forms/form-elements/MuiCheckbox')));
const MuiRadio = Loadable(lazy(() => import('../views/forms/form-elements/MuiRadio')));
const MuiSlider = Loadable(lazy(() => import('../views/forms/form-elements/MuiSlider')));
const MuiDateTime = Loadable(lazy(() => import('../views/forms/form-elements/MuiDateTime')));
const MuiSwitch = Loadable(lazy(() => import('../views/forms/form-elements/MuiSwitch')));

// forms
const FormLayouts = Loadable(lazy(() => import('../views/forms/FormLayouts')));
const FormCustom = Loadable(lazy(() => import('../views/forms/FormCustom')));
const FormHorizontal = Loadable(lazy(() => import('../views/forms/FormHorizontal')));
const FormVertical = Loadable(lazy(() => import('../views/forms/FormVertical')));
const FormWizard = Loadable(lazy(() => import('../views/forms/FormWizard')));
const FormValidation = Loadable(lazy(() => import('../views/forms/FormValidation')));
const TiptapEditor = Loadable(lazy(() => import('../views/forms/from-tiptap/TiptapEditor')));

// pages
const RollbaseCASL = Loadable(lazy(() => import('../views/pages/rollbaseCASL/RollbaseCASL')));
const Faq = Loadable(lazy(() => import('../views/pages/faq/Faq')));
const Pricing = Loadable(lazy(() => import('../views/pages/pricing/Pricing')));
const AccountSetting = Loadable(
  lazy(() => import('../views/pages/account-setting/AccountSetting')),
);

// charts
const AreaChart = Loadable(lazy(() => import('../views/charts/AreaChart')));
const CandlestickChart = Loadable(lazy(() => import('../views/charts/CandlestickChart')));
const ColumnChart = Loadable(lazy(() => import('../views/charts/ColumnChart')));
const DoughnutChart = Loadable(lazy(() => import('../views/charts/DoughnutChart')));
const GredientChart = Loadable(lazy(() => import('../views/charts/GredientChart')));
const RadialbarChart = Loadable(lazy(() => import('../views/charts/RadialbarChart')));
const LineChart = Loadable(lazy(() => import('../views/charts/LineChart')));

// tables
const BasicTable = Loadable(lazy(() => import('../views/tables/BasicTable')));
const EnhanceTable = Loadable(lazy(() => import('../views/tables/EnhanceTable')));
const PaginationTable = Loadable(lazy(() => import('../views/tables/PaginationTable')));
const FixedHeaderTable = Loadable(lazy(() => import('../views/tables/FixedHeaderTable')));
const CollapsibleTable = Loadable(lazy(() => import('../views/tables/CollapsibleTable')));
const SearchTable = Loadable(lazy(() => import('../views/tables/SearchTable')));

//react tables
const ReactBasicTable = Loadable(lazy(() => import('../views/react-tables/basic/page')));
const ReactColumnVisibilityTable = Loadable(
  lazy(() => import('../views/react-tables/columnvisibility/page')),
);
const ReactDenseTable = Loadable(lazy(() => import('../views/react-tables/dense/page')));
const ReactDragDropTable = Loadable(lazy(() => import('../views/react-tables/drag-drop/page')));
const ReactEditableTable = Loadable(lazy(() => import('../views/react-tables/editable/page')));
const ReactEmptyTable = Loadable(lazy(() => import('../views/react-tables/empty/page')));
const ReactExpandingTable = Loadable(lazy(() => import('../views/react-tables/expanding/page')));
const ReactFilterTable = Loadable(lazy(() => import('../views/react-tables/filtering/page')));
const ReactPaginationTable = Loadable(lazy(() => import('../views/react-tables/pagination/page')));
const ReactRowSelectionTable = Loadable(
  lazy(() => import('../views/react-tables/row-selection/page')),
);
const ReactSortingTable = Loadable(lazy(() => import('../views/react-tables/sorting/page')));
const ReactStickyTable = Loadable(lazy(() => import('../views/react-tables/sticky/page')));

//mui charts
const BarCharts = Loadable(lazy(() => import('../views/muicharts/barcharts/page')));
const GaugeCharts = Loadable(lazy(() => import('../views/muicharts/gaugecharts/page')));
const AreaCharts = Loadable(lazy(() => import('../views/muicharts/linecharts/area/page')));
const LineCharts = Loadable(lazy(() => import('../views/muicharts/linecharts/line/page')));
const PieCharts = Loadable(lazy(() => import('../views/muicharts/piecharts/page')));
const ScatterCharts = Loadable(lazy(() => import('../views/muicharts/scattercharts/page')));
const SparklineCharts = Loadable(lazy(() => import('../views/muicharts/sparklinecharts/page')));

//mui charts
const SimpletreeCustomization = Loadable(
  lazy(() => import('../views/mui-trees/simpletree/simpletree-customization/page')),
);
const SimpletreeExpansion = Loadable(
  lazy(() => import('../views/mui-trees/simpletree/simpletree-expansion/page')),
);
const SimpletreeFocus = Loadable(
  lazy(() => import('../views/mui-trees/simpletree/simpletree-focus/page')),
);
const SimpletreeItems = Loadable(
  lazy(() => import('../views/mui-trees/simpletree/simpletree-items/page')),
);
const SimpletreeSelection = Loadable(
  lazy(() => import('../views/mui-trees/simpletree/simpletree-selection/page')),
);

// widget
const WidgetCards = Loadable(lazy(() => import('../views/widgets/cards/WidgetCards')));
const WidgetBanners = Loadable(lazy(() => import('../views/widgets/banners/WidgetBanners')));
const WidgetCharts = Loadable(lazy(() => import('../views/widgets/charts/WidgetCharts')));

// authentication
const Login = Loadable(lazy(() => import('../views/authentication/auth1/Login')));
const Login2 = Loadable(lazy(() => import('../views/authentication/auth2/Login2')));
const Register = Loadable(lazy(() => import('../views/authentication/auth1/Register')));
const Register2 = Loadable(lazy(() => import('../views/authentication/auth2/Register2')));
const ForgotPassword = Loadable(lazy(() => import('../views/authentication/auth1/ForgotPassword')));
const ForgotPassword2 = Loadable(
  lazy(() => import('../views/authentication/auth2/ForgotPassword2')),
);
const TwoSteps = Loadable(lazy(() => import('../views/authentication/auth1/TwoSteps')));
const TwoSteps2 = Loadable(lazy(() => import('../views/authentication/auth2/TwoSteps2')));
const Error = Loadable(lazy(() => import('../views/authentication/Error')));
const Maintenance = Loadable(lazy(() => import('../views/authentication/Maintenance')));

// landingpage
const Landingpage = Loadable(lazy(() => import('../views/pages/landingpage/Landingpage')));

// front end pages
const Homepage = Loadable(lazy(() => import('../views/pages/frontend-pages/Homepage')));
const About = Loadable(lazy(() => import('../views/pages/frontend-pages/About')));
const Contact = Loadable(lazy(() => import('../views/pages/frontend-pages/Contact')));
const Portfolio = Loadable(lazy(() => import('../views/pages/frontend-pages/Portfolio')));
const PagePricing = Loadable(lazy(() => import('../views/pages/frontend-pages/Pricing')));
const BlogPage = Loadable(lazy(() => import('../views/pages/frontend-pages/Blog')));
const BlogPost = Loadable(lazy(() => import('../views/pages/frontend-pages/BlogPost')));

const roleAccessRules: Record<string, string[]> = {
  System: ['*'], // all routes
  SuperAdmin: ['*', '!/master/application'], // all except application
  PrimaryAdmin: ['/dashboards/', '/report/', '/visitor/visitorinvitation'],
  Primary: ['/dashboards/monitoring'],
  Secondary: ['/my-visit/'],
  UserCreated: ['/my-visit/'],
};

const withAuth = (element: JSX.Element, path: string): JSX.Element => {
  const userRole = localStorage.getItem('levelPriority');
  const normalize = (p: string) => (p || '').replace(/\/+$/, ''); // remove trailing slash

  // 🚨 if no role found
  if (!userRole) {
    console.warn('[AuthGuard] No role, redirecting to login.');
    return <Navigate to="/auth/login" replace />;
  }

  const rules = roleAccessRules[userRole];
  if (!rules) {
    console.warn(`[AuthGuard] Unknown role: ${userRole}`);
    return <Navigate to="/auth/login" replace />;
  }

  // ✅ Handle full-access roles
  if (rules.includes('*')) {
    // check exceptions like !/master/application
    const denied = rules
      .filter((r) => r.startsWith('!'))
      .some((r) => normalize(path).startsWith(normalize(r.slice(1))));
    if (denied) {
      console.warn(`[AuthGuard] ${userRole} denied path: ${path}`);
      return <Navigate to="/dashboards/mainmenu" replace />;
    }
    return element;
  }

  // ✅ Handle restricted roles
  const allowed = rules.some((r) => normalize(path).startsWith(normalize(r)));
  if (allowed) {
    return element;
  }

  console.warn(`[AuthGuard] ${userRole} not allowed to access ${path}`);
  return <Navigate to="/dashboards/mainmenu" replace />;
};



const Router = [
  {
    path: '/',
    element: <FullLayout />,
    children: [
      { path: '/', element: <Navigate to="/dashboards/mainmenu" /> },

      // dashboards
      {
        path: '/dashboards/mainmenu',
        exact: true,
        element: withAuth(<MainMenuDash />, '/dashboards/mainmenu'),
      },
      {
        path: '/dashboards/monitoring',
        exact: true,
        element: withAuth(<MonitoringDash />, '/dashboards/monitoring'),
      },
      {
        path: '/dashboards/monitoring/viewer',
        exact: true,
        element: withAuth(<MonitoringDash />, '/dashboards/monitoring/viewer'),
      },
      {
        path: '/dashboards/monitoring/config',
        exact: true,
        element: withAuth(<MonitoringConfig />, '/dashboards/monitoring/config'),
      },
      {
        path: '/dashboards/evacuation',
        exact: true,
        element: withAuth(<EvacuationDashboard />, '/dashboards/evacuation'),
      },

      // master
      {
        path: '/master/organization',
        exact: true,
        element: withAuth(<Organization />, '/master/organization'),
      },
      {
        path: '/master/department',
        exact: true,
        element: withAuth(<Department />, '/master/department'),
      },
      {
        path: '/master/district',
        exact: true,
        element: withAuth(<District />, '/master/district'),
      },
      { path: '/master/building', exact: true, element: withAuth(<Building />, '/master/building') },
      { path: '/master/floor', exact: true, element: withAuth(<Floor />, '/master/floor') },
      { path: '/master/floorplan', exact: true, element: withAuth(<Floorplan />, '/master/floorplan') },
      { path: '/master/floorplanmaskedarea', exact: true, element: withAuth(<FloorplanMaskedArea />, '/master/floorplanmaskedarea') },
      { path: '/master/floorplanmaskedarea/edit', exact: true, element: withAuth(<MaskedAreaEdit />, '/master/floorplanmaskedarea/edit') },
      { path: '/master/brand', exact: true, element: withAuth(<Brand />, '/master/brand') },
      { path: '/master/accesscctv', exact: true, element: withAuth(<AccessCCTV />, '/master/accesscctv') },
      { path: '/master/accesscontrol', exact: true, element: withAuth(<AccessControl />, '/master/accesscontrol') },
      { path: '/master/blereader', exact: true, element: withAuth(<BleReader />, '/master/blereader') },
      { path: '/master/device', exact: true, element: withAuth(<FloorplanDevice />, '/master/device') },
      { path: '/master/device/edit', exact: true, element: withAuth(<FloorplanDeviceEdit />, '/master/device/edit') },
      { path: '/master/rules/edit', exact: true, element: withAuth(<RulesEdit />, '/master/rules/edit') },
      { path: '/master/member', exact: true, element: withAuth(<Member />, '/master/member') },
      { path: '/master/card', exact: true, element: withAuth(<Card />, '/master/card') },
      { path: '/master/timegroup', exact: true, element: withAuth(<TimeGroup />, '/master/timegroup') },
      { path: '/master/visitorcard', exact: true, element: withAuth(<VisitorCard />, '/master/visitorcard') },
      { path: '/master/cardaccess', exact: true, element: withAuth(<CardAccess />, '/master/cardaccess') },
      { path: '/master/cardgroup', exact: true, element: withAuth(<CardGroup />, '/master/cardgroup') },

      { path: '/master/membertag', exact: true, element: withAuth(<MemberTag />, '/master/membertag') },
      // { path: '/master/floorplan', exact: true, element: <Floorplan /> },
      { path: '/master/gateway', exact: true, element: <GatewayApp /> },

      // Visitor
      { path: '/visitor/visitordata', exact: true, element: withAuth(<Visitor />, '/visitor/visitordata') },
      { path: '/visitor/blacklist', exact: true, element: withAuth(<Blacklist />, '/visitor/blacklist') },
      { path: '/visitor/visitorinvitation', exact: true, element: withAuth(<VisitorTag />, '/visitor/visitorinvitation') },

      // Report
      { path: '/report/trackingtransaction', exact: true, element: withAuth(<TrackingTransaction />, '/report/trackingtransaction') },
      { path: '/report/alarmrecord', exact: true, element: withAuth(<AlarmRecord />, '/report/alarmrecord') },
      { path: '/report/alarmtrigger', exact: true, element: withAuth(<AlarmTrigger />, '/report/alarmtrigger') },
      { path: '/report/cardrecord', exact: true, element: withAuth(<CardRecord />, '/report/cardrecord') },

      // ***Alarm Setting*** //
      { path: '/alarmsetting', exact: true, element: withAuth(<AlarmSetting />, '/alarmsetting') },
      { path: '/alarmsetting/geofencing', exact: true, element: withAuth(<GeoFencing />, '/alarmsetting/geofencing') },
      { path: '/alarmsetting/geofencing/edit', exact: true, element: withAuth(<GeoFencingEdit />, '/alarmsetting/geofencing/edit') },
      { path: '/alarmsetting/overpopulating', exact: true, element: withAuth(<OverPopulating />, '/alarmsetting/overpopulating') },
      { path: '/alarmsetting/overpopulating/edit', exact: true, element: withAuth(<OverPopulatingEdit />, '/alarmsetting/overpopulating/edit') },
      { path: '/alarmsetting/stayonarea', exact: true, element: withAuth(<StayOnArea />, '/alarmsetting/stayonarea') },
      { path: '/alarmsetting/stayonarea/edit', exact: true, element: withAuth(<StayOnAreaEdit />, '/alarmsetting/stayonarea/edit') },
      { path: '/alarmsetting/boundary', exact: true, element: withAuth(<Boundary />, '/alarmsetting/boundary') },
      { path: '/alarmsetting/boundary/edit', exact: true, element: withAuth(<BoundaryEdit />, '/alarmsetting/boundary/edit') },

      //Restricted
      { path: '/master/application', element: withAuth(<Application />, '/master/application') },
      { path: '/master/integration', exact: true, element: withAuth(<Integration />, '/master/integration') },
      { path: '/master/user', exact: true, element: withAuth(<User />, '/master/user') },

      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
  {
    path: '/',
    element: <MyVisitLayout />,
    children: [
      { path: '/my-visit', element: withAuth(<MyVisitDashboard />, '/my-visit') },
      { path: '/my-visit/invite', element: withAuth(<InvitationPage />, '/my-visit/invite') },
    ],
  },
  {
    path: '/',
    element: <BlankLayout />,
    children: [
      { path: '/webview/monitoring/viewer', exact: true, element: <MonitoringDash /> },
      { path: '/auth/404', element: <Error /> },
      { path: '/auth/login', element: <Login /> },
      { path: '/auth/login2', element: <Login2 /> },
      { path: '/auth/register', element: <Register /> },
      { path: '/auth/register2', element: <Register2 /> },
      { path: '/auth/forgot-password', element: <ForgotPassword /> },
      { path: '/auth/forgot-password2', element: <ForgotPassword2 /> },
      { path: '/auth/two-steps', element: <TwoSteps /> },
      { path: '/auth/two-steps2', element: <TwoSteps2 /> },
      { path: '/auth/maintenance', element: <Maintenance /> },
      { path: '*', element: <Navigate to="/auth/404" /> },
      //Invitation Form
      { path: '/visitor-form', exact: true, element: <InvitationForm /> },
      { path: '/visitor-info', exact: true, element: <InvitationInfo /> },
      { path: '/thank-you', exact: true, element: <ThankYouPage /> },
    ],
  },
];
const router = createBrowserRouter(Router);

export default router;
