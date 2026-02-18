import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, Trophy, ArrowRight } from 'lucide-react';
import { fetchClubsByDistrict, fetchTeams, fetchProfiles } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { Club } from '../../types';

export default function DistrictDashboard() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [stats, setStats] = useState({ teams: 0, players: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.profile.district_id) { setLoading(false); return; }
    fetchClubsByDistrict(user.profile.district_id)
      .then(async c => {
        setClubs(c);
        const clubIds = c.map(cl => cl.id);
        const [allTeams, allPlayers] = await Promise.all([
          Promise.all(clubIds.map(id => fetchTeams(id))),
          Promise.all(clubIds.map(id => fetchProfiles({ clubId: id, role: 'player' }))),
        ]);
        setStats({
          teams: allTeams.flat().length,
          players: allPlayers.flat().length,
        });
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <LoadingSpinner fullPage message="Chargement..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord District</h1>
        <p className="text-gray-500 text-sm">Vue des clubs sous votre supervision</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Clubs',   value: clubs.length, icon: Building2, color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Équipes', value: stats.teams,  icon: Trophy,    color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Joueurs', value: stats.players,icon: Users,     color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Clubs list */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Mes clubs</h2>
        {clubs.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucun club assigné à votre district.</p>
        ) : (
          <div className="space-y-2">
            {clubs.map(club => (
              <Link key={club.id} to={`/district/clubs/${club.id}`}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{club.name}</p>
                    <p className="text-xs text-gray-400">{club.city ?? 'Ville non renseignée'}</p>
                  </div>
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
