import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, user, requiredRole }) => {
  if (!user) {
    return <Navigate to="/signin" />;
  }

  if (user.role !== requiredRole) {
    return <Navigate to={`/${user.role}-dashboard`} />;
  }

  return children;
};

export default ProtectedRoute;
