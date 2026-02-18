import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, BarChart3, Plus, ArrowRight } from 'lucide-react';
import { fetchCoachTeams, fetchProfiles, fetchSessions } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { Team } from '../../types';

export default function CoachDashboard() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState({ players: 0, sessions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.profile.id) { setLoading(false); return; }
    fetchCoachTeams(user.profile.id)
      .then(async t => {
        setTeams(t);
        const [players, sessions] = await Promise.all([
          Promise.all(t.map(team => fetchProfiles({ role: 'player', teamId: team.id }))),
          fetchSessions({ coachId: user.profile.id }),
        ]);
        setStats({ players: players.flat().length, sessions: sessions.length });
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Entraîneur</h1>
        <p className="text-gray-500 text-sm">Gestion de vos équipes et performances</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Équipes',   value: teams.length,   icon: BarChart3, bg: 'bg-green-50',  color: 'text-green-600'  },
          { label: 'Joueurs',   value: stats.players,  icon: Users,     bg: 'bg-blue-50',   color: 'text-blue-600'   },
          { label: 'Sessions',  value: stats.sessions, icon: BarChart3, bg: 'bg-orange-50', color: 'text-orange-600' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick action */}
      <Link to="/coach/sessions"
        className="flex items-center gap-4 p-5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors">
        <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center">
          <Plus className="w-6 h-6" />
        </div>
        <div>
          <p className="font-semibold text-lg">Saisir des performances</p>
          <p className="text-primary-200 text-sm">Enregistrer une nouvelle session d'entraînement</p>
        </div>
        <ArrowRight className="w-5 h-5 ml-auto" />
      </Link>

      {/* Teams */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Mes équipes</h2>
        {teams.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucune équipe assignée. Contactez votre administrateur.</p>
        ) : (
          <div className="space-y-2">
            {teams.map(team => (
              <Link key={team.id} to={`/coach/sessions?team=${team.id}`}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-all group">
                <div>
                  <p className="font-medium text-gray-900">{team.name}</p>
                  <p className="text-xs text-gray-400">{team.club?.name ?? '-'} · {team.category ?? ''}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
