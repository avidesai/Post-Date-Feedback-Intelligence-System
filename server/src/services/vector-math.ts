import type { PreferenceVector } from '../types';

// dot product of two vectors
export function dot(a: PreferenceVector, b: PreferenceVector): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

// magnitude of a vector
export function magnitude(v: PreferenceVector): number {
  return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
}

// cosine similarity between two vectors (1 = identical direction, 0 = orthogonal, -1 = opposite)
export function cosineSimilarity(a: PreferenceVector, b: PreferenceVector): number {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dot(a, b) / (magA * magB);
}

// cosine distance (0 = identical, 1 = orthogonal, 2 = opposite)
export function cosineDistance(a: PreferenceVector, b: PreferenceVector): number {
  return 1 - cosineSimilarity(a, b);
}

// exponential moving average update
// alpha is the learning rate (0-1, higher = more weight on new value)
export function emaUpdate(
  current: PreferenceVector,
  newSignal: PreferenceVector,
  alpha: number
): PreferenceVector {
  return current.map((val, i) => val * (1 - alpha) + newSignal[i] * alpha) as PreferenceVector;
}

// clamp a value to [min, max]
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// clamp each element of a vector to [0, 1]
export function clampVector(v: PreferenceVector): PreferenceVector {
  return v.map(val => clamp(val, 0, 1)) as PreferenceVector;
}

// element-wise absolute difference between two vectors
export function absDifference(a: PreferenceVector, b: PreferenceVector): PreferenceVector {
  return a.map((val, i) => Math.abs(val - b[i])) as PreferenceVector;
}

// sigmoid function - used for smooth transitions
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

// weighted blend of two vectors based on a weight (0 = all a, 1 = all b)
export function blend(a: PreferenceVector, b: PreferenceVector, weight: number): PreferenceVector {
  const w = clamp(weight, 0, 1);
  return a.map((val, i) => val * (1 - w) + b[i] * w) as PreferenceVector;
}

// geometric mean of two numbers (rewards mutual high values)
export function geometricMean(a: number, b: number): number {
  if (a <= 0 || b <= 0) return 0;
  return Math.sqrt(a * b);
}

// create a zero vector
export function zeroVector(): PreferenceVector {
  return [0, 0, 0, 0, 0];
}

// create a uniform vector (all same value)
export function uniformVector(val: number): PreferenceVector {
  return [val, val, val, val, val];
}
