import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { DateCard } from '@/components/DateCard';
import { LoadingView } from '@/components/LoadingView';
import { ErrorView } from '@/components/ErrorView';
import { useApi } from '@/hooks/useApi';
import * as api from '@/services/api';
import type { User, DateRecord } from '@/types/api';

export default function DatesScreen() {
  const { data: users, loading: usersLoading, error: usersError, refetch: refetchUsers } = useApi(() => api.getUsers(), []);
  const { data: dates, loading: datesLoading, error: datesError, refetch: refetchDates } = useApi(() => api.getDates(), []);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchUsers(), refetchDates()]);
    setRefreshing(false);
  }, [refetchUsers, refetchDates]);

  const loading = usersLoading || datesLoading;
  const error = usersError || datesError;

  if (loading && !refreshing) return <LoadingView message="Loading dates..." />;
  if (error) return <ErrorView message={error} onRetry={onRefresh} />;

  const userMap = new Map((users || []).map(u => [u.id, u]));

  // if no user selected yet, default to the first one
  const activeUser = selectedUser || (users && users.length > 0 ? users[0] : null);

  const userDates = (dates || []).filter(
    d => activeUser && (d.userAId === activeUser.id || d.userBId === activeUser.id)
  );

  const getOtherUser = (d: DateRecord) => {
    if (!activeUser) return null;
    const otherId = d.userAId === activeUser.id ? d.userBId : d.userAId;
    return userMap.get(otherId) || null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Dates</Text>
        <Text style={styles.headerSubtitle}>
          {activeUser ? `Viewing as ${activeUser.name}` : 'No users yet'}
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
              {item.feedbackCount > 0 && (
                <Text style={styles.feedbackBadge}>{item.feedbackCount}</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {userDates.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No dates yet</Text>
          <Text style={styles.emptyText}>
            Run a simulation from the Profile tab to generate date history
          </Text>
        </View>
      ) : (
        <FlatList
          data={userDates}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          renderItem={({ item }) => (
            <DateCard
              dateRecord={item}
              otherUser={getOtherUser(item)}
            />
          )}
        />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    gap: 4,
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
  feedbackBadge: {
    fontSize: 10,
    color: Colors.textTertiary,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
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
});
