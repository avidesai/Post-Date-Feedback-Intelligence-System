import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import type { DateRecord, User } from '@/types/api';

interface Props {
  dateRecord: DateRecord;
  otherUser: User | null;
  onPress?: () => void;
  compatibility?: number | null;
}

export function DateCard({ dateRecord, otherUser, onPress, compatibility }: Props) {
  const dateStr = new Date(dateRecord.dateAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={24} color={Colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{otherUser?.name || 'Unknown'}</Text>
        <Text style={styles.venue}>
          {dateRecord.venueName || 'No venue'} · {dateStr}
        </Text>
      </View>
      {compatibility != null && (
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>{Math.round(compatibility * 100)}%</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  venue: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scoreBadge: {
    backgroundColor: Colors.primaryLight + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
  },
  scoreText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
});
