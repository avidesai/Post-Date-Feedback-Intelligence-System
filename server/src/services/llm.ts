import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { config } from '../config';
import { extractedFeedbackSchema, extractedPreferencesSchema, editorialInsightSchema } from '../schemas';
import type { ExtractedFeedback, PreferenceVector } from '../types';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return client;
}

const SYSTEM_PROMPT = `You are a dating feedback analyst. Given someone's post-date debrief (casual text about how a date went), extract structured compatibility scores and pull key snippets from their own words.

Score each dimension from 0.0 to 1.0 where:
- 0.0 = terrible/nonexistent
- 0.5 = average/neutral
- 1.0 = exceptional

The 5 dimensions:
1. Conversation quality - how engaging, natural, and enjoyable the conversation was
2. Emotional connection - feeling understood, vulnerability, emotional resonance
3. Shared interests - overlap in hobbies, lifestyle, things they both enjoy
4. Physical chemistry - attraction, flirting, physical comfort, spark
5. Value alignment - compatible life goals, worldview, priorities

Also extract overall satisfaction (0-1), best part, worst part, and a chemistry summary.

For dimensionSnippets: pull a short, natural snippet (1 sentence max) from the user's own words that best captures how they felt about each dimension. Use their actual phrasing when possible. If they didn't mention a dimension directly, paraphrase what their response implies about it. Keep snippets casual and conversational, matching the user's tone. Never use em dashes.

Important: read between the lines. People often downplay or overstate things. Look for specific behavioral signals rather than just taking their words at face value. If someone says "it was fine" thats probably a 0.4-0.5, not a 0.7.

Here are some calibration examples:

Input: "Honestly it was amazing. We talked for like 4 hours and I didn't even notice. She's so funny and we're into all the same stuff. Only weird thing was she seemed kinda closed off when I asked about her family."
Expected: conversation=0.85, emotional=0.55, interests=0.8, chemistry=0.7, values=0.5, overall=0.72
Snippets: conversation="We talked for like 4 hours and I didn't even notice", emotional="She seemed kinda closed off when I asked about her family", interests="We're into all the same stuff", chemistry=(inferred from overall positive tone), values="Seemed closed off when I asked about her family"

Input: "It was ok I guess. Nice enough person but the conversation kept dying. We don't really have much in common. But he was cute so there's that."
Expected: conversation=0.3, emotional=0.25, interests=0.2, chemistry=0.6, values=0.35, overall=0.35

Input: "I don't even know what to say. There was this crazy spark from the moment we sat down. We have completely different interests though lol she's super outdoorsy and I'm a homebody. But something just clicked emotionally."
Expected: conversation=0.65, emotional=0.8, interests=0.2, chemistry=0.9, values=0.5, overall=0.7`;

export async function extractFeedbackWithLLM(
  rawText: string,
  venueContext?: string
): Promise<ExtractedFeedback | null> {
  if (!config.openaiApiKey) {
    console.log('No OpenAI API key, skipping LLM extraction');
    return null;
  }

  const openai = getClient();

  let userMessage = rawText;
  if (venueContext) {
    userMessage = `[${venueContext}]\n\n${rawText}`;
  }

  const completion = await openai.beta.chat.completions.parse({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    response_format: zodResponseFormat(extractedFeedbackSchema, 'feedback_extraction'),
    temperature: 0.3,
  });

  const parsed = completion.choices[0]?.message?.parsed;
  return parsed || null;
}

const PREFERENCES_SYSTEM_PROMPT = `You are analyzing a conversation where someone describes what they look for in romantic dates. Extract how much each dimension matters to them as a weight between 0.0 and 1.0.

Scoring guide:
- 0.0-0.2 = they barely mentioned it or actively said it doesn't matter
- 0.3-0.4 = mentioned in passing, not a priority
- 0.5 = neutral/average importance
- 0.6-0.7 = clearly matters to them, mentioned with some emphasis
- 0.8-1.0 = a top priority, they were passionate or specific about it

The 5 dimensions:
1. conversation - how much they value good conversation, banter, being able to talk easily
2. emotional - how much they value emotional connection, feeling safe/understood, vulnerability
3. interests - how much they value having shared hobbies, activities, lifestyle overlap
4. chemistry - how much they value physical attraction, spark, flirting, sexual tension
5. values - how much they value alignment on big life stuff (career, family, religion, lifestyle)

Read between the lines. If someone spends a lot of time talking about one dimension, it matters to them even if they don't explicitly say "this is important." If they brush something off or give a vague answer, it probably doesn't matter much to them.`;

export async function extractPreferencesFromChat(
  transcript: { question: string; answer: string }[]
): Promise<PreferenceVector | null> {
  if (!config.openaiApiKey) {
    console.log('No OpenAI API key, skipping preference extraction');
    return null;
  }

  const openai = getClient();

  const formatted = transcript
    .map(t => `Q: ${t.question}\nA: ${t.answer}`)
    .join('\n\n');

  const completion = await openai.beta.chat.completions.parse({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: PREFERENCES_SYSTEM_PROMPT },
      { role: 'user', content: formatted },
    ],
    response_format: zodResponseFormat(extractedPreferencesSchema, 'preference_extraction'),
    temperature: 0.3,
  });

  const parsed = completion.choices[0]?.message?.parsed;
  if (!parsed) return null;

  return [parsed.conversation, parsed.emotional, parsed.interests, parsed.chemistry, parsed.values];
}

// used by the simulation engine to generate realistic date feedback text
export async function generateFeedbackText(
  scores: { conversation: number; emotional: number; interests: number; chemistry: number; values: number; overall: number },
  userAName: string,
  userBName: string
): Promise<string> {
  if (!config.openaiApiKey) {
    // fallback: generate a basic template if no API key
    return generateFallbackText(scores);
  }

  const openai = getClient();

  const prompt = `Generate a casual, realistic post-date debrief message from ${userAName} about their date with ${userBName}. Write it like a text to a friend - informal, maybe some slang, not too long (2-4 sentences).

The date scores were (0-1 scale):
- Conversation: ${scores.conversation.toFixed(2)}
- Emotional connection: ${scores.emotional.toFixed(2)}
- Shared interests: ${scores.interests.toFixed(2)}
- Chemistry: ${scores.chemistry.toFixed(2)}
- Value alignment: ${scores.values.toFixed(2)}
- Overall: ${scores.overall.toFixed(2)}

Make it sound natural. Don't mention numbers or scores. If scores are low, they might be diplomatic or blunt about it. If high, they might be excited or trying to play it cool.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: prompt },
    ],
    temperature: 0.9,
    max_tokens: 200,
  });

  return completion.choices[0]?.message?.content || generateFallbackText(scores);
}

function generateFallbackText(scores: { conversation: number; emotional: number; interests: number; chemistry: number; values: number; overall: number }): string {
  // no LLM available, just cobble together something from templates
  const parts: string[] = [];

  if (scores.overall > 0.7) {
    parts.push('It went really well honestly.');
  } else if (scores.overall > 0.4) {
    parts.push('It was decent, not bad.');
  } else {
    parts.push('Eh it was kind of a letdown.');
  }

  if (scores.conversation > 0.7) {
    parts.push('The conversation flowed super naturally.');
  } else if (scores.conversation < 0.4) {
    parts.push('Conversation was a bit of a struggle.');
  }

  if (scores.chemistry > 0.7) {
    parts.push('Definitely felt a spark.');
  } else if (scores.chemistry < 0.3) {
    parts.push('No real spark there though.');
  }

  if (scores.interests > 0.7) {
    parts.push('We have a ton in common which is cool.');
  }

  if (scores.emotional > 0.7) {
    parts.push('Felt like we really connected on a deeper level.');
  }

  return parts.join(' ');
}

const DIMENSION_NAMES = ['conversation', 'emotional', 'interests', 'chemistry', 'values'] as const;

const EDITORIAL_SYSTEM_PROMPT = `You are a warm, perceptive dating coach analyzing someone's "say-do gap" — the difference between what they say they want in a partner and what their actual date feedback reveals they respond to.

You'll be given:
- Dimensions where there's a meaningful gap between stated and revealed preferences
- The user's raw feedback texts from their dates

For each dimension provided, generate an insight that:
1. Has a short 2-3 word editorial heading (like "The spark", "Emotional depth", "Hidden priorities")
2. Contains a 2-3 sentence personalized quote explaining what this gap means for their dating life
3. Is warm, non-judgmental, and sounds like a wise friend — not clinical or preachy
4. References the user's actual words from their feedback when possible
5. Helps them understand something true about themselves they might not have noticed

If their stated preference is higher than revealed, they might think something matters more than it actually does in practice.
If their revealed preference is higher than stated, they might be undervaluing something that actually drives their satisfaction.

Never use em dashes. Keep it conversational and genuine.`;

export async function generateEditorialInsights(
  statedPreferences: number[],
  revealedPreferences: number[],
  feedbackTexts: string[]
): Promise<{ dimension: string; heading: string; quote: string }[] | null> {
  if (!config.openaiApiKey) {
    console.log('No OpenAI API key, skipping editorial insights generation');
    return null;
  }

  // find dimensions where |stated - revealed| > 0.12
  const gapDimensions: { name: string; stated: number; revealed: number; gap: number }[] = [];
  for (let i = 0; i < DIMENSION_NAMES.length; i++) {
    const gap = Math.abs(statedPreferences[i] - revealedPreferences[i]);
    if (gap > 0.12) {
      gapDimensions.push({
        name: DIMENSION_NAMES[i],
        stated: statedPreferences[i],
        revealed: revealedPreferences[i],
        gap,
      });
    }
  }

  if (gapDimensions.length === 0) {
    return [];
  }

  const openai = getClient();

  const dimensionDetails = gapDimensions.map(d => {
    const direction = d.stated > d.revealed
      ? `They say ${d.name} matters (${d.stated.toFixed(2)}) but their feedback suggests it matters less (${d.revealed.toFixed(2)})`
      : `They underrate ${d.name} (stated ${d.stated.toFixed(2)}) but their feedback shows it actually matters a lot to them (${d.revealed.toFixed(2)})`;
    return `- ${d.name}: ${direction} (gap: ${d.gap.toFixed(2)})`;
  }).join('\n');

  const feedbackSection = feedbackTexts.length > 0
    ? `\n\nHere are their actual post-date feedback texts:\n${feedbackTexts.map((t, i) => `${i + 1}. "${t}"`).join('\n')}`
    : '';

  const userMessage = `Analyze these say-do gaps and generate one insight per dimension:\n\n${dimensionDetails}${feedbackSection}`;

  const completion = await openai.beta.chat.completions.parse({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: EDITORIAL_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    response_format: zodResponseFormat(editorialInsightSchema, 'editorial_insights'),
    temperature: 0.7,
  });

  const parsed = completion.choices[0]?.message?.parsed;
  return parsed?.insights || null;
}
