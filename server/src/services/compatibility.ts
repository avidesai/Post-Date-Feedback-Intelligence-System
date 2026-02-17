import type { PreferenceVector, User, Dimension, CompatibilityScore } from '../types';
import { DIMENSIONS } from '../types';
import { dot, magnitude, sigmoid, blend, geometricMean, clamp } from './vector-math';
import * as models from '../db/models';

// after ~10 feedback submissions, revealed preferences dominate
function getRevealedWeight(feedbackCount: number): number {
  const x = (feedbackCount - 5) * 0.8;
  return sigmoid(x);
}

function getEffectivePreferences(user: User): PreferenceVector {
  const weight = getRevealedWeight(user.feedbackCount);
  return blend(user.statedPreferences, user.revealedPreferences, weight);
}

function computeDirectionalScore(
  wantPrefs: PreferenceVector,
  deliverQuality: PreferenceVector
): number {
  let weightedScore = 0;
  let totalWeight = 0;

  for (let i = 0; i < 5; i++) {
    const weight = wantPrefs[i];
    const delivery = deliverQuality[i];
    weightedScore += weight * delivery;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0.5;

  return clamp(weightedScore / totalWeight, 0, 1);
}

function computeDimensionScores(
  userA: User,
  userB: User
): Record<Dimension, { aToB: number; bToA: number }> {
  const prefsA = getEffectivePreferences(userA);
  const prefsB = getEffectivePreferences(userB);

  const result = {} as Record<Dimension, { aToB: number; bToA: number }>;

  for (let i = 0; i < DIMENSIONS.length; i++) {
    const dim = DIMENSIONS[i];
    const aToB = prefsA[i] > 0 ? clamp(userB.qualityProfile[i] / Math.max(prefsA[i], 0.1), 0, 1) : 0.5;
    const bToA = prefsB[i] > 0 ? clamp(userA.qualityProfile[i] / Math.max(prefsB[i], 0.1), 0, 1) : 0.5;
    result[dim] = { aToB, bToA };
  }

  return result;
}

// two-sided: geometric mean so a 0.9/0.3 pair scores lower than a 0.6/0.6 pair
export function computeCompatibility(userA: User, userB: User): {
  score: number;
  aToBScore: number;
  bToAScore: number;
  dimensionScores: Record<Dimension, { aToB: number; bToA: number }>;
} {
  const prefsA = getEffectivePreferences(userA);
  const prefsB = getEffectivePreferences(userB);

  const aToBScore = computeDirectionalScore(prefsA, userB.qualityProfile);
  const bToAScore = computeDirectionalScore(prefsB, userA.qualityProfile);

  const score = geometricMean(aToBScore, bToAScore);
  const dimensionScores = computeDimensionScores(userA, userB);

  return { score, aToBScore, bToAScore, dimensionScores };
}

export function computeAndRecordCompatibility(userAId: string, userBId: string): CompatibilityScore | null {
  const userA = models.getUser(userAId);
  const userB = models.getUser(userBId);
  if (!userA || !userB) return null;

  const result = computeCompatibility(userA, userB);

  return models.recordCompatibilityScore(
    userAId,
    userBId,
    result.score,
    result.aToBScore,
    result.bToAScore,
    result.dimensionScores
  );
}

export { getRevealedWeight, getEffectivePreferences };
