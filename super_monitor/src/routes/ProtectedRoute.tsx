import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ element, allowedRoles }: { element: JSX.Element; allowedRoles: string[] }) => {
  const location = useLocation();
  const userRole = localStorage.getItem('levelPriority'); // e.g. "SystemAdmin"

  // no role found → force login or 404
  if (!userRole) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // check if allowed
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboards/newmainmenu" replace />;
  }

  return element;
};

export default ProtectedRoute;
