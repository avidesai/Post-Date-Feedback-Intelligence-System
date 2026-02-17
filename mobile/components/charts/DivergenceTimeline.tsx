import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

interface HistoryEntry {
  feedbackCount: number;
  divergenceScore: number;
  recordedAt: string;
}

interface Props {
  history: HistoryEntry[];
}

export function DivergenceTimeline({ history }: Props) {
  if (history.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Preference Divergence Over Time</Text>
        <Text style={styles.emptyText}>No history yet - submit some feedback first</Text>
      </View>
    );
  }

  const maxDivergence = Math.max(...history.map(h => h.divergenceScore), 0.5);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Preference Divergence Over Time</Text>
      <Text style={styles.subtitle}>
        How different your stated vs revealed preferences are
      </Text>

      <View style={styles.chartArea}>
        {history.slice(-15).map((entry, i) => {
          const normalized = entry.divergenceScore / maxDivergence;
          const height = Math.max(normalized * 100, 4);
          const isHigh = entry.divergenceScore > 0.2;

          return (
            <View key={i} style={styles.barWrapper}>
              <View
                style={[
                  styles.bar,
                  { height },
                  isHigh ? styles.barHigh : styles.barNormal,
                ]}
              />
              <Text style={styles.barLabel}>#{entry.feedbackCount}</Text>
            </View>
          );
        })}
      </View>

      {history.length > 2 && (
        <Text style={styles.trendText}>
          {history[history.length - 1].divergenceScore < history[Math.floor(history.length / 2)].divergenceScore
            ? 'Your self-awareness is improving'
            : 'Still discovering what you actually want'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 30,
  },
  bar: {
    width: 16,
    borderRadius: 3,
    minHeight: 4,
  },
  barNormal: {
    backgroundColor: Colors.primary,
  },
  barHigh: {
    backgroundColor: Colors.warning,
  },
  barLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  trendText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
});
