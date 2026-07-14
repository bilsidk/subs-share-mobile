import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { getCurrentLanguage } from '../utils/i18n';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const SEEN_KEY = '@subsshare_ann_seen';

// One-time admin announcement popup. Fetches the runtime config once the user is
// authenticated; shows a dismissible modal if the message targets mobile ('both'/'mobile')
// and this exact text hasn't been dismissed yet (re-shows automatically when it changes).
export default function AnnouncementModal() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [ann, setAnn] = useState(null); // { message, link }

  useEffect(() => {
    if (!user) return;
    let alive = true;
    api.getClientConfig(getCurrentLanguage()).then(async (c) => {
      if (!alive || !c || !c.announcement_message) return;
      const plat = c.announcement_platform || 'both';
      if (plat !== 'both' && plat !== 'mobile') return;
      const seen = await AsyncStorage.getItem(SEEN_KEY);
      if (!alive || seen === c.announcement_message) return;
      setAnn({ message: c.announcement_message, link: c.announcement_link || '' });
    }).catch(() => {});
    return () => { alive = false; };
  }, [user]);

  const dismiss = async () => {
    if (ann) { try { await AsyncStorage.setItem(SEEN_KEY, ann.message); } catch (_) {} }
    setAnn(null);
  };
  const openLink = async () => {
    if (ann?.link) { try { await Linking.openURL(ann.link); } catch (_) {} }
    dismiss();
  };

  if (!ann) return null;
  return (
    <Modal transparent animationType="fade" visible onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.bgCard }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>🔔 Announcement</Text>
          <Text style={[styles.msg, { color: colors.textPrimary }]}>{ann.message}</Text>
          {!!ann.link && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={openLink}>
              <Text style={styles.btnText}>Open</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.border }]} onPress={dismiss}>
            <Text style={[styles.btnText, { color: colors.textPrimary }]}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 16, padding: 20 },
  title: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
  msg: { fontSize: 15, lineHeight: 22 },
  btn: { marginTop: 12, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
