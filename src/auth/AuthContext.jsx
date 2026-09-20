import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DEMO_PROFILES, DEFAULT_DEMO_KEY } from './demoProfiles';
import { syncDemoCommentsForUser } from '../lib/comments';

const AuthContext = createContext(null);
const DEMO_STORAGE_KEY = 'letsplay_auth_demo_profile';

function getStoredDemoUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (e) {
    return null;
  }
}

/**
 * @param {object} [props.initialSession] session Supabase fournie au montage.
 *   Hors navigateur (rendus SSR des scripts de vérification) Supabase n'existe
 *   pas et la session n'arrive que par effet : cette entrée permet de rendre le
 *   hub d'un compte réellement connecté. L'application ne la fournit jamais.
 */
export function AuthProvider({ children, initialSession = null }) {
  const [session, setSession] = useState(initialSession);
  const [demoUser, setDemoUser] = useState(getStoredDemoUser);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const loginAsDemo = (profileKey = DEFAULT_DEMO_KEY) => {
    const profile = DEMO_PROFILES[profileKey] || DEMO_PROFILES[DEFAULT_DEMO_KEY];
    setDemoUser(profile);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(profile));
      }
    } catch (e) {}
    return profile;
  };

  const updateDemoProfile = (updater) => {
    setDemoUser((prev) => {
      if (!prev) return prev;
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next));
        }
      } catch (e) {}
      // Keep existing demo comments in sync with the new gamertag / avatar / level
      try { syncDemoCommentsForUser(next); } catch {}
      return next;
    });
  };

  const toggleDemoProvider = (provider) => {
    setDemoUser((prev) => {
      if (!prev) return prev;
      const meta = { ...prev.user_metadata };
      if (provider === 'google') {
        meta.googleConnected = !meta.googleConnected;
        if (meta.googleConnected && !meta.googleEmail) {
          meta.googleEmail = prev.email || 'player@gmail.com';
        }
      } else if (provider === 'microsoft') {
        meta.microsoftConnected = !meta.microsoftConnected;
        if (meta.microsoftConnected && !meta.microsoftGamertag) {
          meta.microsoftGamertag = `${meta.gamertag || 'PlayerDZ'}#${Math.floor(1000 + Math.random() * 9000)}`;
        }
      }
      const next = { ...prev, user_metadata: meta };
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next));
        }
      } catch (e) {}
      return next;
    });
  };

  const signOut = async () => {
    // Clear the local session immediately. This also keeps account deletion
    // from leaving a deleted user visible if Supabase rejects the follow-up
    // network sign-out because the auth row has just been removed.
    setSession(null);
    setDemoUser(null);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(DEMO_STORAGE_KEY);
      }
    } catch (e) {}
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // A local sign-out is still complete if the remote session is already
        // invalid (for example, immediately after deleting the account).
      }
    }
  };

  const activeUser = session?.user || demoUser || null;

  const value = useMemo(() => ({
    session,
    user: activeUser,
    isDemo: Boolean(!session?.user && demoUser),
    demoProfileKey: demoUser?.profileKey || DEFAULT_DEMO_KEY,
    loading,
    configured: Boolean(supabase),
    loginAsDemo,
    updateDemoProfile,
    toggleDemoProvider,
    signOut,
  }), [session, demoUser, loading, activeUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
