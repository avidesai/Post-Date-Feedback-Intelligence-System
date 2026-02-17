import type { PreferenceVector, Feedback, User } from '../types';
import { emaUpdate, clampVector, clamp } from './vector-math';
import * as models from '../db/models';
import { computeDivergence } from './divergence';

// adaptive learning rate
// starts high (0.3) so early feedback has big impact
// decays toward 0.05 as more feedback comes in
// the idea: early dates should shift your profile quickly, later dates refine it
function getLearningRate(feedbackCount: number): number {
  const initial = 0.3;
  const minimum = 0.05;
  const decayRate = 0.15;

  return minimum + (initial - minimum) * Math.exp(-decayRate * feedbackCount);
}

// extract the signal about what the user actually cares about from their feedback
// the key insight: we look at how each dimension score correlates with overall satisfaction
// if someone rates conversation 0.9 and overall 0.8, conversation matters to them
// if someone rates conversation 0.9 but overall 0.4, conversation alone isnt enough for them
function extractRevealedSignal(feedback: Feedback): PreferenceVector {
  const overall = feedback.overallRating;
  const scores: PreferenceVector = [
    feedback.conversationScore,
    feedback.emotionalScore,
    feedback.interestsScore,
    feedback.chemistryScore,
    feedback.valuesScore,
  ];

  // satisfaction-weighted signal extraction
  // when overall satisfaction is high and a dimension scored high, that dimension matters
  // when overall is low despite a dimension being high, that dimension matters less
  // we use the correlation between each dimension and overall as the signal
  return scores.map(score => {
    // if both high or both low, strong positive signal
    // if one high one low, weaker signal
    const agreement = 1 - Math.abs(score - overall);
    const importance = score * agreement;
    return clamp(importance, 0, 1);
  }) as PreferenceVector;
}

// extract quality signal - how others experience this user
// when someone rates you, those scores describe your quality as a date
function extractQualitySignal(feedback: Feedback): PreferenceVector {
  return [
    feedback.conversationScore,
    feedback.emotionalScore,
    feedback.interestsScore,
    feedback.chemistryScore,
    feedback.valuesScore,
  ];
}

// main entry point: called after every feedback submission
// updates both the reviewer's revealed preferences AND the reviewed person's quality profile
export function updatePreferencesFromFeedback(
  feedback: Feedback,
  fromUser: User,
  aboutUser: User
): void {
  // 1. update reviewer's revealed preferences
  const revealedSignal = extractRevealedSignal(feedback);
  const alpha = getLearningRate(fromUser.feedbackCount);
  const newRevealed = clampVector(emaUpdate(fromUser.revealedPreferences, revealedSignal, alpha));
  const newFromCount = fromUser.feedbackCount + 1;

  models.updateUserVectors(
    fromUser.id,
    newRevealed,
    fromUser.qualityProfile, // quality doesnt change for the reviewer
    newFromCount
  );

  // 2. update the rated person's quality profile (two-sided: how others experience them)
  const qualitySignal = extractQualitySignal(feedback);
  const qualityAlpha = getLearningRate(aboutUser.feedbackCount);
  const newQuality = clampVector(emaUpdate(aboutUser.qualityProfile, qualitySignal, qualityAlpha));

  // about user's feedback count for quality updates tracks how many times theyve been rated
  // we count reviews about them separately from reviews they give
  const aboutFeedbackCount = models.getFeedbackAboutUser(aboutUser.id).length;
  models.updateUserVectors(
    aboutUser.id,
    aboutUser.revealedPreferences, // revealed doesnt change for the person being rated
    newQuality,
    aboutUser.feedbackCount // keep their own feedback count the same
  );

  // 3. snapshot the preference history for the reviewer (the one whose prefs are evolving)
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
