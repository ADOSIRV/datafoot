// ============================================================
// ENUMS
// ============================================================

export type UserRole = 'admin' | 'district' | 'club_admin' | 'coach' | 'player';

export type PlayerPosition =
  | 'goalkeeper'
  | 'defender'
  | 'midfielder'
  | 'forward'
  | 'unknown';

// ============================================================
// DATABASE MODELS
// ============================================================

export interface Club {
  id: string;
  name: string;
  logo_url?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  district_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  club_id: string;
  category?: string;
  season?: string;
  created_at: string;
  updated_at: string;
  club?: Club;
}

export interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  email: string;
  phone?: string;
  avatar_url?: string;
  club_id?: string;
  team_id?: string;
  district_id?: string;
  position?: PlayerPosition;
  date_of_birth?: string;
  jersey_number?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  club?: Club;
  team?: Team;
}

export interface PerformanceSession {
  id: string;
  player_id: string;
  coach_id: string;
  team_id: string;
  right_foot: number;
  left_foot: number;
  head: number;
  total: number;
  comment?: string;
  session_date: string;
  created_at: string;
  updated_at: string;
  is_synced: boolean;
  player?: Profile;
  coach?: Profile;
  team?: Team;
}

export interface DistrictClub {
  id: string;
  district_id: string;
  club_id: string;
  created_at: string;
  club?: Club;
}

export interface CoachTeam {
  id: string;
  coach_id: string;
  team_id: string;
  created_at: string;
  team?: Team;
}

export interface AppSettings {
  id: string;
  supabase_url: string;
  supabase_anon_key: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_from_email?: string;
  smtp_from_name?: string;
  monthly_report_enabled: boolean;
  monthly_report_day: number;
  updated_at: string;
}

// ============================================================
// FORM DATA
// ============================================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface PerformanceFormData {
  right_foot: number;
  left_foot: number;
  head: number;
  comment?: string;
  session_date: string;
}

export interface PlayerFormData {
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  position?: PlayerPosition;
  date_of_birth?: string;
  jersey_number?: number;
  team_id?: string;
  phone?: string;
}

export interface TeamFormData {
  name: string;
  club_id: string;
  category?: string;
  season?: string;
}

export interface ClubFormData {
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
}

export interface UserFormData {
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  role: UserRole;
  club_id?: string;
  team_id?: string;
  district_id?: string;
  phone?: string;
}

export interface SupabaseSettingsFormData {
  supabase_url: string;
  supabase_anon_key: string;
}

export interface SmtpSettingsFormData {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
}

// ============================================================
// UI / STATE TYPES
// ============================================================

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile;
}

export interface OfflineAction {
  id: string;
  type: 'create_performance' | 'update_performance';
  data: PerformanceFormData & { player_id: string; team_id: string };
  timestamp: number;
  retries: number;
}

export interface ChartDataPoint {
  date: string;
  right_foot: number;
  left_foot: number;
  head: number;
  total: number;
}

export interface PlayerStats {
  total_sessions: number;
  best_right_foot: number;
  best_left_foot: number;
  best_head: number;
  best_total: number;
  last_session_date?: string;
  avg_right_foot: number;
  avg_left_foot: number;
  avg_head: number;
  avg_total: number;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface SearchParams {
  query: string;
  teamId?: string;
  clubId?: string;
}
