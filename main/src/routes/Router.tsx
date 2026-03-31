// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import VisitorCard from 'src/views/master/tag/VisitorCard';
import AlarmList from 'src/views/Reports/AlarmList';
import SecurityViewLayout from 'src/layouts/SecurityView/SecurityViewLayout';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));
const MyVisitLayout = Loadable(lazy(() => import('../layouts/MyVisit/MyVisitLayout')));

/* ****Pages***** */
const MainMenuDash = Loadable(lazy(() => import('../views/dashboard/Main')));
const NewDashboardView = Loadable(lazy(() => import('../views/dashboard/NewDashboardView')));
const MonitoringDash = Loadable(lazy(() => import('../views/dashboard/Monitoring')));
const MonitoringConfig = Loadable(lazy(() => import('../views/dashboard/MonitoringConfig')));
const MyVisitDashboard = Loadable(lazy(() => import('../views/MyVisit/MyVisitDashboard')));
const WebView = Loadable(lazy(() => import('../components/dashboards/monitoring/FloorView')));
const About = Loadable(lazy(() => import('../views/About/aboutPage')));

/* Security View */
const SecurityViewDashboard = Loadable(
  lazy(() => import('../views/SecurityView/SecurityViewDashboard')),
);
const SecurityViewPatrolPage = Loadable(
  lazy(() => import('../views/SecurityView/SecurityViewPatrolPage')),
);
const SecurityViewPatrolDetail = Loadable(
  lazy(() => import('../views/SecurityView/SecurityViewPatrolDetail')),
);
const SecurityViewPatrolCasePage = Loadable(
  lazy(() => import('../views/SecurityView/SecurityViewPatrolCasePage')),
);
const SecurityViewAlarmInvestigatePage = Loadable(
  lazy(() => import('../views/SecurityView/SecurityViewAlarmInvestigate')),
);

/* ****Invitation***** */
const InvitationForm = Loadable(lazy(() => import('../components/InvitationForm/InvitationForm')));
const InvitationInfo = Loadable(lazy(() => import('../components/InvitationForm/InvitationInfo')));
const ThankYouPage = Loadable(lazy(() => import('../components/InvitationForm/ThankYouPage')));
const InvitationPage = Loadable(
  lazy(() => import('../views/MyVisit/MyVisitInvitation/InvitationPage')),
);

/* *****Register***** */
const UserForm = Loadable(lazy(() => import('../components/UserForm/userForm')));

/* ***Master**** */
// const GatewayApp = Loadable(lazy(() => import('../views/master/gateway/gateway')));
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

const Visitor = Loadable(lazy(() => import('../views/master/crud/Visitor')));
const Blacklist = Loadable(lazy(() => import('../views/master/crud/Blacklist')));
const Building = Loadable(lazy(() => import('../views/master/crud/Building')));
const FloorplanDevice = Loadable(lazy(() => import('../views/master/crud/FloorplanDevice')));

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

/* ****Security**** */
const SecurityGuard = Loadable(lazy(() => import('../views/master/security/securityGuard')));
const PatrolArea = Loadable(lazy(() => import('../views/master/security/PatrolArea')));
const PatrolAreaEdit = Loadable(lazy(() => import('../views/master/security/PatrolAreaEdit')));
const PatrolRoute = Loadable(lazy(() => import('../views/master/security/PatrolRoute')));
const PatrolAssignmentEdit = Loadable(
  lazy(() => import('../views/master/security/PatrolAssignmentEdit')),
);

/* ****Reports**** */
const TrackingTransaction = Loadable(lazy(() => import('../views/Reports/TrackingTrans')));
const AlarmRecord = Loadable(lazy(() => import('../views/Reports/AlarmRecord')));
const AlarmTrigger = Loadable(lazy(() => import('../views/Reports/AlarmTrigger')));
const CardRecord = Loadable(lazy(() => import('../views/Reports/CardRecord')));
const TestRecord = Loadable(lazy(() => import('../views/Reports/TestRecord')));
const TestReport = Loadable(lazy(() => import('../views/Reports/TestReport')));
const Investigate = Loadable(lazy(() => import('../views/Reports/Investigate')));
const EventLog = Loadable(lazy(() => import('../views/Reports/EventLog')));
const CardHistory = Loadable(lazy(() => import('../views/Reports/CardHistory')));
const PatrolReport = Loadable(lazy(() => import('../views/Reports/PatrolReport')));

// Evacuation
const EvacuationDashboard = Loadable(
  lazy(() => import('../views/dashboard/Evacuation/Evacuation')),
);

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

const roleAccessRules: Record<string, string[]> = {
  System: ['*'], // all routes
  SuperAdmin: ['*', '!/master/application'], // all except application
  PrimaryAdmin: ['/dashboards/', '/report/', '/visitor/visitorinvitation'],
  Primary: ['/dashboards/monitoring', '/security-view/'],
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
      return <Navigate to="/dashboards/newmainmenu" replace />;
    }
    return element;
  }

  // ✅ Handle restricted roles
  const allowed = rules.some((r) => normalize(path).startsWith(normalize(r)));
  if (allowed) {
    return element;
  }

  console.warn(`[AuthGuard] ${userRole} not allowed to access ${path}`);
  return <Navigate to="/dashboards/newmainmenu" replace />;
};

const Router = [
  {
    path: '/',
    element: <FullLayout />,
    children: [
      { path: '/', element: <Navigate to="/dashboards/newmainmenu" /> },

      // dashboards
      {
        path: '/dashboards/mainmenu',
        exact: true,
        element: withAuth(<MainMenuDash />, '/dashboards/mainmenu'),
      },
      {
        path: '/dashboards/newmainmenu',
        exact: true,
        element: withAuth(<NewDashboardView />, '/dashboards/newmainmenu'),
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
      {
        path: '/master/building',
        exact: true,
        element: withAuth(<Building />, '/master/building'),
      },
      { path: '/master/floor', exact: true, element: withAuth(<Floor />, '/master/floor') },
      {
        path: '/master/floorplan',
        exact: true,
        element: withAuth(<Floorplan />, '/master/floorplan'),
      },
      {
        path: '/master/floorplanmaskedarea',
        exact: true,
        element: withAuth(<FloorplanMaskedArea />, '/master/floorplanmaskedarea'),
      },
      {
        path: '/master/floorplanmaskedarea/edit',
        exact: true,
        element: withAuth(<MaskedAreaEdit />, '/master/floorplanmaskedarea/edit'),
      },
      { path: '/master/brand', exact: true, element: withAuth(<Brand />, '/master/brand') },
      {
        path: '/master/accesscctv',
        exact: true,
        element: withAuth(<AccessCCTV />, '/master/accesscctv'),
      },
      {
        path: '/master/accesscontrol',
        exact: true,
        element: withAuth(<AccessControl />, '/master/accesscontrol'),
      },
      {
        path: '/master/blereader',
        exact: true,
        element: withAuth(<BleReader />, '/master/blereader'),
      },
      {
        path: '/master/device',
        exact: true,
        element: withAuth(<FloorplanDevice />, '/master/device'),
      },
      {
        path: '/master/device/edit',
        exact: true,
        element: withAuth(<FloorplanDeviceEdit />, '/master/device/edit'),
      },
      {
        path: '/master/rules/edit',
        exact: true,
        element: withAuth(<RulesEdit />, '/master/rules/edit'),
      },
      { path: '/master/member', exact: true, element: withAuth(<Member />, '/master/member') },
      { path: '/master/card', exact: true, element: withAuth(<Card />, '/master/card') },
      {
        path: '/master/timegroup',
        exact: true,
        element: withAuth(<TimeGroup />, '/master/timegroup'),
      },
      {
        path: '/master/visitorcard',
        exact: true,
        element: withAuth(<VisitorCard />, '/master/visitorcard'),
      },
      {
        path: '/master/cardaccess',
        exact: true,
        element: withAuth(<CardAccess />, '/master/cardaccess'),
      },
      {
        path: '/master/cardgroup',
        exact: true,
        element: withAuth(<CardGroup />, '/master/cardgroup'),
      },

      {
        path: '/master/membertag',
        exact: true,
        element: withAuth(<MemberTag />, '/master/membertag'),
      },

      //Security
      {
        path: '/master/securityguard',
        exact: true,
        element: withAuth(<SecurityGuard />, '/master/securityguard'),
      },
      {
        path: '/master/patrolarea',
        exact: true,
        element: withAuth(<PatrolArea />, '/master/patrolarea'),
      },
      {
        path: '/master/patrolarea/edit',
        exact: true,
        element: withAuth(<PatrolAreaEdit />, '/master/patrolarea/edit'),
      },
      {
        path: '/master/patrolroute',
        exact: true,
        element: withAuth(<PatrolRoute />, '/master/patrolroute'),
      },
      {
        path: '/master/patrolassignment/edit',
        exact: true,
        element: withAuth(<PatrolAssignmentEdit />, '/master/patrolassignment/edit'),
      },
      // { path: '/master/floorplan', exact: true, element: <Floorplan /> },
      // { path: '/master/gateway', exact: true, element: <GatewayApp /> },

      // Visitor
      {
        path: '/visitor/visitordata',
        exact: true,
        element: withAuth(<Visitor />, '/visitor/visitordata'),
      },
      {
        path: '/visitor/blacklist',
        exact: true,
        element: withAuth(<Blacklist />, '/visitor/blacklist'),
      },
      {
        path: '/visitor/visitorinvitation',
        exact: true,
        element: withAuth(<VisitorTag />, '/visitor/visitorinvitation'),
      },

      // Report
      {
        path: '/report/trackingtransaction',
        exact: true,
        element: withAuth(<TrackingTransaction />, '/report/trackingtransaction'),
      },
      {
        path: '/report/alarmrecord',
        exact: true,
        element: withAuth(<AlarmRecord />, '/report/alarmrecord'),
      },
      {
        path: '/report/alarmtrigger',
        exact: true,
        element: withAuth(<AlarmTrigger />, '/report/alarmtrigger'),
      },
      {
        path: '/alarm/alarmlist',
        exact: true,
        element: withAuth(<AlarmList />, '/alarm/alarmlist'),
      },
      {
        path: '/report/cardrecord',
        exact: true,
        element: withAuth(<CardRecord />, '/report/cardrecord'),
      },
      {
        path: '/report/testrecord',
        exact: true,
        element: withAuth(<TestRecord />, '/report/testrecord'),
      },
      {
        path: '/report/visitorreport/filter',
        exact: true,
        element: withAuth(<TestReport />, '/report/visitorreport/filter'),
      },
      {
        path: '/report/investigate',
        exact: true,
        element: withAuth(<Investigate />, '/report/investigate'),
      },
      {
        path: '/report/eventlog',
        exact: true,
        element: withAuth(<EventLog />, '/report/eventlog'),
      },
      {
        path: '/report/cardhistory',
        exact: true,
        element: withAuth(<CardHistory />, '/report/cardhistory'),
      },
      {
        path: '/report/patrolreport',
        exact: true,
        element: withAuth(<PatrolReport />, '/report/patrolreport'),
      },

      // ***Alarm Setting*** //
      { path: '/alarmsetting', exact: true, element: withAuth(<AlarmSetting />, '/alarmsetting') },
      {
        path: '/alarmsetting/geofencing',
        exact: true,
        element: withAuth(<GeoFencing />, '/alarmsetting/geofencing'),
      },
      {
        path: '/alarmsetting/geofencing/edit',
        exact: true,
        element: withAuth(<GeoFencingEdit />, '/alarmsetting/geofencing/edit'),
      },
      {
        path: '/alarmsetting/overpopulating',
        exact: true,
        element: withAuth(<OverPopulating />, '/alarmsetting/overpopulating'),
      },
      {
        path: '/alarmsetting/overpopulating/edit',
        exact: true,
        element: withAuth(<OverPopulatingEdit />, '/alarmsetting/overpopulating/edit'),
      },
      {
        path: '/alarmsetting/stayonarea',
        exact: true,
        element: withAuth(<StayOnArea />, '/alarmsetting/stayonarea'),
      },
      {
        path: '/alarmsetting/stayonarea/edit',
        exact: true,
        element: withAuth(<StayOnAreaEdit />, '/alarmsetting/stayonarea/edit'),
      },
      {
        path: '/alarmsetting/boundary',
        exact: true,
        element: withAuth(<Boundary />, '/alarmsetting/boundary'),
      },
      {
        path: '/alarmsetting/boundary/edit',
        exact: true,
        element: withAuth(<BoundaryEdit />, '/alarmsetting/boundary/edit'),
      },

      //Restricted
      { path: '/master/application', element: withAuth(<Application />, '/master/application') },
      {
        path: '/master/integration',
        exact: true,
        element: withAuth(<Integration />, '/master/integration'),
      },
      { path: '/master/user', exact: true, element: withAuth(<User />, '/master/user') },
      { path: '/about', exact: true, element: withAuth(<About />, '/about') },

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
    element: <SecurityViewLayout />,
    children: [
      {
        path: '/security-view/dashboard',
        element: withAuth(<SecurityViewDashboard />, '/security-view/dashboard'),
      },
      {
        path: '/security-view/patrol-assignment',
        element: withAuth(<SecurityViewPatrolPage />, '/security-view/patrol-assignment'),
      },
      {
        path: '/security-view/patrol-assignment/detail',
        element: withAuth(<SecurityViewPatrolDetail />, '/security-view/patrol-assignment/detail'),
      },
      {
        path: '/security-view/patrol-case',
        element: withAuth(<SecurityViewPatrolCasePage />, '/security-view/patrol-case'),
      },
      {
        path: '/security-view/alarm-investigate',
        element: withAuth(<SecurityViewAlarmInvestigatePage />, '/security-view/alarm-investigate'),
      },
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
      //User Form
      { path: '/user-form', exact: true, element: <UserForm /> },
    ],
  },
];
const router = createBrowserRouter(Router);

export default router;
