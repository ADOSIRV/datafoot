import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Save, Wifi, WifiOff, ChevronDown } from 'lucide-react';
import { fetchCoachTeams, fetchProfiles, createSession, fetchSessions } from '../../services/api';
import { queueOfflineAction, getCachedTeamPlayers } from '../../services/offline';
import { useAuth } from '../../contexts/AuthContext';
import { useOffline } from '../../contexts/OfflineContext';
import { useToast } from '../../contexts/ToastContext';
import { computePlayerStats, sessionsToChartData } from '../../services/api';
import ProgressionChart from '../../components/charts/ProgressionChart';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { Team, Profile, PerformanceSession } from '../../types';

interface SessionFormData {
  right_foot: number;
  left_foot: number;
  head: number;
  comment?: string;
  session_date: string;
}

const schema = z.object({
  right_foot: z.coerce.number().min(0, 'Min 0').max(9999),
  left_foot:  z.coerce.number().min(0, 'Min 0').max(9999),
  head:       z.coerce.number().min(0, 'Min 0').max(9999),
  comment:    z.string().optional(),
  session_date: z.string().min(1, 'Requis'),
});

export default function CoachSessionsPage() {
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>(searchParams.get('team') ?? '');
  const [players, setPlayers] = useState<Profile[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [playerSessions, setPlayerSessions] = useState<PerformanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<SessionFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { session_date: format(new Date(), 'yyyy-MM-dd'), right_foot: 0, left_foot: 0, head: 0 },
  });

  const watchValues = watch(['right_foot', 'left_foot', 'head']);
  const total = (Number(watchValues[0]) || 0) + (Number(watchValues[1]) || 0) + (Number(watchValues[2]) || 0);

  // Load coach's teams
  useEffect(() => {
    if (!user?.profile.id) return;
    fetchCoachTeams(user.profile.id)
      .then(t => {
        setTeams(t);
        if (!selectedTeam && t.length === 1) setSelectedTeam(t[0].id);
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [user]);

  // Load players when team selected
  useEffect(() => {
    if (!selectedTeam) { setPlayers([]); setSelectedPlayer(''); return; }
    setLoadingPlayers(true);
    setSelectedPlayer('');

    const loadPlayers = async () => {
      if (isOnline) {
        const p = await fetchProfiles({ role: 'player', teamId: selectedTeam });
        setPlayers(p);
      } else {
        const p = await getCachedTeamPlayers(selectedTeam);
        setPlayers(p);
      }
    };
    loadPlayers().catch(console.warn).finally(() => setLoadingPlayers(false));
  }, [selectedTeam, isOnline]);

  // Load sessions when player selected
  useEffect(() => {
    if (!selectedPlayer) { setPlayerSessions([]); return; }
    if (isOnline) {
      fetchSessions({ playerId: selectedPlayer })
        .then(setPlayerSessions)
        .catch(console.warn);
    }
  }, [selectedPlayer, isOnline]);

  const selectedPlayerData = players.find(p => p.id === selectedPlayer);
  const stats = computePlayerStats(playerSessions);
  const chartData = sessionsToChartData(playerSessions);

  const onSubmit = async (data: SessionFormData) => {
    if (!selectedPlayer || !selectedTeam || !user?.profile.id) {
      addToast({ type: 'warning', title: 'Sélectionnez un joueur et une équipe' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...data, player_id: selectedPlayer, coach_id: user.profile.id, team_id: selectedTeam };

      if (isOnline) {
        const session = await createSession(payload);
        setPlayerSessions(prev => [session, ...prev]);
        addToast({ type: 'success', title: 'Performance enregistrée !' });
      } else {
        await queueOfflineAction({ type: 'create_performance', data: payload });
        addToast({ type: 'info', title: 'Enregistré hors ligne', message: 'Les données seront synchronisées dès la reconnexion' });
      }

      reset({ session_date: format(new Date(), 'yyyy-MM-dd'), right_foot: 0, left_foot: 0, head: 0, comment: '' });
    } catch (e: unknown) {
      addToast({ type: 'error', title: 'Erreur', message: String(e) });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saisie des performances</h1>
          <p className="text-gray-500 text-sm">Enregistrez les jongles par joueur</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${isOnline ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {isOnline ? 'En ligne' : 'Hors ligne'}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Left: Selection + Form ─────────────────────── */}
        <div className="space-y-4">
          {/* Team select */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-bold">1</span>
              Sélectionner une équipe
            </h2>
            <div className="relative">
              <select
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
                className="input-field appearance-none pr-10"
              >
                <option value="">— Choisir une équipe —</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name} · {t.club?.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Player select */}
          {selectedTeam && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-bold">2</span>
                Sélectionner un joueur
              </h2>
              {loadingPlayers ? <LoadingSpinner size="sm" /> : (
                <div className="grid grid-cols-2 gap-2">
                  {players.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlayer(p.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        selectedPlayer === p.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 font-semibold text-xs">{p.first_name[0]}{p.last_name[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.first_name} {p.last_name}</p>
                        {p.jersey_number && <p className="text-xs text-gray-400">#{p.jersey_number}</p>}
                      </div>
                    </button>
                  ))}
                  {players.length === 0 && (
                    <p className="col-span-2 text-gray-400 text-sm">Aucun joueur dans cette équipe.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Performance form */}
          {selectedPlayer && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-bold">3</span>
                Saisir les performances — {selectedPlayerData?.first_name} {selectedPlayerData?.last_name}
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de la session</label>
                  <input type="date" className="input-field" {...register('session_date')} />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { field: 'right_foot' as const, label: 'Pied droit', emoji: '🦵', color: 'border-blue-400 bg-blue-50' },
                    { field: 'left_foot'  as const, label: 'Pied gauche', emoji: '🦵', color: 'border-green-400 bg-green-50' },
                    { field: 'head'       as const, label: 'Tête',        emoji: '🤕', color: 'border-orange-400 bg-orange-50' },
                  ].map(f => (
                    <div key={f.field} className={`p-4 rounded-xl border-2 ${f.color} text-center`}>
                      <div className="text-2xl mb-1">{f.emoji}</div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">{f.label}</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full text-center text-2xl font-bold bg-transparent border-none outline-none text-gray-900 p-0"
                        {...register(f.field)}
                      />
                      {errors[f.field] && <p className="text-red-500 text-xs mt-1">{errors[f.field]?.message}</p>}
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between p-4 bg-primary-50 rounded-xl border border-primary-200">
                  <span className="font-semibold text-primary-700">Total jongles</span>
                  <span className="text-3xl font-bold text-primary-700">{total}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire (optionnel)</label>
                  <textarea
                    rows={3}
                    placeholder="Observations sur la session..."
                    className="input-field resize-none"
                    {...register('comment')}
                  />
                </div>

                <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? 'Enregistrement...' : isOnline ? 'Enregistrer' : 'Enregistrer hors ligne'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ── Right: Chart + History ─────────────────────── */}
        {selectedPlayer && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Sessions', value: stats.total_sessions },
                { label: 'Meilleur total', value: stats.best_total },
                { label: 'Moy. total', value: stats.avg_total },
                { label: 'Moy. pied D', value: stats.avg_right_foot },
              ].map(s => (
                <div key={s.label} className="card py-4">
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Progression</h3>
              <ProgressionChart data={chartData} id="coach-chart" height={250} />
            </div>

            {/* History */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Historique récent</h3>
              {playerSessions.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucune session enregistrée.</p>
              ) : (
                <div className="space-y-2">
                  {playerSessions.slice(0, 8).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">
                          {format(new Date(s.session_date), 'dd MMM yyyy', { locale: fr })}
                        </p>
                        {s.comment && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{s.comment}</p>}
                      </div>
                      <div className="flex gap-3 text-right">
                        <div>
                          <span className="text-xs text-blue-500 block">D</span>
                          <span className="font-semibold text-blue-700">{s.right_foot}</span>
                        </div>
                        <div>
                          <span className="text-xs text-green-500 block">G</span>
                          <span className="font-semibold text-green-700">{s.left_foot}</span>
                        </div>
                        <div>
                          <span className="text-xs text-orange-500 block">T</span>
                          <span className="font-semibold text-orange-700">{s.head}</span>
                        </div>
                        <div className="border-l pl-3 border-gray-200">
                          <span className="text-xs text-gray-400 block">Total</span>
                          <span className="font-bold text-gray-900">{s.total}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
