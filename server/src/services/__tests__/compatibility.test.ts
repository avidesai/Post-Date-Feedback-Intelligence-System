import { describe, it, expect } from 'vitest';
import { computeCompatibility, getRevealedWeight } from '../compatibility';
import type { User, PreferenceVector } from '../../types';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'test-user',
    name: 'Test',
    age: 25,
    gender: 'other',
    bio: '',
    statedPreferences: [0.5, 0.5, 0.5, 0.5, 0.5],
    revealedPreferences: [0.5, 0.5, 0.5, 0.5, 0.5],
    qualityProfile: [0.5, 0.5, 0.5, 0.5, 0.5],
    feedbackCount: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('compatibility', () => {
  describe('getRevealedWeight', () => {
    it('should be low for new users', () => {
      const weight = getRevealedWeight(0);
      expect(weight).toBeLessThan(0.2);
    });

    it('should be high after many feedback submissions', () => {
      const weight = getRevealedWeight(15);
      expect(weight).toBeGreaterThan(0.9);
    });

    it('should increase monotonically', () => {
      let prev = getRevealedWeight(0);
      for (let i = 1; i <= 20; i++) {
        const curr = getRevealedWeight(i);
        expect(curr).toBeGreaterThan(prev);
        prev = curr;
      }
    });
  });

  describe('computeCompatibility', () => {
    it('should return score between 0 and 1', () => {
      const userA = makeUser({ id: 'a' });
      const userB = makeUser({ id: 'b' });
      const result = computeCompatibility(userA, userB);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should give higher score when B delivers what A wants', () => {
      const userA = makeUser({
        id: 'a',
        statedPreferences: [0.9, 0.1, 0.1, 0.1, 0.1],
        revealedPreferences: [0.9, 0.1, 0.1, 0.1, 0.1],
        feedbackCount: 20, // high count so revealed dominates
      });

      const goodMatch = makeUser({
        id: 'good',
        qualityProfile: [0.9, 0.5, 0.5, 0.5, 0.5], // great at conversation
        statedPreferences: [0.5, 0.5, 0.5, 0.5, 0.5],
        revealedPreferences: [0.5, 0.5, 0.5, 0.5, 0.5],
        feedbackCount: 20,
      });

      const badMatch = makeUser({
        id: 'bad',
        qualityProfile: [0.1, 0.5, 0.5, 0.5, 0.5], // bad at conversation
        statedPreferences: [0.5, 0.5, 0.5, 0.5, 0.5],
        revealedPreferences: [0.5, 0.5, 0.5, 0.5, 0.5],
        feedbackCount: 20,
      });

      const goodResult = computeCompatibility(userA, goodMatch);
      const badResult = computeCompatibility(userA, badMatch);

      expect(goodResult.aToBScore).toBeGreaterThan(badResult.aToBScore);
    });

    it('geometric mean should reward mutual compatibility', () => {
      const userA = makeUser({
        id: 'a',
        statedPreferences: [0.8, 0.8, 0.8, 0.8, 0.8],
        revealedPreferences: [0.8, 0.8, 0.8, 0.8, 0.8],
        qualityProfile: [0.8, 0.8, 0.8, 0.8, 0.8],
        feedbackCount: 20,
      });

      const mutualGood = makeUser({
        id: 'mutual',
        statedPreferences: [0.8, 0.8, 0.8, 0.8, 0.8],
        revealedPreferences: [0.8, 0.8, 0.8, 0.8, 0.8],
        qualityProfile: [0.8, 0.8, 0.8, 0.8, 0.8],
        feedbackCount: 20,
      });

      const oneSided = makeUser({
        id: 'onesided',
        statedPreferences: [0.8, 0.8, 0.8, 0.8, 0.8],
        revealedPreferences: [0.8, 0.8, 0.8, 0.8, 0.8],
        qualityProfile: [0.2, 0.2, 0.2, 0.2, 0.2], // bad quality
        feedbackCount: 20,
      });

      const mutualResult = computeCompatibility(userA, mutualGood);
      const oneSidedResult = computeCompatibility(userA, oneSided);

      expect(mutualResult.score).toBeGreaterThan(oneSidedResult.score);
    });

    it('should include dimension scores', () => {
      const userA = makeUser({ id: 'a' });
      const userB = makeUser({ id: 'b' });
      const result = computeCompatibility(userA, userB);

      expect(result.dimensionScores).toHaveProperty('conversation');
      expect(result.dimensionScores).toHaveProperty('emotional');
      expect(result.dimensionScores).toHaveProperty('interests');
      expect(result.dimensionScores).toHaveProperty('chemistry');
      expect(result.dimensionScores).toHaveProperty('values');
    });
  });
});
