import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { OfflineProvider } from './contexts/OfflineContext';

// Layout
import AppLayout from './components/shared/AppLayout';
import LoadingSpinner from './components/shared/LoadingSpinner';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';

// Admin
import ClubsPage from './pages/admin/ClubsPage';
import TeamsPage from './pages/admin/TeamsPage';
import UsersPage from './pages/admin/UsersPage';
import SettingsPage from './pages/admin/SettingsPage';

// District
import DistrictClubsPage from './pages/district/DistrictClubsPage';

// Club Admin
import ClubPlayersPage from './pages/club-admin/ClubPlayersPage';

// Coach
import CoachSessionsPage from './pages/coach/CoachSessionsPage';
import CoachPlayersPage from './pages/coach/CoachPlayersPage';

// Player
import PlayerProfilePage from './pages/player/PlayerProfilePage';
import PlayerHistoryPage from './pages/player/PlayerHistoryPage';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullPage message="Chargement..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.profile.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullPage />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

      {/* Protected layout wrapper */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/reports"   element={<ReportsPage />} />

        {/* Admin */}
        <Route path="/admin/clubs"    element={<ProtectedRoute roles={['admin']}><ClubsPage /></ProtectedRoute>} />
        <Route path="/admin/teams"    element={<ProtectedRoute roles={['admin']}><TeamsPage /></ProtectedRoute>} />
        <Route path="/admin/users"    element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute roles={['admin']}><SettingsPage /></ProtectedRoute>} />

        {/* District */}
        <Route path="/district/clubs" element={<ProtectedRoute roles={['district']}><DistrictClubsPage /></ProtectedRoute>} />
        <Route path="/district/stats" element={<ProtectedRoute roles={['district']}><DashboardPage /></ProtectedRoute>} />

        {/* Club Admin */}
        <Route path="/club/teams"   element={<ProtectedRoute roles={['club_admin']}><TeamsPage /></ProtectedRoute>} />
        <Route path="/club/players" element={<ProtectedRoute roles={['club_admin']}><ClubPlayersPage /></ProtectedRoute>} />
        <Route path="/club/coaches" element={<ProtectedRoute roles={['club_admin']}><UsersPage /></ProtectedRoute>} />

        {/* Coach */}
        <Route path="/coach/sessions" element={<ProtectedRoute roles={['admin','coach','club_admin']}><CoachSessionsPage /></ProtectedRoute>} />
        <Route path="/coach/players"  element={<ProtectedRoute roles={['coach']}><CoachPlayersPage /></ProtectedRoute>} />

        {/* Player */}
        <Route path="/player/profile" element={<ProtectedRoute roles={['player']}><PlayerProfilePage /></ProtectedRoute>} />
        <Route path="/player/history" element={<ProtectedRoute roles={['player']}><PlayerHistoryPage /></ProtectedRoute>} />
      </Route>

      {/* Catch-all */}
      <Route path="/"  element={<Navigate to="/dashboard" replace />} />
      <Route path="*"  element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <OfflineProvider>
            <AppRoutes />
          </OfflineProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
