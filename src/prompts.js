import { todayStr } from './store.js';

// The morning journal question. One per day, the same on every device; "Another one" steps to the next.
export const PROMPTS = [
  'What would make today a good day?',
  'What is the one thing that has to get done today?',
  'How did you sleep, and how is your body feeling?',
  'What are you looking forward to today?',
  'What is something you are grateful for this morning?',
  'What is on your mind right now that you want to get out of your head?',
  'What could trip you up today, and how will you handle it?',
  'What did yesterday teach you?',
  'How can you make Hannah\'s day a little easier today?',
  'What is one small thing you can do for future you today?',
  'What are you avoiding, and what is the first tiny step on it?',
  'What would you do today if you had no obligations?',
  'What is a win from this week, big or small?',
  'What creative idea has been floating around lately?',
  'What game, show or book is on your mind, and why?',
  'What does "enough" look like for today?',
  'Who would you like to reach out to soon?',
  'What is one habit you want to show up for today?',
  'How is your energy, and what do you need to protect it?',
  'What are you proud of lately?',
  'What would you tell yourself a year ago?',
  'What is something you want to remember about this season of life?',
  'What is stressing you out, and what part of it is in your control?',
  'What is one thing you can let go of today?',
  'What progress are you making on Game Dev or video projects?',
  'What made you laugh recently?',
  'What would a calm, focused version of today look like?',
  'What do you want to learn more about?',
  'What is one thing you and Hannah could plan together?',
  'If today goes perfectly, what happened by tonight?',
  'What are three words for how you feel right now?'
];

const dayNum = (day) => Math.floor(new Date(day + 'T12:00:00').getTime() / 864e5);
export const promptFor = (day = todayStr(), skip = 0) => PROMPTS[(dayNum(day) + skip) % PROMPTS.length];
