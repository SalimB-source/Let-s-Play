import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import Ionicons from '@expo/vector-icons/Ionicons';
import GameWebView from './GameWebView';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { SITE_URL, getWebSupabaseStorageKey } from '../lib/supabase';
import { heavyImpact, lightTap, mediumImpact } from '../lib/haptics';

/**
 * Construit le script injecté AVANT le démarrage du jeu dans la WebView :
 *   1. Injecte la session Supabase active (`sb-<ref>-auth-token`) + langue + thème
 *      dans `window.localStorage` → pas besoin de se reconnecter dans les jeux.
 *   2. Expose `window.LetsPlayAndroid` (compatibilité 100 % avec le pont existant
 *      de Sablier, Vice City Rush et Mirage Rush) + `window.LetsPlayMobile` (haptics).
 */
function buildInjectedShellScript({ session, storageKey, lang, themeMode }) {
  const sessionPayload = session && storageKey ? JSON.stringify(session) : null;

  return `
(function() {
  try {
    window.localStorage.setItem('letsplay_lang', ${JSON.stringify(lang)});
    window.localStorage.setItem('letsplay-theme', ${JSON.stringify(themeMode)});
    ${
      sessionPayload
        ? `window.localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(sessionPayload)});`
        : ''
    }
  } catch (e) {}

  function post(payload) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    } catch (e) {}
  }

  window.LetsPlayMobile = {
    version: '1.0.0',
    platform: ${JSON.stringify(Platform.OS)},
    haptic: function(style) {
      post({ type: 'HAPTIC', style: style || 'medium' });
    },
    exitGame: function() {
      post({ type: 'EXIT_GAME' });
    }
  };

  window.LetsPlayAndroid = {
    setSablierActif: function(active) {
      post({ type: 'SABLIER_ACTIVE', active: Boolean(active) });
    },
    setPaysageSablier: function(active) {
      post({ type: 'PAYSAGE_SABLIER', active: Boolean(active) });
    },
    setDuelLandscape: function(active) {
      post({ type: 'PAYSAGE_SABLIER', active: Boolean(active) });
    },
    ouvrirCompte: function(url) {
      post({ type: 'OPEN_ACCOUNT', url: url || '' });
    },
    webViewVersion: function() {
      return 'ReactNative-Expo-Mobile/1.0';
    },
    setCallAudio: function() {}
  };
})();
true;
`;
}

export default function GameLauncherModal({ game, visible, onClose, onOpenProfile }) {
  const { session } = useAuth();
  const { lang, t } = useLanguage();
  const { themeMode, colors } = useTheme();
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const storageKey = useMemo(() => getWebSupabaseStorageKey(), []);

  const injectedBeforeLoad = useMemo(
    () =>
      buildInjectedShellScript({
        session,
        storageKey,
        lang,
        themeMode,
      }),
    [session, storageKey, lang, themeMode],
  );

  // Déverrouille l'orientation pendant la partie (portrait & paysage fluides)
  useEffect(() => {
    if (!visible || Platform.OS === 'web') return undefined;
    setLoading(true);
    ScreenOrientation.unlockAsync().catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [visible, game?.id]);

  // Bouton Retour physique Android : délègue d'abord au jeu (`letsPlayGameBack`)
  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (webViewRef.current?.injectJavaScript) {
        webViewRef.current.injectJavaScript(`
          (function() {
            if (typeof window.letsPlayGameBack === 'function') {
              var handled = window.letsPlayGameBack();
              if (handled) return;
            }
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'EXIT_GAME' }));
            }
          })();
          true;
        `);
        return true;
      }
      onClose?.();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const handleBridgeMessage = useCallback(
    (msg) => {
      if (!msg?.type) return;
      if (msg.type === 'HAPTIC') {
        if (msg.style === 'heavy') heavyImpact();
        else if (msg.style === 'light') lightTap();
        else mediumImpact();
      } else if (msg.type === 'EXIT_GAME') {
        onClose?.();
      } else if (msg.type === 'OPEN_ACCOUNT') {
        onClose?.();
        onOpenProfile?.();
      } else if (msg.type === 'PAYSAGE_SABLIER' && Platform.OS !== 'web') {
        if (msg.active) {
          ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
        } else {
          ScreenOrientation.unlockAsync().catch(() => {});
        }
      }
    },
    [onClose, onOpenProfile],
  );

  if (!game) return null;

  const gameUri = `${SITE_URL}${game.route}`;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden={visible} />
      <View style={styles.root}>
        <GameWebView
          key={`${game.id}-${reloadKey}`}
          ref={webViewRef}
          uri={gameUri}
          injectedBeforeLoad={injectedBeforeLoad}
          onBridgeMessage={handleBridgeMessage}
          onLoadEnd={() => setLoading(false)}
        />

        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={colors.cyan} />
            <Text style={styles.loadingTitle}>{game.title}</Text>
            <Text style={styles.loadingSub}>{t.games.loadingEngine}</Text>
          </View>
        )}

        {/* Pastille discrète en haut à gauche pour quitter ou recharger */}
        <View style={styles.floatingHud}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.games.exitGame}
            onPress={() => {
              lightTap();
              onClose?.();
            }}
            style={({ pressed }) => [
              styles.hudPill,
              { opacity: pressed ? 0.8 : 0.92 },
            ]}
          >
            <Ionicons name="arrow-back" size={15} color="#eef0ff" />
            <Text style={styles.hudText}>{t.games.exitGame}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.games.reloadGame}
            onPress={() => {
              lightTap();
              setLoading(true);
              setReloadKey((k) => k + 1);
            }}
            style={({ pressed }) => [
              styles.hudIconBtn,
              { opacity: pressed ? 0.8 : 0.92 },
            ]}
          >
            <Ionicons name="refresh" size={15} color="#22d3ee" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#05060f',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 6, 15, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingTitle: {
    color: '#eef0ff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  loadingSub: {
    color: 'rgba(214, 220, 255, 0.7)',
    fontSize: 13,
  },
  floatingHud: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 16,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 40,
  },
  hudPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(11, 13, 30, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(148, 130, 255, 0.42)',
  },
  hudText: {
    color: '#eef0ff',
    fontSize: 12,
    fontWeight: '800',
  },
  hudIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 13, 30, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.4)',
  },
});
