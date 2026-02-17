import type { PreferenceVector, Dimension, User } from '../types';
import { DIMENSIONS } from '../types';
import { cosineDistance, absDifference } from './vector-math';
import * as models from '../db/models';

export interface DivergenceResult {
  overall: number; // cosine distance between stated and revealed (0 = aligned, 1 = very different)
  perDimension: Record<Dimension, number>; // absolute difference per dimension
  insights: string[]; // human-readable insights about significant divergences
}

export interface PreferenceDriftData {
  userId: string;
  currentDivergence: DivergenceResult;
  history: Array<{
    feedbackCount: number;
    divergenceScore: number;
    stated: PreferenceVector;
    revealed: PreferenceVector;
    recordedAt: string;
  }>;
}

// compute how different stated and revealed preferences are
export function computeDivergence(
  stated: PreferenceVector,
  revealed: PreferenceVector
): DivergenceResult {
  const overall = cosineDistance(stated, revealed);
  const diffs = absDifference(stated, revealed);

  const perDimension = {} as Record<Dimension, number>;
  for (let i = 0; i < DIMENSIONS.length; i++) {
    perDimension[DIMENSIONS[i]] = diffs[i];
  }

  const insights = generateInsights(stated, revealed, perDimension);

  return { overall, perDimension, insights };
}

// dimension labels in plain english
const DIMENSION_LABELS: Record<Dimension, { stated: string; revealed: string }> = {
  conversation: {
    stated: 'you say conversation quality is important',
    revealed: 'your feedback suggests conversation matters',
  },
  emotional: {
    stated: 'you say emotional connection matters a lot',
    revealed: 'your actual satisfaction correlates with emotional depth',
  },
  interests: {
    stated: 'you say shared interests are key',
    revealed: 'shared interests actually drive your satisfaction',
  },
  chemistry: {
    stated: 'you say physical chemistry is important',
    revealed: 'chemistry actually influences how much you enjoy dates',
  },
  values: {
    stated: 'you say value alignment matters',
    revealed: 'value alignment actually impacts your dating satisfaction',
  },
};

function generateInsights(
  stated: PreferenceVector,
  revealed: PreferenceVector,
  perDimension: Record<Dimension, number>
): string[] {
  const insights: string[] = [];
  const threshold = 0.2; // only flag dimensions with > 0.2 difference

  for (let i = 0; i < DIMENSIONS.length; i++) {
    const dim = DIMENSIONS[i];
    const diff = perDimension[dim];

    if (diff < threshold) continue;

    const statedVal = stated[i];
    const revealedVal = revealed[i];

    if (statedVal > revealedVal) {
      // they think this matters more than it actually does
      if (dim === 'conversation') {
        insights.push(`You rate conversation as very important (${(statedVal * 10).toFixed(1)}/10) but your feedback patterns suggest it matters less than you think (${(revealedVal * 10).toFixed(1)}/10). You might be enjoying dates with ok-ish conversation more than expected.`);
      } else if (dim === 'chemistry') {
        insights.push(`You say chemistry is a ${(statedVal * 10).toFixed(1)}/10 priority, but your actual satisfaction doesnt depend on it as much (${(revealedVal * 10).toFixed(1)}/10). Maybe the spark isnt as make-or-break as you thought.`);
      } else {
        insights.push(`You rate ${dim} as ${(statedVal * 10).toFixed(1)}/10 important, but your revealed preference is ${(revealedVal * 10).toFixed(1)}/10. This dimension might matter less to your actual happiness than you think.`);
      }
    } else {
      // this actually matters more than they think
      if (dim === 'chemistry') {
        insights.push(`Interesting - you rated chemistry as only ${(statedVal * 10).toFixed(1)}/10 important, but your feedback reveals it actually matters ${(revealedVal * 10).toFixed(1)}/10. The physical spark might be more important to you than you realize.`);
      } else if (dim === 'emotional') {
        insights.push(`Your stated importance for emotional connection is ${(statedVal * 10).toFixed(1)}/10, but your revealed preference is ${(revealedVal * 10).toFixed(1)}/10. Emotional depth seems to drive your satisfaction more than you expected.`);
      } else {
        insights.push(`You only rated ${dim} as ${(statedVal * 10).toFixed(1)}/10 important, but it actually shows up as ${(revealedVal * 10).toFixed(1)}/10 in your feedback. This might be a blind spot worth paying attention to.`);
      }
    }
  }

  if (insights.length === 0) {
    insights.push('Your stated and revealed preferences are pretty well aligned. You seem to know yourself well when it comes to dating.');
  }

  return insights;
}

// get full preference drift data for a user
export function getPreferenceDrift(userId: string): PreferenceDriftData | null {
  const user = models.getUser(userId);
  if (!user) return null;

  const currentDivergence = computeDivergence(user.statedPreferences, user.revealedPreferences);
  const snapshots = models.getPreferenceHistory(userId);

  return {
    userId,
    currentDivergence,
    history: snapshots.map(s => ({
      feedbackCount: s.feedbackCount,
      divergenceScore: s.divergenceScore,
      stated: s.statedVector,
      revealed: s.revealedVector,
      recordedAt: s.recordedAt,
    })),
  };
}
