import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { useSocial } from '../social/SocialContext';
import { lightTap } from '../lib/haptics';
import ChatThreadModal from '../components/ChatThreadModal';

export default function MessagesScreen({
  onNavigateTab,
  pendingPeerId,
  pendingSubTab,
  onConsumedPendingPeer,
}) {
  const { colors } = useTheme();
  const { t, textAlign, rowDirection, writingDirection } = useLanguage();
  const { user, isDemo, loginAsDemo } = useAuth();
  const {
    relations,
    profiles,
    threads,
    activePeerId,
    incomingCount,
    openChatWithPeer,
    closeChat,
    searchPlayers,
    sendFriendRequest,
    acceptFriend,
    removeFriendship,
  } = useSocial();

  const [subTab, setSubTab] = useState('chats'); // 'chats' | 'friends' | 'add'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (pendingSubTab) setSubTab(pendingSubTab);
    if (pendingPeerId) {
      openChatWithPeer(pendingPeerId);
      onConsumedPendingPeer?.();
    }
  }, [pendingPeerId, pendingSubTab, openChatWithPeer, onConsumedPendingPeer]);

  useEffect(() => {
    let cancelled = false;
    if (subTab !== 'add' || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      const found = await searchPlayers(searchQuery);
      if (!cancelled) setSearchResults(found);
    }, 240);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, subTab, searchPlayers]);

  const sortedThreads = useMemo(() => {
    return Object.values(threads).sort((a, b) => {
      const ta = a.lastAt ? Date.parse(a.lastAt) : 0;
      const tb = b.lastAt ? Date.parse(b.lastAt) : 0;
      return tb - ta;
    });
  }, [threads]);

  const { friendsList, incomingList, outgoingList } = useMemo(() => {
    const friends = [];
    const incoming = [];
    const outgoing = [];
    for (const [peerId, rel] of Object.entries(relations)) {
      const p = profiles[peerId] || { id: peerId, name: peerId.slice(0, 8), level: 1, online: false };
      if (rel.kind === 'friend') friends.push(p);
      else if (rel.kind === 'incoming') incoming.push(p);
      else if (rel.kind === 'outgoing') outgoing.push(p);
    }
    return { friendsList: friends, incomingList: incoming, outgoingList: outgoing };
  }, [relations, profiles]);

  // Écran d'accueil Let's Talk si non connecté
  if (!user) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: colors.bg }]}>
        <View
          style={[
            styles.authCard,
            { backgroundColor: colors.panel, borderColor: colors.lineStrong },
          ]}
        >
          <View style={[styles.authIconCircle, { backgroundColor: colors.badgeBg }]}>
            <Ionicons name="chatbubbles" size={30} color={colors.violet} />
          </View>
          <Text style={[styles.authTitle, { color: colors.ink }]}>
            {t.messages.authTitle}
          </Text>
          <Text style={[styles.authSub, { color: colors.muted }]}>
            {t.messages.authSubtitle}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              lightTap();
              onNavigateTab?.('profile');
            }}
            style={[styles.primaryBtn, { backgroundColor: colors.purple }]}
          >
            <Ionicons name="log-in-outline" size={18} color="#ffffff" />
            <Text style={styles.primaryBtnText}>{t.messages.goToLogin}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              lightTap();
              loginAsDemo('pixel');
            }}
            style={[
              styles.secondaryBtn,
              { backgroundColor: colors.panel2, borderColor: colors.lineStrong },
            ]}
          >
            <Ionicons name="sparkles-outline" size={16} color={colors.cyan} />
            <Text style={[styles.secondaryBtnText, { color: colors.ink }]}>
              {t.messages.tryDemo}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text
            style={[
              styles.eyebrow,
              { color: colors.cyan, textAlign, writingDirection },
            ]}
          >
            ✦ {t.messages.eyebrow}
          </Text>
          <Text
            style={[
              styles.title,
              { color: colors.ink, textAlign, writingDirection },
            ]}
          >
            {t.messages.title}
          </Text>
        </View>

        {isDemo && (
          <View
            style={[
              styles.demoBanner,
              { backgroundColor: colors.badgeBg, borderColor: colors.lineStrong },
            ]}
          >
            <Ionicons name="flask-outline" size={16} color={colors.cyan} />
            <Text style={[styles.demoText, { color: colors.ink }]}>
              {t.messages.demoBanner}
            </Text>
          </View>
        )}

        {/* Sous-navigation Discussions / Amis / Ajouter */}
        <View
          style={[
            styles.segBar,
            { backgroundColor: colors.panel, borderColor: colors.line, flexDirection: rowDirection },
          ]}
        >
          {[
            { id: 'chats', label: t.messages.tabChats },
            {
              id: 'friends',
              label:
                incomingCount > 0
                  ? `${t.messages.tabFriends} (${incomingCount})`
                  : t.messages.tabFriends,
            },
            { id: 'add', label: t.messages.tabAdd },
          ].map((tab) => {
            const active = subTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                onPress={() => {
                  lightTap();
                  setSubTab(tab.id);
                }}
                style={[
                  styles.segItem,
                  active && { backgroundColor: colors.purple },
                ]}
              >
                <Text
                  style={[
                    styles.segLabel,
                    { color: active ? '#ffffff' : colors.muted },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Sous-onglet 1 : Discussions */}
        {subTab === 'chats' && (
          <View style={styles.sectionList}>
            {sortedThreads.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.dim} />
                <Text style={[styles.emptyLabel, { color: colors.muted }]}>
                  {t.messages.noThreads}
                </Text>
              </View>
            ) : (
              sortedThreads.map((th) => {
                const peer = profiles[th.peerId] || {
                  id: th.peerId,
                  name: th.peerId.slice(0, 8),
                  online: false,
                };
                return (
                  <Pressable
                    key={th.peerId}
                    accessibilityRole="button"
                    onPress={() => openChatWithPeer(th.peerId)}
                    style={({ pressed }) => [
                      styles.threadRow,
                      {
                        backgroundColor: colors.panel,
                        borderColor: th.unread > 0 ? colors.violet : colors.line,
                        flexDirection: rowDirection,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.avatar, { backgroundColor: colors.panel2 }]}>
                      <Text style={[styles.avatarLetter, { color: colors.cyan }]}>
                        {peer.name.slice(0, 1).toUpperCase()}
                      </Text>
                      <View
                        style={[
                          styles.presenceDot,
                          {
                            backgroundColor: peer.online ? colors.green : colors.dim,
                            borderColor: colors.panel,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.threadCenter}>
                      <Text
                        style={[
                          styles.peerTitle,
                          { color: colors.ink, textAlign, writingDirection },
                        ]}
                      >
                        {peer.name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.previewLine,
                          {
                            color: th.unread > 0 ? colors.ink : colors.muted,
                            fontWeight: th.unread > 0 ? '700' : '400',
                            textAlign,
                            writingDirection,
                          },
                        ]}
                      >
                        {th.lastMessage?.body || '…'}
                      </Text>
                    </View>

                    {th.unread > 0 && (
                      <View style={[styles.unreadBadge, { backgroundColor: colors.red }]}>
                        <Text style={styles.unreadText}>{th.unread}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {/* Sous-onglet 2 : Amis & demandes */}
        {subTab === 'friends' && (
          <View style={styles.sectionList}>
            {incomingList.length > 0 && (
              <View style={styles.groupBlock}>
                <Text style={[styles.groupTitle, { color: colors.yellow, textAlign }]}>
                  {t.messages.incomingTitle}
                </Text>
                {incomingList.map((p) => (
                  <View
                    key={p.id}
                    style={[
                      styles.friendRow,
                      {
                        backgroundColor: colors.panel,
                        borderColor: colors.lineStrong,
                        flexDirection: rowDirection,
                      },
                    ]}
                  >
                    <View style={styles.threadCenter}>
                      <Text style={[styles.peerTitle, { color: colors.ink, textAlign }]}>
                        {p.name}
                      </Text>
                      <Text style={[styles.previewLine, { color: colors.muted, textAlign }]}>
                        Niv. {p.level || 1}
                      </Text>
                    </View>
                    <View style={[styles.inlineActions, { flexDirection: rowDirection }]}>
                      <Pressable
                        onPress={() => acceptFriend(p.id)}
                        style={[styles.actionChip, { backgroundColor: colors.green }]}
                      >
                        <Text style={styles.actionChipLight}>{t.messages.accept}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => removeFriendship(p.id)}
                        style={[styles.actionChip, { backgroundColor: colors.panel2 }]}
                      >
                        <Text style={[styles.actionChipText, { color: colors.muted }]}>
                          {t.messages.decline}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.groupBlock}>
              <Text style={[styles.groupTitle, { color: colors.cyan, textAlign }]}>
                {t.messages.friendsTitle} ({friendsList.length})
              </Text>
              {friendsList.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
                  <Text style={[styles.emptyLabel, { color: colors.muted }]}>
                    {t.messages.noFriends}
                  </Text>
                </View>
              ) : (
                friendsList.map((p) => (
                  <View
                    key={p.id}
                    style={[
                      styles.friendRow,
                      {
                        backgroundColor: colors.panel,
                        borderColor: colors.line,
                        flexDirection: rowDirection,
                      },
                    ]}
                  >
                    <View style={styles.threadCenter}>
                      <Text style={[styles.peerTitle, { color: colors.ink, textAlign }]}>
                        {p.name}
                      </Text>
                      <Text
                        style={[
                          styles.previewLine,
                          { color: p.online ? colors.green : colors.dim, textAlign },
                        ]}
                      >
                        {p.online ? t.messages.online : t.messages.offline} · Niv. {p.level || 1}
                      </Text>
                    </View>
                    <View style={[styles.inlineActions, { flexDirection: rowDirection }]}>
                      <Pressable
                        onPress={() => openChatWithPeer(p.id)}
                        style={[styles.actionChip, { backgroundColor: colors.purple }]}
                      >
                        <Text style={styles.actionChipLight}>{t.messages.messageBtn}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => removeFriendship(p.id)}
                        style={[styles.actionChip, { backgroundColor: colors.panel2 }]}
                      >
                        <Text style={[styles.actionChipText, { color: colors.muted }]}>
                          {t.messages.removeBtn}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>

            {outgoingList.length > 0 && (
              <View style={styles.groupBlock}>
                <Text style={[styles.groupTitle, { color: colors.muted, textAlign }]}>
                  {t.messages.outgoingTitle}
                </Text>
                {outgoingList.map((p) => (
                  <View
                    key={p.id}
                    style={[
                      styles.friendRow,
                      {
                        backgroundColor: colors.panel,
                        borderColor: colors.line,
                        flexDirection: rowDirection,
                      },
                    ]}
                  >
                    <Text style={[styles.peerTitle, { color: colors.ink, flex: 1, textAlign }]}>
                      {p.name}
                    </Text>
                    <Pressable
                      onPress={() => removeFriendship(p.id)}
                      style={[styles.actionChip, { backgroundColor: colors.panel2 }]}
                    >
                      <Text style={[styles.actionChipText, { color: colors.muted }]}>
                        {t.messages.cancel}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Sous-onglet 3 : Recherche & Ajout de joueurs */}
        {subTab === 'add' && (
          <View style={styles.sectionList}>
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.lineStrong,
                  flexDirection: rowDirection,
                },
              ]}
            >
              <Ionicons name="person-add-outline" size={17} color={colors.cyan} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t.messages.searchUsersPlaceholder}
                placeholderTextColor={colors.dim}
                style={[
                  styles.searchInput,
                  { color: colors.ink, textAlign, writingDirection },
                ]}
              />
            </View>

            {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
              <Text style={[styles.emptyLabel, { color: colors.muted, marginTop: 12 }]}>
                {t.messages.searchEmpty}
              </Text>
            )}

            {searchResults.map((p) => {
              const rel = relations[p.id];
              const isFriend = rel?.kind === 'friend';
              const isPending = rel?.kind === 'outgoing' || rel?.kind === 'incoming';
              return (
                <View
                  key={p.id}
                  style={[
                    styles.friendRow,
                    {
                      backgroundColor: colors.panel,
                      borderColor: colors.line,
                      flexDirection: rowDirection,
                    },
                  ]}
                >
                  <View style={styles.threadCenter}>
                    <Text style={[styles.peerTitle, { color: colors.ink, textAlign }]}>
                      {p.name}
                    </Text>
                    <Text style={[styles.previewLine, { color: colors.muted, textAlign }]}>
                      Niv. {p.level || 1}
                    </Text>
                  </View>
                  <Pressable
                    disabled={isFriend || isPending}
                    onPress={() => sendFriendRequest(p.id)}
                    style={[
                      styles.actionChip,
                      {
                        backgroundColor: isFriend || isPending ? colors.panel2 : colors.purple,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionChipLight,
                        (isFriend || isPending) && { color: colors.muted },
                      ]}
                    >
                      {isFriend
                        ? t.messages.alreadyFriend
                        : isPending
                          ? t.messages.requestSent
                          : t.messages.addFriend}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <ChatThreadModal
        peerId={activePeerId}
        visible={Boolean(activePeerId)}
        onClose={closeChat}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    padding: 20,
  },
  authCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  authIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  authSub: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 4,
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
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
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  demoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  segBar: {
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  segItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  segLabel: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  sectionList: {
    gap: 10,
  },
  emptyCard: {
    padding: 26,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyLabel: {
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'center',
  },
  threadRow: {
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 17,
    fontWeight: '900',
  },
  presenceDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  threadCenter: {
    flex: 1,
    gap: 3,
  },
  peerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  previewLine: {
    fontSize: 13,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  groupBlock: {
    gap: 8,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  friendRow: {
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  inlineActions: {
    alignItems: 'center',
    gap: 6,
  },
  actionChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
  },
  actionChipLight: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchBox: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
});
