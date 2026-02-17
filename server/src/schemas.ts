import { z } from 'zod';

// preference vector: 5 numbers between 0 and 1
const preferenceVector = z.tuple([
  z.number().min(0).max(1),
  z.number().min(0).max(1),
  z.number().min(0).max(1),
  z.number().min(0).max(1),
  z.number().min(0).max(1),
]);

export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  age: z.number().int().min(18).max(100),
  gender: z.string().min(1).max(50),
  bio: z.string().max(500).default(''),
  statedPreferences: preferenceVector,
});

export const createDateSchema = z.object({
  userAId: z.string().uuid(),
  userBId: z.string().uuid(),
  venueName: z.string().optional(),
  dateAt: z.string(),
});

export const submitFeedbackSchema = z.object({
  dateId: z.string().uuid(),
  fromUserId: z.string().uuid(),
  aboutUserId: z.string().uuid(),
  overallRating: z.number().min(0).max(1).optional(),
  conversationScore: z.number().min(0).max(1).optional(),
  emotionalScore: z.number().min(0).max(1).optional(),
  interestsScore: z.number().min(0).max(1).optional(),
  chemistryScore: z.number().min(0).max(1).optional(),
  valuesScore: z.number().min(0).max(1).optional(),
  bestPart: z.string().optional(),
  worstPart: z.string().optional(),
  chemistryText: z.string().optional(),
  rawText: z.string().optional(),
});

// what the LLM should return - used as structured output schema
export const extractedFeedbackSchema = z.object({
  conversationScore: z.number().min(0).max(1).describe('How good the conversation was, 0-1'),
  emotionalScore: z.number().min(0).max(1).describe('Emotional connection strength, 0-1'),
  interestsScore: z.number().min(0).max(1).describe('How much shared interests came through, 0-1'),
  chemistryScore: z.number().min(0).max(1).describe('Physical/romantic chemistry, 0-1'),
  valuesScore: z.number().min(0).max(1).describe('Value alignment signals, 0-1'),
  overallRating: z.number().min(0).max(1).describe('Overall date satisfaction, 0-1'),
  bestPart: z.string().describe('Best part of the date in one sentence'),
  worstPart: z.string().describe('Worst or weakest part of the date in one sentence'),
  chemistrySummary: z.string().describe('Brief summary of the romantic chemistry'),
  dimensionSnippets: z.object({
    conversation: z.string().describe('Short quote or paraphrase from the user about how the conversation went'),
    emotional: z.string().describe('Short quote or paraphrase from the user about emotional connection'),
    interests: z.string().describe('Short quote or paraphrase from the user about shared interests'),
    chemistry: z.string().describe('Short quote or paraphrase from the user about chemistry/attraction'),
    values: z.string().describe('Short quote or paraphrase from the user about values/lifestyle alignment'),
  }).describe('Per-dimension snippets pulled from the user\'s own words'),
});

// what the LLM should return for preference extraction from chat
export const extractedPreferencesSchema = z.object({
  conversation: z.number().min(0).max(1).describe('How much this person values good conversation quality (0 = indifferent, 1 = most important)'),
  emotional: z.number().min(0).max(1).describe('How much this person values emotional connection and feeling understood'),
  interests: z.number().min(0).max(1).describe('How much this person values shared interests and hobbies'),
  chemistry: z.number().min(0).max(1).describe('How much this person values physical chemistry and attraction'),
  values: z.number().min(0).max(1).describe('How much this person values alignment on life values, goals, and lifestyle'),
});

export const extractPreferencesRequestSchema = z.object({
  transcript: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).min(1),
});

export const simulationConfigSchema = z.object({
  userCount: z.number().int().min(4).max(100).default(20),
  iterationsPerRound: z.number().int().min(1).max(50).default(10),
  rounds: z.number().int().min(1).max(20).default(5),
});
