# Post-Date Feedback Intelligence System

A prototype feedback pipeline for AI-powered dating apps. The idea is pretty simple: take unstructured post-date feedback (the stuff people say after a date like "the conversation was great but I just didn't feel a spark") and turn it into structured compatibility signals that actually improve future match quality.

Built as a technical showcase for Known, a voice AI dating app.

## Why this exists

Most dating apps treat matching as a one-shot problem. You fill out a profile, the algorithm does its thing, and you get matches. But the real signal is in what happens *after* the date. Did the conversation flow? Was there chemistry? Did you actually care about the things you said you cared about?

This system closes that loop. It processes post-date feedback through an LLM to extract compatibility dimensions, updates user preference vectors over time, and tracks the gap between what people say they want vs what they actually respond to (spoiler: these are usually pretty different).

## What it does

- Collects post-date feedback through a conversational multi-step UI
- Extracts structured compatibility scores across 5 dimensions using GPT-4o-mini with Structured Outputs
- Learns revealed preferences from feedback patterns using exponential moving averages with adaptive learning rates
- Two-sided compatibility scoring (geometric mean rewards mutual compatibility)
- Detects stated vs revealed preference divergence with human-readable insights
- Enriches feedback with venue context from Google Places
- Full simulation engine that generates synthetic dating data and demonstrates match quality improving over rounds

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

- **Mobile**: React Native (Expo SDK 52) with Expo Router, expo-haptics
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite via better-sqlite3 (zero config, single file)
- **AI**: OpenAI gpt-4o-mini with Structured Outputs + Zod schemas
- **Venue data**: Google Places API (New)
- **Validation**: Zod
- **Testing**: Vitest (40 tests covering core algorithms)

## Setup

```bash
# install everything (npm workspaces handles both mobile/ and server/)
npm install

# copy the env template and add your keys
cp server/.env.example server/.env

# start the server (with hot reload)
npm run server

# in another terminal, start the mobile app
npm run mobile
```

You'll need a `.env` file in `server/` with:
```
PORT=3000
OPENAI_API_KEY=your_key_here          # optional - falls back to template text gen
GOOGLE_PLACES_API_KEY=your_key_here   # optional - skips venue enrichment without it
```

The system works fine without API keys. The LLM extraction falls back to default scores, and venue lookup is skipped. The core intelligence pipeline (preference learning, compatibility scoring, divergence detection) runs entirely locally.

## Running the simulation

1. Start the server (`npm run server`)
2. Open the mobile app and go to the Profile tab
3. Tap "Reset & Seed" to create 24 synthetic users with varied preference patterns
4. Choose number of rounds (3, 5, or 10) and tap "Run Simulation"
5. Switch to the Insights tab to see preference drift charts and AI-generated insights
6. Switch between users to see how each person's stated vs revealed preferences diverge

The simulation creates users with intentionally designed patterns:
- "says one thing, does another" (Alex claims conversation matters, actually cares about chemistry)
- "self-aware" (Sam and Maya's stated prefs roughly match their true prefs)
- "secretly picky" (Chris says no preference but actually needs values + emotional connection)
- "evolving" (Riley and Casey's preferences shift over dating experience)

## Project structure

```
mobile/                          # Expo React Native app
  app/(tabs)/                    # Tab screens (Dates, Feedback, Insights, Profile)
  components/                    # Shared components
    feedback/ConversationalFlow  # Multi-step feedback collection UI
    charts/                      # PreferenceDrift, Compatibility, Divergence charts
  hooks/useApi.ts                # Generic data fetching hook
  services/api.ts                # Typed API client
  types/api.ts                   # TypeScript types

server/                          # Express + TypeScript backend
  src/
    db/                          # SQLite schema, models, seed data
    routes/                      # REST API endpoints
    services/
      llm.ts                     # OpenAI structured extraction
      places.ts                  # Google Places venue lookup
      preference-learning.ts     # EMA-based revealed preference updates
      compatibility.ts           # Two-sided compatibility scoring
      divergence.ts              # Stated vs revealed detection + insights
      simulation.ts              # Synthetic data generation + sim engine
      vector-math.ts             # Cosine similarity, dot product, EMA, etc
    types.ts                     # Shared TypeScript types
    schemas.ts                   # Zod validation schemas

docs/                            # Architecture and algorithm docs
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| GET/POST | /api/users | List/create users |
| PUT | /api/users/:id/preferences | Update stated preferences |
| GET/POST | /api/dates | List/create dates |
| POST | /api/dates/:id/enrich | Enrich date with Google Places venue data |
| POST | /api/feedback | Submit feedback (structured scores or raw text for LLM extraction) |
| GET | /api/feedback/user/:id | Get feedback given by user |
| GET | /api/compatibility/:a/:b | Compute two-sided compatibility between users |
| GET | /api/compatibility/:a/:b/history | Compatibility score history |
| GET | /api/insights/:id/preference-drift | Preference divergence data over time |
| GET | /api/insights/:id/summary | Full user insights summary |
| POST | /api/simulation/seed | Reset and seed database |
| POST | /api/simulation/run | Run full simulation |
| GET | /api/simulation/status | Current data counts |

## Running tests

```bash
cd server && npm test
```

40 tests covering vector math, preference learning (EMA convergence, adaptive learning rate), compatibility scoring (two-sided, geometric mean), and divergence detection.
