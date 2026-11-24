import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { AuthProvider } from './src/auth/AuthContext';
import { SocialProvider } from './src/social/SocialContext';
import AppHeader from './src/components/AppHeader';
import BottomTabBar from './src/components/BottomTabBar';
import NewsScreen from './src/screens/NewsScreen';
import GamesScreen from './src/screens/GamesScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import ProfileScreen from './src/screens/ProfileScreen';

function MainShell() {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('news');
  const [isLiveFeed, setIsLiveFeed] = useState(false);
  const [pendingSlug, setPendingSlug] = useState(null);
  const [pendingPeerId, setPendingPeerId] = useState(null);
  const [pendingSubTab, setPendingSubTab] = useState(null);

  // Navigation profonde lors d'un clic sur une notification Push (message, ami ou actu)
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data || {};
      if (data.tab === 'messages') {
        setActiveTab('messages');
        if (data.peerId) setPendingPeerId(String(data.peerId));
        if (data.subTab) setPendingSubTab(String(data.subTab));
      } else if (data.tab === 'news') {
        setActiveTab('news');
        if (data.slug) setPendingSlug(String(data.slug));
      } else if (data.tab === 'games') {
        setActiveTab('games');
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.safe, { backgroundColor: colors.bg }]}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppHeader isLive={isLiveFeed} />

      <View style={styles.content}>
        {activeTab === 'news' && (
          <NewsScreen
            pendingArticleSlug={pendingSlug}
            onConsumedPendingSlug={() => setPendingSlug(null)}
            onLiveStatusChange={setIsLiveFeed}
          />
        )}
        {activeTab === 'games' && <GamesScreen onNavigateTab={setActiveTab} />}
        {activeTab === 'messages' && (
          <MessagesScreen
            onNavigateTab={setActiveTab}
            pendingPeerId={pendingPeerId}
            pendingSubTab={pendingSubTab}
            onConsumedPendingPeer={() => {
              setPendingPeerId(null);
              setPendingSubTab(null);
            }}
          />
        )}
        {activeTab === 'profile' && <ProfileScreen />}
      </View>

      <BottomTabBar activeTab={activeTab} onChangeTab={setActiveTab} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <SocialProvider>
              <MainShell />
            </SocialProvider>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
