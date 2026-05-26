// Lightweight sanity checks without a test runner.
// Run with: node -r ts-node/register src/utils/attributeXpEngine.sanity.ts
// (or compile and run depending on your environment)

import type { Workout } from '../types';
import { calculateAttributeXpGainsFromWorkouts, normalizeAttributeProgressDoc } from './performanceXp';

const sampleWorkouts: Workout[] = [
  {
    date: '2026-01-01',
    exercises: [
      {
        name: 'Bench Press',
        sets: [
          { completed: true, weight: 100, reps: 5 },
          { completed: true, weight: 100, reps: 5 },
        ],
      },
      {
        name: 'Plank',
        sets: [
          { completed: true, duration: 60 },
        ],
      },
    ],
  },
  {
    date: '2026-01-03',
    exercises: [
      {
        name: 'Bench Press',
        sets: [
          { completed: true, weight: 102.5, reps: 5 },
          { completed: true, weight: 102.5, reps: 4 },
        ],
      },
      {
        name: 'Hamstring Stretch',
        sets: [
          { completed: true, duration: 300 },
        ],
      },
    ],
  },
];

const gains1 = calculateAttributeXpGainsFromWorkouts(sampleWorkouts);
const gains2 = calculateAttributeXpGainsFromWorkouts(sampleWorkouts);

// deterministic
for (const k of Object.keys(gains1) as (keyof typeof gains1)[]) {
  if (gains1[k] !== gains2[k]) {
    throw new Error(`Non-deterministic gain for ${String(k)}: ${gains1[k]} vs ${gains2[k]}`);
  }
  if (!Number.isFinite(gains1[k])) {
    throw new Error(`Non-finite gain for ${String(k)}`);
  }
}

const normalized = normalizeAttributeProgressDoc(null);
for (const k of Object.keys(normalized) as (keyof typeof normalized)[]) {
  if (normalized[k].level < 1) throw new Error('Bad level');
  if (normalized[k].xp < 0) throw new Error('Bad xp');
  if (normalized[k].tier < 1) throw new Error('Bad tier');
}

console.log('attributeXpEngine sanity checks: OK', { gains: gains1 });

