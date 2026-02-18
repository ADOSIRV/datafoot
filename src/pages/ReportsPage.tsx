import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Download, Mail, Loader2, Calendar } from 'lucide-react';
import { fetchProfiles, fetchTeams, fetchSessions, computePlayerStats, sessionsToChartData } from '../services/api';
import { generatePlayerPDF, downloadPDF } from '../services/pdf';
import { getSupabaseClient } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ProgressionChart from '../components/charts/ProgressionChart';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import type { Profile, Team, PerformanceSession } from '../types';

export default function ReportsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [players, setPlayers] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [teamFilter, setTeamFilter] = useState('');
  const [sessions, setSessions] = useState<PerformanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [period, setPeriod] = useState<'all' | '3months' | 'month'>('all');

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      const clubId = user.profile.club_id;
      const [p, t] = await Promise.all([
        fetchProfiles({ role: 'player', ...(clubId ? { clubId } : {}) }),
        fetchTeams(clubId),
      ]);
      setPlayers(p);
      setTeams(t);
    };
    loadData().catch(console.warn).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!selectedPlayer) { setSessions([]); return; }
    const now = new Date();
    const from = period === 'month' ? format(startOfMonth(now), 'yyyy-MM-dd')
      : period === '3months' ? format(subMonths(now, 3), 'yyyy-MM-dd')
      : undefined;
    const to = period === 'month' ? format(endOfMonth(now), 'yyyy-MM-dd') : undefined;
    fetchSessions({ playerId: selectedPlayer, from, to })
      .then(setSessions)
      .catch(console.warn);
  }, [selectedPlayer, period]);

  const selectedPlayerData = players.find(p => p.id === selectedPlayer);
  const stats = computePlayerStats(sessions);
  const chartData = sessionsToChartData(sessions);

  const filteredPlayers = players.filter(p => !teamFilter || p.team_id === teamFilter);

  const handleDownloadPDF = async () => {
    if (!selectedPlayerData) return;
    setGeneratingPdf(true);
    try {
      const blob = await generatePlayerPDF({
        player: selectedPlayerData,
        sessions,
        stats,
        chartElementId: 'report-chart',
        title: `Rapport de performance — ${period === 'month' ? format(new Date(), 'MMMM yyyy', { locale: fr }) : 'Toutes les sessions'}`,
      });
      downloadPDF(blob, `rapport_${selectedPlayerData.last_name}_${selectedPlayerData.first_name}_${format(new Date(), 'yyyyMM')}.pdf`);
      addToast({ type: 'success', title: 'PDF généré et téléchargé' });
    } catch (e: unknown) {
      addToast({ type: 'error', title: 'Erreur PDF', message: String(e) });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedPlayerData) return;
    setSendingEmail(true);
    try {
      const blob = await generatePlayerPDF({ player: selectedPlayerData, sessions, stats, chartElementId: 'report-chart' });
      const base64 = await blobToBase64(blob);
      const { error } = await getSupabaseClient().functions.invoke('send-report-email', {
        body: {
          to: selectedPlayerData.email,
          playerName: `${selectedPlayerData.first_name} ${selectedPlayerData.last_name}`,
          pdfBase64: base64,
          month: format(new Date(), 'MMMM yyyy', { locale: fr }),
        },
      });
      if (error) throw new Error(error.message);
      addToast({ type: 'success', title: `Email envoyé à ${selectedPlayerData.email}` });
    } catch (e: unknown) {
      addToast({ type: 'error', title: 'Erreur envoi email', message: String(e) });
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rapports PDF</h1>
        <p className="text-gray-500 text-sm">Génération et envoi des rapports de performance</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Left: config ─────────────────────────────────── */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Paramètres du rapport</h2>

            <div className="space-y-4">
              {teams.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filtrer par équipe</label>
                  <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} className="input-field">
                    <option value="">Toutes les équipes</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Joueur</label>
                <select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)} className="input-field">
                  <option value="">— Sélectionner un joueur —</option>
                  {filteredPlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="inline w-4 h-4 mr-1" />Période
                </label>
                <select value={period} onChange={e => setPeriod(e.target.value as 'all' | '3months' | 'month')} className="input-field">
                  <option value="all">Toutes les sessions</option>
                  <option value="3months">3 derniers mois</option>
                  <option value="month">Mois en cours</option>
                </select>
              </div>
            </div>
          </div>

          {selectedPlayer && (
            <div className="card space-y-3">
              <h2 className="font-semibold text-gray-900">Générer le rapport</h2>
              <p className="text-sm text-gray-500">{sessions.length} session{sessions.length > 1 ? 's' : ''} sélectionnée{sessions.length > 1 ? 's' : ''}</p>

              <button
                onClick={handleDownloadPDF}
                disabled={generatingPdf || sessions.length === 0}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {generatingPdf ? 'Génération...' : 'Télécharger PDF'}
              </button>

              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || sessions.length === 0}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {sendingEmail ? 'Envoi...' : `Envoyer par email`}
              </button>

              {selectedPlayerData && (
                <p className="text-xs text-gray-400 text-center">
                  Destinataire : {selectedPlayerData.email}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Right: preview ────────────────────────────────── */}
        {selectedPlayerData ? (
          <div className="xl:col-span-2 space-y-4">
            {/* Player header */}
            <div className="card">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center text-xl font-bold text-primary-700">
                  {selectedPlayerData.first_name[0]}{selectedPlayerData.last_name[0]}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedPlayerData.first_name} {selectedPlayerData.last_name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedPlayerData.team?.name ?? '-'} · {selectedPlayerData.club?.name ?? '-'}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
                  <FileText className="w-4 h-4" />
                  Aperçu rapport
                </div>
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-4 gap-3 mt-5">
                {[
                  { label: 'Sessions',  value: stats.total_sessions,  color: 'bg-gray-50' },
                  { label: 'Meilleur',  value: stats.best_total,      color: 'bg-yellow-50' },
                  { label: 'Moy. total',value: stats.avg_total,       color: 'bg-blue-50'  },
                  { label: 'Moy. D',    value: stats.avg_right_foot,  color: 'bg-green-50' },
                ].map(s => (
                  <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart preview */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Graphique de progression</h3>
              <ProgressionChart data={chartData} id="report-chart" height={280} />
            </div>
          </div>
        ) : (
          <div className="xl:col-span-2 flex items-center justify-center py-20 text-gray-400">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Sélectionnez un joueur pour générer son rapport</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
