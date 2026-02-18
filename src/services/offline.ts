import Dexie, { type Table } from 'dexie';
import type { PerformanceSession, Profile, Team, Club, OfflineAction } from '../types';

class DatafootDatabase extends Dexie {
  profiles!: Table<Profile, string>;
  teams!: Table<Team, string>;
  clubs!: Table<Club, string>;
  sessions!: Table<PerformanceSession, string>;
  offlineActions!: Table<OfflineAction, string>;

  constructor() {
    super('DatafootDB');
    this.version(1).stores({
      profiles:      'id, user_id, role, club_id, team_id, email',
      teams:         'id, club_id, name',
      clubs:         'id, name, district_id',
      sessions:      'id, player_id, coach_id, team_id, session_date, is_synced',
      offlineActions:'id, type, timestamp',
    });
  }
}

export const db = new DatafootDatabase();

// ── Cache helpers ────────────────────────────────────────────

export async function cacheProfiles(profiles: Profile[]) {
  await db.profiles.bulkPut(profiles);
}

export async function cacheTeams(teams: Team[]) {
  await db.teams.bulkPut(teams);
}

export async function cacheClubs(clubs: Club[]) {
  await db.clubs.bulkPut(clubs);
}

export async function cacheSessions(sessions: PerformanceSession[]) {
  await db.sessions.bulkPut(sessions);
}

// ── Getters ─────────────────────────────────────────────────

export async function getCachedPlayerSessions(playerId: string): Promise<PerformanceSession[]> {
  return db.sessions.where('player_id').equals(playerId).reverse().sortBy('session_date');
}

export async function getCachedTeamPlayers(teamId: string): Promise<Profile[]> {
  return db.profiles.where('team_id').equals(teamId).toArray();
}

export async function getCachedTeams(clubId?: string): Promise<Team[]> {
  if (clubId) {
    return db.teams.where('club_id').equals(clubId).toArray();
  }
  return db.teams.toArray();
}

export async function getCachedClubs(): Promise<Club[]> {
  return db.clubs.toArray();
}

// ── Offline action queue ─────────────────────────────────────

export async function queueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>) {
  const id = crypto.randomUUID();
  await db.offlineActions.put({
    ...action,
    id,
    timestamp: Date.now(),
    retries: 0,
  });
  return id;
}

export async function getPendingActions(): Promise<OfflineAction[]> {
  return db.offlineActions.orderBy('timestamp').toArray();
}

export async function removeOfflineAction(id: string) {
  await db.offlineActions.delete(id);
}

export async function incrementRetry(id: string) {
  const action = await db.offlineActions.get(id);
  if (action) {
    await db.offlineActions.put({ ...action, retries: action.retries + 1 });
  }
}

export async function clearSyncedSessions() {
  await db.sessions.where('is_synced').equals(1).delete();
}
