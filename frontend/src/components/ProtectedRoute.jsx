/**
 * ProtectedRoute — redirects unauthenticated users to /login.
 * Optionally restricts to a specific role.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
        <Spinner size="lg" className="text-[var(--color-accent)]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    // Redirect to the correct dashboard if the role doesn't match
    return <Navigate to={user.role === 'dentist' ? '/dentist' : '/dashboard'} replace />;
  }

  return children;
}
