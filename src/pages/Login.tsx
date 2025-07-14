import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LoginForm from '@/components/auth/LoginForm';

const Login = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-card flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLoginSuccess = () => {
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-card flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <LoginForm onSuccess={handleLoginSuccess} />
      </div>
    </div>
  );
};

export default Login; 