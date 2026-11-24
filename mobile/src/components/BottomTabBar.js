import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useSocial } from '../social/SocialContext';
import { lightTap } from '../lib/haptics';

export default function BottomTabBar({ activeTab, onChangeTab }) {
  const { colors } = useTheme();
  const { t, rowDirection } = useLanguage();
  const { totalUnread, incomingCount } = useSocial();

  const socialBadge = totalUnread + incomingCount;

  const tabs = [
    {
      id: 'news',
      label: t.tabs.news,
      icon: 'newspaper-outline',
      iconActive: 'newspaper',
    },
    {
      id: 'games',
      label: t.tabs.games,
      icon: 'game-controller-outline',
      iconActive: 'game-controller',
    },
    {
      id: 'messages',
      label: t.tabs.messages,
      icon: 'chatbubbles-outline',
      iconActive: 'chatbubbles',
      badge: socialBadge,
    },
    {
      id: 'profile',
      label: t.tabs.profile,
      icon: 'person-outline',
      iconActive: 'person',
    },
  ];

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.line,
          flexDirection: rowDirection,
        },
      ]}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              lightTap();
              onChangeTab(tab.id);
            }}
            style={styles.tabItem}
          >
            <View
              style={[
                styles.iconPill,
                active && { backgroundColor: colors.badgeBg },
              ]}
            >
              <Ionicons
                name={active ? tab.iconActive : tab.icon}
                size={20}
                color={active ? colors.cyan : colors.muted}
              />
              {tab.badge > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.red }]}>
                  <Text style={styles.badgeText}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                {
                  color: active ? colors.ink : colors.muted,
                  fontWeight: active ? '800' : '600',
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  iconPill: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 6,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
});
