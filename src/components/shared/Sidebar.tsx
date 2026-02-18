import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Shield, Building2, Trophy,
  BarChart3, FileText, Settings, LogOut, Wifi, WifiOff,
  RefreshCw, Bell,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOffline } from '../../contexts/OfflineContext';
import { useToast } from '../../contexts/ToastContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

function roleNav(role: string): NavItem[] {
  const base: NavItem[] = [
    { to: '/dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" /> },
  ];
  if (role === 'admin') return [
    ...base,
    { to: '/admin/clubs',   label: 'Clubs',        icon: <Building2 className="w-5 h-5" /> },
    { to: '/admin/teams',   label: 'Équipes',       icon: <Trophy    className="w-5 h-5" /> },
    { to: '/admin/users',   label: 'Utilisateurs',  icon: <Users     className="w-5 h-5" /> },
    { to: '/reports',       label: 'Rapports PDF',  icon: <FileText  className="w-5 h-5" /> },
    { to: '/admin/settings',label: 'Paramètres',    icon: <Settings  className="w-5 h-5" /> },
  ];
  if (role === 'district') return [
    ...base,
    { to: '/district/clubs', label: 'Mes clubs',   icon: <Building2 className="w-5 h-5" /> },
    { to: '/district/stats', label: 'Statistiques',icon: <BarChart3 className="w-5 h-5" /> },
  ];
  if (role === 'club_admin') return [
    ...base,
    { to: '/club/teams',   label: 'Équipes',        icon: <Trophy   className="w-5 h-5" /> },
    { to: '/club/players', label: 'Joueurs',         icon: <Users    className="w-5 h-5" /> },
    { to: '/club/coaches', label: 'Entraîneurs',     icon: <Shield   className="w-5 h-5" /> },
    { to: '/reports',      label: 'Rapports PDF',    icon: <FileText className="w-5 h-5" /> },
  ];
  if (role === 'coach') return [
    ...base,
    { to: '/coach/sessions', label: 'Saisie performances', icon: <BarChart3 className="w-5 h-5" /> },
    { to: '/coach/players',  label: 'Mes joueurs',         icon: <Users     className="w-5 h-5" /> },
    { to: '/reports',        label: 'Rapports',            icon: <FileText  className="w-5 h-5" /> },
  ];
  if (role === 'player') return [
    ...base,
    { to: '/player/profile',  label: 'Mon profil',      icon: <Users    className="w-5 h-5" /> },
    { to: '/player/history',  label: 'Mes performances', icon: <BarChart3 className="w-5 h-5" /> },
  ];
  return base;
}

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, syncing, triggerSync } = useOffline();
  const { addToast } = useToast();
  const navigate = useNavigate();

  if (!user) return null;

  const navItems = roleNav(user.profile.role);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSync = async () => {
    await triggerSync();
    addToast({ type: 'success', title: 'Synchronisation terminée' });
  };

  const roleLabel: Record<string, string> = {
    admin: 'Administrateur', district: 'District',
    club_admin: 'Admin club', coach: 'Entraîneur', player: 'Joueur',
  };

  return (
    <aside className={`h-screen flex flex-col bg-white border-r border-gray-100 shadow-sm transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-lg">⚽</span>
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-none">DataFoot</h1>
            <p className="text-xs text-gray-400 mt-0.5">Suivi des performances</p>
          </div>
        )}
      </div>

      {/* Online / offline badge */}
      <div className={`flex items-center gap-2 px-4 py-2 ${isOnline ? 'bg-green-50' : 'bg-yellow-50'}`}>
        {isOnline
          ? <Wifi className="w-4 h-4 text-green-600 flex-shrink-0" />
          : <WifiOff className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
        {!collapsed && (
          <span className={`text-xs font-medium ${isOnline ? 'text-green-700' : 'text-yellow-700'}`}>
            {isOnline ? 'En ligne' : 'Hors ligne'}
            {pendingCount > 0 && ` · ${pendingCount} en attente`}
          </span>
        )}
        {isOnline && pendingCount > 0 && !collapsed && (
          <button onClick={handleSync} disabled={syncing} className="ml-auto text-primary-600 hover:text-primary-800">
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-gray-100 p-3">
        {!collapsed && (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-primary-700 font-semibold text-sm">
                {user.profile.first_name[0]}{user.profile.last_name[0]}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.profile.first_name} {user.profile.last_name}
              </p>
              <p className="text-xs text-gray-500 truncate">{roleLabel[user.profile.role] ?? user.profile.role}</p>
            </div>
            <button className="ml-auto text-gray-400 hover:text-gray-600">
              <Bell className="w-4 h-4" />
            </button>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
