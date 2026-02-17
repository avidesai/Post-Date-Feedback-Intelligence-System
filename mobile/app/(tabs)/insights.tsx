import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { PreferenceDriftChart } from '@/components/charts/PreferenceDriftChart';
import { DivergenceTimeline } from '@/components/charts/DivergenceTimeline';
import { InsightCard } from '@/components/InsightCard';
import { LoadingView } from '@/components/LoadingView';
import { ErrorView } from '@/components/ErrorView';
import { useApi } from '@/hooks/useApi';
import * as api from '@/services/api';
import type { User } from '@/types/api';

export default function InsightsScreen() {
  const { data: users, loading: usersLoading, error: usersError, refetch: refetchUsers } = useApi(() => api.getUsers(), []);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const activeUser = selectedUser || (users && users.length > 0 ? users[0] : null);

  const {
    data: insights,
    loading: insightsLoading,
    error: insightsError,
    refetch: refetchInsights,
  } = useApi(
    () => activeUser ? api.getUserInsights(activeUser.id) : Promise.resolve(null),
    [activeUser?.id]
  );

  const {
    data: drift,
    loading: driftLoading,
    refetch: refetchDrift,
  } = useApi(
    () => activeUser ? api.getPreferenceDrift(activeUser.id) : Promise.resolve(null),
    [activeUser?.id]
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchUsers(), refetchInsights(), refetchDrift()]);
    setRefreshing(false);
  };

  if (usersLoading && !refreshing) return <LoadingView message="Loading insights..." />;
  if (usersError) return <ErrorView message={usersError} onRetry={onRefresh} />;

  const hasData = insights && insights.stats.feedbackGiven > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Insights</Text>
        <Text style={styles.headerSubtitle}>
          {activeUser ? `${activeUser.name}'s dating intelligence` : 'Match quality and trends'}
        </Text>
      </View>

      {/* user selector */}
      {users && users.length > 0 && (
        <FlatList
          horizontal
          data={users.slice(0, 10)}
          keyExtractor={(u) => u.id}
          showsHorizontalScrollIndicator={false}
          style={styles.userPicker}
          contentContainerStyle={styles.userPickerContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.userChip,
                activeUser?.id === item.id && styles.userChipActive,
              ]}
              onPress={() => setSelectedUser(item)}
            >
              <Text style={[
                styles.userChipText,
                activeUser?.id === item.id && styles.userChipTextActive,
              ]}>
                {item.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {!hasData ? (
        <View style={styles.emptyState}>
          <Ionicons name="bar-chart-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>Not enough data yet</Text>
          <Text style={styles.emptyText}>
            Insights will appear after a few dates with feedback. Run a simulation from the Profile tab.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          {/* stats overview */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{insights.stats.totalDates}</Text>
              <Text style={styles.statLabel}>Dates</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{insights.stats.feedbackGiven}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {insights.stats.avgSatisfaction != null
                  ? (insights.stats.avgSatisfaction * 10).toFixed(1)
                  : '-'}
              </Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {insights.divergence
                  ? (insights.divergence.overall * 100).toFixed(0) + '%'
                  : '-'}
              </Text>
              <Text style={styles.statLabel}>Divergence</Text>
            </View>
          </View>

          {/* preference drift chart */}
          {activeUser && (
            <PreferenceDriftChart
              stated={activeUser.statedPreferences}
              revealed={activeUser.revealedPreferences}
            />
          )}

          {/* divergence timeline */}
          {drift && drift.history.length > 0 && (
            <View style={styles.chartSection}>
              <DivergenceTimeline history={drift.history} />
            </View>
          )}

          {/* insights */}
          {insights.insights.length > 0 && (
            <View style={styles.insightsSection}>
              <Text style={styles.sectionTitle}>What we've learned</Text>
              {insights.insights.map((text, i) => (
                <InsightCard
                  key={i}
                  text={text}
                  type={text.includes('well aligned') ? 'success' : 'info'}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  userPicker: {
    maxHeight: 44,
    marginBottom: Spacing.sm,
  },
  userPickerContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  userChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
  },
  userChipActive: {
    backgroundColor: Colors.primary,
  },
  userChipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  userChipTextActive: {
    color: Colors.white,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  chartSection: {
    marginTop: Spacing.md,
  },
  insightsSection: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
});
