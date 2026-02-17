# Architecture Overview

## System diagram

```
React + Vite (web)               Express + TypeScript              External APIs
+-----------------+              +------------------+              +----------+
| PreferencesScreen|  REST API   | /api/users       |              |          |
| DateRatingFlow  | <---------> | /api/feedback    |              | OpenAI   |
| ChatConversation|             | /api/tts         | <---------> | GPT-4o-  |
| RevealScreen    |             | /api/extract     |              | mini     |
| Dashboard       |             | /api/insights    |              | Whisper  |
+-----------------+             | /api/simulation  |              | TTS      |
                                +--------+---------+              +----------+
                                         |
                                +--------v---------+
                                |  SQLite (better-  |
                                |  sqlite3)         |
                                |  - users          |
                                |  - dates          |
                                |  - feedback       |
                                |  - compat_scores  |
                                |  - pref_history   |
                                +------------------+
```

## Data flow

1. User describes what they want in a date (conversation or sliders)
2. If conversational, GPT-4o-mini extracts a 5-dimension stated preference vector from the transcript
3. User talks about how each date went through the chat UI (text or voice via Whisper)
4. GPT-4o-mini extracts structured scores across all 5 dimensions + overall rating + per-dimension quotes from their own words
5. The feedback triggers preference learning:
   - Reviewer's revealed preference vector updates via EMA
   - Reviewed person's quality profile vector updates via EMA
6. Preference snapshot is recorded for historical tracking
7. Divergence detection compares stated vs revealed and generates insights
8. Results screen shows the gap, with direct quotes as evidence

## Voice pipeline

The voice input uses a chunked transcription approach that works across all browsers:

1. MediaRecorder captures audio with 500ms timeslice
2. Every 2.5s, all accumulated audio chunks are sent to the server
3. Server forwards to OpenAI Whisper, returns transcribed text
4. Text appears live in the input as the user speaks
5. Silence detection (Web Audio API analyser) auto-stops after 3s of no sound
6. On stop, final transcription is auto-submitted

The AI voice side uses OpenAI TTS with prefetching. While the typing animation plays for the next question, the audio is already being fetched in the background so playback starts immediately when text appears.

Whisper has a known issue with hallucinating on silent audio ("thank you for watching", "bye bye", etc). Theres a server-side blocklist that catches these and returns empty text instead.

## Key design decisions

**Web over mobile**: Originally built as React Native (Expo) but moved to web for easier demo access. No app install needed, just open a URL.

**SQLite over Postgres**: Zero config, single file database, perfect for a prototype. No Docker, no connection strings. The data model is simple enough that we dont need joins beyond what SQLite handles easily.

**Conversational feedback over forms**: People are way more natural talking about a date than filling out 6 sliders. The LLM extraction picks up on subtlety that numeric inputs miss entirely. "it was fine I guess" tells you more than a 5/10 slider.

**MediaRecorder + Whisper over Web Speech API**: The browser Speech Recognition API only works in Chrome. MediaRecorder works everywhere. Slightly more latency since audio goes to the server, but universally compatible.

**EMA over simple averaging**: Exponential moving average with adaptive learning rate means recent dates matter more than old ones. The adaptive rate (starts at 0.3, decays to 0.05) means early feedback shifts preferences quickly while later feedback fine-tunes them.

**Geometric mean for compatibility**: Using geometric mean instead of arithmetic mean for the two-sided score means a 0.6/0.6 mutual match scores higher than a 0.9/0.3 one-sided match. This is the right behavior for dating.

**Zod for both validation and LLM outputs**: Same schema definitions validate API inputs and define the structured output format for GPT-4o-mini. Less duplication, more type safety.

## Simulation

The simulation engine demos the system without needing real users. Each synthetic user has:
- Stated preferences (what they tell the system)
- "True" preferences (hidden, only used by simulation to generate realistic feedback)

The gap between stated and true creates the interesting behavior. After enough simulated dates, revealed preferences converge toward the true ones, and divergence detection flags where the user's self-perception was off.
