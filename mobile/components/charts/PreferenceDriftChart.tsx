import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import type { PreferenceVector, Dimension } from '@/types/api';
import { DIMENSIONS, DIMENSION_LABELS } from '@/types/api';

// radar chart drawn manually since victory-native radar support is spotty
// this is a simple 5-axis radar overlay that shows stated vs revealed prefs

interface Props {
  stated: PreferenceVector;
  revealed: PreferenceVector;
  size?: number;
}

function polarToCartesian(angle: number, radius: number, centerX: number, centerY: number) {
  // start from top (- PI/2) and go clockwise
  const rad = (angle - 90) * (Math.PI / 180);
  return {
    x: centerX + radius * Math.cos(rad),
    y: centerY + radius * Math.sin(rad),
  };
}

function getPoints(values: PreferenceVector, maxRadius: number, centerX: number, centerY: number) {
  const angleStep = 360 / 5;
  return values.map((val, i) => {
    const angle = angleStep * i;
    return polarToCartesian(angle, val * maxRadius, centerX, centerY);
  });
}

// since we cant use SVG easily without more deps, lets do a simplified visual
// with bar-based representation instead of a true radar
export function PreferenceDriftChart({ stated, revealed, size = 280 }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stated vs Revealed Preferences</Text>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
          <Text style={styles.legendText}>What you say</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.secondary }]} />
          <Text style={styles.legendText}>What your feedback shows</Text>
        </View>
      </View>

      {DIMENSIONS.map((dim, i) => {
        const statedVal = stated[i];
        const revealedVal = revealed[i];
        const diff = Math.abs(statedVal - revealedVal);
        const hasDivergence = diff > 0.15;

        return (
          <View key={dim} style={styles.barRow}>
            <Text style={styles.dimLabel}>{DIMENSION_LABELS[dim]}</Text>
            <View style={styles.barContainer}>
              <View style={[styles.statedBar, { width: `${statedVal * 100}%` }]} />
              <View style={[styles.revealedBar, { width: `${revealedVal * 100}%` }]} />
            </View>
            {hasDivergence && (
              <Text style={styles.diffBadge}>
                {revealedVal > statedVal ? '+' : '-'}{(diff * 10).toFixed(1)}
              </Text>
            )}
          </View>
        );
      })}
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
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
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
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  dimLabel: {
    width: 85,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  statedBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 10,
    backgroundColor: Colors.primary + '60',
    borderRadius: 4,
  },
  revealedBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 10,
    backgroundColor: Colors.secondary + '80',
    borderRadius: 4,
  },
  diffBadge: {
    width: 40,
    textAlign: 'right',
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.warning,
    marginLeft: Spacing.xs,
  },
});
