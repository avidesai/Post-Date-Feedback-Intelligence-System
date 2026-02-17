export type PreferenceVector = [number, number, number, number, number];
export type Dimension = 'conversation' | 'emotional' | 'interests' | 'chemistry' | 'values';

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
  dateAt: string;
  createdAt: string;
  // joined fields from the dates route
  userAName?: string;
  userBName?: string;
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
  dimensionScores: Record<string, { aToB: number; bToA: number }>;
  computedAt: string;
}

export interface SimulationResult {
  round: number;
  averageCompatibility: number;
  averageDivergence: number;
  matchQualityImprovement: number;
  pairings: Array<{ userAId: string; userBId: string; score: number }>;
}

export interface DivergenceResult {
  overall: number;
  perDimension: Record<Dimension, number>;
  insights: string[];
}

export interface PreferenceDriftData {
  userId: string;
  currentDivergence: DivergenceResult;
  history: Array<{
    feedbackCount: number;
    divergenceScore: number;
    stated: PreferenceVector;
    revealed: PreferenceVector;
    recordedAt: string;
  }>;
}

export interface UserSummary {
  user: {
    id: string;
    name: string;
    feedbackCount: number;
    statedPreferences: PreferenceVector;
    revealedPreferences: PreferenceVector;
    qualityProfile: PreferenceVector;
  };
  stats: {
    totalDates: number;
    feedbackGiven: number;
    feedbackReceived: number;
    avgSatisfaction: number | null;
    avgRatingReceived: number | null;
  };
  divergence: DivergenceResult | null;
  insights: string[];
}
