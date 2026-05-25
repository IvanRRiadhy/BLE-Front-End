import React, { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import Loadable from '../layouts/full/shared/loadable/Loadable';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));

/* ****Pages***** */
const MainMenuDash = Loadable(lazy(() => import('../views/dashboard/Main')));
const NewDashboardView = Loadable(lazy(() => import('../views/dashboard/NewerDashboardView')));
const MonitoringDash = Loadable(lazy(() => import('../views/dashboard/Monitoring')));
const MonitoringConfig = Loadable(lazy(() => import('../views/dashboard/MonitoringConfig')));

/* ****Reports**** */
const MovementLog = Loadable(lazy(() => import('../views/Reports/MovementLog')));

const Error = Loadable(lazy(() => import('../views/Error')));

const withAuth = (element: JSX.Element, path: string): JSX.Element => {
  return element;
};

const Router = [
  {
    path: '/',
    element: <FullLayout />,
    children: [
      { path: '/', element: <Navigate to="/report/movementlog" /> },

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

      // Report
      {
        path: '/report/movementlog',
        exact: true,
        element: withAuth(<MovementLog />, '/report/movementlog'),
      },

      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
  {
    path: '/',
    element: <BlankLayout />,
    children: [
      { path: '/webview/monitoring/viewer', exact: true, element: <MonitoringDash /> },
      { path: '/auth/404', element: <Error /> },
      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
];
const router = createBrowserRouter(Router);

export default router;
