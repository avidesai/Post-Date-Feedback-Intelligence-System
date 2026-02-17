import type { PreferenceVector, User, Dimension, CompatibilityScore } from '../types';
import { DIMENSIONS } from '../types';
import { dot, magnitude, sigmoid, blend, geometricMean, clamp } from './vector-math';
import * as models from '../db/models';

// sigmoid-based blend weight: how much to trust revealed vs stated preferences
// after ~10 feedback submissions, revealed preferences dominate
// the transition is smooth thanks to sigmoid
function getRevealedWeight(feedbackCount: number): number {
  // sigmoid centered at 5, scaled so at 10 we're at ~0.85 revealed
  const x = (feedbackCount - 5) * 0.8;
  return sigmoid(x);
}

// get the effective preference vector for a user (blend of stated and revealed)
function getEffectivePreferences(user: User): PreferenceVector {
  const weight = getRevealedWeight(user.feedbackCount);
  return blend(user.statedPreferences, user.revealedPreferences, weight);
}

// how well does user B deliver on what user A wants?
// compares A's preferences (what they want) with B's quality profile (what B brings)
function computeDirectionalScore(
  wantPrefs: PreferenceVector,
  deliverQuality: PreferenceVector
): number {
  // weighted dot product normalized by the "want" magnitude
  // higher scores on dimensions A cares about contribute more
  let weightedScore = 0;
  let totalWeight = 0;

  for (let i = 0; i < 5; i++) {
    const weight = wantPrefs[i]; // how much A cares about this dimension
    const delivery = deliverQuality[i]; // how well B delivers on this dimension
    weightedScore += weight * delivery;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0.5; // no preferences = neutral

  return clamp(weightedScore / totalWeight, 0, 1);
}

// per-dimension compatibility breakdown
function computeDimensionScores(
  userA: User,
  userB: User
): Record<Dimension, { aToB: number; bToA: number }> {
  const prefsA = getEffectivePreferences(userA);
  const prefsB = getEffectivePreferences(userB);

  const result = {} as Record<Dimension, { aToB: number; bToA: number }>;

  for (let i = 0; i < DIMENSIONS.length; i++) {
    const dim = DIMENSIONS[i];
    // A's satisfaction on this dimension: how much A cares * how well B delivers
    const aToB = prefsA[i] > 0 ? clamp(userB.qualityProfile[i] / Math.max(prefsA[i], 0.1), 0, 1) : 0.5;
    const bToA = prefsB[i] > 0 ? clamp(userA.qualityProfile[i] / Math.max(prefsB[i], 0.1), 0, 1) : 0.5;
    result[dim] = { aToB, bToA };
  }

  return result;
}

// main compatibility scoring function
// two-sided: geometric mean of "does B deliver what A wants" and "does A deliver what B wants"
// this rewards mutual compatibility - a 0.9/0.3 pair scores lower than a 0.6/0.6 pair
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

  // geometric mean rewards mutual compatibility
  const score = geometricMean(aToBScore, bToAScore);

  const dimensionScores = computeDimensionScores(userA, userB);

  return { score, aToBScore, bToAScore, dimensionScores };
}

// compute and record compatibility score, returns the stored record
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
