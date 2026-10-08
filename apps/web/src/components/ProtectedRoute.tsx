import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';

export const ProtectedRoute: React.FC = () => {
  const { id, token } = useUserStore();
  const location = useLocation();

  if (!token || !id) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
