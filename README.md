# Post-Date Feedback Intelligence System

A prototype feedback pipeline for AI-powered dating apps. The core idea: take unstructured post-date feedback (stuff people naturally say like "the conversation was great but I just didn't feel a spark") and turn it into structured compatibility signals that actually improve future match quality.

Built as a technical showcase for Known, a voice AI dating app.

## Why this exists

Most dating apps treat matching as a one-shot problem. You fill out a profile, the algorithm does its thing, and you get matches. But the real signal is in what happens *after* the date. Did the conversation flow? Was there chemistry? Did you actually care about the things you said you cared about?

This system closes that loop. It processes post-date feedback through an LLM to extract compatibility dimensions, updates user preference vectors over time, and tracks the gap between what people say they want vs what they actually respond to (spoiler: these are usually pretty different).

## What it does

- Conversational feedback collection with voice input (Whisper transcription) and AI voice responses (OpenAI TTS)
- Natural language processing of casual date recaps via GPT-4o-mini with Structured Outputs, extracts structured scores + per-dimension quotes from the users own words
- Stated preference extraction from conversation (you talk about what you want, the LLM figures out your preference vector)
- Revealed preference learning from feedback patterns using exponential moving averages with adaptive learning rates
- Two-sided compatibility scoring (geometric mean rewards mutual compatibility)
- Stated vs revealed preference divergence detection with human-readable insights
- Full simulation engine that generates synthetic dating data and demonstrates match quality improving over rounds

## How the flow works

1. You describe what you want in dates (conversation or sliders). LLM extracts your stated preference vector.
2. You "go on" 2 dates with simulated people and talk about how each one went, just casually
3. GPT-4o-mini analyzes your words, extracts scores across 5 dimensions, pulls direct quotes as evidence
4. The system computes your revealed preferences from the pattern of what actually correlates with your satisfaction
5. You see the gap between what you said mattered and what your behavior actually shows

## The 5 compatibility dimensions

1. **Conversation quality** - how engaging and natural the conversation was
2. **Emotional connection** - feeling understood, vulnerability, emotional resonance
3. **Shared interests** - overlap in hobbies, lifestyle, common ground
4. **Physical chemistry** - attraction, flirting, that feeling
5. **Value alignment** - compatible life goals, worldview, priorities

Each user has three vectors (all 5 elements, 0-1 scale):
- **Stated preferences** - what they say they want (from onboarding)
- **Revealed preferences** - what actually correlates with their satisfaction (learned from feedback)
- **Quality profile** - how others experience them (updated when others rate them)

## Tech stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite via better-sqlite3 (zero config, single file)
- **AI/NLP**: OpenAI GPT-4o-mini (structured extraction + preference extraction), Whisper (speech-to-text), TTS (text-to-speech)
- **Validation**: Zod (shared between API validation and LLM output schemas)
- **Testing**: Vitest

## Setup

```bash
# install everything (npm workspaces)
npm install

# copy the env template and add your keys
cp server/.env.example server/.env

# start the server (with hot reload)
npm run server

# in another terminal, start the web app
npm run web
```

You'll need a `.env` file in `server/` with:
```
PORT=3000
OPENAI_API_KEY=your_key_here
```

The OpenAI key is needed for the LLM extraction pipeline, voice transcription (Whisper), and text-to-speech. Without it the conversational features wont work but the core algorithms (preference learning, compatibility, divergence) all run locally.

## Project structure

```
web/
  src/
    components/
      PreferencesScreen.tsx
      DateRatingFlow.tsx
      ChatConversation.tsx       # voice + text chat UI
      RevealScreen.tsx
      Dashboard.tsx
      VoiceOrb.tsx
    hooks/
      useSpeechRecognition.ts    # MediaRecorder + Whisper (cross-browser)
      useTTS.ts                  # TTS with prefetching
    data/questions.ts
    api.ts
    types.ts

server/
  src/
    db/
    routes/
      feedback.ts
      tts.ts                     # TTS + Whisper transcription
      extract.ts                 # preference extraction from chat
    services/
      llm.ts                     # GPT-4o-mini structured extraction
      preference-learning.ts     # EMA-based revealed preference updates
      compatibility.ts
      divergence.ts              # stated vs revealed gap detection
      simulation.ts
      vector-math.ts
    types.ts
    schemas.ts
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| GET/POST | /api/users | List/create users |
| GET | /api/users/:id | Get user by id |
| PUT | /api/users/:id/preferences | Update stated preferences |
| GET/POST | /api/dates | List/create dates |
| GET | /api/dates/user/:id | Get dates for a user |
| POST | /api/feedback | Submit feedback (scores or raw text for LLM extraction) |
| GET | /api/feedback/user/:id | Feedback given by user |
| GET | /api/feedback/about/:id | Feedback about a user (from others) |
| POST | /api/extract/preferences | Extract preference vector from chat transcript |
| POST | /api/tts | Text-to-speech (returns mp3 audio) |
| POST | /api/tts/transcribe | Speech-to-text via Whisper (accepts audio file) |
| GET | /api/compatibility/:a/:b | Two-sided compatibility score |
| GET | /api/insights/:id/preference-drift | Preference divergence over time |
| GET | /api/insights/:id/summary | Full user insights summary |
| POST | /api/simulation/seed | Reset and seed database |
| POST | /api/simulation/run | Run simulation rounds |

## Running tests

```bash
cd server && npm test
```

Tests cover vector math, preference learning (EMA convergence, adaptive learning rate), compatibility scoring (two-sided, geometric mean), and divergence detection.
