import type { Workout } from '../types';
import type { PerformanceScores } from './performanceEngine';


export type ConditioningStability = 'rising' | 'steady' | 'soft_falling' | 'falling' | 'unknown';
export type RecoveryPattern = 'cooling' | 'stabilizing' | 'warming' | 'inconsistent' | 'unknown';
export type MovementBalance = 'improving' | 'stable' | 'worsening' | 'unknown';
export type AdaptationQuality = 'accelerating' | 'plateauing' | 'mixed' | 'unknown';
export type ProgressionDirection = 'upward' | 'sideways' | 'downward' | 'unknown';

export interface PerformanceTrendsOutput {
  conditioningStability: ConditioningStability;
  movementBalance: MovementBalance;
  recoveryPattern: RecoveryPattern;
  adaptationQuality: AdaptationQuality;
  progressionDirection: ProgressionDirection;
}



const safeAvg = (nums: number[]) => {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
};

const scorePillarFromWorkout = (w: Workout): Partial<PerformanceScores> => {
  // Heuristic proxy from completed sets intensity.
  // We do not have per-attribute event types here, so we approximate by exercise names.
  if (!w.exercises?.length) return {};

  const completedSets = w.exercises
    .flatMap((ex) => (Array.isArray(ex.sets) ? ex.sets : []))
    .filter((s) => !!s && (s.completed === true));

  const count = completedSets.length;
  if (count === 0) return {};

  const strength = safeAvg(
    completedSets.map((s) => Number(s.weight) || 0)
  );

  const endurance = safeAvg(
    completedSets.map((s) => Number(s.distance) || 0)
  );

  const mobility = safeAvg(
    completedSets.map((s) => Number(s.duration) || 0)
  );

  const consistency = count; // proxy frequency/volume per workout

  // skill/recovery not directly inferable; approximate.
  const skill = safeAvg(completedSets.map((s) => Number(s.reps) || 0));
  const recovery = safeAvg(completedSets.map((s) => Number(s.duration) || 0));

  return {
    strengthScore: strength,
    enduranceScore: endurance,
    mobilityScore: mobility,
    consistencyScore: consistency,
    skillScore: skill,
    recoveryScore: recovery,
  } as Partial<PerformanceScores>;
};

const deltaBand = (delta: number, upIsGood: boolean) => {
  // Normalize small/medium/large deltas into qualitative states.
  const magnitude = Math.abs(delta);
  const small = magnitude < 0.08;
  const medium = magnitude >= 0.08 && magnitude < 0.18;

  if (small) return 'steady';
  const signGood = upIsGood ? delta > 0 : delta < 0;

  if (medium) return signGood ? 'rising' : 'soft_falling';
  return signGood ? 'rising' : 'falling';
};

export const computePerformanceTrends = (
  recentWorkouts: Workout[],
  previousWorkouts: Workout[]
): PerformanceTrendsOutput => {
  // We treat inputs as windows already sliced.
  // Recent vs previous: compare proxies for conditioning/recovery/balance.

  const recentPillars = recentWorkouts.map(scorePillarFromWorkout);
  const prevPillars = previousWorkouts.map(scorePillarFromWorkout);

  const recentAvg = {
    strength: safeAvg(recentPillars.map((p) => p.strengthScore ?? 0)),
    endurance: safeAvg(recentPillars.map((p) => p.enduranceScore ?? 0)),
    mobility: safeAvg(recentPillars.map((p) => p.mobilityScore ?? 0)),
    consistency: safeAvg(recentPillars.map((p) => p.consistencyScore ?? 0)),
    skill: safeAvg(recentPillars.map((p) => p.skillScore ?? 0)),
    recovery: safeAvg(recentPillars.map((p) => p.recoveryScore ?? 0)),
  };

  const prevAvg = {
    strength: safeAvg(prevPillars.map((p) => p.strengthScore ?? 0)),
    endurance: safeAvg(prevPillars.map((p) => p.enduranceScore ?? 0)),
    mobility: safeAvg(prevPillars.map((p) => p.mobilityScore ?? 0)),
    consistency: safeAvg(prevPillars.map((p) => p.consistencyScore ?? 0)),
    skill: safeAvg(prevPillars.map((p) => p.skillScore ?? 0)),
    recovery: safeAvg(prevPillars.map((p) => p.recoveryScore ?? 0)),
  };

  const hasEnough = recentWorkouts.length >= 2 && previousWorkouts.length >= 2;
  if (!hasEnough) {
    return {
      conditioningStability: 'unknown',
      movementBalance: 'unknown',
      recoveryPattern: 'unknown',
      adaptationQuality: 'unknown',
      progressionDirection: 'unknown',
    };
  }

  const denom = (v: number) => Math.max(1e-6, Math.abs(v));

  const consistencyDelta = (recentAvg.consistency - prevAvg.consistency) / denom(prevAvg.consistency);
  const mobilityDelta = (recentAvg.mobility - prevAvg.mobility) / denom(prevAvg.mobility);
  const recoveryDelta = (recentAvg.recovery - prevAvg.recovery) / denom(prevAvg.recovery);

  const strengthShareRecent = safeAvg(recentPillars.map((p) => p.strengthScore ?? 0));
  const enduranceShareRecent = safeAvg(recentPillars.map((p) => p.enduranceScore ?? 0));
  const spreadRecent = Math.abs(strengthShareRecent - enduranceShareRecent) / Math.max(1e-6, strengthShareRecent + enduranceShareRecent);

  const strengthSharePrev = safeAvg(prevPillars.map((p) => p.strengthScore ?? 0));
  const enduranceSharePrev = safeAvg(prevPillars.map((p) => p.enduranceScore ?? 0));
  const spreadPrev = Math.abs(strengthSharePrev - enduranceSharePrev) / Math.max(1e-6, strengthSharePrev + enduranceSharePrev);

  const spreadDelta = spreadPrev - spreadRecent; // positive => balance improving

  // Conditioning: use consistency delta + mobility delta as a stabilizer.
  const conditioningQual = (() => {
    const d = consistencyDelta * 0.65 + mobilityDelta * 0.35;
    const band = deltaBand(d, true);
    // map to rising/steady/soft_falling/falling
    if (band === 'steady') return 'steady';
    if (band === 'rising') {
      return d > 0 ? 'rising' : 'soft_falling';
    }
    if (band === 'soft_falling') return 'soft_falling';
    return 'falling';
  })();

  const movementBalance: MovementBalance = spreadDelta > 0.04 ? 'improving' : spreadDelta < -0.04 ? 'worsening' : 'stable';

  const recoveryPattern: RecoveryPattern = (() => {
    if (recoveryDelta > 0.06) return 'warming';
    if (recoveryDelta < -0.06) return 'cooling';
    // if both mobility and recovery are moving opposite, consider inconsistent
    if (Math.sign(mobilityDelta) !== Math.sign(recoveryDelta) && Math.abs(mobilityDelta) > 0.08) return 'inconsistent';
    return 'stabilizing';
  })();

  const adaptationQuality: AdaptationQuality = (() => {
    const prog = (recentAvg.strength + recentAvg.endurance + recentAvg.skill) / 3;
    const base = (prevAvg.strength + prevAvg.endurance + prevAvg.skill) / 3;
    const d = (prog - base) / Math.max(1e-6, Math.abs(base));
    if (Math.abs(d) < 0.09) return 'plateauing';
    if (d > 0.09) return 'accelerating';
    return 'mixed';
  })();

  const progressionDirection: ProgressionDirection = (() => {
    const fitness = (recentAvg.strength + recentAvg.endurance + recentAvg.skill) / 3;
    const base = (prevAvg.strength + prevAvg.endurance + prevAvg.skill) / 3;
    const d = (fitness - base) / Math.max(1e-6, Math.abs(base));
    if (Math.abs(d) < 0.09) return 'sideways';
    return d > 0 ? 'upward' : 'downward';
  })();

  return {
    conditioningStability: conditioningQual,
    movementBalance,
    recoveryPattern,
    adaptationQuality,
    progressionDirection,
  };
};

