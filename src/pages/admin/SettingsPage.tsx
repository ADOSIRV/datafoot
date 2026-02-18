import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Settings, Database, Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { fetchSettings, saveSupabaseSettings, saveSmtpSettings } from '../../services/api';
import { setSupabaseConfig, testSupabaseConnection } from '../../services/supabase';
import { useToast } from '../../contexts/ToastContext';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { AppSettings, SupabaseSettingsFormData, SmtpSettingsFormData } from '../../types';

export default function SettingsPage() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [testError, setTestError] = useState('');

  const supabaseForm = useForm<SupabaseSettingsFormData>();
  const smtpForm = useForm<SmtpSettingsFormData>();
  const [savingSupabase, setSavingSupabase] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);

  useEffect(() => {
    fetchSettings()
      .then(s => {
        setSettings(s);
        if (s?.supabase_url) supabaseForm.reset({ supabase_url: s.supabase_url, supabase_anon_key: s.supabase_anon_key ?? '' });
        if (s?.smtp_host) smtpForm.reset({
          smtp_host: s.smtp_host ?? '', smtp_port: s.smtp_port ?? 587,
          smtp_user: s.smtp_user ?? '', smtp_password: s.smtp_password ?? '',
          smtp_from_email: s.smtp_from_email ?? '', smtp_from_name: s.smtp_from_name ?? 'DataFoot',
        });
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);

  const handleTestConnection = async () => {
    const url = supabaseForm.getValues('supabase_url');
    const key = supabaseForm.getValues('supabase_anon_key');
    if (!url || !key) {
      addToast({ type: 'warning', title: 'Renseignez l\'URL et la clé API d\'abord' });
      return;
    }
    setTestStatus('testing');
    setTestError('');
    const result = await testSupabaseConnection(url, key);
    setTestStatus(result.ok ? 'ok' : 'fail');
    setTestError(result.error ?? '');
  };

  const handleSaveSupabase = async (data: SupabaseSettingsFormData) => {
    setSavingSupabase(true);
    try {
      await saveSupabaseSettings(data);
      setSupabaseConfig(data.supabase_url, data.supabase_anon_key);
      addToast({ type: 'success', title: 'Paramètres Supabase enregistrés' });
    } catch (e: unknown) {
      addToast({ type: 'error', title: 'Erreur', message: String(e) });
    } finally {
      setSavingSupabase(false);
    }
  };

  const handleSaveSmtp = async (data: SmtpSettingsFormData) => {
    setSavingSmtp(true);
    try {
      await saveSmtpSettings(data);
      addToast({ type: 'success', title: 'Paramètres SMTP enregistrés' });
    } catch (e: unknown) {
      addToast({ type: 'error', title: 'Erreur', message: String(e) });
    } finally {
      setSavingSmtp(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage message="Chargement des paramètres..." />;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500 text-sm">Configuration de la plateforme DataFoot</p>
      </div>

      {/* ── Supabase settings ─────────────────────────────── */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Database className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Configuration Supabase</h2>
            <p className="text-sm text-gray-500">Connexion à votre instance Supabase hébergée</p>
          </div>
        </div>

        <form onSubmit={supabaseForm.handleSubmit(handleSaveSupabase)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Supabase *</label>
            <input
              placeholder="https://votre-projet.supabase.co"
              className="input-field font-mono text-sm"
              {...supabaseForm.register('supabase_url', { required: 'Requis' })}
            />
            <p className="text-xs text-gray-400 mt-1">Trouvez cette URL dans les paramètres de votre projet Supabase</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clé API (anon key) *</label>
            <input
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="input-field font-mono text-sm"
              {...supabaseForm.register('supabase_anon_key', { required: 'Requis' })}
            />
            <p className="text-xs text-gray-400 mt-1">Clé publique (anon) de votre projet Supabase</p>
          </div>

          {/* Test connection */}
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleTestConnection} disabled={testStatus === 'testing'}
              className="btn-secondary flex items-center gap-2 text-sm">
              {testStatus === 'testing'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Test en cours...</>
                : <><Database className="w-4 h-4" /> Tester la connexion</>}
            </button>
            {testStatus === 'ok' && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <CheckCircle className="w-4 h-4" /> Connexion réussie
              </div>
            )}
            {testStatus === 'fail' && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <XCircle className="w-4 h-4" /> {testError || 'Connexion échouée'}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={savingSupabase} className="btn-primary">
              {savingSupabase ? 'Enregistrement...' : 'Enregistrer la configuration'}
            </button>
          </div>
        </form>
      </div>

      {/* ── SMTP settings ──────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Mail className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Configuration email (SMTP)</h2>
            <p className="text-sm text-gray-500">Envoi automatique des rapports PDF mensuels</p>
          </div>
        </div>

        <form onSubmit={smtpForm.handleSubmit(handleSaveSmtp)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serveur SMTP</label>
              <input placeholder="smtp.gmail.com" className="input-field" {...smtpForm.register('smtp_host')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <input type="number" defaultValue={587} className="input-field" {...smtpForm.register('smtp_port', { valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Utilisateur SMTP</label>
              <input className="input-field" {...smtpForm.register('smtp_user')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe SMTP</label>
              <input type="password" className="input-field" {...smtpForm.register('smtp_password')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email expéditeur</label>
              <input type="email" className="input-field" {...smtpForm.register('smtp_from_email')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom expéditeur</label>
              <input className="input-field" {...smtpForm.register('smtp_from_name')} />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={savingSmtp} className="btn-primary">
              {savingSmtp ? 'Enregistrement...' : 'Enregistrer la configuration email'}
            </button>
          </div>
        </form>
      </div>

      {/* ── App info ──────────────────────────────────────── */}
      <div className="card bg-gray-50 border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-gray-700">Informations</h2>
        </div>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-gray-500">Version</span>
          <span className="text-gray-700 font-medium">1.0.0</span>
          <span className="text-gray-500">Dernière mise à jour</span>
          <span className="text-gray-700 font-medium">{settings?.updated_at ? new Date(settings.updated_at).toLocaleDateString('fr-FR') : '-'}</span>
        </div>
      </div>
    </div>
  );
}
