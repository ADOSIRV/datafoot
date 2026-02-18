import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, MessageSquare, TrendingUp } from 'lucide-react';
import { fetchSessions } from '../../services/api';
import { computePlayerStats, sessionsToChartData } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import ProgressionChart from '../../components/charts/ProgressionChart';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import type { PerformanceSession } from '../../types';

export default function PlayerHistoryPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes performances</h1>
        <p className="text-gray-500 text-sm">{sessions.length} session{sessions.length > 1 ? 's' : ''} enregistrée{sessions.length > 1 ? 's' : ''}</p>
      </div>

      {/* Best records */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Record pied droit',  value: stats.best_right_foot, color: 'border-l-4 border-blue-500'   },
          { label: 'Record pied gauche', value: stats.best_left_foot,  color: 'border-l-4 border-green-500'  },
          { label: 'Record tête',        value: stats.best_head,       color: 'border-l-4 border-orange-500' },
          { label: 'Record total',       value: stats.best_total,      color: 'border-l-4 border-purple-500' },
        ].map(s => (
          <div key={s.label} className={`card ${s.color}`}>
            <p className="text-3xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">Évolution des performances</h2>
        </div>
        <ProgressionChart data={chartData} id="player-history-chart" height={300} showArea />
      </div>

      {/* Sessions list */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Historique complet</h2>
        {sessions.length === 0 ? (
          <EmptyState
            icon={<TrendingUp className="w-8 h-8 text-gray-300" />}
            title="Aucune performance enregistrée"
            description="Votre entraîneur n'a pas encore enregistré de session."
          />
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <div key={s.id} className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium text-gray-700">
                      {format(new Date(s.session_date), 'EEEE dd MMMM yyyy', { locale: fr })}
                    </span>
                  </div>
                  <div className="flex gap-3 text-sm flex-shrink-0">
                    <div className="text-center">
                      <p className="text-xs text-blue-500">Pied D</p>
                      <p className="font-bold text-blue-700">{s.right_foot}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-green-500">Pied G</p>
                      <p className="font-bold text-green-700">{s.left_foot}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-orange-500">Tête</p>
                      <p className="font-bold text-orange-700">{s.head}</p>
                    </div>
                    <div className="text-center border-l pl-3 border-gray-200">
                      <p className="text-xs text-gray-400">Total</p>
                      <p className="font-bold text-gray-900 text-base">{s.total}</p>
                    </div>
                  </div>
                </div>
                {s.comment && (
                  <div className="mt-3 flex items-start gap-2 text-sm text-gray-500 italic">
                    <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>"{s.comment}"</span>
                  </div>
                )}
                <p className="text-xs text-gray-300 mt-2">
                  Entraîneur : {s.coach?.first_name} {s.coach?.last_name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
