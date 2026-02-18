import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { User, Calendar, MapPin, Hash, Shield } from 'lucide-react';

const posLabel: Record<string, string> = {
  goalkeeper: 'Gardien', defender: 'Défenseur',
  midfielder: 'Milieu', forward: 'Attaquant', unknown: 'Inconnu',
};

export default function PlayerProfilePage() {
  const { user } = useAuth();
  const p = user?.profile;
  if (!p) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>

      {/* Avatar + basic info */}
      <div className="card">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            {p.avatar_url
              ? <img src={p.avatar_url} alt="" className="w-20 h-20 rounded-2xl object-cover" />
              : <span className="text-primary-700 font-bold text-2xl">{p.first_name[0]}{p.last_name[0]}</span>
            }
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{p.first_name} {p.last_name}</h2>
            <span className="badge-blue mt-1">Joueur</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {[
            { icon: Shield,   label: 'Poste',           value: posLabel[p.position ?? 'unknown'] },
            { icon: Hash,     label: 'N° maillot',      value: p.jersey_number ? `#${p.jersey_number}` : '-' },
            { icon: MapPin,   label: 'Équipe',          value: p.team?.name ?? '-' },
            { icon: MapPin,   label: 'Club',            value: p.club?.name ?? '-' },
            { icon: Calendar, label: 'Date de naissance', value: p.date_of_birth ? format(new Date(p.date_of_birth), 'dd MMMM yyyy', { locale: fr }) : '-' },
            { icon: User,     label: 'Email',           value: p.email },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <item.icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className="text-sm font-medium text-gray-700">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card bg-primary-50 border-primary-100">
        <p className="text-sm text-primary-700">
          Pour modifier vos informations, contactez votre entraîneur ou l'administrateur de votre club.
        </p>
      </div>
    </div>
  );
}
