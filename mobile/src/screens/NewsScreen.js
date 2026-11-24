import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { SITE_URL } from '../lib/supabase';
import { readJsonCache, writeJsonCache } from '../lib/storage';
import { lightTap } from '../lib/haptics';
import bundledFeed from '../data/bundledFeed.json';
import ArticleModal from '../components/ArticleModal';
import StoryCoverImage from '../components/StoryCoverImage';

const FEED_CACHE_PREFIX = 'letsplay_mobile_feed_v1:';

export default function NewsScreen({ pendingArticleSlug, onConsumedPendingSlug, onLiveStatusChange }) {
  const { colors } = useTheme();
  const { lang, isRTL, t, textAlign, rowDirection, writingDirection } = useLanguage();

  const initialItems = useMemo(
    () => bundledFeed?.feeds?.[lang] || bundledFeed?.feeds?.fr || [],
    [lang],
  );

  const [articles, setArticles] = useState(initialItems);
  const [section, setSection] = useState('all');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const fetchLatestFeed = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      const cacheKey = `${FEED_CACHE_PREFIX}${lang}`;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`${SITE_URL}/mobile-feed/feed-${lang}.json`, {
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.items) && json.items.length > 0) {
            setArticles(json.items);
            await writeJsonCache(cacheKey, json.items);
            onLiveStatusChange?.(true);
            return;
          }
        }
        throw new Error('feed_not_ready');
      } catch {
        const cached = await readJsonCache(cacheKey, null);
        if (Array.isArray(cached) && cached.length > 0) {
          setArticles(cached);
        } else {
          setArticles(bundledFeed?.feeds?.[lang] || bundledFeed?.feeds?.fr || []);
        }
      } finally {
        if (isManual) setRefreshing(false);
      }
    },
    [lang, onLiveStatusChange],
  );

  useEffect(() => {
    setArticles(bundledFeed?.feeds?.[lang] || bundledFeed?.feeds?.fr || []);
    fetchLatestFeed(false);
  }, [lang, fetchLatestFeed]);

  // Ouverture directe d'un article suite au clic sur une notification Push
  useEffect(() => {
    if (!pendingArticleSlug || articles.length === 0) return;
    const match = articles.find((a) => a.slug === pendingArticleSlug);
    if (match) {
      setSelectedArticle(match);
      onConsumedPendingSlug?.();
    }
  }, [pendingArticleSlug, articles, onConsumedPendingSlug]);

  const sections = useMemo(
    () => [
      { id: 'all', label: t.news.all, icon: 'sparkles-outline' },
      { id: 'gaming', label: t.news.gaming, icon: 'game-controller-outline' },
      { id: 'cinema', label: t.news.cinema, icon: 'film-outline' },
      { id: 'tech', label: t.news.tech, icon: 'hardware-chip-outline' },
    ],
    [t],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((item) => {
      if (section !== 'all' && item.section !== section) return false;
      if (!q) return true;
      const hay = `${item.title} ${item.accent} ${item.dek} ${item.category}`.toLowerCase();
      return hay.includes(q);
    });
  }, [articles, section, query]);

  const featured = filtered[0] || null;
  const listData = featured ? filtered.slice(1) : [];

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Barre de recherche rapide */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.line,
            flexDirection: rowDirection,
          },
        ]}
      >
        <Ionicons name="search-outline" size={17} color={colors.dim} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t.news.searchPlaceholder}
          placeholderTextColor={colors.dim}
          style={[
            styles.searchInput,
            { color: colors.ink, textAlign, writingDirection },
          ]}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {/* Filtres de rubriques */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.chipsRow,
          isRTL && { minWidth: '100%', justifyContent: 'flex-end' },
        ]}
      >
        {(isRTL ? [...sections].reverse() : sections).map((s) => {
          const active = section === s.id;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              onPress={() => {
                lightTap();
                setSection(s.id);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.purple : colors.panel,
                  borderColor: active ? colors.violet : colors.line,
                },
              ]}
            >
              <Ionicons
                name={s.icon}
                size={14}
                color={active ? '#ffffff' : colors.muted}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: active ? '#ffffff' : colors.ink },
                ]}
              >
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Carte À LA UNE */}
      {featured && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            lightTap();
            setSelectedArticle(featured);
          }}
          style={({ pressed }) => [
            styles.heroCard,
            {
              backgroundColor: colors.panel,
              borderColor: colors.lineStrong,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <StoryCoverImage
            uri={featured.image}
            section={featured.section}
            category={featured.category}
            style={styles.heroImg}
          />

          <View style={styles.heroBody}>
            <View style={[styles.heroBadges, { flexDirection: rowDirection }]}>
              <View style={[styles.featuredPill, { backgroundColor: colors.yellow }]}>
                <Text style={styles.featuredPillText}>{t.news.featured}</Text>
              </View>
              <Text style={[styles.heroCat, { color: colors.cyan }]} numberOfLines={1}>
                {featured.category}
              </Text>
            </View>

            <Text
              style={[
                styles.heroTitle,
                { color: colors.ink, textAlign, writingDirection },
              ]}
            >
              {featured.title}{' '}
              <Text style={{ color: colors.violet }}>{featured.accent}</Text>
            </Text>

            <Text
              numberOfLines={3}
              style={[
                styles.heroDek,
                { color: colors.muted, textAlign, writingDirection },
              ]}
            >
              {featured.dek}
            </Text>

            <View style={[styles.heroFooter, { flexDirection: rowDirection }]}>
              <Text style={[styles.cardDate, { color: colors.dim }]}>
                {featured.date} · {featured.readTime}
              </Text>
              <Text style={[styles.readCta, { color: colors.cyan }]}>
                {t.news.readMore} →
              </Text>
            </View>
          </View>
        </Pressable>
      )}
    </View>
  );

  const renderItem = ({ item }) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        lightTap();
        setSelectedArticle(item);
      }}
      style={({ pressed }) => [
        styles.rowCard,
        {
          backgroundColor: colors.panel,
          borderColor: colors.line,
          flexDirection: rowDirection,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <StoryCoverImage
        uri={item.image}
        section={item.section}
        category={item.category}
        compact
        style={styles.rowThumb}
      />

      <View style={styles.rowBody}>
        <Text
          numberOfLines={1}
          style={[
            styles.rowCategory,
            { color: colors.cyan, textAlign, writingDirection },
          ]}
        >
          {item.category}
        </Text>
        <Text
          numberOfLines={2}
          style={[
            styles.rowTitle,
            { color: colors.ink, textAlign, writingDirection },
          ]}
        >
          {item.title} {item.accent}
        </Text>
        <Text
          numberOfLines={2}
          style={[
            styles.rowExcerpt,
            { color: colors.muted, textAlign, writingDirection },
          ]}
        >
          {item.dek}
        </Text>
        <Text
          style={[
            styles.rowMeta,
            { color: colors.dim, textAlign, writingDirection },
          ]}
        >
          {item.date} · {item.readTime}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.slug}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !featured ? (
            <View style={styles.emptyBox}>
              <Ionicons name="search-outline" size={32} color={colors.dim} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>{t.news.empty}</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listPadding}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchLatestFeed(true)}
            tintColor={colors.cyan}
            colors={[colors.purple]}
          />
        }
      />

      <ArticleModal
        article={selectedArticle}
        visible={Boolean(selectedArticle)}
        onClose={() => setSelectedArticle(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listPadding: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 12,
  },
  listHeader: {
    gap: 12,
    marginBottom: 4,
  },
  searchBar: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroImg: {
    width: '100%',
    height: 196,
  },
  heroFallback: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    padding: 16,
    gap: 8,
  },
  heroBadges: {
    alignItems: 'center',
    gap: 8,
  },
  featuredPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featuredPillText: {
    color: '#05060f',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  heroCat: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 26,
  },
  heroDek: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  heroFooter: {
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  readCta: {
    fontSize: 12,
    fontWeight: '800',
  },
  rowCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 10,
    gap: 12,
    alignItems: 'center',
  },
  rowThumb: {
    width: 92,
    height: 92,
    borderRadius: 10,
  },
  rowThumbFallback: {
    width: 92,
    height: 92,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  thumbInitials: {
    fontSize: 13,
    fontWeight: '900',
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowCategory: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  rowTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    lineHeight: 19,
  },
  rowExcerpt: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  rowMeta: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyBox: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
