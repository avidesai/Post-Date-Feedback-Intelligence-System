import { Router } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { config } from '../config';
import { toFile } from 'openai';

const router = Router();

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return client;
}

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

// Takes audio file, returns text via Whisper
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'audio file is required' });
    }

    if (!config.openaiApiKey) {
      return res.status(503).json({ error: 'OpenAI API key not configured' });
    }

    const openai = getClient();

    const file = await toFile(req.file.buffer, 'audio.webm', { type: req.file.mimetype });

    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'en',
    });

    // Filter Whisper hallucinations on silent/near-silent audio
    const hallucinations = [
      'thank you for watching',
      'thanks for watching',
      'thank you for listening',
      'thanks for listening',
      'bye bye',
      'bye-bye',
      'goodbye',
      'thank you.',
      'thanks.',
      'you',
      'the end',
      'subscribe',
      'like and subscribe',
      'see you next time',
      'see you in the next',
    ];
    const lower = transcription.text.trim().toLowerCase().replace(/[.!?,]/g, '');
    const isHallucination = hallucinations.some(h => lower === h.replace(/[.!?,]/g, '') || lower.startsWith(h));

    res.json({ text: isHallucination ? '' : transcription.text });
  } catch (err: any) {
    console.error('Transcription failed:', err);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

export default router;
