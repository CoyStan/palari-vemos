import type { PlanIdea } from './types';

export const PLAN_IDEAS: PlanIdea[] = [
  { idea: 'grab coffee', place: 'a nearby café' },
  { idea: 'take a walk', place: 'the park' },
  { idea: 'get lunch', place: 'somewhere easy' },
  { idea: 'catch up over tea', place: 'your usual spot' },
  { idea: 'hang out', place: '' },
  { idea: 'go for ice cream', place: 'around the corner' },
];

export function pickIdea(seed: string): PlanIdea {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % PLAN_IDEAS.length;
  }
  return PLAN_IDEAS[hash] ?? PLAN_IDEAS[0]!;
}

export function nextIdea(currentIdea: string): PlanIdea {
  const index = PLAN_IDEAS.findIndex((item) => item.idea === currentIdea);
  const nextIndex = index < 0 ? 0 : (index + 1) % PLAN_IDEAS.length;
  return PLAN_IDEAS[nextIndex] ?? PLAN_IDEAS[0]!;
}
