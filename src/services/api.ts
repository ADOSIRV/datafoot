import { getSupabaseClient } from './supabase';
import type {
  Club, Team, Profile, PerformanceSession,
  ClubFormData, TeamFormData, UserFormData,
  PerformanceFormData, AppSettings, SupabaseSettingsFormData,
  SmtpSettingsFormData, ChartDataPoint, PlayerStats,
} from '../types';

// ── CLUBS ────────────────────────────────────────────────────

export async function fetchClubs(): Promise<Club[]> {
  const { data, error } = await getSupabaseClient()
    .from('clubs')
    .select('*')
    .order('name');
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchClubsByDistrict(districtId: string): Promise<Club[]> {
  const { data, error } = await getSupabaseClient()
    .from('district_clubs')
    .select('club:clubs(*)')
    .eq('district_id', districtId);
  if (error) throw new Error(error.message);
  return (data as unknown as { club: Club }[]).map(d => d.club);
}

export async function createClub(form: ClubFormData): Promise<Club> {
  const { data, error } = await getSupabaseClient()
    .from('clubs')
    .insert(form)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateClub(id: string, form: Partial<ClubFormData>): Promise<Club> {
  const { data, error } = await getSupabaseClient()
    .from('clubs')
    .update({ ...form, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteClub(id: string) {
  const { error } = await getSupabaseClient().from('clubs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── TEAMS ────────────────────────────────────────────────────

export async function fetchTeams(clubId?: string): Promise<Team[]> {
  let query = getSupabaseClient()
    .from('teams')
    .select('*, club:clubs(*)')
    .order('name');
  if (clubId) query = query.eq('club_id', clubId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchCoachTeams(coachId: string): Promise<Team[]> {
  const { data, error } = await getSupabaseClient()
    .from('coach_teams')
    .select('team:teams(*, club:clubs(*))')
    .eq('coach_id', coachId);
  if (error) throw new Error(error.message);
  return (data as unknown as { team: Team }[]).map(d => d.team);
}

export async function createTeam(form: TeamFormData): Promise<Team> {
  const { data, error } = await getSupabaseClient()
    .from('teams')
    .insert(form)
    .select('*, club:clubs(*)')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateTeam(id: string, form: Partial<TeamFormData>): Promise<Team> {
  const { data, error } = await getSupabaseClient()
    .from('teams')
    .update({ ...form, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, club:clubs(*)')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTeam(id: string) {
  const { error } = await getSupabaseClient().from('teams').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── PROFILES / USERS ─────────────────────────────────────────

export async function fetchProfiles(opts?: { role?: string; clubId?: string; teamId?: string }): Promise<Profile[]> {
  let query = getSupabaseClient()
    .from('profiles')
    .select('*, club:clubs(*), team:teams(*)')
    .order('last_name');
  if (opts?.role) query = query.eq('role', opts.role);
  if (opts?.clubId) query = query.eq('club_id', opts.clubId);
  if (opts?.teamId) query = query.eq('team_id', opts.teamId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchProfile(id: string): Promise<Profile> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('*, club:clubs(*), team:teams(*)')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createUser(form: UserFormData): Promise<Profile> {
  // Call edge function that creates auth user + profile
  const { data, error } = await getSupabaseClient().functions.invoke('create-user', { body: form });
  if (error) throw new Error(error.message);
  return data as Profile;
}

export async function updateProfile(id: string, form: Partial<UserFormData>): Promise<Profile> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .update({ ...form, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, club:clubs(*), team:teams(*)')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteUser(id: string) {
  const { error } = await getSupabaseClient().functions.invoke('delete-user', { body: { id } });
  if (error) throw new Error(error.message);
}

export async function assignCoachToTeam(coachId: string, teamId: string) {
  const { error } = await getSupabaseClient()
    .from('coach_teams')
    .upsert({ coach_id: coachId, team_id: teamId });
  if (error) throw new Error(error.message);
}

export async function removeCoachFromTeam(coachId: string, teamId: string) {
  const { error } = await getSupabaseClient()
    .from('coach_teams')
    .delete()
    .eq('coach_id', coachId)
    .eq('team_id', teamId);
  if (error) throw new Error(error.message);
}

// ── PERFORMANCE SESSIONS ─────────────────────────────────────

export async function fetchSessions(opts?: {
  playerId?: string;
  teamId?: string;
  coachId?: string;
  from?: string;
  to?: string;
}): Promise<PerformanceSession[]> {
  let query = getSupabaseClient()
    .from('performance_sessions')
    .select('*, player:profiles!player_id(id,first_name,last_name,position,avatar_url), coach:profiles!coach_id(id,first_name,last_name), team:teams(id,name)')
    .order('session_date', { ascending: false });

  if (opts?.playerId) query = query.eq('player_id', opts.playerId);
  if (opts?.teamId) query = query.eq('team_id', opts.teamId);
  if (opts?.coachId) query = query.eq('coach_id', opts.coachId);
  if (opts?.from) query = query.gte('session_date', opts.from);
  if (opts?.to) query = query.lte('session_date', opts.to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function createSession(
  form: PerformanceFormData & { player_id: string; coach_id: string; team_id: string }
): Promise<PerformanceSession> {
  const total = form.right_foot + form.left_foot + form.head;
  const { data, error } = await getSupabaseClient()
    .from('performance_sessions')
    .insert({ ...form, total, is_synced: true })
    .select('*, player:profiles!player_id(id,first_name,last_name,position,avatar_url), coach:profiles!coach_id(id,first_name,last_name), team:teams(id,name)')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateSession(id: string, form: Partial<PerformanceFormData>): Promise<PerformanceSession> {
  const total = (form.right_foot ?? 0) + (form.left_foot ?? 0) + (form.head ?? 0);
  const { data, error } = await getSupabaseClient()
    .from('performance_sessions')
    .update({ ...form, total, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSession(id: string) {
  const { error } = await getSupabaseClient()
    .from('performance_sessions')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ── STATS / CHARTS ───────────────────────────────────────────

export function computePlayerStats(sessions: PerformanceSession[]): PlayerStats {
  if (!sessions.length) {
    return {
      total_sessions: 0, best_right_foot: 0, best_left_foot: 0,
      best_head: 0, best_total: 0, avg_right_foot: 0,
      avg_left_foot: 0, avg_head: 0, avg_total: 0,
    };
  }
  const n = sessions.length;
  return {
    total_sessions: n,
    best_right_foot: Math.max(...sessions.map(s => s.right_foot)),
    best_left_foot:  Math.max(...sessions.map(s => s.left_foot)),
    best_head:       Math.max(...sessions.map(s => s.head)),
    best_total:      Math.max(...sessions.map(s => s.total)),
    last_session_date: sessions[0]?.session_date,
    avg_right_foot: Math.round(sessions.reduce((a, s) => a + s.right_foot, 0) / n),
    avg_left_foot:  Math.round(sessions.reduce((a, s) => a + s.left_foot, 0) / n),
    avg_head:       Math.round(sessions.reduce((a, s) => a + s.head, 0) / n),
    avg_total:      Math.round(sessions.reduce((a, s) => a + s.total, 0) / n),
  };
}

export function sessionsToChartData(sessions: PerformanceSession[]): ChartDataPoint[] {
  return [...sessions]
    .sort((a, b) => a.session_date.localeCompare(b.session_date))
    .map(s => ({
      date: s.session_date,
      right_foot: s.right_foot,
      left_foot: s.left_foot,
      head: s.head,
      total: s.total,
    }));
}

// ── APP SETTINGS ─────────────────────────────────────────────

export async function fetchSettings(): Promise<AppSettings | null> {
  const { data, error } = await getSupabaseClient()
    .from('app_settings')
    .select('*')
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data;
}

export async function saveSupabaseSettings(form: SupabaseSettingsFormData) {
  const { error } = await getSupabaseClient()
    .from('app_settings')
    .upsert({ ...form, id: 'singleton', updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function saveSmtpSettings(form: SmtpSettingsFormData) {
  const { error } = await getSupabaseClient()
    .from('app_settings')
    .upsert({ ...form, id: 'singleton', updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

// ── DISTRICT ─────────────────────────────────────────────────

export async function assignClubToDistrict(districtId: string, clubId: string) {
  const { error } = await getSupabaseClient()
    .from('district_clubs')
    .upsert({ district_id: districtId, club_id: clubId });
  if (error) throw new Error(error.message);
}

export async function removeClubFromDistrict(districtId: string, clubId: string) {
  const { error } = await getSupabaseClient()
    .from('district_clubs')
    .delete()
    .eq('district_id', districtId)
    .eq('club_id', clubId);
  if (error) throw new Error(error.message);
}
