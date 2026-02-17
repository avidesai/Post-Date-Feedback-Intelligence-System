import { v4 as uuid } from 'uuid';
import { getDb } from './index';
import type {
  User,
  DateRecord,
  Feedback,
  CompatibilityScore,
  PreferenceSnapshot,
  PreferenceVector,
  CreateUserInput,
  CreateDateInput,
  SubmitFeedbackInput,
  Dimension,
} from '../types';

function rowToUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    gender: row.gender,
    bio: row.bio,
    statedPreferences: [
      row.stated_conversation,
      row.stated_emotional,
      row.stated_interests,
      row.stated_chemistry,
      row.stated_values,
    ],
    revealedPreferences: [
      row.revealed_conversation,
      row.revealed_emotional,
      row.revealed_interests,
      row.revealed_chemistry,
      row.revealed_values,
    ],
    qualityProfile: [
      row.quality_conversation,
      row.quality_emotional,
      row.quality_interests,
      row.quality_chemistry,
      row.quality_values,
    ],
    feedbackCount: row.feedback_count,
    createdAt: row.created_at,
  };
}

function rowToDate(row: any): DateRecord {
  return {
    id: row.id,
    userAId: row.user_a_id,
    userBId: row.user_b_id,
    venueName: row.venue_name,
    venuePlaceId: row.venue_place_id,
    venueNoiseLevel: row.venue_noise_level,
    venuePriceLevel: row.venue_price_level,
    venueAmbiance: row.venue_ambiance,
    dateAt: row.date_at,
    createdAt: row.created_at,
  };
}

function rowToFeedback(row: any): Feedback {
  return {
    id: row.id,
    dateId: row.date_id,
    fromUserId: row.from_user_id,
    aboutUserId: row.about_user_id,
    overallRating: row.overall_rating,
    conversationScore: row.conversation_score,
    emotionalScore: row.emotional_score,
    interestsScore: row.interests_score,
    chemistryScore: row.chemistry_score,
    valuesScore: row.values_score,
    bestPart: row.best_part,
    worstPart: row.worst_part,
    chemistryText: row.chemistry_text,
    dimensionSnippets: row.dimension_snippets ? JSON.parse(row.dimension_snippets) : null,
    rawText: row.raw_text,
    llmExtracted: !!row.llm_extracted,
    createdAt: row.created_at,
  };
}

function rowToCompatibilityScore(row: any): CompatibilityScore {
  return {
    id: row.id,
    userAId: row.user_a_id,
    userBId: row.user_b_id,
    score: row.score,
    aToBScore: row.a_to_b_score,
    bToAScore: row.b_to_a_score,
    dimensionScores: JSON.parse(row.dimension_scores),
    computedAt: row.computed_at,
  };
}

function rowToPreferenceSnapshot(row: any): PreferenceSnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    statedVector: JSON.parse(row.stated_vector),
    revealedVector: JSON.parse(row.revealed_vector),
    qualityVector: JSON.parse(row.quality_vector),
    divergenceScore: row.divergence_score,
    feedbackCount: row.feedback_count,
    recordedAt: row.recorded_at,
  };
}


export function createUser(input: CreateUserInput): User {
  const db = getDb();
  const id = uuid();
  const [conv, emo, int, chem, val] = input.statedPreferences;

  db.prepare(`
    INSERT INTO users (id, name, age, gender, bio,
      stated_conversation, stated_emotional, stated_interests, stated_chemistry, stated_values,
      revealed_conversation, revealed_emotional, revealed_interests, revealed_chemistry, revealed_values,
      quality_conversation, quality_emotional, quality_interests, quality_chemistry, quality_values)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.5, 0.5, 0.5, 0.5, 0.5)
  `).run(id, input.name, input.age, input.gender, input.bio,
    conv, emo, int, chem, val,
    conv, emo, int, chem, val); // revealed starts same as stated

  return getUser(id)!;
}

export function getUser(id: string): User | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return row ? rowToUser(row) : null;
}

export function getAllUsers(): User[] {
  const db = getDb();
  return db.prepare('SELECT * FROM users ORDER BY created_at DESC').all().map(rowToUser);
}

export function updateUserVectors(
  id: string,
  revealed: PreferenceVector,
  quality: PreferenceVector,
  feedbackCount: number
): void {
  const db = getDb();
  db.prepare(`
    UPDATE users SET
      revealed_conversation = ?, revealed_emotional = ?, revealed_interests = ?,
      revealed_chemistry = ?, revealed_values = ?,
      quality_conversation = ?, quality_emotional = ?, quality_interests = ?,
      quality_chemistry = ?, quality_values = ?,
      feedback_count = ?
    WHERE id = ?
  `).run(
    ...revealed, ...quality, feedbackCount, id
  );
}

export function updateUserStatedPreferences(id: string, stated: PreferenceVector): void {
  const db = getDb();
  db.prepare(`
    UPDATE users SET
      stated_conversation = ?, stated_emotional = ?, stated_interests = ?,
      stated_chemistry = ?, stated_values = ?
    WHERE id = ?
  `).run(...stated, id);
}

export function deleteAllUsers(): void {
  const db = getDb();
  db.prepare('DELETE FROM preference_history').run();
  db.prepare('DELETE FROM compatibility_scores').run();
  db.prepare('DELETE FROM feedback').run();
  db.prepare('DELETE FROM dates').run();
  db.prepare('DELETE FROM users').run();
}


export function createDate(input: CreateDateInput): DateRecord {
  const db = getDb();
  const id = uuid();

  db.prepare(`
    INSERT INTO dates (id, user_a_id, user_b_id, venue_name, date_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, input.userAId, input.userBId, input.venueName || null, input.dateAt);

  return getDate(id)!;
}

export function getDate(id: string): DateRecord | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM dates WHERE id = ?').get(id);
  return row ? rowToDate(row) : null;
}

export function getDatesForUser(userId: string): DateRecord[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM dates WHERE user_a_id = ? OR user_b_id = ? ORDER BY date_at DESC'
  ).all(userId, userId).map(rowToDate);
}

export function getAllDates(): DateRecord[] {
  const db = getDb();
  return db.prepare('SELECT * FROM dates ORDER BY date_at DESC').all().map(rowToDate);
}

export function updateDateVenue(
  id: string,
  placeId: string,
  noiseLevel: string,
  priceLevel: number,
  ambiance: string
): void {
  const db = getDb();
  db.prepare(`
    UPDATE dates SET venue_place_id = ?, venue_noise_level = ?,
      venue_price_level = ?, venue_ambiance = ?
    WHERE id = ?
  `).run(placeId, noiseLevel, priceLevel, ambiance, id);
}


export function createFeedback(input: SubmitFeedbackInput & {
  overallRating: number;
  conversationScore: number;
  emotionalScore: number;
  interestsScore: number;
  chemistryScore: number;
  valuesScore: number;
  llmExtracted?: boolean;
  dimensionSnippets?: Record<string, string> | null;
}): Feedback {
  const db = getDb();
  const id = uuid();

  db.prepare(`
    INSERT INTO feedback (id, date_id, from_user_id, about_user_id,
      overall_rating, conversation_score, emotional_score, interests_score,
      chemistry_score, values_score, best_part, worst_part, chemistry_text,
      dimension_snippets, raw_text, llm_extracted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, input.dateId, input.fromUserId, input.aboutUserId,
    input.overallRating, input.conversationScore, input.emotionalScore,
    input.interestsScore, input.chemistryScore, input.valuesScore,
    input.bestPart || null, input.worstPart || null, input.chemistryText || null,
    input.dimensionSnippets ? JSON.stringify(input.dimensionSnippets) : null,
    input.rawText || null, input.llmExtracted ? 1 : 0
  );

  return getFeedback(id)!;
}

export function getFeedback(id: string): Feedback | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM feedback WHERE id = ?').get(id);
  return row ? rowToFeedback(row) : null;
}

export function getFeedbackForDate(dateId: string): Feedback[] {
  const db = getDb();
  return db.prepare('SELECT * FROM feedback WHERE date_id = ?').all(dateId).map(rowToFeedback);
}

export function getFeedbackByUser(userId: string): Feedback[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM feedback WHERE from_user_id = ? ORDER BY created_at DESC'
  ).all(userId).map(rowToFeedback);
}

export function getFeedbackAboutUser(userId: string): Feedback[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM feedback WHERE about_user_id = ? ORDER BY created_at DESC'
  ).all(userId).map(rowToFeedback);
}


export function recordCompatibilityScore(
  userAId: string,
  userBId: string,
  score: number,
  aToBScore: number,
  bToAScore: number,
  dimensionScores: Record<Dimension, { aToB: number; bToA: number }>
): CompatibilityScore {
  const db = getDb();
  const id = uuid();

  db.prepare(`
    INSERT INTO compatibility_scores (id, user_a_id, user_b_id, score,
      a_to_b_score, b_to_a_score, dimension_scores)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userAId, userBId, score, aToBScore, bToAScore, JSON.stringify(dimensionScores));

  return getCompatibilityScore(id)!;
}

export function getCompatibilityScore(id: string): CompatibilityScore | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM compatibility_scores WHERE id = ?').get(id);
  return row ? rowToCompatibilityScore(row) : null;
}

export function getCompatibilityHistory(userAId: string, userBId: string): CompatibilityScore[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM compatibility_scores
    WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)
    ORDER BY computed_at ASC
  `).all(userAId, userBId, userBId, userAId).map(rowToCompatibilityScore);
}

export function getLatestCompatibility(userAId: string, userBId: string): CompatibilityScore | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM compatibility_scores
    WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)
    ORDER BY computed_at DESC LIMIT 1
  `).get(userAId, userBId, userBId, userAId);
  return row ? rowToCompatibilityScore(row) : null;
}


export function recordPreferenceSnapshot(
  userId: string,
  stated: PreferenceVector,
  revealed: PreferenceVector,
  quality: PreferenceVector,
  divergenceScore: number,
  feedbackCount: number
): PreferenceSnapshot {
  const db = getDb();
  const id = uuid();

  db.prepare(`
    INSERT INTO preference_history (id, user_id, stated_vector, revealed_vector,
      quality_vector, divergence_score, feedback_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, JSON.stringify(stated), JSON.stringify(revealed),
    JSON.stringify(quality), divergenceScore, feedbackCount);

  return getPreferenceSnapshot(id)!;
}

export function getPreferenceSnapshot(id: string): PreferenceSnapshot | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM preference_history WHERE id = ?').get(id);
  return row ? rowToPreferenceSnapshot(row) : null;
}

export function getPreferenceHistory(userId: string): PreferenceSnapshot[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM preference_history WHERE user_id = ? ORDER BY recorded_at ASC'
  ).all(userId).map(rowToPreferenceSnapshot);
}
