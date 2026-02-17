import { describe, it, expect } from 'vitest';
import {
  dot,
  magnitude,
  cosineSimilarity,
  cosineDistance,
  emaUpdate,
  clamp,
  clampVector,
  absDifference,
  sigmoid,
  blend,
  geometricMean,
} from '../vector-math';
import type { PreferenceVector } from '../../types';

describe('vector-math', () => {
  describe('dot product', () => {
    it('should compute dot product of two vectors', () => {
      const a: PreferenceVector = [1, 0, 0, 0, 0];
      const b: PreferenceVector = [0, 1, 0, 0, 0];
      expect(dot(a, b)).toBe(0); // orthogonal

      const c: PreferenceVector = [1, 1, 1, 1, 1];
      const d: PreferenceVector = [0.5, 0.5, 0.5, 0.5, 0.5];
      expect(dot(c, d)).toBe(2.5);
    });
  });

  describe('magnitude', () => {
    it('should compute vector magnitude', () => {
      const v: PreferenceVector = [1, 0, 0, 0, 0];
      expect(magnitude(v)).toBe(1);

      const v2: PreferenceVector = [0, 0, 0, 0, 0];
      expect(magnitude(v2)).toBe(0);
    });
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const a: PreferenceVector = [0.5, 0.3, 0.8, 0.2, 0.6];
      expect(cosineSimilarity(a, a)).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const a: PreferenceVector = [1, 0, 0, 0, 0];
      const b: PreferenceVector = [0, 1, 0, 0, 0];
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it('should handle zero vectors', () => {
      const a: PreferenceVector = [0, 0, 0, 0, 0];
      const b: PreferenceVector = [0.5, 0.3, 0.8, 0.2, 0.6];
      expect(cosineSimilarity(a, b)).toBe(0);
    });
  });

  describe('cosineDistance', () => {
    it('should return 0 for identical vectors', () => {
      const a: PreferenceVector = [0.5, 0.3, 0.8, 0.2, 0.6];
      expect(cosineDistance(a, a)).toBeCloseTo(0, 5);
    });

    it('should return 1 for orthogonal vectors', () => {
      const a: PreferenceVector = [1, 0, 0, 0, 0];
      const b: PreferenceVector = [0, 1, 0, 0, 0];
      expect(cosineDistance(a, b)).toBe(1);
    });
  });

  describe('emaUpdate', () => {
    it('with alpha=1 should completely replace the old value', () => {
      const old: PreferenceVector = [0, 0, 0, 0, 0];
      const newVal: PreferenceVector = [1, 1, 1, 1, 1];
      const result = emaUpdate(old, newVal, 1);
      expect(result).toEqual([1, 1, 1, 1, 1]);
    });

    it('with alpha=0 should keep the old value', () => {
      const old: PreferenceVector = [0.5, 0.5, 0.5, 0.5, 0.5];
      const newVal: PreferenceVector = [1, 1, 1, 1, 1];
      const result = emaUpdate(old, newVal, 0);
      expect(result).toEqual([0.5, 0.5, 0.5, 0.5, 0.5]);
    });

    it('with alpha=0.5 should average', () => {
      const old: PreferenceVector = [0, 0, 0, 0, 0];
      const newVal: PreferenceVector = [1, 1, 1, 1, 1];
      const result = emaUpdate(old, newVal, 0.5);
      expect(result).toEqual([0.5, 0.5, 0.5, 0.5, 0.5]);
    });

    it('should converge over many updates', () => {
      let vec: PreferenceVector = [0.5, 0.5, 0.5, 0.5, 0.5];
      const target: PreferenceVector = [0.8, 0.2, 0.9, 0.1, 0.5];

      // simulate 20 updates at alpha=0.2
      for (let i = 0; i < 20; i++) {
        vec = emaUpdate(vec, target, 0.2);
      }

      // should be very close to target after 20 updates
      for (let i = 0; i < 5; i++) {
        expect(vec[i]).toBeCloseTo(target[i], 1);
      }
    });
  });

  describe('clamp', () => {
    it('should clamp values within range', () => {
      expect(clamp(-0.5, 0, 1)).toBe(0);
      expect(clamp(1.5, 0, 1)).toBe(1);
      expect(clamp(0.5, 0, 1)).toBe(0.5);
    });
  });

  describe('clampVector', () => {
    it('should clamp each element to [0, 1]', () => {
      const v: PreferenceVector = [-0.1, 0.5, 1.2, 0, 1];
      expect(clampVector(v)).toEqual([0, 0.5, 1, 0, 1]);
    });
  });

  describe('absDifference', () => {
    it('should compute element-wise absolute difference', () => {
      const a: PreferenceVector = [0.8, 0.2, 0.5, 0.9, 0.1];
      const b: PreferenceVector = [0.3, 0.7, 0.5, 0.1, 0.6];
      const diff = absDifference(a, b);
      expect(diff[0]).toBeCloseTo(0.5);
      expect(diff[1]).toBeCloseTo(0.5);
      expect(diff[2]).toBeCloseTo(0);
      expect(diff[3]).toBeCloseTo(0.8);
      expect(diff[4]).toBeCloseTo(0.5);
    });
  });

  describe('sigmoid', () => {
    it('should return 0.5 at x=0', () => {
      expect(sigmoid(0)).toBe(0.5);
    });

    it('should approach 1 for large positive x', () => {
      expect(sigmoid(10)).toBeCloseTo(1, 3);
    });

    it('should approach 0 for large negative x', () => {
      expect(sigmoid(-10)).toBeCloseTo(0, 3);
    });
  });

  describe('blend', () => {
    it('with weight=0 should return first vector', () => {
      const a: PreferenceVector = [1, 1, 1, 1, 1];
      const b: PreferenceVector = [0, 0, 0, 0, 0];
      expect(blend(a, b, 0)).toEqual([1, 1, 1, 1, 1]);
    });

    it('with weight=1 should return second vector', () => {
      const a: PreferenceVector = [1, 1, 1, 1, 1];
      const b: PreferenceVector = [0, 0, 0, 0, 0];
      expect(blend(a, b, 1)).toEqual([0, 0, 0, 0, 0]);
    });
  });

  describe('geometricMean', () => {
    it('should compute geometric mean of two numbers', () => {
      expect(geometricMean(4, 9)).toBeCloseTo(6, 5);
      expect(geometricMean(1, 1)).toBe(1);
    });

    it('should return 0 when either input is 0', () => {
      expect(geometricMean(0, 5)).toBe(0);
      expect(geometricMean(5, 0)).toBe(0);
    });

    it('should reward mutual compatibility over one-sided', () => {
      // 0.6/0.6 should beat 0.9/0.3
      const balanced = geometricMean(0.6, 0.6);
      const lopsided = geometricMean(0.9, 0.3);
      expect(balanced).toBeGreaterThan(lopsided);
    });
  });
});
