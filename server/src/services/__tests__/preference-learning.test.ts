import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getLearningRate, extractRevealedSignal } from '../preference-learning';
import type { Feedback, PreferenceVector } from '../../types';

describe('preference-learning', () => {
  describe('getLearningRate', () => {
    it('should start high for new users', () => {
      const rate = getLearningRate(0);
      expect(rate).toBeCloseTo(0.3, 1);
    });

    it('should decay with more feedback', () => {
      const rate0 = getLearningRate(0);
      const rate5 = getLearningRate(5);
      const rate10 = getLearningRate(10);
      const rate20 = getLearningRate(20);

      expect(rate0).toBeGreaterThan(rate5);
      expect(rate5).toBeGreaterThan(rate10);
      expect(rate10).toBeGreaterThan(rate20);
    });

    it('should approach but not go below minimum', () => {
      const rateHigh = getLearningRate(100);
      expect(rateHigh).toBeGreaterThanOrEqual(0.05);
      expect(rateHigh).toBeLessThan(0.1);
    });
  });

  describe('extractRevealedSignal', () => {
    function makeFeedback(overrides: Partial<Feedback>): Feedback {
      return {
        id: 'test',
        dateId: 'test-date',
        fromUserId: 'test-from',
        aboutUserId: 'test-about',
        overallRating: 0.5,
        conversationScore: 0.5,
        emotionalScore: 0.5,
        interestsScore: 0.5,
        chemistryScore: 0.5,
        valuesScore: 0.5,
        bestPart: null,
        worstPart: null,
        chemistryText: null,
        rawText: null,
        llmExtracted: false,
        createdAt: new Date().toISOString(),
        ...overrides,
      };
    }

    it('should detect high-satisfaction high-dimension as important', () => {
      // high conversation, high overall = conversation matters
      const fb = makeFeedback({
        overallRating: 0.9,
        conversationScore: 0.9,
        emotionalScore: 0.3,
        interestsScore: 0.3,
        chemistryScore: 0.3,
        valuesScore: 0.3,
      });

      const signal = extractRevealedSignal(fb);
      // conversation should have highest signal since it agrees with high overall
      expect(signal[0]).toBeGreaterThan(signal[1]);
    });

    it('should detect dimension that doesnt match overall as less important', () => {
      // high chemistry but LOW overall = chemistry alone isnt enough
      const fb = makeFeedback({
        overallRating: 0.3,
        conversationScore: 0.3,
        emotionalScore: 0.3,
        interestsScore: 0.3,
        chemistryScore: 0.9,
        valuesScore: 0.3,
      });

      const signal = extractRevealedSignal(fb);
      // chemistry scored high but overall was low - so the agreement is low
      // the importance signal should reflect this
      // conversation (low score, low overall = agreement) vs chemistry (high score, low overall = disagreement)
      expect(signal[3]).toBeLessThan(0.5); // chemistry importance dampened
    });

    it('should produce values in [0, 1]', () => {
      const fb = makeFeedback({
        overallRating: 0.8,
        conversationScore: 0.9,
        emotionalScore: 0.1,
        interestsScore: 0.5,
        chemistryScore: 1.0,
        valuesScore: 0.0,
      });

      const signal = extractRevealedSignal(fb);
      for (const val of signal) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });
  });
});
