import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Shield, BarChart3, ArrowRight } from 'lucide-react';
import { fetchTeams, fetchProfiles } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function ClubAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ teams: 0, players: 0, coaches: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.profile.club_id) { setLoading(false); return; }
    const clubId = user.profile.club_id;
    Promise.all([
      fetchTeams(clubId),
      fetchProfiles({ role: 'player', clubId }),
      fetchProfiles({ role: 'coach',  clubId }),
    ])
      .then(([teams, players, coaches]) => {
        setStats({ teams: teams.length, players: players.length, coaches: coaches.length });
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <LoadingSpinner fullPage />;

  const cards = [
    { label: 'Équipes',      value: stats.teams,   icon: Trophy,   color: 'text-green-600',  bg: 'bg-green-50',  to: '/club/teams'   },
    { label: 'Joueurs',      value: stats.players, icon: Users,    color: 'text-blue-600',   bg: 'bg-blue-50',   to: '/club/players' },
    { label: 'Entraîneurs',  value: stats.coaches, icon: Shield,   color: 'text-purple-600', bg: 'bg-purple-50', to: '/club/coaches' },
    { label: 'Performances', value: '-',           icon: BarChart3,color: 'text-orange-600', bg: 'bg-orange-50', to: '/reports'      },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord — {user?.profile.club?.name ?? 'Mon club'}</h1>
        <p className="text-gray-500 text-sm">Gestion de votre club</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <Link key={c.label} to={c.to} className="stat-card hover:shadow-md transition-shadow cursor-pointer">
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

      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Gérer les équipes',   to: '/club/teams'   },
            { label: 'Gérer les joueurs',   to: '/club/players' },
            { label: 'Gérer les entraîneurs',to: '/club/coaches'},
            { label: 'Voir les rapports',   to: '/reports'      },
          ].map(a => (
            <Link key={a.label} to={a.to}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-all group">
              <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700">{a.label}</span>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
