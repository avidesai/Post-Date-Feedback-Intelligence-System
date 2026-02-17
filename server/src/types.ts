// core types for the feedback intelligence system
// all preference vectors are 5-element arrays [conversation, emotional, interests, chemistry, values]

export type PreferenceVector = [number, number, number, number, number];

export const DIMENSIONS = [
  'conversation',
  'emotional',
  'interests',
  'chemistry',
  'values',
] as const;

export type Dimension = typeof DIMENSIONS[number];

export interface User {
  id: string;
  name: string;
  age: number;
  gender: string;
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
  venueName: string | null;
  venuePlaceId: string | null;
  venueNoiseLevel: string | null;
  venuePriceLevel: number | null;
  venueAmbiance: string | null;
  dateAt: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  dateId: string;
  fromUserId: string;
  aboutUserId: string;
  overallRating: number;
  conversationScore: number;
  emotionalScore: number;
  interestsScore: number;
  chemistryScore: number;
  valuesScore: number;
  bestPart: string | null;
  worstPart: string | null;
  chemistryText: string | null;
  rawText: string | null;
  llmExtracted: boolean;
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
  computedAt: string;
}

export interface PreferenceSnapshot {
  id: string;
  userId: string;
  statedVector: PreferenceVector;
  revealedVector: PreferenceVector;
  qualityVector: PreferenceVector;
  divergenceScore: number;
  feedbackCount: number;
  recordedAt: string;
}

// what the LLM spits out after processing feedback text
export interface ExtractedFeedback {
  conversationScore: number;
  emotionalScore: number;
  interestsScore: number;
  chemistryScore: number;
  valuesScore: number;
  overallRating: number;
  bestPart: string;
  worstPart: string;
  chemistrySummary: string;
}

// venue info from google places
export interface VenueContext {
  name: string;
  placeId: string;
  noiseLevel: string;
  priceLevel: number;
  ambiance: string;
  rating: number;
  types: string[];
}

// api request/response shapes
export interface CreateUserInput {
  name: string;
  age: number;
  gender: string;
  bio: string;
  statedPreferences: PreferenceVector;
}

export interface CreateDateInput {
  userAId: string;
  userBId: string;
  venueName?: string;
  dateAt: string;
}

export interface SubmitFeedbackInput {
  dateId: string;
  fromUserId: string;
  aboutUserId: string;
  overallRating?: number;
  conversationScore?: number;
  emotionalScore?: number;
  interestsScore?: number;
  chemistryScore?: number;
  valuesScore?: number;
  bestPart?: string;
  worstPart?: string;
  chemistryText?: string;
  rawText?: string;
}

// simulation types
export interface SimulationConfig {
  userCount: number;
  iterationsPerRound: number;
  rounds: number;
}

export interface SimulationResult {
  round: number;
  averageCompatibility: number;
  averageDivergence: number;
  matchQualityImprovement: number;
  pairings: Array<{
    userAId: string;
    userBId: string;
    score: number;
  }>;
}
