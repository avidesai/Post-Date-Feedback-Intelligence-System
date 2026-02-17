import type { PreferenceVector } from '../types';

export function dot(a: PreferenceVector, b: PreferenceVector): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

export function magnitude(v: PreferenceVector): number {
  return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
}

export function cosineSimilarity(a: PreferenceVector, b: PreferenceVector): number {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dot(a, b) / (magA * magB);
}

export function cosineDistance(a: PreferenceVector, b: PreferenceVector): number {
  return 1 - cosineSimilarity(a, b);
}

export function emaUpdate(
  current: PreferenceVector,
  newSignal: PreferenceVector,
  alpha: number
): PreferenceVector {
  return current.map((val, i) => val * (1 - alpha) + newSignal[i] * alpha) as PreferenceVector;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function clampVector(v: PreferenceVector): PreferenceVector {
  return v.map(val => clamp(val, 0, 1)) as PreferenceVector;
}

export function absDifference(a: PreferenceVector, b: PreferenceVector): PreferenceVector {
  return a.map((val, i) => Math.abs(val - b[i])) as PreferenceVector;
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function blend(a: PreferenceVector, b: PreferenceVector, weight: number): PreferenceVector {
  const w = clamp(weight, 0, 1);
  return a.map((val, i) => val * (1 - w) + b[i] * w) as PreferenceVector;
}

export function geometricMean(a: number, b: number): number {
  if (a <= 0 || b <= 0) return 0;
  return Math.sqrt(a * b);
}

export function zeroVector(): PreferenceVector {
  return [0, 0, 0, 0, 0];
}

export function uniformVector(val: number): PreferenceVector {
  return [val, val, val, val, val];
}
