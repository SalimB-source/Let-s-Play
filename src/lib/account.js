import { supabase } from './supabase';
import { clearStorage, scopeForUser } from '../achievements/storage';

/**
 * Re-authenticates the current email/password account, then asks Supabase to
 * remove the authenticated user. The password never leaves Supabase Auth: it
 * is used only by signInWithPassword and is not sent to the database function.
 *
 * `delete_current_user` is installed by supabase/schema.sql. It runs as a
 * SECURITY DEFINER function so the auth.users row can be removed safely; the
 * foreign-key cascades clean up the public profile, comments and progression.
 */
export async function deleteAccountWithPassword(user, password) {
  if (!supabase) {
    const error = new Error('Supabase authentication is not configured.');
    error.code = 'supabase_not_configured';
    throw error;
  }

  if (!user?.id || !user.email) {
    const error = new Error('This account cannot be re-authenticated with an email password.');
    error.code = 'password_reauthentication_unavailable';
    throw error;
  }

  const { data, error: reauthenticationError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (reauthenticationError) throw reauthenticationError;

  // A successful password login must still refer to the account shown in the
  // profile. This also makes the invariant explicit if the auth client is
  // ever reused by another flow.
  if (data?.user?.id && data.user.id !== user.id) {
    const error = new Error('The authenticated account changed.');
    error.code = 'account_changed';
    throw error;
  }

  const { error: deletionError } = await supabase.rpc('delete_current_user');
  if (deletionError) throw deletionError;

  // The database row is gone. Clear the local achievement cache before the
  // session is removed so the deleted account's progression is not retained
  // on a shared device.
  clearStorage(scopeForUser(user.id));
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // The access token can be invalid immediately after deleting auth.users;
    // the local session is already safe to discard.
  }
}
