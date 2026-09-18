/**
 * App.jsx — MOLAR router shell.
 *
 * The original landing page (workspaceCards, hero section) is preserved
 * and served at the root "/" route.
 *
 * All authenticated pages are wrapped in AppShell + ProtectedRoute.
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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
import ClinicalMeasurementWorkspace from './pages/ClinicalMeasurementWorkspace';
import SmileDesignWorkspace from './pages/SmileDesignWorkspace';
import PatientSmileDesigns from './pages/PatientSmileDesigns';

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

function AppRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        <Routes location={location}>
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
            <Route
              path="/smile-designs"
              element={<ProtectedRoute role="patient"><AppShell><PatientSmileDesigns /></AppShell></ProtectedRoute>}
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
            <Route
              path="/dentist/cases/:id/clinical"
              element={<ProtectedRoute role="dentist"><AppShell><ClinicalMeasurementWorkspace /></AppShell></ProtectedRoute>}
            />
            <Route
              path="/dentist/cases/:id/smile-design"
              element={<ProtectedRoute role="dentist"><AppShell><SmileDesignWorkspace /></AppShell></ProtectedRoute>}
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
