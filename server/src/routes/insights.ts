import { Router } from 'express';
import { getPreferenceDrift } from '../services/divergence';
import * as models from '../db/models';

const router = Router();

router.get('/:userId/preference-drift', (req, res) => {
  const drift = getPreferenceDrift(req.params.userId);
  if (!drift) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(drift);
});

// high-level summary of what we know about this users dating patterns
router.get('/:userId/summary', (req, res) => {
  const user = models.getUser(req.params.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const drift = getPreferenceDrift(req.params.userId);
  const feedbackGiven = models.getFeedbackByUser(req.params.userId);
  const feedbackReceived = models.getFeedbackAboutUser(req.params.userId);
  const dates = models.getDatesForUser(req.params.userId);

  // compute average satisfaction from feedback given
  const avgSatisfaction = feedbackGiven.length > 0
    ? feedbackGiven.reduce((sum, f) => sum + f.overallRating, 0) / feedbackGiven.length
    : null;

  // compute average rating received
  const avgRatingReceived = feedbackReceived.length > 0
    ? feedbackReceived.reduce((sum, f) => sum + f.overallRating, 0) / feedbackReceived.length
    : null;

  res.json({
    user: {
      id: user.id,
      name: user.name,
      feedbackCount: user.feedbackCount,
      statedPreferences: user.statedPreferences,
      revealedPreferences: user.revealedPreferences,
      qualityProfile: user.qualityProfile,
    },
    stats: {
      totalDates: dates.length,
      feedbackGiven: feedbackGiven.length,
      feedbackReceived: feedbackReceived.length,
      avgSatisfaction,
      avgRatingReceived,
    },
    divergence: drift?.currentDivergence || null,
    insights: drift?.currentDivergence.insights || [],
  });
});

export default router;
