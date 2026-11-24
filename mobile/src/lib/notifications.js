import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

// Affichage des alertes même lorsque l'application est au premier plan.
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch {
    // Certains environnements restreints ignorent le handler global
  }
}

export function isRunningInExpoGo() {
  return Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';
}

export async function configureAndroidChannels() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages directs',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#7c3aed',
    });
    await Notifications.setNotificationChannelAsync('friends', {
      name: 'Amis',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#22d3ee',
    });
    await Notifications.setNotificationChannelAsync('news', {
      name: 'Actualités',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#ffd619',
    });
  } catch {
    // ignoré dans Expo Go si non pris en charge
  }
}

/**
 * Demande la permission système et tente d'obtenir un jeton Expo Push.
 * Renvoie `{ granted, mode: 'push' | 'local' | 'denied', token }`.
 */
export async function registerDeviceForNotifications() {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await window.Notification.requestPermission();
      return { granted: perm === 'granted', mode: perm === 'granted' ? 'local' : 'denied', token: null };
    }
    return { granted: false, mode: 'denied', token: null };
  }

  await configureAndroidChannels();

  try {
    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;
    if (finalStatus !== 'granted') {
      const asked = await Notifications.requestPermissionsAsync();
      finalStatus = asked.status;
    }
    if (finalStatus !== 'granted') {
      return { granted: false, mode: 'denied', token: null };
    }

    // Sur Android dans Expo Go, les push distants FCM nécessitent un build dédié,
    // mais les notifications locales déclenchées par Supabase Realtime marchent !
    if (Platform.OS === 'android' && isRunningInExpoGo()) {
      return { granted: true, mode: 'local', token: null };
    }

    if (!Device.isDevice) {
      return { granted: true, mode: 'local', token: null };
    }

    const projectId =
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId;

    const tokenRes = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    if (tokenRes?.data) {
      return { granted: true, mode: 'push', token: tokenRes.data };
    }
    return { granted: true, mode: 'local', token: null };
  } catch {
    // Repli propre vers les notifications locales si projectId EAS absent
    return { granted: true, mode: 'local', token: null };
  }
}

export async function syncPushTokenWithSupabase({
  token,
  lang = 'fr',
  notifyMessages = true,
  notifyFriends = true,
  notifyNews = true,
}) {
  if (!supabase || !token) return false;
  try {
    const { error } = await supabase.rpc('upsert_push_token', {
      p_token: token,
      p_platform: Platform.OS,
      p_lang: lang,
      p_notify_messages: notifyMessages,
      p_notify_friends: notifyFriends,
      p_notify_news: notifyNews,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function unregisterPushTokenFromSupabase(token) {
  if (!supabase || !token) return;
  try {
    await supabase.rpc('delete_push_token', { p_token: token });
  } catch {
    // ignoré
  }
}

/** Déclenche une notification locale immédiate (messages Realtime ou bouton de test). */
export async function triggerLocalNotification({ title, body, data = {}, channelId = 'messages' }) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
      try {
        // eslint-disable-next-line no-new
        new window.Notification(title, { body });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId } : {}),
      },
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
}
