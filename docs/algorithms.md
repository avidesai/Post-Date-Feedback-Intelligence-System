# Core Algorithms

## NLP Extraction

The most important piece. When someone casually talks about a date, GPT-4o-mini with Structured Outputs extracts:

- 5 dimension scores (0-1 each)
- Overall satisfaction (0-1)
- Best part / worst part
- Per-dimension snippets pulled from the users own words

The model is calibrated with examples so it reads between the lines. "it was fine" maps to roughly 0.4, not 0.7. "we talked for 4 hours and I didnt even notice" signals high conversation quality. The system prompt includes calibration examples with expected scores so extraction is consistent.

Same approach for stated preferences. User answers 6 questions about what they want, the LLM reads the transcript and outputs a 5-dimension preference vector weighted by how much emphasis they put on each thing.

Both use Zod schemas as the structured output format, so the LLM output is type-safe and validated.

## Preference Learning

The key insight: people are bad at knowing what they actually want in a partner. They'll say "I need someone who's intellectual" and then their feedback patterns show they consistently rate chemistry-heavy dates higher.

### Revealed preference signal extraction

When a user submits feedback, we extract what they actually care about:

```
For each dimension score S_i and overall satisfaction O:
  agreement = 1 - |S_i - O|
  importance_i = S_i * agreement
```

The idea: if someone rates conversation 0.9 and overall 0.8, theres high agreement. Conversation matters to them. But if someone rates conversation 0.9 and overall 0.3, the high conversation score didnt translate to satisfaction. That dimension matters less than they think.

### EMA update

```
revealed_new = revealed_old * (1 - alpha) + signal * alpha
```

Where alpha (learning rate) adapts based on feedback count:
```
alpha = 0.05 + (0.3 - 0.05) * exp(-0.15 * feedback_count)
```

- At 0 feedback: alpha = 0.30 (fast learning)
- At 5 feedback: alpha = 0.16 (moderate)
- At 15 feedback: alpha = 0.06 (fine-tuning)
- Asymptote: alpha = 0.05 (never fully stops learning)

### Quality profile (two-sided)

When user A rates user B, B's quality profile also updates:
```
quality_B_new = quality_B_old * (1 - alpha) + [A's scores for B] * alpha
```

This captures "how do others experience you" separately from "what do you want."

## Compatibility Scoring

### Effective preferences

Users start with only stated preferences. As they give feedback, revealed preferences become more reliable. The blend uses a sigmoid:

```
weight = sigmoid((feedback_count - 5) * 0.8)
effective_prefs = stated * (1 - weight) + revealed * weight
```

At ~10 feedback submissions, revealed preferences dominate (~85% weight).

### Directional score

"How well does B deliver on what A wants?"

```
score_A_to_B = sum(pref_A[i] * quality_B[i]) / sum(pref_A[i])
```

Dimensions A cares about more are weighted more. If A doesnt care about chemistry (low weight), B's chemistry score barely matters.

### Two-sided score

```
compatibility = sqrt(score_A_to_B * score_B_to_A)
```

Geometric mean. A 0.6/0.6 pair (balanced = 0.6) beats a 0.9/0.3 pair (lopsided = 0.52). This is the right incentive for a dating app.

## Divergence Detection

### Overall divergence

Cosine distance between stated and revealed preference vectors. 0 means perfectly aligned, values above 0.2 indicate meaningful self-awareness gaps.

### Per-dimension divergence

Simple absolute difference for each dimension. Thresholded at 0.2 to filter noise.

### Insight generation

When divergence exceeds threshold on a dimension, the system generates a human-readable insight:
- If stated > revealed: "You rate X as very important but your feedback suggests it matters less than you think"
- If revealed > stated: "You only rated X as moderately important, but it actually shows up as a strong driver of your satisfaction"

These insights are the most product-valuable output. Imagine a dating app telling you "hey, you keep saying you want deep conversations, but your happiest dates were the ones with the most chemistry." That kind of self-knowledge is genuinely useful.
