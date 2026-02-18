import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Building2, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { fetchClubs, createClub, updateClub, deleteClub } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/shared/Modal';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import EmptyState from '../../components/shared/EmptyState';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { Club, ClubFormData } from '../../types';

export default function ClubsPage() {
  const { addToast } = useToast();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editClub, setEditClub] = useState<Club | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Club | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClubFormData>();

  const load = async () => {
    try { setClubs(await fetchClubs()); }
    catch (e: unknown) { addToast({ type: 'error', title: 'Erreur', message: String(e) }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditClub(null); reset({}); setModalOpen(true); };
  const openEdit = (club: Club) => { setEditClub(club); reset(club); setModalOpen(true); };

  const onSubmit = async (data: ClubFormData) => {
    setSaving(true);
    try {
      if (editClub) {
        const updated = await updateClub(editClub.id, data);
        setClubs(prev => prev.map(c => c.id === updated.id ? updated : c));
        addToast({ type: 'success', title: 'Club mis à jour' });
      } else {
        const created = await createClub(data);
        setClubs(prev => [...prev, created]);
        addToast({ type: 'success', title: 'Club créé' });
      }
      setModalOpen(false);
    } catch (e: unknown) {
      addToast({ type: 'error', title: 'Erreur', message: String(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteClub(deleteTarget.id);
      setClubs(prev => prev.filter(c => c.id !== deleteTarget.id));
      addToast({ type: 'success', title: 'Club supprimé' });
      setDeleteTarget(null);
    } catch (e: unknown) {
      addToast({ type: 'error', title: 'Erreur', message: String(e) });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = clubs.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.city ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner fullPage message="Chargement des clubs..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clubs</h1>
          <p className="text-gray-500 text-sm">{clubs.length} club{clubs.length > 1 ? 's' : ''} enregistré{clubs.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouveau club
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un club..."
          className="input-field pl-9"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-8 h-8 text-gray-400" />}
          title="Aucun club trouvé"
          description="Créez votre premier club pour commencer."
          action={<button onClick={openCreate} className="btn-primary">Créer un club</button>}
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Nom</th>
                <th className="table-header hidden sm:table-cell">Ville</th>
                <th className="table-header hidden md:table-cell">Email</th>
                <th className="table-header hidden md:table-cell">Téléphone</th>
                <th className="table-header w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(club => (
                <tr key={club.id} className="table-row">
                  <td className="table-cell font-medium text-gray-900">{club.name}</td>
                  <td className="table-cell hidden sm:table-cell">{club.city ?? '-'}</td>
                  <td className="table-cell hidden md:table-cell">{club.email ?? '-'}</td>
                  <td className="table-cell hidden md:table-cell">{club.phone ?? '-'}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(club)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(club)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
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

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editClub ? 'Modifier le club' : 'Nouveau club'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input className={`input-field ${errors.name ? 'border-red-400' : ''}`} {...register('name', { required: 'Requis' })} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input className="input-field" {...register('city')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input className="input-field" {...register('phone')} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" className="input-field" {...register('email')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <input className="input-field" {...register('address')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : editClub ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer le club"
        message={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.name}" ? Cette action est irréversible.`}
        loading={deleting}
      />
    </div>
  );
}
