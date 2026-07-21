import React from 'react';
import { AuthProvider, useAuth } from './models/AuthContext';
import { Login } from './views/Login';
import { Dashboard } from './views/Dashboard';

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Dashboard /> : <Login />;
};

export const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);