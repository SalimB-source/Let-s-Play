import React, { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { lightTap } from '../lib/haptics';
import ExpoQrModal from './ExpoQrModal';

const LOGO_SOURCE = require('../../assets/lets-play-logo.png');

const LANG_BADGE = {
  fr: 'FR',
  en: 'EN',
  ar: 'عربي',
};

export default function AppHeader({ isLive = true }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { lang, cycleLang, t, rowDirection } = useLanguage();
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          borderBottomColor: colors.line,
          flexDirection: rowDirection,
        },
      ]}
    >
      <View style={[styles.brandRow, { flexDirection: rowDirection }]}>
        <Image source={LOGO_SOURCE} style={styles.logo} resizeMode="contain" />
        <View style={[styles.livePill, { backgroundColor: colors.panel2, borderColor: colors.line }]}>
          <View
            style={[
              styles.liveDot,
              { backgroundColor: isLive ? colors.cyan : colors.yellow },
            ]}
          />
          <Text style={[styles.liveText, { color: colors.muted }]}>
            {isLive ? t.header.liveSync : t.header.offlineCache}
          </Text>
        </View>
      </View>

      <View style={[styles.actionsRow, { flexDirection: rowDirection }]}>
        {Platform.OS === 'web' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scanner le QR Code Expo Go"
            onPress={() => setQrOpen(true)}
            style={({ pressed }) => [
              styles.pillBtn,
              {
                backgroundColor: colors.purple,
                borderColor: colors.violet,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name="qr-code-outline" size={14} color="#ffffff" />
            <Text style={[styles.pillBtnText, { color: '#ffffff' }]}>QR</Text>
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Changer de langue"
          onPress={() => {
            lightTap();
            cycleLang();
          }}
          style={({ pressed }) => [
            styles.pillBtn,
            {
              backgroundColor: colors.panel2,
              borderColor: colors.lineStrong,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Ionicons name="globe-outline" size={14} color={colors.cyan} />
          <Text style={[styles.pillBtnText, { color: colors.ink }]}>
            {LANG_BADGE[lang] || 'FR'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Changer de thème"
          onPress={() => {
            lightTap();
            toggleTheme();
          }}
          style={({ pressed }) => [
            styles.iconBtn,
            {
              backgroundColor: colors.panel2,
              borderColor: colors.line,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={17}
            color={isDark ? colors.yellow : colors.purple}
          />
        </Pressable>
      </View>

      {Platform.OS === 'web' && (
        <ExpoQrModal visible={qrOpen} onClose={() => setQrOpen(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  brandRow: {
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 96,
    height: 34,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  actionsRow: {
    alignItems: 'center',
    gap: 8,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
