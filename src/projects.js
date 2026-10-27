import { newId, save } from './db.js';
import { useItems } from './store.js';

// Project templates for Video Projects and Client Work. Each section's templates are one shared item
// ('ptemplates-video' / 'ptemplates-client'), edited in Settings. Until edited, the defaults below are used.
// A template: { id, name, desc, outline, steps: [{ name, items: [text] }] }.
export const VIDEO_STAGES = ['Idea', 'Script', 'Record', 'Edit', 'Publish'];
// Client steps are the pipeline columns, so client templates only change each step's checklist.
export const CLIENT_STAGES = ['Brief', 'In progress', 'Review', 'Revisions', 'Delivered'];

const steps = (names, lists) => names.map((name) => ({ name, items: lists[name] || [] }));
export const DEFAULT_TEMPLATES = {
  video: [
    { id: 'long', name: 'Long-form', desc: 'A full episode with a written script.', outline: 'Hook (first 30s):\n\nIntro:\n\nMain points:\n1.\n2.\n3.\n\nOutro / call to action:', steps: steps(VIDEO_STAGES, { Idea: ['Working title', 'Who is it for?'], Script: ['Outline', 'Full draft', 'Read-through'], Record: ['Set up mic + lighting', 'Record A-roll', 'Record B-roll'], Edit: ['Rough cut', 'Music + SFX', 'Captions', 'Color + audio pass'], Publish: ['Thumbnail', 'Title + description', 'Tags + end screen', 'Schedule'] }) },
    { id: 'journal', name: 'Play journal', desc: 'Your journaling series. Pulls notes from a game\'s session log.', outline: 'Session recap:\n\nHighlights & timestamps:\n\nThoughts / reactions:\n\nNext session plan:', steps: steps(VIDEO_STAGES, { Idea: ['Pick the game + session'], Script: ['Pull notes from the game\'s session log'], Record: ['Record gameplay', 'Record voiceover'], Edit: ['Cut highlights', 'Add chapter markers'], Publish: ['Thumbnail', 'Title (Ep #)', 'Add to playlist'] }) },
    { id: 'devlog', name: 'Devlog', desc: 'Show what changed in your game. Links to Game Dev cards.', outline: 'What I worked on:\n\nShow & tell:\n\nProblems + how I solved them:\n\nWhat\'s next:', steps: steps(VIDEO_STAGES, { Idea: ['Pick features to show'], Script: ['Bullet points from Game Dev notes'], Record: ['Capture footage', 'Record voiceover'], Edit: ['Cut + captions'], Publish: ['Thumbnail', 'Post links (Steam, socials)'] }) },
    { id: 'short', name: 'Short', desc: 'Vertical, under 60 seconds.', outline: 'Hook (1s):\n\nPayoff:\n\nLoop back:', steps: steps(VIDEO_STAGES, { Idea: ['Hook idea'], Script: ['3-line script'], Record: ['Vertical capture'], Edit: ['Captions', 'Under 60s'], Publish: ['Title + hashtags'] }) }
  ],
  client: [
    { id: 'edit', name: 'Video edit', desc: 'Editing a client\'s footage.', outline: '', steps: steps(CLIENT_STAGES, { Brief: ['Get footage + brief', 'Agree on deadline and rate'], 'In progress': ['Rough cut'], Review: ['Send for review'], Revisions: ['Apply their notes'], Delivered: ['Export final', 'Send invoice'] }) },
    { id: 'design', name: 'Design / branding', desc: 'Logos, mascots, brand kits.', outline: '', steps: steps(CLIENT_STAGES, { Brief: ['Moodboard + references'], 'In progress': ['Concepts'], Review: ['Present options'], Revisions: ['Refine the chosen one'], Delivered: ['Final files', 'Send invoice'] }) }
  ]
};

export function useTemplates(section) {
  const rec = useItems('ptemplates').find((r) => r.id === 'ptemplates-' + section);
  return rec?.templates || DEFAULT_TEMPLATES[section];
}
export const saveTemplates = (section, templates) => save('ptemplates', { templates }, 'ptemplates-' + section);

// A fresh project's steps and per-step checklists from a template (or blank when no template).
export function fromTemplate(t, fallbackSteps) {
  const names = t ? t.steps.map((s) => s.name) : fallbackSteps;
  const checklist = Object.fromEntries(names.map((n) => [n, ((t?.steps.find((s) => s.name === n) || {}).items || []).map((text) => ({ id: newId(), text, done: false }))]));
  return { stages: names, checklist };
}
