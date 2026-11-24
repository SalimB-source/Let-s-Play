import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const SECTION_THEMES = {
  gaming: {
    bg: '#191338',
    orbA: 'rgba(124, 58, 237, 0.42)',
    orbB: 'rgba(34, 211, 238, 0.25)',
    accent: '#a78bfa',
    icon: 'game-controller-outline',
    tag: 'GAMING',
  },
  cinema: {
    bg: '#24132c',
    orbA: 'rgba(244, 63, 94, 0.34)',
    orbB: 'rgba(255, 214, 25, 0.24)',
    accent: '#ffd619',
    icon: 'film-outline',
    tag: 'CINÉMA & SÉRIES',
  },
  tech: {
    bg: '#0f1e36',
    orbA: 'rgba(34, 211, 238, 0.34)',
    orbB: 'rgba(99, 102, 241, 0.28)',
    accent: '#22d3ee',
    icon: 'hardware-chip-outline',
    tag: 'TECH & IA',
  },
};

export default function StoryCoverImage({ uri, section = 'gaming', category, compact = false, style }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const theme = SECTION_THEMES[section] || SECTION_THEMES.gaming;
  const showImage = Boolean(uri) && !failed;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }, style]}>
      {/* Décor éditorial hors-ligne / chargement */}
      <View
        pointerEvents="none"
        style={[
          styles.orbA,
          compact && styles.orbACompact,
          { backgroundColor: theme.orbA },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.orbB,
          compact && styles.orbBCompact,
          { backgroundColor: theme.orbB },
        ]}
      />

      <View pointerEvents="none" style={styles.fallbackCenter}>
        <View
          style={[
            styles.iconRing,
            compact && styles.iconRingCompact,
            { borderColor: theme.accent + '55', backgroundColor: 'rgba(9, 9, 20, 0.48)' },
          ]}
        >
          <Ionicons name={theme.icon} size={compact ? 24 : 36} color={theme.accent} />
        </View>
        {!compact && (
          <Text numberOfLines={1} style={[styles.fallbackLabel, { color: theme.accent }]}>
            {category || theme.tag}
          </Text>
        )}
      </View>

      {showImage ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  orbA: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -70,
    left: -40,
  },
  orbACompact: {
    width: 90,
    height: 90,
    borderRadius: 45,
    top: -25,
    left: -20,
  },
  orbB: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    bottom: -65,
    right: -30,
  },
  orbBCompact: {
    width: 80,
    height: 80,
    borderRadius: 40,
    bottom: -25,
    right: -15,
  },
  fallbackCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  iconRing: {
    width: 68,
    height: 68,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRingCompact: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  fallbackLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
