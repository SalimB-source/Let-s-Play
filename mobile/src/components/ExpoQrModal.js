import React, { useMemo } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { toQR } from 'toqr';
import { useTheme } from '../theme/ThemeContext';

export default function ExpoQrModal({ visible, onClose }) {
  const { colors } = useTheme();

  const expoUrl = useMemo(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.host) {
      return `exps://${window.location.host}`;
    }
    return 'exps://localhost:8081';
  }, [visible]);

  const { rows } = useMemo(() => {
    const data = toQR(expoUrl);
    const n = Math.sqrt(data.byteLength) | 0;
    const grid = [];
    for (let r = 0; r < n; r++) {
      const row = [];
      for (let c = 0; c < n; c++) {
        row.push(data[r * n + c] === 1);
      }
      grid.push(row);
    }
    return { rows: grid };
  }, [expoUrl]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.lineStrong }]}
        >
          <View style={styles.topRow}>
            <View style={styles.titleRow}>
              <Ionicons name="qr-code-outline" size={20} color={colors.cyan} />
              <Text style={[styles.title, { color: colors.ink }]}>Tester sur Expo Go</Text>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.panel2 }]}>
              <Ionicons name="close" size={18} color={colors.ink} />
            </Pressable>
          </View>

          <Text style={[styles.sub, { color: colors.muted }]}>
            Scannez ce QR Code avec l’appareil photo (iPhone) ou depuis l’application Expo Go (Android).
          </Text>

          <View style={styles.qrFrame}>
            {rows.map((row, rIdx) => (
              <View key={rIdx} style={styles.qrRow}>
                {row.map((dark, cIdx) => (
                  <View
                    key={cIdx}
                    style={[styles.cell, dark ? styles.cellDark : styles.cellLight]}
                  />
                ))}
              </View>
            ))}
          </View>

          <View style={[styles.urlBox, { backgroundColor: colors.bg2, borderColor: colors.line }]}>
            <Text selectable style={[styles.urlText, { color: colors.cyan }]}>
              {expoUrl}
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 15, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 14,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  qrFrame: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 18,
  },
  qrRow: {
    flexDirection: 'row',
  },
  cell: {
    width: 7,
    height: 7,
  },
  cellDark: {
    backgroundColor: '#0b0720',
  },
  cellLight: {
    backgroundColor: '#ffffff',
  },
  urlBox: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  urlText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});
