import { describe, it, expect } from 'vitest';
import { computeDivergence } from '../divergence';
import type { PreferenceVector } from '../../types';

describe('divergence', () => {
  describe('computeDivergence', () => {
    it('should return 0 divergence for identical vectors', () => {
      const v: PreferenceVector = [0.5, 0.5, 0.5, 0.5, 0.5];
      const result = computeDivergence(v, v);
      expect(result.overall).toBeCloseTo(0, 3);
    });

    it('should detect high divergence between different vectors', () => {
      const stated: PreferenceVector = [0.9, 0.1, 0.1, 0.1, 0.1]; // says conversation is everything
      const revealed: PreferenceVector = [0.1, 0.1, 0.1, 0.9, 0.1]; // actually chemistry driven
      const result = computeDivergence(stated, revealed);
      expect(result.overall).toBeGreaterThan(0.3);
    });

    it('should compute per-dimension differences', () => {
      const stated: PreferenceVector = [0.8, 0.5, 0.5, 0.2, 0.5];
      const revealed: PreferenceVector = [0.3, 0.5, 0.5, 0.7, 0.5];
      const result = computeDivergence(stated, revealed);

      expect(result.perDimension.conversation).toBeCloseTo(0.5);
      expect(result.perDimension.emotional).toBeCloseTo(0);
      expect(result.perDimension.chemistry).toBeCloseTo(0.5);
    });

    it('should generate insights for high-divergence dimensions', () => {
      const stated: PreferenceVector = [0.9, 0.5, 0.5, 0.2, 0.5]; // says conversation matters
      const revealed: PreferenceVector = [0.4, 0.5, 0.5, 0.8, 0.5]; // actually chemistry matters
      const result = computeDivergence(stated, revealed);

      // should have insights about conversation (overstated) and chemistry (understated)
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.insights.some(i => i.toLowerCase().includes('conversation'))).toBe(true);
      expect(result.insights.some(i => i.toLowerCase().includes('chemistry'))).toBe(true);
    });

    it('should say "well aligned" when prefs match', () => {
      const stated: PreferenceVector = [0.6, 0.5, 0.5, 0.5, 0.5];
      const revealed: PreferenceVector = [0.65, 0.48, 0.52, 0.5, 0.5];
      const result = computeDivergence(stated, revealed);

      expect(result.insights.some(i => i.includes('well aligned'))).toBe(true);
    });
  });
});
