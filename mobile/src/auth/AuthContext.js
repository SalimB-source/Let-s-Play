import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { readJsonCache, writeJsonCache } from '../lib/storage';
import {
  registerDeviceForNotifications,
  syncPushTokenWithSupabase,
  unregisterPushTokenFromSupabase,
  triggerLocalNotification,
} from '../lib/notifications';
import { useLanguage } from '../i18n/LanguageContext';

const DEMO_STORAGE_KEY = 'letsplay_mobile_demo_user';
const NOTIF_PREFS_KEY = 'letsplay_mobile_notif_prefs';

export const DEMO_PROFILES = {
  pixel: {
    id: 'demo-user-8842',
    profileKey: 'pixel',
    email: 'pixel.nomad@demo.letsplay.dz',
    user_metadata: {
      gamertag: 'PixelNomad',
      full_name: 'Salim · Alger',
      level: 14,
      xp: 3420,
    },
  },
  vortex: {
    id: 'demo-user-9104',
    profileKey: 'vortex',
    email: 'vortex.dz@demo.letsplay.dz',
    user_metadata: {
      gamertag: 'VortexDZ',
      full_name: 'Rayan · Oran',
      level: 19,
      xp: 5180,
    },
  },
};

const DEFAULT_NOTIF_PREFS = {
  enabled: false,
  mode: 'denied', // 'push' | 'local' | 'denied'
  token: null,
  notifyMessages: true,
  notifyFriends: true,
  notifyNews: true,
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { lang } = useLanguage();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [demoUser, setDemoUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifPrefs, setNotifPrefs] = useState(DEFAULT_NOTIF_PREFS);

  // Chargement initial de la session Supabase + préférences locales
  useEffect(() => {
    let mounted = true;

    readJsonCache(DEMO_STORAGE_KEY, null).then((storedDemo) => {
      if (mounted && storedDemo?.id) setDemoUser(storedDemo);
    });

    readJsonCache(NOTIF_PREFS_KEY, DEFAULT_NOTIF_PREFS).then((storedPrefs) => {
      if (mounted && storedPrefs) setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...storedPrefs });
    });

    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) {
          setSession(data?.session || null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession || null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // Chargement du profil public (`public.profiles`) quand un vrai compte est connecté
  useEffect(() => {
    const uid = session?.user?.id;
    if (!supabase || !uid) {
      setProfile(null);
      return undefined;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, level, xp')
      .eq('id', uid)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setProfile(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // Synchronisation automatique du jeton Push vers Supabase quand la langue ou les choix changent
  useEffect(() => {
    if (!session?.user?.id || !notifPrefs.enabled || !notifPrefs.token) return;
    syncPushTokenWithSupabase({
      token: notifPrefs.token,
      lang,
      notifyMessages: notifPrefs.notifyMessages,
      notifyFriends: notifPrefs.notifyFriends,
      notifyNews: notifPrefs.notifyNews,
    });
  }, [
    session?.user?.id,
    lang,
    notifPrefs.enabled,
    notifPrefs.token,
    notifPrefs.notifyMessages,
    notifPrefs.notifyFriends,
    notifPrefs.notifyNews,
  ]);

  const signInWithEmail = useCallback(async (email, password) => {
    if (!supabase) throw new Error('Supabase non configuré');
    const cleanEmail = String(email || '').trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: String(password || ''),
    });
    if (error) throw error;
    setDemoUser(null);
    await writeJsonCache(DEMO_STORAGE_KEY, null);
    return data;
  }, []);

  const signUpWithEmail = useCallback(async (email, password, gamertag) => {
    if (!supabase) throw new Error('Supabase non configuré');
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanTag = String(gamertag || '').trim().slice(0, 32);
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: String(password || ''),
      options: {
        data: {
          gamertag: cleanTag || cleanEmail.split('@')[0],
          full_name: cleanTag || cleanEmail.split('@')[0],
        },
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const loginAsDemo = useCallback(async (personaKey = 'pixel') => {
    const chosen = DEMO_PROFILES[personaKey] || DEMO_PROFILES.pixel;
    setDemoUser(chosen);
    await writeJsonCache(DEMO_STORAGE_KEY, chosen);
    return chosen;
  }, []);

  const signOut = useCallback(async () => {
    if (notifPrefs.token && session?.user?.id) {
      await unregisterPushTokenFromSupabase(notifPrefs.token);
    }
    setSession(null);
    setProfile(null);
    setDemoUser(null);
    await writeJsonCache(DEMO_STORAGE_KEY, null);
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignoré
      }
    }
  }, [notifPrefs.token, session?.user?.id]);

  const enableNotifications = useCallback(async () => {
    const res = await registerDeviceForNotifications();
    const next = {
      ...notifPrefs,
      enabled: res.granted,
      mode: res.mode,
      token: res.token,
    };
    setNotifPrefs(next);
    await writeJsonCache(NOTIF_PREFS_KEY, next);
    if (res.granted && res.token && session?.user?.id) {
      await syncPushTokenWithSupabase({
        token: res.token,
        lang,
        notifyMessages: next.notifyMessages,
        notifyFriends: next.notifyFriends,
        notifyNews: next.notifyNews,
      });
    }
    return next;
  }, [notifPrefs, session?.user?.id, lang]);

  const updateNotifPreference = useCallback(
    async (field, val) => {
      const next = { ...notifPrefs, [field]: Boolean(val) };
      setNotifPrefs(next);
      await writeJsonCache(NOTIF_PREFS_KEY, next);
    },
    [notifPrefs],
  );

  const sendTestNotification = useCallback(async (title, body) => {
    let activePrefs = notifPrefs;
    if (!activePrefs.enabled) {
      activePrefs = await enableNotifications();
    }
    if (!activePrefs.enabled) return false;
    return triggerLocalNotification({
      title,
      body,
      data: { tab: 'news' },
      channelId: 'news',
    });
  }, [notifPrefs, enableNotifications]);

  const activeUser = session?.user || demoUser || null;
  const isDemo = Boolean(!session?.user && demoUser);

  const displayGamertag = useMemo(() => {
    if (profile?.username) return profile.username;
    if (profile?.display_name) return profile.display_name;
    const meta = activeUser?.user_metadata || {};
    return meta.gamertag || meta.full_name || activeUser?.email?.split('@')[0] || 'Joueur';
  }, [profile, activeUser]);

  const value = useMemo(
    () => ({
      session,
      user: activeUser,
      profile,
      displayGamertag,
      isDemo,
      loading,
      configured: isSupabaseConfigured,
      notifPrefs,
      signInWithEmail,
      signUpWithEmail,
      loginAsDemo,
      signOut,
      enableNotifications,
      updateNotifPreference,
      sendTestNotification,
    }),
    [
      session,
      activeUser,
      profile,
      displayGamertag,
      isDemo,
      loading,
      notifPrefs,
      signInWithEmail,
      signUpWithEmail,
      loginAsDemo,
      signOut,
      enableNotifications,
      updateNotifPreference,
      sendTestNotification,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
