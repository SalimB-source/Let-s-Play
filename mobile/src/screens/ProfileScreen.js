import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { lightTap, successHaptic } from '../lib/haptics';

export default function ProfileScreen() {
  const { colors, isDark, setTheme } = useTheme();
  const { lang, setLang, t, textAlign, rowDirection, writingDirection } = useLanguage();
  const {
    user,
    profile,
    displayGamertag,
    isDemo,
    notifPrefs,
    signInWithEmail,
    signUpWithEmail,
    loginAsDemo,
    signOut,
    enableNotifications,
    updateNotifPreference,
    sendTestNotification,
  } = useAuth();

  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gamertag, setGamertag] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ kind: '', message: '' });

  const handleSubmitAuth = async () => {
    if (!email.trim() || !password) return;
    setBusy(true);
    setFeedback({ kind: '', message: '' });
    try {
      if (authMode === 'signin') {
        await signInWithEmail(email, password);
        successHaptic();
      } else {
        await signUpWithEmail(email, password, gamertag);
        successHaptic();
        setFeedback({ kind: 'ok', message: t.profile.accountSignUpSuccess });
      }
    } catch (err) {
      setFeedback({ kind: 'err', message: err?.message || 'Erreur de connexion' });
    } finally {
      setBusy(false);
    }
  };

  const handleTestNotification = async () => {
    lightTap();
    const ok = await sendTestNotification(
      t.profile.testNotifTitle,
      t.profile.testNotifBody,
    );
    setFeedback({
      kind: ok ? 'ok' : 'err',
      message: ok ? t.profile.testNotifBody : t.profile.pushDisabled,
    });
  };

  const playerLevel =
    profile?.level || user?.user_metadata?.level || 1;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* En-tête */}
        <View style={styles.headerBlock}>
          <Text
            style={[
              styles.eyebrow,
              { color: colors.cyan, textAlign, writingDirection },
            ]}
          >
            ✦ {t.profile.eyebrow}
          </Text>
          <Text
            style={[
              styles.title,
              { color: colors.ink, textAlign, writingDirection },
            ]}
          >
            {t.profile.title}
          </Text>
        </View>

        {Boolean(feedback.message) && (
          <View
            style={[
              styles.toast,
              {
                backgroundColor:
                  feedback.kind === 'ok'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                borderColor: feedback.kind === 'ok' ? colors.green : colors.red,
              },
            ]}
          >
            <Text style={[styles.toastText, { color: colors.ink }]}>
              {feedback.message}
            </Text>
          </View>
        )}

        {/* Carte Compte Joueur OU Formulaire Connexion/Inscription */}
        {user ? (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.panel, borderColor: colors.lineStrong },
            ]}
          >
            <View style={[styles.userTop, { flexDirection: rowDirection }]}>
              <View style={[styles.bigAvatar, { backgroundColor: colors.purple }]}>
                <Text style={styles.bigAvatarText}>
                  {displayGamertag.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userMeta}>
                <Text style={[styles.gamertag, { color: colors.ink, textAlign }]}>
                  {displayGamertag}
                </Text>
                <Text style={[styles.userEmail, { color: colors.muted, textAlign }]}>
                  {user.email}
                </Text>
                <View style={[styles.badgesRow, { flexDirection: rowDirection }]}>
                  <View style={[styles.levelBadge, { backgroundColor: colors.panel2 }]}>
                    <Text style={[styles.levelText, { color: colors.yellow }]}>
                      {t.profile.level} {playerLevel}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.connLabel,
                      { color: isDemo ? colors.cyan : colors.green },
                    ]}
                  >
                    {isDemo ? t.profile.statusDemo : t.profile.statusConnected}
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                lightTap();
                signOut();
              }}
              style={[
                styles.outlineBtn,
                { borderColor: colors.lineStrong, backgroundColor: colors.panel2 },
              ]}
            >
              <Ionicons name="log-out-outline" size={17} color={colors.red} />
              <Text style={[styles.outlineBtnText, { color: colors.ink }]}>
                {t.profile.signOutBtn}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.panel, borderColor: colors.lineStrong },
            ]}
          >
            <View
              style={[
                styles.modeSwitch,
                { backgroundColor: colors.panel2, flexDirection: rowDirection },
              ]}
            >
              {[
                { id: 'signin', label: t.profile.signInTab },
                { id: 'signup', label: t.profile.signUpTab },
              ].map((m) => {
                const active = authMode === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => {
                      lightTap();
                      setAuthMode(m.id);
                    }}
                    style={[
                      styles.modeBtn,
                      active && { backgroundColor: colors.purple },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeBtnText,
                        { color: active ? '#ffffff' : colors.muted },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {authMode === 'signup' && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.muted, textAlign }]}>
                  {t.profile.gamertagLabel}
                </Text>
                <TextInput
                  value={gamertag}
                  onChangeText={setGamertag}
                  autoCapitalize="none"
                  placeholder="Ex: SalimDZ"
                  placeholderTextColor={colors.dim}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBg,
                      color: colors.ink,
                      borderColor: colors.line,
                      textAlign,
                    },
                  ]}
                />
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.muted, textAlign }]}>
                {t.profile.emailLabel}
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="joueur@exemple.com"
                placeholderTextColor={colors.dim}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    color: colors.ink,
                    borderColor: colors.line,
                    textAlign,
                  },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.muted, textAlign }]}>
                {t.profile.passwordLabel}
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={colors.dim}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    color: colors.ink,
                    borderColor: colors.line,
                    textAlign,
                  },
                ]}
              />
            </View>

            <Pressable
              disabled={busy}
              accessibilityRole="button"
              onPress={handleSubmitAuth}
              style={[styles.submitBtn, { backgroundColor: colors.purple }]}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {authMode === 'signin' ? t.profile.signInBtn : t.profile.signUpBtn}
                </Text>
              )}
            </Pressable>

            {/* Personas de démonstration en 1 tap */}
            <View style={[styles.divider, { backgroundColor: colors.line }]} />
            <Text style={[styles.fieldLabel, { color: colors.dim, textAlign }]}>
              {t.profile.demoSectionTitle}
            </Text>
            <View style={styles.demoBtns}>
              <Pressable
                onPress={() => {
                  lightTap();
                  loginAsDemo('pixel');
                }}
                style={[
                  styles.demoBtn,
                  { backgroundColor: colors.panel2, borderColor: colors.line },
                ]}
              >
                <Ionicons name="sparkles-outline" size={15} color={colors.cyan} />
                <Text style={[styles.demoBtnText, { color: colors.ink }]}>
                  {t.profile.demoLoginPixel}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  lightTap();
                  loginAsDemo('vortex');
                }}
                style={[
                  styles.demoBtn,
                  { backgroundColor: colors.panel2, borderColor: colors.line },
                ]}
              >
                <Ionicons name="flash-outline" size={15} color={colors.yellow} />
                <Text style={[styles.demoBtnText, { color: colors.ink }]}>
                  {t.profile.demoLoginVortex}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Panneau Notifications Push */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.panel, borderColor: colors.line },
          ]}
        >
          <View style={[styles.cardHeadRow, { flexDirection: rowDirection }]}>
            <Ionicons name="notifications-outline" size={20} color={colors.violet} />
            <Text style={[styles.cardTitle, { color: colors.ink }]}>
              {t.profile.notifsTitle}
            </Text>
          </View>
          <Text
            style={[
              styles.cardSub,
              { color: colors.muted, textAlign, writingDirection },
            ]}
          >
            {t.profile.notifsSubtitle}
          </Text>

          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: colors.panel2,
                borderColor: notifPrefs.enabled ? colors.green : colors.line,
                flexDirection: rowDirection,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: notifPrefs.enabled ? colors.green : colors.dim,
                },
              ]}
            />
            <Text style={[styles.statusPillText, { color: colors.ink, textAlign }]}>
              {!notifPrefs.enabled
                ? t.profile.pushDisabled
                : notifPrefs.mode === 'push'
                  ? t.profile.pushActive
                  : t.profile.pushLocalOnly}
            </Text>
          </View>

          <View style={[styles.notifActions, { flexDirection: rowDirection }]}>
            {!notifPrefs.enabled && (
              <Pressable
                onPress={() => {
                  lightTap();
                  enableNotifications();
                }}
                style={[styles.notifBtn, { backgroundColor: colors.purple }]}
              >
                <Text style={styles.notifBtnLight}>{t.profile.enablePushBtn}</Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleTestNotification}
              style={[
                styles.notifBtn,
                { backgroundColor: colors.panel2, borderColor: colors.lineStrong, borderWidth: 1 },
              ]}
            >
              <Text style={[styles.notifBtnDark, { color: colors.cyan }]}>
                {t.profile.testPushBtn}
              </Text>
            </Pressable>
          </View>

          {[
            { key: 'notifyMessages', label: t.profile.prefMessages },
            { key: 'notifyFriends', label: t.profile.prefFriends },
            { key: 'notifyNews', label: t.profile.prefNews },
          ].map((pref) => (
            <View
              key={pref.key}
              style={[
                styles.switchRow,
                { borderTopColor: colors.line, flexDirection: rowDirection },
              ]}
            >
              <Text style={[styles.switchLabel, { color: colors.ink }]}>
                {pref.label}
              </Text>
              <Switch
                value={Boolean(notifPrefs[pref.key])}
                onValueChange={(v) => updateNotifPreference(pref.key, v)}
                trackColor={{ false: colors.panel2, true: colors.purple }}
                thumbColor="#ffffff"
              />
            </View>
          ))}
        </View>

        {/* Panneau Langue & Thème */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.panel, borderColor: colors.line },
          ]}
        >
          <View style={[styles.cardHeadRow, { flexDirection: rowDirection }]}>
            <Ionicons name="color-palette-outline" size={20} color={colors.cyan} />
            <Text style={[styles.cardTitle, { color: colors.ink }]}>
              {t.profile.appearanceTitle}
            </Text>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.muted, textAlign }]}>
            {t.profile.langLabel}
          </Text>
          <View style={[styles.choiceRow, { flexDirection: rowDirection }]}>
            {[
              { id: 'fr', label: 'Français' },
              { id: 'en', label: 'English' },
              { id: 'ar', label: 'العربية' },
            ].map((l) => {
              const active = lang === l.id;
              return (
                <Pressable
                  key={l.id}
                  onPress={() => {
                    lightTap();
                    setLang(l.id);
                  }}
                  style={[
                    styles.choicePill,
                    {
                      backgroundColor: active ? colors.purple : colors.panel2,
                      borderColor: active ? colors.violet : colors.line,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      { color: active ? '#ffffff' : colors.ink },
                    ]}
                  >
                    {l.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.muted, textAlign }]}>
            {t.profile.themeLabel}
          </Text>
          <View style={[styles.choiceRow, { flexDirection: rowDirection }]}>
            {[
              { id: 'dark', label: t.profile.themeDark, active: isDark },
              { id: 'light', label: t.profile.themeLight, active: !isDark },
            ].map((th) => (
              <Pressable
                key={th.id}
                onPress={() => {
                  lightTap();
                  setTheme(th.id);
                }}
                style={[
                  styles.choicePill,
                  {
                    backgroundColor: th.active ? colors.purple : colors.panel2,
                    borderColor: th.active ? colors.violet : colors.line,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    { color: th.active ? '#ffffff' : colors.ink },
                  ]}
                >
                  {th.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: 36,
    gap: 14,
  },
  headerBlock: {
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
  },
  toast: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  userTop: {
    alignItems: 'center',
    gap: 14,
  },
  bigAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigAvatarText: {
    color: '#ffffff',
    fontSize: 23,
    fontWeight: '900',
  },
  userMeta: {
    flex: 1,
    gap: 3,
  },
  gamertag: {
    fontSize: 19,
    fontWeight: '900',
  },
  userEmail: {
    fontSize: 13,
  },
  badgesRow: {
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '800',
  },
  connLabel: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  outlineBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  modeSwitch: {
    padding: 4,
    borderRadius: 10,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  fieldGroup: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14.5,
  },
  submitBtn: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  demoBtns: {
    gap: 8,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  demoBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardHeadRow: {
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  cardSub: {
    fontSize: 13,
    lineHeight: 19,
  },
  statusPill: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusPillText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  notifActions: {
    gap: 8,
    flexWrap: 'wrap',
  },
  notifBtn: {
    flex: 1,
    minWidth: 140,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBtnLight: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  notifBtnDark: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  switchRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  choiceRow: {
    gap: 8,
  },
  choicePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
