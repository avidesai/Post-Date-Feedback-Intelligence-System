# Architecture Overview

## System diagram

```
React Native (Expo)              Express + TypeScript              External APIs
+-----------------+              +------------------+              +----------+
| Dates screen    |   REST API   | /api/users       |              |          |
| Feedback flow   | <---------> | /api/dates       |              | OpenAI   |
| Insights/charts |              | /api/feedback    | <---------> | gpt-4o-  |
| Profile/sim     |              | /api/compatibility|             | mini     |
+-----------------+              | /api/insights    |              |          |
                                 | /api/simulation  |              | Google   |
                                 +--------+---------+              | Places   |
                                          |                        +----------+
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

1. User goes on a date
2. They submit feedback through the conversational UI (structured ratings + optional free text)
3. If free text is provided without structured scores, GPT-4o-mini extracts scores using Structured Outputs
4. The feedback triggers preference learning:
   - Reviewer's revealed preference vector updates via EMA
   - Reviewed person's quality profile vector updates via EMA
5. Preference snapshot is recorded for historical tracking
6. Compatibility can be computed between any two users at any time
7. Divergence detection compares stated vs revealed and generates insights

## Key design decisions

**SQLite over Postgres**: zero config, single file database, perfect for a prototype. No Docker, no connection strings, just works. The data model is simple enough that we dont need joins beyond what SQLite handles easily.

**Vectors as individual columns**: We store each dimension as its own column instead of JSON arrays. Makes querying easier and avoids json parsing overhead. The trade-off is more columns but for 5 dimensions its totally fine.

**EMA over simple averaging**: Exponential moving average with adaptive learning rate means recent dates matter more than old ones. The adaptive rate (starts at 0.3, decays to 0.05) means early feedback shifts preferences quickly while later feedback fine-tunes them.

**Geometric mean for compatibility**: Using geometric mean instead of arithmetic mean for the two-sided score means a 0.6/0.6 mutual match scores higher than a 0.9/0.3 one-sided match. This is the right behavior for dating.

**Zod for both validation and LLM outputs**: Same schema definitions validate API inputs and define the structured output format for GPT-4o-mini. Less duplication, more type safety.

## Simulation approach

The simulation engine is designed to demonstrate the system working without needing real users. Each synthetic user has:
- Stated preferences (what they tell the system they want)
- "True" preferences (hidden, only used by the simulation to generate realistic feedback)

The gap between stated and true preferences creates the interesting behavior. After enough simulated dates, the system's revealed preferences should converge toward the true preferences, and the divergence detection should flag the gap.
