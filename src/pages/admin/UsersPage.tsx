import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users, Search, UserCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { fetchProfiles, fetchClubs, fetchTeams, createUser, updateProfile, deleteUser } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/shared/Modal';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import EmptyState from '../../components/shared/EmptyState';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { Profile, Club, Team, UserFormData, UserRole } from '../../types';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin',      label: 'Administrateur global' },
  { value: 'district',   label: 'District'              },
  { value: 'club_admin', label: 'Administrateur de club' },
  { value: 'coach',      label: 'Entraîneur'            },
  { value: 'player',     label: 'Joueur'                },
];

const POSITIONS = [
  { value: 'goalkeeper', label: 'Gardien'    },
  { value: 'defender',   label: 'Défenseur'  },
  { value: 'midfielder', label: 'Milieu'     },
  { value: 'forward',    label: 'Attaquant'  },
  { value: 'unknown',    label: 'Inconnu'    },
];

const roleBadge: Record<string, string> = {
  admin:      'badge-red',
  district:   'badge-yellow',
  club_admin: 'badge-blue',
  coach:      'badge-green',
  player:     'badge-gray',
};

const roleLabel: Record<string, string> = {
  admin: 'Admin', district: 'District', club_admin: 'Admin club',
  coach: 'Entraîneur', player: 'Joueur',
};

export default function UsersPage() {
  const { addToast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<UserFormData>();
  const watchRole = watch('role');

  const load = async () => {
    try {
      const [p, c, t] = await Promise.all([fetchProfiles(), fetchClubs(), fetchTeams()]);
      setProfiles(p); setClubs(c); setTeams(t);
    } catch (e: unknown) { addToast({ type: 'error', title: 'Erreur', message: String(e) }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditProfile(null); reset({ role: 'player' }); setModalOpen(true); };
  const openEdit = (p: Profile) => { setEditProfile(p); reset({ ...p } as UserFormData); setModalOpen(true); };

  const onSubmit = async (data: UserFormData) => {
    setSaving(true);
    try {
      if (editProfile) {
        const updated = await updateProfile(editProfile.id, data);
        setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
        addToast({ type: 'success', title: 'Utilisateur mis à jour' });
      } else {
        const created = await createUser(data);
        setProfiles(prev => [...prev, created]);
        addToast({ type: 'success', title: 'Utilisateur créé' });
      }
      setModalOpen(false);
    } catch (e: unknown) {
      addToast({ type: 'error', title: 'Erreur', message: String(e) });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget.id);
      setProfiles(prev => prev.filter(p => p.id !== deleteTarget.id));
      addToast({ type: 'success', title: 'Utilisateur supprimé' });
      setDeleteTarget(null);
    } catch (e: unknown) {
      addToast({ type: 'error', title: 'Erreur', message: String(e) });
    } finally { setDeleting(false); }
  };

  const filtered = profiles.filter(p => {
    const matchSearch = `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || p.role === filterRole;
    return matchSearch && matchRole;
  });

  if (loading) return <LoadingSpinner fullPage message="Chargement des utilisateurs..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-gray-500 text-sm">{profiles.length} utilisateur{profiles.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvel utilisateur
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="input-field pl-9" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="input-field max-w-xs">
          <option value="">Tous les rôles</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-gray-400" />}
          title="Aucun utilisateur trouvé"
          action={<button onClick={openCreate} className="btn-primary">Créer un utilisateur</button>}
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Utilisateur</th>
                <th className="table-header">Rôle</th>
                <th className="table-header hidden sm:table-cell">Club</th>
                <th className="table-header hidden md:table-cell">Équipe</th>
                <th className="table-header hidden sm:table-cell">Statut</th>
                <th className="table-header w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 font-semibold text-xs">
                          {p.first_name[0]}{p.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{p.first_name} {p.last_name}</p>
                        <p className="text-xs text-gray-400">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={roleBadge[p.role] ?? 'badge-gray'}>{roleLabel[p.role] ?? p.role}</span>
                  </td>
                  <td className="table-cell hidden sm:table-cell">{p.club?.name ?? '-'}</td>
                  <td className="table-cell hidden md:table-cell">{p.team?.name ?? '-'}</td>
                  <td className="table-cell hidden sm:table-cell">
                    <span className={p.is_active ? 'badge-green' : 'badge-gray'}>
                      {p.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(p)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editProfile ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
              <input className={`input-field ${errors.first_name ? 'border-red-400' : ''}`}
                {...register('first_name', { required: 'Requis' })} />
              {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input className={`input-field ${errors.last_name ? 'border-red-400' : ''}`}
                {...register('last_name', { required: 'Requis' })} />
              {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" className={`input-field ${errors.email ? 'border-red-400' : ''}`}
              {...register('email', { required: 'Requis' })} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          {!editProfile && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
              <input type="password" className={`input-field ${errors.password ? 'border-red-400' : ''}`}
                {...register('password', { required: !editProfile ? 'Requis' : false, minLength: { value: 6, message: '6 caractères min.' } })} />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
              <select className="input-field" {...register('role', { required: 'Requis' })}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input className="input-field" {...register('phone')} />
            </div>
          </div>
          {(watchRole === 'club_admin' || watchRole === 'coach' || watchRole === 'player') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Club</label>
              <select className="input-field" {...register('club_id')}>
                <option value="">Aucun</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {(watchRole === 'coach' || watchRole === 'player') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Équipe</label>
              <select className="input-field" {...register('team_id')}>
                <option value="">Aucune</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.club?.name})</option>)}
              </select>
            </div>
          )}
          {watchRole === 'player' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poste</label>
                  <select className="input-field" {...register('position' as keyof UserFormData)}>
                    {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° maillot</label>
                  <input type="number" className="input-field" {...register('jersey_number' as keyof UserFormData)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                <input type="date" className="input-field" {...register('date_of_birth' as keyof UserFormData)} />
              </div>
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              {saving ? 'Enregistrement...' : editProfile ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer l'utilisateur"
        message={`Supprimer "${deleteTarget?.first_name} ${deleteTarget?.last_name}" ? Toutes ses données seront supprimées.`}
        loading={deleting}
      />
    </div>
  );
}
