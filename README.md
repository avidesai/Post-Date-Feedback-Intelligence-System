# Post-Date Feedback Intelligence System

A prototype feedback pipeline for AI-powered dating apps. The idea is pretty simple: take unstructured post-date feedback (the stuff people say after a date like "the conversation was great but I just didn't feel a spark") and turn it into structured compatibility signals that actually improve future match quality.

## Why this exists

Most dating apps treat matching as a one-shot problem. You fill out a profile, the algorithm does its thing, and you get matches. But the real signal is in what happens *after* the date. Did the conversation flow? Was there chemistry? Did you actually care about the things you said you cared about?

This system closes that loop. It processes post-date feedback through an LLM to extract compatibility dimensions, updates user preference vectors over time, and tracks the gap between what people say they want vs what they actually respond to (spoiler: these are usually pretty different).

## What it does

- Collects post-date feedback through a conversational UI (not just a 1-5 star rating)
- Extracts structured compatibility scores across 5 dimensions using GPT-4o-mini
- Learns revealed preferences from feedback patterns using exponential moving averages
- Two-sided compatibility scoring (both people's perspectives matter)
- Detects stated vs revealed preference divergence (you say you want X but your behavior says Y)
- Enriches feedback with venue context from Google Places (a loud restaurant might tank conversation scores regardless of the people)
- Includes a simulation engine so you can watch match quality improve over iterations without needing real users

## Tech stack

- **Mobile**: React Native (Expo) with Expo Router
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite (via better-sqlite3)
- **AI**: OpenAI gpt-4o-mini with Structured Outputs
- **Venue data**: Google Places API
- **Charts**: victory-native

## Setup

```bash
# install deps
npm install

# start the server
cd server && npm run dev

# start the mobile app
cd mobile && npx expo start
```

You'll need a `.env` file in `server/` with:
```
OPENAI_API_KEY=your_key_here
GOOGLE_PLACES_API_KEY=your_key_here
```

## Project structure

```
mobile/     - Expo React Native app
server/     - Node.js Express backend
docs/       - Architecture notes and algorithm docs
```

## Status

Work in progress. Building this out incrementally.
