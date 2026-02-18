import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, BarChart3 } from 'lucide-react';
import { fetchCoachTeams, fetchProfiles } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import type { Profile, Team } from '../../types';

const posLabel: Record<string, string> = {
  goalkeeper: 'Gardien', defender: 'Défenseur',
  midfielder: 'Milieu', forward: 'Attaquant', unknown: '-',
};

export default function CoachPlayersPage() {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

  useEffect(() => {
    if (!user?.profile.id) { setLoading(false); return; }
    fetchCoachTeams(user.profile.id)
      .then(async t => {
        setTeams(t);
        const playersPerTeam = await Promise.all(t.map(team => fetchProfiles({ role: 'player', teamId: team.id })));
        setPlayers(playersPerTeam.flat());
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = players.filter(p => {
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase()) && (!teamFilter || p.team_id === teamFilter);
  });

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes joueurs</h1>
        <p className="text-gray-500 text-sm">{players.length} joueur{players.length > 1 ? 's' : ''} dans vos équipes</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="input-field pl-9" />
        </div>
        <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} className="input-field max-w-xs">
          <option value="">Toutes les équipes</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users className="w-8 h-8 text-gray-400" />} title="Aucun joueur trouvé" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(player => (
            <Link key={player.id} to={`/coach/players/${player.id}`} className="card-hover">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 font-bold">{player.first_name[0]}{player.last_name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{player.first_name} {player.last_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge-blue">{posLabel[player.position ?? 'unknown']}</span>
                    {player.jersey_number && <span className="badge-gray">#{player.jersey_number}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{player.team?.name ?? '-'}</p>
                </div>
                <BarChart3 className="w-5 h-5 text-gray-300 flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
