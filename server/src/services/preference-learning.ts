import type { PreferenceVector, Feedback, User } from '../types';
import { emaUpdate, clampVector, clamp } from './vector-math';
import * as models from '../db/models';
import { computeDivergence } from './divergence';

// starts high (0.3) so early feedback has big impact, decays toward 0.05
function getLearningRate(feedbackCount: number): number {
  const initial = 0.3;
  const minimum = 0.05;
  const decayRate = 0.15;

  return minimum + (initial - minimum) * Math.exp(-decayRate * feedbackCount);
}

// look at how each dimension score correlates with overall satisfaction
// high score + high overall = this dimension matters. high score + low overall = doesn't.
function extractRevealedSignal(feedback: Feedback): PreferenceVector {
  const overall = feedback.overallRating;
  const scores: PreferenceVector = [
    feedback.conversationScore,
    feedback.emotionalScore,
    feedback.interestsScore,
    feedback.chemistryScore,
    feedback.valuesScore,
  ];

  return scores.map(score => {
    const agreement = 1 - Math.abs(score - overall);
    const importance = score * agreement;
    return clamp(importance, 0, 1);
  }) as PreferenceVector;
}

function extractQualitySignal(feedback: Feedback): PreferenceVector {
  return [
    feedback.conversationScore,
    feedback.emotionalScore,
    feedback.interestsScore,
    feedback.chemistryScore,
    feedback.valuesScore,
  ];
}

// called after every feedback submission
export function updatePreferencesFromFeedback(
  feedback: Feedback,
  fromUser: User,
  aboutUser: User
): void {
  const revealedSignal = extractRevealedSignal(feedback);
  const alpha = getLearningRate(fromUser.feedbackCount);
  const newRevealed = clampVector(emaUpdate(fromUser.revealedPreferences, revealedSignal, alpha));
  const newFromCount = fromUser.feedbackCount + 1;

  models.updateUserVectors(
    fromUser.id,
    newRevealed,
    fromUser.qualityProfile,
    newFromCount
  );

  const qualitySignal = extractQualitySignal(feedback);
  const qualityAlpha = getLearningRate(aboutUser.feedbackCount);
  const newQuality = clampVector(emaUpdate(aboutUser.qualityProfile, qualitySignal, qualityAlpha));

  const aboutFeedbackCount = models.getFeedbackAboutUser(aboutUser.id).length;
  models.updateUserVectors(
    aboutUser.id,
    aboutUser.revealedPreferences,
    newQuality,
    aboutUser.feedbackCount
  );

  const updatedFromUser = models.getUser(fromUser.id)!;
  const divergence = computeDivergence(updatedFromUser.statedPreferences, newRevealed);
  models.recordPreferenceSnapshot(
    fromUser.id,
    updatedFromUser.statedPreferences,
    newRevealed,
    updatedFromUser.qualityProfile,
    divergence.overall,
    newFromCount
  );
}

export { getLearningRate, extractRevealedSignal, extractQualitySignal };
