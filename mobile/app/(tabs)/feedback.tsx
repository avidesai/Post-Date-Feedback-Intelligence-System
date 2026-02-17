import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { ConversationalFlow } from '@/components/feedback/ConversationalFlow';
import { InsightCard } from '@/components/InsightCard';
import { LoadingView } from '@/components/LoadingView';
import { useApi } from '@/hooks/useApi';
import * as api from '@/services/api';
import type { User, DateRecord, Feedback as FeedbackType } from '@/types/api';

type ScreenState = 'list' | 'feedback-flow' | 'result';

export default function FeedbackScreen() {
  const { data: users, loading: usersLoading } = useApi(() => api.getUsers(), []);
  const { data: dates, loading: datesLoading } = useApi(() => api.getDates(), []);

  const [screenState, setScreenState] = useState<ScreenState>('list');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<DateRecord | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ feedback: FeedbackType; llmExtracted: boolean } | null>(null);

  const loading = usersLoading || datesLoading;
  if (loading) return <LoadingView message="Loading..." />;

  const userMap = new Map((users || []).map(u => [u.id, u]));
  const activeUser = selectedUser || (users && users.length > 0 ? users[0] : null);

  const userDates = (dates || []).filter(
    d => activeUser && (d.userAId === activeUser.id || d.userBId === activeUser.id)
  );

  const handleSelectDate = (d: DateRecord) => {
    setSelectedDate(d);
    const otherId = d.userAId === activeUser!.id ? d.userBId : d.userAId;
    setOtherUser(userMap.get(otherId) || null);
    setScreenState('feedback-flow');
  };

  const handleSubmit = async (data: any) => {
    if (!selectedDate || !activeUser || !otherUser) return;

    setSubmitting(true);
    try {
      const res = await api.submitFeedback({
        dateId: selectedDate.id,
        fromUserId: activeUser.id,
        aboutUserId: otherUser.id,
        overallRating: data.overallRating,
        conversationScore: data.conversationScore,
        emotionalScore: data.emotionalScore,
        interestsScore: data.interestsScore,
        chemistryScore: data.chemistryScore,
        valuesScore: data.valuesScore,
        bestPart: data.bestPart,
        worstPart: data.worstPart,
        chemistryText: data.chemistryText,
      });
      setResult(res);
      setScreenState('result');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  // result screen
  if (screenState === 'result' && result) {
    const fb = result.feedback;
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Feedback Submitted</Text>
          <Text style={styles.headerSubtitle}>
            {result.llmExtracted ? 'Scores extracted by AI' : 'Your ratings recorded'}
          </Text>
        </View>

        <View style={styles.resultContent}>
          <View style={styles.scoreGrid}>
            {[
              { label: 'Overall', value: fb.overallRating },
              { label: 'Conversation', value: fb.conversationScore },
              { label: 'Emotional', value: fb.emotionalScore },
              { label: 'Interests', value: fb.interestsScore },
              { label: 'Chemistry', value: fb.chemistryScore },
              { label: 'Values', value: fb.valuesScore },
            ].map(({ label, value }) => (
              <View key={label} style={styles.scoreItem}>
                <Text style={styles.scoreValue}>{(value * 10).toFixed(1)}</Text>
                <Text style={styles.scoreLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {fb.bestPart && (
            <InsightCard text={`Best part: ${fb.bestPart}`} type="success" />
          )}
          {fb.worstPart && (
            <InsightCard text={`Could improve: ${fb.worstPart}`} type="warning" />
          )}

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => {
              setScreenState('list');
              setResult(null);
            }}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // feedback flow
  if (screenState === 'feedback-flow' && otherUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TouchableOpacity
          style={styles.backNav}
          onPress={() => setScreenState('list')}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          <Text style={styles.backNavText}>Cancel</Text>
        </TouchableOpacity>
        <ConversationalFlow
          otherUserName={otherUser.name}
          onSubmit={handleSubmit}
          loading={submitting}
        />
      </SafeAreaView>
    );
  }

  // date selection list
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feedback</Text>
        <Text style={styles.headerSubtitle}>Share how your dates went</Text>
      </View>

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

      {userDates.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubble-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No dates to review</Text>
          <Text style={styles.emptyText}>
            After a date, you can share your thoughts here
          </Text>
        </View>
      ) : (
        <FlatList
          data={userDates}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const otherId = item.userAId === activeUser!.id ? item.userBId : item.userAId;
            const other = userMap.get(otherId);
            return (
              <TouchableOpacity
                style={styles.dateSelectCard}
                onPress={() => handleSelectDate(item)}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.primary} />
                <View style={styles.dateSelectInfo}>
                  <Text style={styles.dateSelectName}>
                    Date with {other?.name || 'Unknown'}
                  </Text>
                  <Text style={styles.dateSelectVenue}>
                    {item.venueName || 'No venue'} · {new Date(item.dateAt).toLocaleDateString()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            );
          }}
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
  backNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  backNavText: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: '500',
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
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  dateSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.md,
  },
  dateSelectInfo: {
    flex: 1,
  },
  dateSelectName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  dateSelectVenue: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
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
  resultContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  scoreItem: {
    width: '30%',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.primary,
  },
  scoreLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  doneButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
