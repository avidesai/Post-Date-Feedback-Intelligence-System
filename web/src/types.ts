export type Dimension = 'conversation' | 'emotional' | 'interests' | 'chemistry' | 'values';
export type PreferenceVector = [number, number, number, number, number];

export const DIMENSIONS: Dimension[] = ['conversation', 'emotional', 'interests', 'chemistry', 'values'];
export const DIMENSION_LABELS: Record<Dimension, string> = {
  conversation: 'Conversation',
  emotional: 'Emotional',
  interests: 'Interests',
  chemistry: 'Chemistry',
  values: 'Values',
};

export interface User {
  id: string;
  name: string;
  age: number;
  bio: string;
  statedPreferences: PreferenceVector;
  revealedPreferences: PreferenceVector;
  qualityProfile: PreferenceVector;
  feedbackCount: number;
  createdAt: string;
}

export interface DateRecord {
  id: string;
  userAId: string;
  userBId: string;
  userAName?: string;
  userBName?: string;
  venue: string;
  dateTimestamp: string;
  notes: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  dateId: string;
  reviewerId: string;
  reviewedId: string;
  overallRating: number;
  conversationScore: number;
  emotionalScore: number;
  interestsScore: number;
  chemistryScore: number;
  valuesScore: number;
  textFeedback: string;
  extractedInsights: string;
  createdAt: string;
}

export interface CompatibilityScore {
  id: string;
  userAId: string;
  userBId: string;
  score: number;
  aToBScore: number;
  bToAScore: number;
  dimensionScores: Record<Dimension, { aToB: number; bToA: number }>;
  blendWeight: number;
  computedAt: string;
}

export interface PreferenceSnapshot {
  id: string;
  userId: string;
  stated: PreferenceVector;
  revealed: PreferenceVector;
  divergenceScore: number;
  feedbackCount: number;
  recordedAt: string;
}

export interface DivergenceResult {
  overall: number;
  perDimension: Record<Dimension, number>;
  insights: string[];
  stated: PreferenceVector;
  revealed: PreferenceVector;
}

export interface SimulationResult {
  round: number;
  pairings: number;
  avgCompatibility: number;
  avgDivergence: number;
}
