import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useSocial } from '../social/SocialContext';
import { lightTap } from '../lib/haptics';

function formatHour(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatThreadModal({ peerId, visible, onClose }) {
  const { colors } = useTheme();
  const { t, rowDirection, textAlign, writingDirection } = useLanguage();
  const {
    profiles,
    threads,
    blockedIds,
    reportedByPeer,
    sendDirectMessage,
    clearPeerConversation,
    toggleBlockPeer,
    reportPeer,
  } = useSocial();

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const listRef = useRef(null);

  const peer = peerId ? profiles[peerId] : null;
  const thread = peerId ? threads[peerId] : null;
  const messages = useMemo(() => thread?.messages || [], [thread]);
  const isBlocked = Boolean(peerId && blockedIds.includes(peerId));
  const isReported = Boolean(peerId && reportedByPeer[peerId]);

  if (!peerId) return null;

  const peerName = peer?.name || peerId.slice(0, 8);
  const initial = peerName.slice(0, 1).toUpperCase();

  const handleSend = async () => {
    const clean = draft.trim();
    if (!clean || sending || isBlocked) return;
    setSending(true);
    setSendError('');
    try {
      await sendDirectMessage(peerId, clean);
      setDraft('');
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 80);
    } catch (err) {
      setSendError(err?.message || 'Envoi impossible');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* En-tête de la discussion */}
          <View
            style={[
              styles.header,
              { borderBottomColor: colors.line, flexDirection: rowDirection },
            ]}
          >
            <View style={[styles.peerRow, { flexDirection: rowDirection }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.news.close}
                onPress={() => {
                  lightTap();
                  onClose();
                }}
                style={[styles.backBtn, { backgroundColor: colors.panel2 }]}
              >
                <Ionicons name="arrow-back" size={18} color={colors.ink} />
              </Pressable>

              <View style={[styles.avatar, { backgroundColor: colors.purple }]}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>

              <View>
                <Text style={[styles.peerName, { color: colors.ink }]}>{peerName}</Text>
                <View style={[styles.statusRow, { flexDirection: rowDirection }]}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: peer?.online ? colors.green : colors.dim },
                    ]}
                  />
                  <Text style={[styles.statusText, { color: colors.muted }]}>
                    {peer?.online ? t.messages.online : t.messages.offline}
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions modération / effacement */}
            <View style={[styles.actionsRow, { flexDirection: rowDirection }]}>
              <Pressable
                onPress={() => clearPeerConversation(peerId)}
                style={[styles.smallBtn, { borderColor: colors.line, backgroundColor: colors.panel }]}
              >
                <Text style={[styles.smallBtnText, { color: colors.muted }]}>
                  {t.messages.clearChat}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => toggleBlockPeer(peerId)}
                style={[
                  styles.smallBtn,
                  {
                    borderColor: isBlocked ? colors.red : colors.line,
                    backgroundColor: colors.panel,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.smallBtnText,
                    { color: isBlocked ? colors.red : colors.muted },
                  ]}
                >
                  {isBlocked ? t.messages.unblockPeer : t.messages.blockPeer}
                </Text>
              </Pressable>

              <Pressable
                disabled={isReported}
                onPress={() => reportPeer(peerId, 'inappropriate')}
                style={[styles.smallBtn, { borderColor: colors.line, backgroundColor: colors.panel }]}
              >
                <Text
                  style={[
                    styles.smallBtnText,
                    { color: isReported ? colors.yellow : colors.muted },
                  ]}
                >
                  {isReported ? t.messages.reportedBadge : t.messages.reportPeer}
                </Text>
              </Pressable>
            </View>
          </View>

          {isBlocked && (
            <View style={[styles.banner, { backgroundColor: 'rgba(239, 68, 68, 0.14)' }]}>
              <Ionicons name="ban-outline" size={16} color={colors.red} />
              <Text style={[styles.bannerText, { color: colors.ink }]}>
                {t.messages.blockedBanner}
              </Text>
            </View>
          )}

          {Boolean(sendError) && (
            <View style={[styles.banner, { backgroundColor: 'rgba(239, 68, 68, 0.14)' }]}>
              <Text style={[styles.bannerText, { color: colors.red }]}>{sendError}</Text>
            </View>
          )}

          {/* Fil des messages */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.bubbleWrap,
                  item.mine ? styles.bubbleWrapMine : styles.bubbleWrapPeer,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    item.mine
                      ? { backgroundColor: colors.purple }
                      : {
                          backgroundColor: colors.panel2,
                          borderColor: colors.line,
                          borderWidth: 1,
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleBody,
                      {
                        color: item.mine ? '#ffffff' : colors.ink,
                        writingDirection,
                      },
                    ]}
                  >
                    {item.body}
                  </Text>
                </View>
                <Text style={[styles.timeLabel, { color: colors.dim }]}>
                  {formatHour(item.createdAt)}
                  {item.mine ? ` · ${item.read ? t.messages.seen : t.messages.sent}` : ''}
                </Text>
              </View>
            )}
          />

          {/* Zone de saisie */}
          <View
            style={[
              styles.composerBar,
              {
                backgroundColor: colors.panel,
                borderTopColor: colors.line,
                flexDirection: rowDirection,
              },
            ]}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              editable={!isBlocked}
              multiline
              maxLength={1000}
              placeholder={t.messages.composerPlaceholder}
              placeholderTextColor={colors.dim}
              style={[
                styles.composerInput,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.ink,
                  borderColor: colors.line,
                  textAlign,
                  writingDirection,
                },
              ]}
            />
            <Pressable
              disabled={!draft.trim() || sending || isBlocked}
              accessibilityRole="button"
              accessibilityLabel={t.messages.send}
              onPress={handleSend}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor:
                    !draft.trim() || isBlocked ? colors.panel2 : colors.purple,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons
                name="send"
                size={16}
                color={!draft.trim() || isBlocked ? colors.dim : '#ffffff'}
              />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  peerRow: {
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  peerName: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusRow: {
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsRow: {
    alignItems: 'center',
    gap: 6,
  },
  smallBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  bubbleWrap: {
    maxWidth: '82%',
    gap: 3,
  },
  bubbleWrapMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleWrapPeer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 15,
  },
  bubbleBody: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  timeLabel: {
    fontSize: 10.5,
    paddingHorizontal: 4,
  },
  composerBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    alignItems: 'flex-end',
    gap: 8,
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
    fontSize: 14.5,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
