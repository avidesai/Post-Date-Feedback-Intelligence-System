import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import type { CompatibilityScore } from '@/types/api';
import { DIMENSIONS, DIMENSION_LABELS } from '@/types/api';

// compatibility score timeline - shows how match quality changes over time
// using a simple bar chart approach since victory-native can be finicky

interface TimelineProps {
  history: CompatibilityScore[];
}

export function CompatibilityTimeline({ history }: TimelineProps) {
  if (history.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Match Quality Over Time</Text>
        <Text style={styles.emptyText}>No compatibility data yet</Text>
      </View>
    );
  }

  const maxScore = Math.max(...history.map(h => h.score));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Match Quality Over Time</Text>
      <View style={styles.chartArea}>
        {history.map((entry, i) => {
          const height = Math.max(entry.score * 150, 4);
          const dateStr = new Date(entry.computedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });

          return (
            <View key={entry.id} style={styles.barWrapper}>
              <Text style={styles.barValue}>{Math.round(entry.score * 100)}%</Text>
              <View style={[styles.bar, { height }]} />
              <Text style={styles.barLabel}>R{i + 1}</Text>
            </View>
          );
        })}
      </View>
      {history.length > 1 && (
        <Text style={styles.trendText}>
          {history[history.length - 1].score > history[0].score
            ? 'Trending up - matches are improving'
            : history[history.length - 1].score < history[0].score
            ? 'Scores declining - might need recalibration'
            : 'Holding steady'}
        </Text>
      )}
    </View>
  );
}

// per-dimension breakdown for a single compatibility score
interface BreakdownProps {
  score: CompatibilityScore;
  userAName: string;
  userBName: string;
}

export function CompatibilityBreakdown({ score, userAName, userBName }: BreakdownProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Compatibility Breakdown</Text>
      <View style={styles.overallRow}>
        <Text style={styles.overallLabel}>Overall Match</Text>
        <Text style={styles.overallScore}>{Math.round(score.score * 100)}%</Text>
      </View>

      <View style={styles.directionRow}>
        <Text style={styles.directionLabel}>{userAName} satisfaction</Text>
        <Text style={styles.directionScore}>{Math.round(score.aToBScore * 100)}%</Text>
      </View>
      <View style={styles.directionRow}>
        <Text style={styles.directionLabel}>{userBName} satisfaction</Text>
        <Text style={styles.directionScore}>{Math.round(score.bToAScore * 100)}%</Text>
      </View>

      <View style={styles.divider} />

      {DIMENSIONS.map((dim) => {
        const dimScore = score.dimensionScores[dim];
        if (!dimScore) return null;

        return (
          <View key={dim} style={styles.dimRow}>
            <Text style={styles.dimLabel}>{DIMENSION_LABELS[dim]}</Text>
            <View style={styles.dimBars}>
              <View style={styles.dimBarTrack}>
                <View style={[styles.dimBarA, { width: `${dimScore.aToB * 100}%` }]} />
              </View>
              <View style={styles.dimBarTrack}>
                <View style={[styles.dimBarB, { width: `${dimScore.bToA * 100}%` }]} />
              </View>
            </View>
          </View>
        );
      })}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
          <Text style={styles.legendText}>{userAName}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.secondary }]} />
          <Text style={styles.legendText}>{userBName}</Text>
        </View>
      </View>
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
    height: 180,
    paddingTop: Spacing.sm,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  barValue: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  bar: {
    width: 24,
    backgroundColor: Colors.primary,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  trendText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  overallRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  overallLabel: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  overallScore: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.primary,
  },
  directionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  directionLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  directionScore: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
  dimRow: {
    marginBottom: Spacing.sm,
  },
  dimLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  dimBars: {
    gap: 2,
  },
  dimBarTrack: {
    height: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 4,
    overflow: 'hidden',
  },
  dimBarA: {
    height: '100%',
    backgroundColor: Colors.primary + '80',
    borderRadius: 4,
  },
  dimBarB: {
    height: '100%',
    backgroundColor: Colors.secondary + '80',
    borderRadius: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
});
