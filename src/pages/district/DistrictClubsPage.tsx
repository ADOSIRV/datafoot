import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';
import { fetchClubsByDistrict } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import type { Club } from '../../types';

export default function DistrictClubsPage() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.profile.district_id) { setLoading(false); return; }
    fetchClubsByDistrict(user.profile.district_id)
      .then(setClubs)
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clubs du district</h1>
        <p className="text-gray-500 text-sm">{clubs.length} club{clubs.length > 1 ? 's' : ''} sous votre supervision</p>
      </div>

      {clubs.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-8 h-8 text-gray-400" />}
          title="Aucun club assigné"
          description="Contactez l'administrateur pour vous assigner des clubs."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map(club => (
            <Link key={club.id} to={`/district/clubs/${club.id}`} className="card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{club.name}</h3>
              <p className="text-sm text-gray-400">{club.city ?? 'Ville non renseignée'}</p>
              {club.email && <p className="text-xs text-gray-400 mt-1">{club.email}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
