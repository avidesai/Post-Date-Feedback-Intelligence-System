import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { selectionAsync, notificationSuccess } from '@/utils/haptics';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { LoadingView } from '@/components/LoadingView';
import { useApi } from '@/hooks/useApi';
import * as api from '@/services/api';
import { DIMENSIONS, DIMENSION_LABELS } from '@/types/api';
import type { User, PreferenceVector, SimulationResponse } from '@/types/api';

export default function ProfileScreen() {
  const { data: users, loading: usersLoading, refetch: refetchUsers } = useApi(() => api.getUsers(), []);
  const { data: simStatus, refetch: refetchStatus } = useApi(() => api.getSimulationStatus(), []);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingPrefs, setEditingPrefs] = useState<PreferenceVector | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [simResults, setSimResults] = useState<SimulationResponse | null>(null);
  const [rounds, setRounds] = useState(5);

  const activeUser = selectedUser || (users && users.length > 0 ? users[0] : null);

  if (usersLoading) return <LoadingView message="Loading profile..." />;

  const handleSavePrefs = async () => {
    if (!activeUser || !editingPrefs) return;
    try {
      await api.updatePreferences(activeUser.id, editingPrefs);
      setEditingPrefs(null);
      refetchUsers();
      Alert.alert('Saved', 'Your stated preferences have been updated');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save');
    }
  };

  const handleRunSimulation = async () => {
    setSimRunning(true);
    setSimResults(null);
    notificationSuccess();

    try {
      const result = await api.runSimulation({
        rounds,
        iterationsPerRound: 5,
        userCount: 20,
      });
      setSimResults(result);
      refetchUsers();
      refetchStatus();
      notificationSuccess();
    } catch (err: any) {
      Alert.alert('Simulation Failed', err.message || 'Something went wrong');
    } finally {
      setSimRunning(false);
    }
  };

  const handleSeed = async () => {
    try {
      const result = await api.seedSimulation();
      refetchUsers();
      refetchStatus();
      Alert.alert('Seeded', `Created ${result.usersCreated} users`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const currentPrefs = editingPrefs || activeUser?.statedPreferences || [0.5, 0.5, 0.5, 0.5, 0.5] as PreferenceVector;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>
            {activeUser ? activeUser.name : 'Your preferences and settings'}
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
                onPress={() => {
                  setSelectedUser(item);
                  setEditingPrefs(null);
                }}
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

        {/* user info */}
        {activeUser && (
          <View style={styles.userCard}>
            <View style={styles.userCardHeader}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={28} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.userName}>{activeUser.name}, {activeUser.age}</Text>
                <Text style={styles.userBio}>{activeUser.bio}</Text>
              </View>
            </View>
            <View style={styles.userStats}>
              <Text style={styles.userStat}>{activeUser.feedbackCount} feedback given</Text>
            </View>
          </View>
        )}

        {/* stated preferences editor */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Stated Preferences</Text>
          <Text style={styles.cardSubtitle}>
            What you think you want in a match. Drag to adjust.
          </Text>

          {DIMENSIONS.map((dim, i) => (
            <View key={dim} style={styles.prefRow}>
              <Text style={styles.prefLabel}>{DIMENSION_LABELS[dim]}</Text>
              <View style={styles.prefSliderRow}>
                <TouchableOpacity
                  onPress={() => {
                    const newPrefs = [...currentPrefs] as PreferenceVector;
                    newPrefs[i] = Math.max(0, newPrefs[i] - 0.1);
                    setEditingPrefs(newPrefs);
                    selectionAsync();
                  }}
                >
                  <Ionicons name="remove-circle-outline" size={24} color={Colors.textTertiary} />
                </TouchableOpacity>
                <View style={styles.prefBarTrack}>
                  <View style={[styles.prefBarFill, { width: `${currentPrefs[i] * 100}%` }]} />
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const newPrefs = [...currentPrefs] as PreferenceVector;
                    newPrefs[i] = Math.min(1, newPrefs[i] + 0.1);
                    setEditingPrefs(newPrefs);
                    selectionAsync();
                  }}
                >
                  <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.prefValue}>{(currentPrefs[i] * 10).toFixed(1)}</Text>
              </View>
            </View>
          ))}

          {editingPrefs && (
            <TouchableOpacity style={styles.saveButton} onPress={handleSavePrefs}>
              <Text style={styles.saveButtonText}>Save Preferences</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* simulation controls */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Simulation</Text>
          <Text style={styles.cardSubtitle}>
            Generate synthetic dating data to see the intelligence pipeline in action
          </Text>

          {simStatus && (
            <View style={styles.simStats}>
              <Text style={styles.simStatText}>{simStatus.totalUsers} users</Text>
              <Text style={styles.simStatText}>{simStatus.totalDates} dates</Text>
              <Text style={styles.simStatText}>{simStatus.usersWithFeedback} with feedback</Text>
            </View>
          )}

          <View style={styles.roundsRow}>
            <Text style={styles.roundsLabel}>Rounds:</Text>
            {[3, 5, 10].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.roundChip, rounds === n && styles.roundChipActive]}
                onPress={() => setRounds(n)}
              >
                <Text style={[styles.roundChipText, rounds === n && styles.roundChipTextActive]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.simButtonRow}>
            <TouchableOpacity
              style={styles.seedButton}
              onPress={handleSeed}
            >
              <Ionicons name="refresh" size={18} color={Colors.primary} />
              <Text style={styles.seedButtonText}>Reset & Seed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.runButton, simRunning && styles.buttonDisabled]}
              onPress={handleRunSimulation}
              disabled={simRunning}
            >
              {simRunning ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Ionicons name="play" size={18} color={Colors.white} />
              )}
              <Text style={styles.runButtonText}>
                {simRunning ? 'Running...' : 'Run Simulation'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* simulation results */}
          {simResults && (
            <View style={styles.simResults}>
              <Text style={styles.simResultsTitle}>Results</Text>
              {simResults.results.map((r, i) => (
                <View key={i} style={styles.simResultRow}>
                  <Text style={styles.simRoundLabel}>Round {r.round + 1}</Text>
                  <Text style={styles.simRoundScore}>
                    Avg match: {(r.averageCompatibility * 100).toFixed(1)}%
                  </Text>
                  {r.matchQualityImprovement !== 0 && (
                    <Text style={[
                      styles.simImprovement,
                      r.matchQualityImprovement > 0 ? styles.positive : styles.negative,
                    ]}>
                      {r.matchQualityImprovement > 0 ? '+' : ''}
                      {(r.matchQualityImprovement * 100).toFixed(1)}%
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
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
    marginBottom: Spacing.md,
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
  userCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  userBio: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  userStats: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  userStat: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  card: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  prefRow: {
    marginBottom: Spacing.md,
  },
  prefLabel: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  prefSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  prefBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 4,
    overflow: 'hidden',
  },
  prefBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  prefValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    width: 32,
    textAlign: 'right',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  simStats: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  simStatText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  roundsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  roundsLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  roundChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
  },
  roundChipActive: {
    backgroundColor: Colors.primary,
  },
  roundChipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  roundChipTextActive: {
    color: Colors.white,
  },
  simButtonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  seedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  seedButtonText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  runButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  runButtonText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  simResults: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  simResultsTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  simResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  simRoundLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    width: 60,
  },
  simRoundScore: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.text,
  },
  simImprovement: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  positive: {
    color: Colors.success,
  },
  negative: {
    color: Colors.error,
  },
});
