export const PREFERENCE_QUESTIONS = [
  "So, what matters most to you when you go on a date? What's the thing that makes or breaks it?",
  "How important is good conversation? Like, do you need someone you can go back and forth with for hours?",
  "What about emotional connection? Feeling genuinely understood, being able to be yourself. How much does that matter?",
  "How much do shared interests matter to you? Do you need to have hobbies and passions in common, or is it fine if you're into different things?",
  "Let's talk about chemistry. How important is that physical spark and attraction?",
  "Last one, values. How aligned do you need to be on the big life stuff? Things like ambition, family, how you want to live?",
];

export function getRecapQuestions(name: string) {
  return [
    `So, how was your date with ${name}? Give me the overall vibe.`,
    `How was the conversation? Did it flow or was it a struggle to keep things going?`,
    `Did you feel an emotional connection with ${name}? Like you could relax and be real with them?`,
    `Did you find you had things in common? Shared interests, hobbies, that kind of thing?`,
    `What about the chemistry? Was there a spark?`,
    `Did you get a sense of where ${name} stands on the bigger stuff? Values, ambition, how they want to live?`,
    `Anything else you want to add about this date?`,
  ];
}
