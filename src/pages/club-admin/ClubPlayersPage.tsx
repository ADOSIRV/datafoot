import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, BarChart3 } from 'lucide-react';
import { fetchProfiles } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import type { Profile } from '../../types';

const posLabel: Record<string, string> = {
  goalkeeper: 'Gardien', defender: 'Défenseur',
  midfielder: 'Milieu', forward: 'Attaquant', unknown: '-',
};

export default function ClubPlayersPage() {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

  useEffect(() => {
    if (!user?.profile.club_id) { setLoading(false); return; }
    fetchProfiles({ role: 'player', clubId: user.profile.club_id })
      .then(setPlayers)
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [user]);

  const teams = [...new Set(players.map(p => p.team?.name).filter(Boolean))];

  const filtered = players.filter(p => {
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchTeam = !teamFilter || p.team?.name === teamFilter;
    return matchSearch && matchTeam;
  });

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Joueurs</h1>
        <p className="text-gray-500 text-sm">{players.length} joueur{players.length > 1 ? 's' : ''} dans votre club</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un joueur..." className="input-field pl-9" />
        </div>
        {teams.length > 0 && (
          <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} className="input-field max-w-xs">
            <option value="">Toutes les équipes</option>
            {teams.map(t => <option key={t} value={t!}>{t}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users className="w-8 h-8 text-gray-400" />} title="Aucun joueur trouvé" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(player => (
            <Link key={player.id} to={`/club/players/${player.id}`} className="card-hover">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  {player.avatar_url
                    ? <img src={player.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                    : <span className="text-primary-700 font-bold">{player.first_name[0]}{player.last_name[0]}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{player.first_name} {player.last_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge-blue text-xs">{posLabel[player.position ?? 'unknown']}</span>
                    {player.jersey_number && (
                      <span className="badge-gray text-xs">#{player.jersey_number}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 truncate">{player.team?.name ?? '-'}</p>
                </div>
                <BarChart3 className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
