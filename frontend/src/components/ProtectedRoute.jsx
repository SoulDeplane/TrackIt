import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirectPath = {
      admin: '/admin',
      driver: '/driver',
      student: '/dashboard',
      parent: '/dashboard'
    };
    return <Navigate to={redirectPath[user.role] || '/login'} replace />;
  }

  return children;
};

export const PublicRoute = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    const redirectPath = {
      admin: '/admin',
      driver: '/driver',
      student: '/dashboard',
      parent: '/dashboard'
    };
    return <Navigate to={redirectPath[user.role] || '/dashboard'} replace />;
  }

  return children;
};
