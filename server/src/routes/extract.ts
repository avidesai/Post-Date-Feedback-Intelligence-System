import { Router } from 'express';
import { extractPreferencesRequestSchema } from '../schemas';
import { extractPreferencesFromChat } from '../services/llm';

const router = Router();

// Takes a chat transcript and extracts a preference vector using LLM
router.post('/preferences', async (req, res) => {
  try {
    const parsed = extractPreferencesRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const preferences = await extractPreferencesFromChat(parsed.data.transcript);

    if (!preferences) {
      return res.status(503).json({ error: 'LLM extraction unavailable. Is the OpenAI API key configured?' });
    }

    res.json({ preferences });
  } catch (err: any) {
    console.error('Preference extraction failed:', err);
    res.status(500).json({ error: 'Extraction failed' });
  }
});

export default router;
