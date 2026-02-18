import { getSupabaseClient } from './supabase';
import type { AuthUser, Profile } from '../types';

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('No user returned');

  const profile = await getProfile(data.user.id);
  return { id: data.user.id, email: data.user.email!, profile };
}

export async function signOut() {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
}

export async function getProfile(userId: string): Promise<Profile> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*, club:clubs(*), team:teams(*)')
    .eq('user_id', userId)
    .single();
  if (error) throw new Error(error.message);
  return data as Profile;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  try {
    const profile = await getProfile(user.id);
    return { id: user.id, email: user.email!, profile };
  } catch {
    return null;
  }
}

export async function updatePassword(newPassword: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}
