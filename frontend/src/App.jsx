/**
 * App.jsx — MOLAR router shell.
 *
 * The original landing page (workspaceCards, hero section) is preserved
 * and served at the root "/" route.
 *
 * All authenticated pages are wrapped in AppShell + ProtectedRoute.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';

// Pages — lazy-imported for clarity; all are small enough to inline
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PatientDashboard from './pages/PatientDashboard';
import ScreeningPage from './pages/ScreeningPage';
import JourneyPage from './pages/JourneyPage';
import DentistDashboard from './pages/DentistDashboard';
import DentistCases from './pages/DentistCases';
import CaseDetail from './pages/CaseDetail';
import CreatePlan from './pages/CreatePlan';

/**
 * RootRedirect — send logged-in users directly to their dashboard
 * instead of the landing page.
 */
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <LandingPage />;
  return <Navigate to={user.role === 'dentist' ? '/dentist' : '/dashboard'} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Patient routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute role="patient">
                  <AppShell>
                    <PatientDashboard />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/screening"
              element={
                <ProtectedRoute role="patient">
                  <AppShell>
                    <ScreeningPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/journey"
              element={
                <ProtectedRoute role="patient">
                  <AppShell>
                    <JourneyPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Dentist routes */}
            <Route
              path="/dentist"
              element={
                <ProtectedRoute role="dentist">
                  <AppShell>
                    <DentistDashboard />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dentist/cases"
              element={
                <ProtectedRoute role="dentist">
                  <AppShell>
                    <DentistCases />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dentist/cases/:id"
              element={
                <ProtectedRoute role="dentist">
                  <AppShell>
                    <CaseDetail />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dentist/cases/:id/plan"
              element={
                <ProtectedRoute role="dentist">
                  <AppShell>
                    <CreatePlan />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
