import type { PerformanceScores } from './performanceEngine';

export type RecoveryState = 'recovering' | 'ready' | 'peaking' | 'overreached';
export type IntensityRecommendation = 'low' | 'moderate' | 'high';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const scoreTo01 = (score: number) => clamp01(score / 100);

const round0 = (n: number) => Math.round(n);

const computeFatigueProxy = (scores: PerformanceScores) => {
  // Fatigue proxy: overload inferred from strength+endurance, countered by recovery balance.
  // 0..1 (higher => more fatigue)
  const overload = (scoreTo01(scores.strengthScore) * 0.55 + scoreTo01(scores.enduranceScore) * 0.45);
  const recovery = scoreTo01(scores.recoveryScore);

  // If recovery is low, fatigue proxy rises.
  return clamp01(overload * 0.85 + (1 - recovery) * 0.35);
};

const computeRecoveryStateInputs = (scores: PerformanceScores) => {
  const recovery = scoreTo01(scores.recoveryScore);
  // Recovery balance: recovery plus a small contribution from mobility.
  const mobility = scoreTo01(scores.mobilityScore);
  return clamp01(recovery * 0.75 + mobility * 0.25);
};

const computeMobilityBalance = (scores: PerformanceScores) => {
  // If mobility is the lowest pillar, balance is poor.
  const values = [
    scoreTo01(scores.strengthScore),
    scoreTo01(scores.consistencyScore),
    scoreTo01(scores.mobilityScore),
    scoreTo01(scores.enduranceScore),
    scoreTo01(scores.skillScore),
    scoreTo01(scores.recoveryScore),
  ];

  const min = Math.min(...values);
  const mobility = scoreTo01(scores.mobilityScore);

  // 1..0 where 1 means mobility is not the bottleneck.
  const mobilityIsLow = mobility <= min + 1e-6;
  if (!mobilityIsLow) return 1;

  // When mobility is the minimum, convert how far it is from the top-ish baseline into 0..1.
  const max = Math.max(...values);
  const spread = max - min;
  // If spread is large and mobility is min, mobility balance should be lower.
  return clamp01(1 - spread * 0.9);
};

export interface ReadinessOutput {
  readinessScore: number; // 0-100
  recoveryState: RecoveryState;
  intensityRecommendation: IntensityRecommendation;
  limitingFactor: string;
}

export const computeReadiness = (
  performanceScores: PerformanceScores,
  context?: { mobilityBalanceOverride?: number }
): ReadinessOutput => {
  const fatigueProxy = computeFatigueProxy(performanceScores); // 0..1 high=bad
  const recoveryBalance = computeRecoveryStateInputs(performanceScores); // 0..1 high=good
  const mobilityBalance = context?.mobilityBalanceOverride ?? computeMobilityBalance(performanceScores); // 0..1 high=good

  // A blended readiness score (0..100). Higher is better.
  const readiness01 = clamp01(
    (1 - fatigueProxy) * 0.5 +
    recoveryBalance * 0.35 +
    mobilityBalance * 0.15
  );

  const readinessScore = round0(readiness01 * 100);

  // State thresholds (heuristic).
  let recoveryState: RecoveryState;
  if (performanceScores.recoveryScore < 50 || fatigueProxy > 0.68) {
    // Very stressed
    recoveryState = readinessScore < 45 ? 'overreached' : 'recovering';
  } else if (readinessScore >= 78) {
    recoveryState = 'peaking';
  } else {
    recoveryState = 'ready';
  }

  const intensityRecommendation: IntensityRecommendation =
    recoveryState === 'overreached' || recoveryState === 'recovering'
      ? 'low'
      : recoveryState === 'peaking'
        ? 'high'
        : 'moderate';

  // Limiting factor: pick what is most problematic.
  const minPillar = Math.min(
    performanceScores.strengthScore,
    performanceScores.consistencyScore,
    performanceScores.mobilityScore,
    performanceScores.enduranceScore,
    performanceScores.skillScore,
    performanceScores.recoveryScore
  );

  const lowest = ((): keyof PerformanceScores => {
    const entries: Array<[keyof PerformanceScores, number]> = [
      ['strengthScore', performanceScores.strengthScore],
      ['consistencyScore', performanceScores.consistencyScore],
      ['mobilityScore', performanceScores.mobilityScore],
      ['enduranceScore', performanceScores.enduranceScore],
      ['skillScore', performanceScores.skillScore],
      ['recoveryScore', performanceScores.recoveryScore],
    ];
    return entries.sort((a, b) => a[1] - b[1])[0][0];
  })();

  const limitingFactor = (() => {
    if (recoveryState === 'overreached' || performanceScores.recoveryScore < 60) {
      return 'Recovery is the limiting factor right now.';
    }
    if (lowest === 'mobilityScore' || mobilityBalance < 0.6) {
      return 'Mobility balance is limiting performance quality.';
    }
    if (minPillar >= 65) return 'No major limit detected—push responsibly.';

    switch (lowest) {
      case 'strengthScore':
        return 'Strength capacity is the bottleneck for your current training.';
      case 'enduranceScore':
        return 'Endurance adaptation is the limiting factor.';
      case 'consistencyScore':
        return 'Consistency momentum is limiting your training returns.';
      case 'skillScore':
        return 'Skill/control development is lagging behind your baseline.';
      default:
        return 'A balance constraint is limiting performance.';
    }
  })();

  return {
    readinessScore,
    recoveryState,
    intensityRecommendation,
    limitingFactor,
  };
};

