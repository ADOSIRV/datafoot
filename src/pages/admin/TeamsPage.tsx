import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Trophy, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { fetchTeams, fetchClubs, createTeam, updateTeam, deleteTeam } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/shared/Modal';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import EmptyState from '../../components/shared/EmptyState';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { Team, Club, TeamFormData } from '../../types';

export default function TeamsPage() {
  const { addToast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TeamFormData>();

  const load = async () => {
    try {
      const [t, c] = await Promise.all([fetchTeams(), fetchClubs()]);
      setTeams(t); setClubs(c);
    } catch (e: unknown) { addToast({ type: 'error', title: 'Erreur', message: String(e) }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditTeam(null); reset({}); setModalOpen(true); };
  const openEdit = (t: Team) => { setEditTeam(t); reset(t); setModalOpen(true); };

  const onSubmit = async (data: TeamFormData) => {
    setSaving(true);
    try {
      if (editTeam) {
        const updated = await updateTeam(editTeam.id, data);
        setTeams(prev => prev.map(t => t.id === updated.id ? updated : t));
        addToast({ type: 'success', title: 'Équipe mise à jour' });
      } else {
        const created = await createTeam(data);
        setTeams(prev => [...prev, created]);
        addToast({ type: 'success', title: 'Équipe créée' });
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
      await deleteTeam(deleteTarget.id);
      setTeams(prev => prev.filter(t => t.id !== deleteTarget.id));
      addToast({ type: 'success', title: 'Équipe supprimée' });
      setDeleteTarget(null);
    } catch (e: unknown) {
      addToast({ type: 'error', title: 'Erreur', message: String(e) });
    } finally { setDeleting(false); }
  };

  const filtered = teams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.club?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner fullPage message="Chargement..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Équipes</h1>
          <p className="text-gray-500 text-sm">{teams.length} équipe{teams.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvelle équipe
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="input-field pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Trophy className="w-8 h-8 text-gray-400" />}
          title="Aucune équipe"
          action={<button onClick={openCreate} className="btn-primary">Créer une équipe</button>}
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Nom</th>
                <th className="table-header">Club</th>
                <th className="table-header hidden sm:table-cell">Catégorie</th>
                <th className="table-header hidden sm:table-cell">Saison</th>
                <th className="table-header w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(team => (
                <tr key={team.id} className="table-row">
                  <td className="table-cell font-medium text-gray-900">{team.name}</td>
                  <td className="table-cell">
                    <span className="badge-blue">{team.club?.name ?? '-'}</span>
                  </td>
                  <td className="table-cell hidden sm:table-cell">{team.category ?? '-'}</td>
                  <td className="table-cell hidden sm:table-cell">{team.season ?? '-'}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(team)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(team)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTeam ? 'Modifier l\'équipe' : 'Nouvelle équipe'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input className={`input-field ${errors.name ? 'border-red-400' : ''}`} {...register('name', { required: 'Requis' })} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Club *</label>
            <select className={`input-field ${errors.club_id ? 'border-red-400' : ''}`} {...register('club_id', { required: 'Requis' })}>
              <option value="">Sélectionner un club</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.club_id && <p className="text-red-500 text-xs mt-1">{errors.club_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <input placeholder="U13, Séniors..." className="input-field" {...register('category')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Saison</label>
              <input placeholder="2024-2025" className="input-field" {...register('season')} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : editTeam ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer l'équipe"
        message={`Supprimer "${deleteTarget?.name}" ? Les sessions de performance liées seront également supprimées.`}
        loading={deleting}
      />
    </div>
  );
}
