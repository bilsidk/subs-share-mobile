import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { colors, spacing, radius } from '../theme';
import { useTranslation } from '../hooks/useTranslation';

const TaskCard = ({ task, onPress, disabled }) => {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      style={[styles.card, disabled && styles.cardDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <View style={styles.left}>
        {task.owner_avatar ? (
          <Image source={{ uri: task.owner_avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>{task.channel_name?.[0]?.toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={styles.mid}>
        <Text style={styles.channelName} numberOfLines={1}>{task.channel_name}</Text>
        <Text style={styles.ownerName} numberOfLines={1}>by {task.owner_name}</Text>
        <View style={styles.slots}>
          <Text style={styles.slotsText}>🎯 {task.remaining_slots} {t('earn.slotsLeft')}</Text>
        </View>
      </View>

      <View style={styles.right}>
        {task.already_completed ? (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>{t('earn.alreadyDone')}</Text>
          </View>
        ) : (
          <View style={styles.rewardBadge}>
            <Text style={styles.rewardEmoji}>🪙</Text>
            <Text style={styles.rewardText}>+{task.reward}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#13131A', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: '#2A2A3A', gap: spacing.sm },
  cardDisabled: { opacity: 0.5 },
  left: {},
  avatar: { width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.bgElevated },
  avatarFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryDark },
  avatarText: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  mid: { flex: 1, gap: 2 },
  channelName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  ownerName: { fontSize: 12, color: colors.textSecondary },
  slots: { marginTop: 4 },
  slotsText: { fontSize: 11, color: colors.textMuted },
  right: {},
  rewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(255,209,102,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(255,209,102,0.25)' },
  rewardEmoji: { fontSize: 13 },
  rewardText: { fontSize: 14, fontWeight: '800', color: colors.gold },
  completedBadge: { backgroundColor: 'rgba(6,214,160,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(6,214,160,0.25)' },
  completedText: { fontSize: 12, fontWeight: '700', color: colors.success },
});

export default TaskCard;
