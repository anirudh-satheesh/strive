import type { PerformanceAttribute, Workout } from '../types';
import { generatePerformanceEvents } from './performanceEvents';

import {
  applyAttributeXpToProgress,
  calculateAttributeXpGainsFromEvents,
  createEmptyProgress,
  type AttributeProgressMap,
  type AttributeXpGain,
} from './attributeXpEngine';

export type AttributeProgressDoc = AttributeProgressMap;

/**
 * Step 2.6 helper: compute gains from workouts without breaking the existing
 * calculatePerformanceScores() contract.
 */
export const calculateAttributeXpGainsFromWorkouts = (workouts: Workout[]): AttributeXpGain => {
  if (!workouts || workouts.length === 0) {
    return {
      strength: 0,
      consistency: 0,
      mobility: 0,
      endurance: 0,
      skill: 0,
      recovery: 0,
    };
  }
  const events = generatePerformanceEvents(workouts);
  return calculateAttributeXpGainsFromEvents(events);
};

export const calculateAttributeProgressFromWorkouts = (
  workouts: Workout[],
  current?: AttributeProgressMap
): AttributeProgressMap => {
  const gains = calculateAttributeXpGainsFromWorkouts(workouts);
  const base = current ?? createEmptyProgress();
  return applyAttributeXpToProgress(base, gains);
};

export const normalizeAttributeProgressDoc = (doc: Partial<AttributeProgressMap> | null | undefined): AttributeProgressMap => {
  const base = createEmptyProgress();
  if (!doc) return base;

  // shallow merge with type safety
  (Object.keys(base) as PerformanceAttribute[]).forEach((attr) => {
    const cur = doc[attr];
    if (!cur) return;
    const xp = Number(cur.xp ?? 0);
    const level = Number(cur.level ?? 1);
    const tier = Number(cur.tier ?? 1);
    base[attr] = {
      xp: Number.isFinite(xp) ? Math.max(0, xp) : 0,
      level: Number.isFinite(level) ? Math.max(1, level) : 1,
      tier: Number.isFinite(tier) ? Math.max(1, tier) : 1,
    };
  });

  return base;
};

