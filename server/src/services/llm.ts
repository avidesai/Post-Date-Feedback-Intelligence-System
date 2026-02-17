import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { config } from '../config';
import { extractedFeedbackSchema } from '../schemas';
import type { ExtractedFeedback } from '../types';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return client;
}

const SYSTEM_PROMPT = `You are a dating feedback analyst. Given someone's post-date debrief (casual text about how a date went), extract structured compatibility scores.

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

Important: read between the lines. People often downplay or overstate things. Look for specific behavioral signals rather than just taking their words at face value. If someone says "it was fine" thats probably a 0.4-0.5, not a 0.7.

Here are some calibration examples:

Input: "Honestly it was amazing. We talked for like 4 hours and I didn't even notice. She's so funny and we're into all the same stuff. Only weird thing was she seemed kinda closed off when I asked about her family."
Expected: conversation=0.85, emotional=0.55, interests=0.8, chemistry=0.7, values=0.5, overall=0.72

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
