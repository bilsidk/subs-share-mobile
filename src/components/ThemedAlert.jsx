import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Drop-in themed replacement for React Native's Alert. Same call signature:
//   Alert.alert(title, message, buttons)
// so screens only need to swap the import. Rendered once by <ThemedAlertHost/> at
// the app root (inside ThemeProvider), so every alert matches the app's design
// instead of the grey native system dialog.
let _push = null;
let _pending = [];

export const Alert = {
  alert(title, message, buttons) {
    const item = {
      title: title || '',
      message: message || '',
      buttons: Array.isArray(buttons) && buttons.length ? buttons : [{ text: 'OK' }],
    };
    if (_push) _push(item); else _pending.push(item);
  },
};

export function ThemedAlertHost() {
  const { colors } = useTheme();
  const [queue, setQueue] = useState([]);
  const current = queue[0] || null;

  useEffect(() => {
    _push = (item) => setQueue((q) => [...q, item]);
    if (_pending.length) { const p = _pending.slice(); _pending.length = 0; setQueue((q) => [...q, ...p]); }
    return () => { _push = null; };
  }, []);

  if (!current) return null;
  const s = makeStyles(colors);
  const buttons = current.buttons;
  const stacked = buttons.length > 2;

  const handle = (b) => {
    setQueue((q) => q.slice(1)); // dismiss current, reveal the next queued alert
    if (b && typeof b.onPress === 'function') setTimeout(() => b.onPress(), 0);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => handle(null)} statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.card}>
          {!!current.title && <Text style={s.title}>{current.title}</Text>}
          {!!current.message && (
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false} bounces={false}>
              <Text style={s.message}>{current.message}</Text>
            </ScrollView>
          )}
          <View style={[s.buttons, stacked && s.buttonsCol]}>
            {buttons.map((b, i) => {
              const cancel = b.style === 'cancel';
              const destructive = b.style === 'destructive';
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.85}
                  onPress={() => handle(b)}
                  style={[
                    s.btn,
                    stacked && s.btnStacked,
                    cancel ? s.btnCancel : destructive ? s.btnDestructive : s.btnDefault,
                  ]}
                >
                  <Text style={[s.btnText, cancel ? s.btnTextCancel : destructive ? s.btnTextDestructive : s.btnTextDefault]}>
                    {b.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, backgroundColor: colors.bgCard, borderRadius: 22, padding: 22, borderWidth: 1, borderColor: colors.border, gap: 12 },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  message: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  buttonsCol: { flexDirection: 'column' },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  btnStacked: { flex: 0, width: '100%' },
  btnDefault: { backgroundColor: colors.primary },
  btnDestructive: { backgroundColor: '#EF476F' },
  btnCancel: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  btnText: { fontSize: 15, fontWeight: '800' },
  btnTextDefault: { color: '#FFFFFF' },
  btnTextDestructive: { color: '#FFFFFF' },
  btnTextCancel: { color: colors.textSecondary },
});
