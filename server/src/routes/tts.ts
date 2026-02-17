import { Router } from 'express';
import OpenAI from 'openai';
import { config } from '../config';

const router = Router();

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return client;
}

// POST /api/tts
// Takes text, returns audio as mp3 binary
router.post('/', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }

    if (!config.openaiApiKey) {
      return res.status(503).json({ error: 'OpenAI API key not configured' });
    }

    const openai = getClient();

    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: text,
      response_format: 'mp3',
      speed: 1.15,
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'public, max-age=3600',
    });
    res.send(buffer);
  } catch (err: any) {
    console.error('TTS failed:', err);
    res.status(500).json({ error: 'TTS generation failed' });
  }
});

export default router;
