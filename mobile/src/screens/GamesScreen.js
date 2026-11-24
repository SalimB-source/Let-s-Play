import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { mediumImpact, lightTap } from '../lib/haptics';
import GameLauncherModal from '../components/GameLauncherModal';

const SABLIER_ART = require('../../assets/games/sablier.jpg');
const VICE_CITY_ART = require('../../assets/games/vice-city.jpg');
const MIRAGE_ART = require('../../assets/games/mirage.jpg');

export default function GamesScreen({ onNavigateTab }) {
  const { colors } = useTheme();
  const { t, textAlign, rowDirection, writingDirection } = useLanguage();
  const { session, displayGamertag } = useAuth();
  const [activeGame, setActiveGame] = useState(null);

  const games = useMemo(
    () => [
      {
        id: 'sablier-de-bab-el',
        serial: 'LP · 01',
        title: 'LE SABLIER DE BAB EL',
        route: '/jeu/sablier-de-bab-el',
        art: SABLIER_ART,
        accent: '#a855f7',
        tag: t.games.cards.sablier.tag,
        desc: t.games.cards.sablier.desc,
      },
      {
        id: 'vice-city-rush',
        serial: 'LP · 02',
        title: 'VICE CITY RUSH',
        route: '/jeu/vice-city-rush',
        art: VICE_CITY_ART,
        accent: '#22d3ee',
        tag: t.games.cards.viceCity.tag,
        desc: t.games.cards.viceCity.desc,
      },
      {
        id: 'mirage-rush',
        serial: 'LP · 03',
        title: 'MIRAGE RUSH',
        route: '/jeu/mirage-rush',
        art: MIRAGE_ART,
        accent: '#ffd619',
        tag: t.games.cards.mirage.tag,
        desc: t.games.cards.mirage.desc,
      },
      {
        id: 'projet-03',
        serial: 'LP · 04',
        title: 'PROJET 03',
        route: null,
        art: null,
        accent: colors.dim,
        tag: t.games.cards.projet03.tag,
        desc: t.games.cards.projet03.desc,
      },
    ],
    [t, colors.dim],
  );

  const isCloudLogged = Boolean(session?.user);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* En-tête Arcade */}
        <View style={styles.headerBlock}>
          <Text
            style={[
              styles.eyebrow,
              { color: colors.cyan, textAlign, writingDirection },
            ]}
          >
            ✦ {t.games.eyebrow}
          </Text>
          <Text
            style={[
              styles.title,
              { color: colors.ink, textAlign, writingDirection },
            ]}
          >
            {t.games.title}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.muted, textAlign, writingDirection },
            ]}
          >
            {t.games.subtitle}
          </Text>
        </View>

        {/* Bandeau d'état de synchronisation du compte joueur */}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (!isCloudLogged) {
              lightTap();
              onNavigateTab?.('profile');
            }
          }}
          style={[
            styles.syncBanner,
            {
              backgroundColor: colors.panel,
              borderColor: isCloudLogged ? colors.green : colors.lineStrong,
              flexDirection: rowDirection,
            },
          ]}
        >
          <Ionicons
            name={isCloudLogged ? 'checkmark-circle' : 'person-circle-outline'}
            size={20}
            color={isCloudLogged ? colors.green : colors.yellow}
          />
          <Text
            style={[
              styles.syncText,
              { color: colors.ink, textAlign, writingDirection },
            ]}
          >
            {isCloudLogged
              ? `${t.games.sessionSynced} (${displayGamertag})`
              : t.games.guestMode}
          </Text>
        </Pressable>

        {/* Cartes des jeux */}
        {games.map((game) => {
          const playable = Boolean(game.route);
          return (
            <View
              key={game.id}
              style={[
                styles.gameCard,
                {
                  backgroundColor: colors.panel,
                  borderColor: playable ? colors.lineStrong : colors.line,
                  opacity: playable ? 1 : 0.72,
                },
              ]}
            >
              {game.art ? (
                <Image
                  source={game.art}
                  style={styles.gameCover}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.lockedCover, { backgroundColor: colors.panel2 }]}>
                  <Ionicons name="lock-closed-outline" size={28} color={colors.dim} />
                  <Text style={[styles.lockedSerial, { color: colors.dim }]}>
                    {game.serial}
                  </Text>
                </View>
              )}

              <View style={styles.gameBody}>
                <View style={[styles.serialRow, { flexDirection: rowDirection }]}>
                  <Text style={[styles.gameTag, { color: game.accent }]}>
                    {game.tag}
                  </Text>
                  <Text style={[styles.serialBadge, { color: colors.dim }]}>
                    {game.serial}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.gameTitle,
                    { color: colors.ink, textAlign, writingDirection },
                  ]}
                >
                  {game.title}
                </Text>

                <Text
                  style={[
                    styles.gameDesc,
                    { color: colors.muted, textAlign, writingDirection },
                  ]}
                >
                  {game.desc}
                </Text>

                <Pressable
                  disabled={!playable}
                  accessibilityRole="button"
                  onPress={() => {
                    mediumImpact();
                    setActiveGame(game);
                  }}
                  style={({ pressed }) => [
                    styles.playBtn,
                    {
                      backgroundColor: playable ? colors.purple : colors.panel2,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name={playable ? 'play' : 'time-outline'}
                    size={16}
                    color={playable ? '#ffffff' : colors.dim}
                  />
                  <Text
                    style={[
                      styles.playBtnText,
                      { color: playable ? '#ffffff' : colors.dim },
                    ]}
                  >
                    {playable ? t.games.playNow : t.games.comingSoon}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <GameLauncherModal
        game={activeGame}
        visible={Boolean(activeGame)}
        onClose={() => setActiveGame(null)}
        onOpenProfile={() => onNavigateTab?.('profile')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 14,
  },
  headerBlock: {
    gap: 5,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  syncBanner: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  syncText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 18,
  },
  gameCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gameCover: {
    width: '100%',
    height: 168,
  },
  lockedCover: {
    width: '100%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  lockedSerial: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  gameBody: {
    padding: 16,
    gap: 8,
  },
  serialRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  gameTag: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  serialBadge: {
    fontSize: 11,
    fontWeight: '800',
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  gameDesc: {
    fontSize: 13.5,
    lineHeight: 19.5,
  },
  playBtn: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  playBtnText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});
