import { Router } from 'express';
import { submitFeedbackSchema } from '../schemas';
import * as models from '../db/models';
import { extractFeedbackWithLLM } from '../services/llm';
import { updatePreferencesFromFeedback } from '../services/preference-learning';

const router = Router();

// GET /api/feedback/date/:dateId
router.get('/date/:dateId', (req, res) => {
  const feedback = models.getFeedbackForDate(req.params.dateId);
  res.json(feedback);
});

// GET /api/feedback/user/:userId
router.get('/user/:userId', (req, res) => {
  const feedback = models.getFeedbackByUser(req.params.userId);
  res.json(feedback);
});

// GET /api/feedback/about/:userId
router.get('/about/:userId', (req, res) => {
  const feedback = models.getFeedbackAboutUser(req.params.userId);
  res.json(feedback);
});

// POST /api/feedback
// accepts either structured scores OR raw text (or both)
// if raw text is provided and scores are missing, we use the LLM to extract them
router.post('/', async (req, res) => {
  try {
    const parsed = submitFeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      return;
    }

    const input = parsed.data;

    // check that the date and users exist
    const dateRecord = models.getDate(input.dateId);
    if (!dateRecord) {
      res.status(404).json({ error: 'Date not found' });
      return;
    }

    const fromUser = models.getUser(input.fromUserId);
    const aboutUser = models.getUser(input.aboutUserId);
    if (!fromUser || !aboutUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    let scores = {
      overallRating: input.overallRating ?? 0.5,
      conversationScore: input.conversationScore ?? 0.5,
      emotionalScore: input.emotionalScore ?? 0.5,
      interestsScore: input.interestsScore ?? 0.5,
      chemistryScore: input.chemistryScore ?? 0.5,
      valuesScore: input.valuesScore ?? 0.5,
    };

    let llmExtracted = false;
    let bestPart = input.bestPart || null;
    let worstPart = input.worstPart || null;
    let chemistryText = input.chemistryText || null;
    let dimensionSnippets: Record<string, string> | null = null;

    // if we got raw text and are missing structured scores, try LLM extraction
    const hasStructuredScores = input.overallRating !== undefined;
    if (input.rawText && !hasStructuredScores) {
      try {
        const venueContext = dateRecord.venueName
          ? `Venue: ${dateRecord.venueName}${dateRecord.venueAmbiance ? `, ${dateRecord.venueAmbiance}` : ''}`
          : undefined;

        const extracted = await extractFeedbackWithLLM(input.rawText, venueContext);
        if (extracted) {
          scores = {
            overallRating: extracted.overallRating,
            conversationScore: extracted.conversationScore,
            emotionalScore: extracted.emotionalScore,
            interestsScore: extracted.interestsScore,
            chemistryScore: extracted.chemistryScore,
            valuesScore: extracted.valuesScore,
          };
          bestPart = extracted.bestPart;
          worstPart = extracted.worstPart;
          chemistryText = extracted.chemistrySummary;
          dimensionSnippets = extracted.dimensionSnippets;
          llmExtracted = true;
        }
      } catch (err) {
        // LLM failed, thats fine - we'll use the defaults
        console.error('LLM extraction failed, using defaults:', err);
      }
    }

    const feedback = models.createFeedback({
      ...input,
      ...scores,
      bestPart: bestPart || undefined,
      worstPart: worstPart || undefined,
      chemistryText: chemistryText || undefined,
      dimensionSnippets,
      llmExtracted,
    });

    // update preference vectors based on this feedback
    updatePreferencesFromFeedback(feedback, fromUser, aboutUser);

    res.status(201).json({
      feedback,
      llmExtracted,
    });
  } catch (err) {
    console.error('Error submitting feedback:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
