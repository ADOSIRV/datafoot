import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, Trophy, BarChart3, Settings, ArrowRight } from 'lucide-react';
import { fetchClubs } from '../../services/api';
import { fetchProfiles, fetchTeams } from '../../services/api';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

interface Stats {
  clubs: number;
  teams: number;
  players: number;
  coaches: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ clubs: 0, teams: 0, players: 0, coaches: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchClubs(), fetchTeams(), fetchProfiles({ role: 'player' }), fetchProfiles({ role: 'coach' })])
      .then(([clubs, teams, players, coaches]) => {
        setStats({ clubs: clubs.length, teams: teams.length, players: players.length, coaches: coaches.length });
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner fullPage message="Chargement..." />;

  const cards = [
    { label: 'Clubs',        value: stats.clubs,   icon: Building2, color: 'text-blue-600',   bg: 'bg-blue-50',   to: '/admin/clubs'    },
    { label: 'Équipes',      value: stats.teams,   icon: Trophy,    color: 'text-green-600',  bg: 'bg-green-50',  to: '/admin/teams'    },
    { label: 'Joueurs',      value: stats.players, icon: Users,     color: 'text-purple-600', bg: 'bg-purple-50', to: '/admin/users'    },
    { label: 'Entraîneurs',  value: stats.coaches, icon: BarChart3, color: 'text-orange-600', bg: 'bg-orange-50', to: '/admin/users'    },
  ];

  const quickActions = [
    { label: 'Gérer les clubs',       to: '/admin/clubs',    icon: Building2 },
    { label: 'Gérer les équipes',     to: '/admin/teams',    icon: Trophy    },
    { label: 'Gérer les utilisateurs',to: '/admin/users',    icon: Users     },
    { label: 'Paramètres Supabase',   to: '/admin/settings', icon: Settings  },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord administrateur</h1>
        <p className="text-gray-500 text-sm mt-1">Vue globale de la plateforme DataFoot</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <Link key={c.label} to={c.to} className="stat-card hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
              <c.icon className={`w-6 h-6 ${c.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{c.value}</p>
              <p className="text-sm text-gray-500">{c.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map(a => (
            <Link key={a.label} to={a.to}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-all group">
              <div className="flex items-center gap-3">
                <a.icon className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700">{a.label}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
