import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart3, Trophy, TrendingUp, Calendar } from 'lucide-react';
import { fetchSessions } from '../../services/api';
import { computePlayerStats, sessionsToChartData } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import ProgressionChart from '../../components/charts/ProgressionChart';
import StatsRadar from '../../components/charts/StatsRadar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { PerformanceSession } from '../../types';

export default function PlayerDashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<PerformanceSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.profile.id) { setLoading(false); return; }
    fetchSessions({ playerId: user.profile.id })
      .then(setSessions)
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [user]);

  const stats = computePlayerStats(sessions);
  const chartData = sessionsToChartData(sessions);

  if (loading) return <LoadingSpinner fullPage />;

  const lastSession = sessions[0];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 text-white">
        <p className="text-primary-200 text-sm">Bienvenue,</p>
        <h1 className="text-2xl font-bold mt-1">{user?.profile.first_name} {user?.profile.last_name}</h1>
        <div className="flex items-center gap-4 mt-3 text-sm text-primary-200">
          <span>{user?.profile.team?.name ?? 'Équipe non définie'}</span>
          {user?.profile.jersey_number && <span>· #{user.profile.jersey_number}</span>}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Sessions',       value: stats.total_sessions, icon: Calendar,  color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Meilleur total', value: stats.best_total,     icon: Trophy,    color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Moy. total',     value: stats.avg_total,      icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Progression',    value: stats.total_sessions > 1 ? `+${stats.best_total - (sessions[sessions.length - 1]?.total ?? 0)}` : '-', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="xl:col-span-2 card">
          <h2 className="font-semibold text-gray-900 mb-4">Courbe de progression</h2>
          <ProgressionChart data={chartData} height={280} showArea />
        </div>

        {/* Radar */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Profil</h2>
          <StatsRadar stats={stats} />
        </div>
      </div>

      {/* Last session */}
      {lastSession && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Dernière session</h2>
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
            <Calendar className="w-4 h-4" />
            {format(new Date(lastSession.session_date), 'dd MMMM yyyy', { locale: fr })}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Pied droit',  value: lastSession.right_foot, color: 'bg-blue-100 text-blue-700'   },
              { label: 'Pied gauche', value: lastSession.left_foot,  color: 'bg-green-100 text-green-700' },
              { label: 'Tête',        value: lastSession.head,       color: 'bg-orange-100 text-orange-700' },
              { label: 'Total',       value: lastSession.total,      color: 'bg-primary-100 text-primary-700' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs mt-1 opacity-80">{s.label}</p>
              </div>
            ))}
          </div>
          {lastSession.comment && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl text-sm text-gray-600 italic">
              "{lastSession.comment}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
