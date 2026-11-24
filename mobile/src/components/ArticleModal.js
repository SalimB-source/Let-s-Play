import React from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { SITE_URL } from '../lib/supabase';
import { lightTap } from '../lib/haptics';
import StoryCoverImage from './StoryCoverImage';

export default function ArticleModal({ article, visible, onClose }) {
  const { colors } = useTheme();
  const { t, textAlign, rowDirection, writingDirection } = useLanguage();

  if (!article) return null;

  const fullTitle = `${article.title || ''} ${article.accent || ''}`.trim();
  const webUrl = `${SITE_URL}${article.route || `/news/${article.slug}`}`;

  const handleShare = async () => {
    lightTap();
    try {
      await Share.share({
        title: fullTitle,
        message: `${fullTitle}\n${webUrl}`,
        url: webUrl,
      });
    } catch {
      // ignoré
    }
  };

  const handleOpenOfficial = () => {
    if (!article.officialUrl) return;
    lightTap();
    Linking.openURL(article.officialUrl).catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View
          style={[
            styles.topBar,
            { borderBottomColor: colors.line, flexDirection: rowDirection },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.news.close}
            onPress={() => {
              lightTap();
              onClose();
            }}
            style={[styles.barBtn, { backgroundColor: colors.panel2, borderColor: colors.line }]}
          >
            <Ionicons name="close" size={18} color={colors.ink} />
            <Text style={[styles.barBtnText, { color: colors.ink }]}>{t.news.close}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.news.share}
            onPress={handleShare}
            style={[styles.barBtn, { backgroundColor: colors.panel2, borderColor: colors.line }]}
          >
            <Ionicons name="share-social-outline" size={17} color={colors.cyan} />
            <Text style={[styles.barBtnText, { color: colors.ink }]}>{t.news.share}</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <StoryCoverImage
            uri={article.image}
            section={article.section}
            category={article.category}
            style={styles.heroImage}
          />

          <View style={styles.bodyWrap}>
            {!article.translated && (
              <View
                style={[
                  styles.noticeBox,
                  { backgroundColor: colors.badgeBg, borderColor: colors.lineStrong },
                ]}
              >
                <Ionicons name="language-outline" size={16} color={colors.violet} />
                <Text
                  style={[
                    styles.noticeText,
                    { color: colors.ink, textAlign, writingDirection },
                  ]}
                >
                  {t.news.untranslatedNotice}
                </Text>
              </View>
            )}

            <View style={[styles.metaRow, { flexDirection: rowDirection }]}>
              <Text style={[styles.categoryBadge, { color: colors.cyan }]}>
                {article.category}
              </Text>
              <Text style={[styles.metaDate, { color: colors.dim }]}>
                {article.date} · {article.readTime}
              </Text>
            </View>

            <Text
              style={[
                styles.titleMain,
                { color: colors.ink, textAlign, writingDirection },
              ]}
            >
              {article.title}{' '}
              <Text style={{ color: colors.yellow }}>{article.accent}</Text>
            </Text>

            {Boolean(article.dek) && (
              <Text
                style={[
                  styles.dek,
                  { color: colors.ink, textAlign, writingDirection },
                ]}
              >
                {article.dek}
              </Text>
            )}

            {Boolean(article.lead) && (
              <Text
                style={[
                  styles.paragraphLead,
                  { color: colors.muted, textAlign, writingDirection },
                ]}
              >
                {article.lead}
              </Text>
            )}

            {Boolean(article.intro) && (
              <Text
                style={[
                  styles.paragraph,
                  { color: colors.muted, textAlign, writingDirection },
                ]}
              >
                {article.intro}
              </Text>
            )}

            {Boolean(article.h2) && (
              <Text
                style={[
                  styles.subhead,
                  { color: colors.violet, textAlign, writingDirection },
                ]}
              >
                {article.h2}
              </Text>
            )}

            {Boolean(article.p1) && (
              <Text
                style={[
                  styles.paragraph,
                  { color: colors.ink, textAlign, writingDirection },
                ]}
              >
                {article.p1}
              </Text>
            )}

            {Boolean(article.p2) && (
              <Text
                style={[
                  styles.paragraph,
                  { color: colors.ink, textAlign, writingDirection },
                ]}
              >
                {article.p2}
              </Text>
            )}

            {Boolean(article.quote) && (
              <View
                style={[
                  styles.quoteCard,
                  {
                    backgroundColor: colors.panel,
                    borderLeftColor: colors.purple,
                    borderColor: colors.line,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.quoteText,
                    { color: colors.ink, textAlign, writingDirection },
                  ]}
                >
                  « {article.quote} »
                </Text>
                {Boolean(article.quoteBy) && (
                  <Text
                    style={[
                      styles.quoteAuthor,
                      { color: colors.cyan, textAlign, writingDirection },
                    ]}
                  >
                    — {article.quoteBy}
                  </Text>
                )}
              </View>
            )}

            {Boolean(article.h2b) && (
              <Text
                style={[
                  styles.subhead,
                  { color: colors.violet, textAlign, writingDirection },
                ]}
              >
                {article.h2b}
              </Text>
            )}

            {Boolean(article.p3) && (
              <Text
                style={[
                  styles.paragraph,
                  { color: colors.ink, textAlign, writingDirection },
                ]}
              >
                {article.p3}
              </Text>
            )}

            {Boolean(article.p4) && (
              <Text
                style={[
                  styles.paragraph,
                  { color: colors.ink, textAlign, writingDirection },
                ]}
              >
                {article.p4}
              </Text>
            )}

            {Boolean(article.takeText) && (
              <View
                style={[
                  styles.takeBox,
                  {
                    backgroundColor: colors.panel2,
                    borderColor: colors.cyan,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.takeLabel,
                    { color: colors.cyan, textAlign, writingDirection },
                  ]}
                >
                  ✦ {article.take}
                </Text>
                <Text
                  style={[
                    styles.takeText,
                    { color: colors.ink, textAlign, writingDirection },
                  ]}
                >
                  {article.takeText}
                </Text>
              </View>
            )}

            {/* Seules les sources officielles vérifiées (src/lib/articleSources.js) sont proposées */}
            {Boolean(article.officialUrl) && (
              <Pressable
                accessibilityRole="link"
                onPress={handleOpenOfficial}
                style={({ pressed }) => [
                  styles.officialBtn,
                  {
                    backgroundColor: colors.purple,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons name="open-outline" size={16} color="#ffffff" />
                <Text style={styles.officialBtnText}>{t.news.officialSource}</Text>
              </Pressable>
            )}

            {Boolean(article.credit) && (
              <Text
                style={[
                  styles.creditText,
                  { color: colors.dim, textAlign, writingDirection },
                ]}
              >
                {article.credit}
              </Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  barBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 48,
  },
  heroImage: {
    width: '100%',
    height: 230,
  },
  heroPlaceholder: {
    width: '100%',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    padding: 20,
    gap: 6,
  },
  placeholderBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  bodyWrap: {
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 14,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  metaRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  metaDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  titleMain: {
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  dek: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  paragraphLead: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '500',
  },
  subhead: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
  },
  quoteCard: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: 8,
  },
  quoteText: {
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
    fontWeight: '600',
  },
  quoteAuthor: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  takeBox: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
    marginTop: 4,
  },
  takeLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  takeText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  officialBtn: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  officialBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  creditText: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 16,
  },
});
