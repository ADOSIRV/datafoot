import { getPendingActions, removeOfflineAction, incrementRetry, cacheSessions, cacheTeams, cacheClubs, cacheProfiles } from './offline';
import { createSession, fetchSessions, fetchTeams, fetchClubs, fetchProfiles } from './api';
import type { PerformanceFormData } from '../types';

export async function syncOfflineActions(): Promise<{ synced: number; failed: number }> {
  const actions = await getPendingActions();
  let synced = 0;
  let failed = 0;

  for (const action of actions) {
    try {
      if (action.type === 'create_performance') {
        const form = action.data as PerformanceFormData & { player_id: string; coach_id: string; team_id: string };
        await createSession(form);
        await removeOfflineAction(action.id);
        synced++;
      }
    } catch {
      await incrementRetry(action.id);
      failed++;
    }
  }

  return { synced, failed };
}

export async function refreshLocalCache(userId?: string) {
  try {
    const [clubs, teams, profiles, sessions] = await Promise.all([
      fetchClubs(),
      fetchTeams(),
      fetchProfiles(),
      userId ? fetchSessions() : Promise.resolve([]),
    ]);
    await Promise.all([
      cacheClubs(clubs),
      cacheTeams(teams),
      cacheProfiles(profiles),
      sessions.length ? cacheSessions(sessions) : Promise.resolve(),
    ]);
  } catch (err) {
    console.warn('Cache refresh failed:', err);
  }
}
