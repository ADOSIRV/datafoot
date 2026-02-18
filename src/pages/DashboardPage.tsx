import { useAuth } from '../contexts/AuthContext';
import AdminDashboard from './admin/AdminDashboard';
import DistrictDashboard from './district/DistrictDashboard';
import ClubAdminDashboard from './club-admin/ClubAdminDashboard';
import CoachDashboard from './coach/CoachDashboard';
import PlayerDashboard from './player/PlayerDashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  switch (user.profile.role) {
    case 'admin':      return <AdminDashboard />;
    case 'district':   return <DistrictDashboard />;
    case 'club_admin': return <ClubAdminDashboard />;
    case 'coach':      return <CoachDashboard />;
    case 'player':     return <PlayerDashboard />;
    default:           return <div className="card">Rôle non reconnu.</div>;
  }
}
