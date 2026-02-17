import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

interface Props {
  text: string;
  type?: 'info' | 'warning' | 'success';
}

export function InsightCard({ text, type = 'info' }: Props) {
  const iconName = type === 'warning' ? 'alert-circle' : type === 'success' ? 'checkmark-circle' : 'bulb';
  const iconColor = type === 'warning' ? Colors.warning : type === 'success' ? Colors.success : Colors.primary;
  const bgColor = type === 'warning' ? Colors.warning + '10' : type === 'success' ? Colors.success + '10' : Colors.primary + '10';

  return (
    <View style={[styles.card, { backgroundColor: bgColor }]}>
      <Ionicons name={iconName as any} size={20} color={iconColor} style={styles.icon} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  icon: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  text: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 20,
  },
});
