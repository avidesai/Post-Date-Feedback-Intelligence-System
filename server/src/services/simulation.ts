import { v4 as uuid } from 'uuid';
import type { PreferenceVector, SimulationConfig, SimulationResult, User } from '../types';
import * as models from '../db/models';
import { seedDatabase } from '../db/seed';
import { computeCompatibility, computeAndRecordCompatibility } from './compatibility';
import { updatePreferencesFromFeedback } from './preference-learning';
import { clamp, cosineDistance } from './vector-math';

// true preferences intentionally differ from stated for interesting users
const TRUE_PREFERENCES: Record<string, PreferenceVector> = {
  'Alex Rivera': [0.4, 0.5, 0.6, 0.85, 0.5],
  'Jordan Lee': [0.5, 0.5, 0.8, 0.7, 0.4],
  'Sam Chen': [0.6, 0.5, 0.75, 0.65, 0.55],
  'Maya Patel': [0.65, 0.7, 0.5, 0.55, 0.75],
  'Chris Taylor': [0.3, 0.8, 0.3, 0.4, 0.85],
  'Avery Kim': [0.4, 0.5, 0.3, 0.85, 0.4],
  'Riley Morgan': [0.5, 0.7, 0.6, 0.5, 0.6],
  'Casey Brooks': [0.5, 0.6, 0.5, 0.5, 0.8],
  'Kai Nakamura': [0.35, 0.45, 0.35, 0.9, 0.3],
  'Zoe Williams': [0.45, 0.55, 0.3, 0.85, 0.35],
  'Ethan Park': [0.55, 0.65, 0.45, 0.35, 0.9],
  'Priya Sharma': [0.5, 0.55, 0.35, 0.45, 0.85],
  'Marcus Johnson': [0.5, 0.35, 0.85, 0.55, 0.45],
  'Luna Garcia': [0.55, 0.45, 0.85, 0.5, 0.35],
  'Noah White': [0.55, 0.45, 0.5, 0.75, 0.5],
  'Isla Thompson': [0.5, 0.55, 0.4, 0.7, 0.55],
  'Jake Mitchell': [0.4, 0.7, 0.4, 0.5, 0.7],
  'Sophia Davis': [0.5, 0.7, 0.3, 0.5, 0.7],
  "Liam O'Connor": [0.7, 0.5, 0.6, 0.8, 0.6],
  'Emma Rodriguez': [0.6, 0.6, 0.5, 0.8, 0.6],
  'Dev Agarwal': [0.6, 0.65, 0.5, 0.5, 0.55],
  'Mia Zhang': [0.7, 0.55, 0.55, 0.5, 0.65],
  'Tyler Green': [0.6, 0.5, 0.5, 0.6, 0.5],
  'Nadia Hassan': [0.85, 0.6, 0.5, 0.45, 0.65],
};

function simulateFeedbackScores(
  userA: User,
  userB: User,
  truePrefsA: PreferenceVector
): { scores: PreferenceVector; overall: number } {
  const qualityB = userB.qualityProfile;

  const noise = () => (Math.random() - 0.5) * 0.15;
  const scores: PreferenceVector = [
    clamp(qualityB[0] + noise(), 0, 1),
    clamp(qualityB[1] + noise(), 0, 1),
    clamp(qualityB[2] + noise(), 0, 1),
    clamp(qualityB[3] + noise(), 0, 1),
    clamp(qualityB[4] + noise(), 0, 1),
  ];

  // overall weighted by true preferences
  let weightedSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < 5; i++) {
    weightedSum += truePrefsA[i] * scores[i];
    totalWeight += truePrefsA[i];
  }
  const overall = totalWeight > 0 ? clamp(weightedSum / totalWeight + (Math.random() - 0.5) * 0.1, 0, 1) : 0.5;

  return { scores, overall };
}

export function seedSimulation(): { usersCreated: number } {
  return seedDatabase();
}

export function runSimulationRound(
  round: number,
  useCompatibilityPairing: boolean = false
): SimulationResult {
  const users = models.getAllUsers();
  if (users.length < 2) {
    return {
      round,
      averageCompatibility: 0,
      averageDivergence: 0,
      matchQualityImprovement: 0,
      pairings: [],
    };
  }

  const pairs = useCompatibilityPairing && round > 0
    ? createCompatibilityPairings(users)
    : createRandomPairings(users);

  const pairingResults: Array<{ userAId: string; userBId: string; score: number }> = [];

  for (const [userA, userB] of pairs) {
    const truePrefsA = TRUE_PREFERENCES[userA.name] || userA.statedPreferences;
    const truePrefsB = TRUE_PREFERENCES[userB.name] || userB.statedPreferences;

    const dateRecord = models.createDate({
      userAId: userA.id,
      userBId: userB.id,
      venueName: getRandomVenue(),
      dateAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const feedbackAB = simulateFeedbackScores(userA, userB, truePrefsA);

    const fbA = models.createFeedback({
      dateId: dateRecord.id,
      fromUserId: userA.id,
      aboutUserId: userB.id,
      overallRating: feedbackAB.overall,
      conversationScore: feedbackAB.scores[0],
      emotionalScore: feedbackAB.scores[1],
      interestsScore: feedbackAB.scores[2],
      chemistryScore: feedbackAB.scores[3],
      valuesScore: feedbackAB.scores[4],
    });

    const freshA = models.getUser(userA.id)!;
    const freshB = models.getUser(userB.id)!;
    updatePreferencesFromFeedback(fbA, freshA, freshB);

    const feedbackBA = simulateFeedbackScores(userB, userA, truePrefsB);

    const fbB = models.createFeedback({
      dateId: dateRecord.id,
      fromUserId: userB.id,
      aboutUserId: userA.id,
      overallRating: feedbackBA.overall,
      conversationScore: feedbackBA.scores[0],
      emotionalScore: feedbackBA.scores[1],
      interestsScore: feedbackBA.scores[2],
      chemistryScore: feedbackBA.scores[3],
      valuesScore: feedbackBA.scores[4],
    });

    const freshB2 = models.getUser(userB.id)!;
    const freshA2 = models.getUser(userA.id)!;
    updatePreferencesFromFeedback(fbB, freshB2, freshA2);

    const compat = computeAndRecordCompatibility(userA.id, userB.id);
    if (compat) {
      pairingResults.push({
        userAId: userA.id,
        userBId: userB.id,
        score: compat.score,
      });
    }
  }

  const avgCompat = pairingResults.length > 0
    ? pairingResults.reduce((sum, p) => sum + p.score, 0) / pairingResults.length
    : 0;

  const allUsers = models.getAllUsers();
  let totalDivergence = 0;
  for (const user of allUsers) {
    totalDivergence += cosineDistance(user.statedPreferences, user.revealedPreferences);
  }
  const avgDivergence = allUsers.length > 0 ? totalDivergence / allUsers.length : 0;

  return {
    round,
    averageCompatibility: avgCompat,
    averageDivergence: avgDivergence,
    matchQualityImprovement: 0,
    pairings: pairingResults,
  };
}

export function runFullSimulation(config: SimulationConfig): SimulationResult[] {
  seedSimulation();

  const results: SimulationResult[] = [];

  for (let round = 0; round < config.rounds; round++) {
    const result = runSimulationRound(round, round > 0);
    results.push(result);
  }

  if (results.length > 1) {
    const baselineCompat = results[0].averageCompatibility;
    for (const r of results) {
      r.matchQualityImprovement = baselineCompat > 0
        ? (r.averageCompatibility - baselineCompat) / baselineCompat
        : 0;
    }
  }

  return results;
}

function createRandomPairings(users: User[]): Array<[User, User]> {
  const shuffled = [...users].sort(() => Math.random() - 0.5);
  const pairs: Array<[User, User]> = [];

  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }

  return pairs;
}

// greedy pairing, not optimal but good enough
function createCompatibilityPairings(users: User[]): Array<[User, User]> {
  const available = new Set(users.map(u => u.id));
  const pairs: Array<[User, User]> = [];
  const userMap = new Map(users.map(u => [u.id, u]));

  while (available.size >= 2) {
    let bestScore = -1;
    let bestPair: [string, string] | null = null;

    const ids = Array.from(available);

    for (let i = 0; i < Math.min(ids.length, 20); i++) {
      for (let j = i + 1; j < Math.min(ids.length, 20); j++) {
        const userA = userMap.get(ids[i])!;
        const userB = userMap.get(ids[j])!;
        const result = computeCompatibility(userA, userB);
        if (result.score > bestScore) {
          bestScore = result.score;
          bestPair = [ids[i], ids[j]];
        }
      }
    }

    if (bestPair) {
      available.delete(bestPair[0]);
      available.delete(bestPair[1]);
      pairs.push([userMap.get(bestPair[0])!, userMap.get(bestPair[1])!]);
    } else {
      break;
    }
  }

  return pairs;
}

function getRandomVenue(): string {
  const venues = [
    'The Blue Door Cafe',
    'Moonlight Lounge',
    'Central Park (walking date)',
    'Sushi Nori',
    'The Rustic Table',
    'Rooftop Bar at The Standard',
    'Brooklyn Bowl',
    'Eataly Downtown',
    'Museum of Modern Art',
    'Joe\'s Pizza',
    'The Comedy Cellar',
    'Prospect Park Picnic',
    'Wine Bar on 5th',
    'Thai Basil Kitchen',
    'The High Line walk',
  ];
  return venues[Math.floor(Math.random() * venues.length)];
}
