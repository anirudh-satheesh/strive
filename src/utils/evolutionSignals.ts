import type { PerformanceScores } from './performanceEngine';
import type { PerformanceTrendsOutput, ProgressionDirection } from './performanceTrends';


export type EvolutionSignalType =
  | 'momentum'
  | 'conditioning'
  | 'balance'
  | 'recovery'
  | 'adaptation'
  | 'trajectory';

export interface EvolutionSignal {
  type: EvolutionSignalType;
  text: string; // observation-only
}

export interface EvolutionSignalsOutput {
  signals: EvolutionSignal[]; // max 2-4
  // optional debug/diagnostics for UI
  mood?: 'calm' | 'neutral' | 'cautious';
}

const scoreDelta = (recent: number, previous: number) => {

  const denom = Math.max(1e-6, Math.abs(previous));
  return (recent - previous) / denom;
};

const pickMostRelevant = <T,>(arr: T[], max: number) => arr.slice(0, max);

const directionGlyph = (dir: ProgressionDirection) => {
  switch (dir) {
    case 'upward':
      return '↑';
    case 'downward':
      return '↓';
    case 'sideways':
      return '→';
    default:
      return '→';
  }
};

const stabilityBand = (v: number, goodIsHigh: boolean) => {
  // v is 0..100
  const good = goodIsHigh ? v >= 68 : v <= 45;
  const warn = goodIsHigh ? v < 52 : v > 55;
  if (good) return 'good';
  if (warn) return 'warn';
  return 'neutral';
};

export const generateEvolutionSignals = (
  performanceScores: PerformanceScores,
  conditioning: {
    stability?: number; // optional 0..1
    rhythm?: number; // optional 0..1
    volatility?: number; // optional 0..1
    recoveryConsistency?: number; // optional 0..1
  },
  trends?: Partial<PerformanceTrendsOutput>,
  previousState?: Partial<{ performanceScores: PerformanceScores }>
): EvolutionSignalsOutput => {
  const prev = previousState?.performanceScores;

  const signals: EvolutionSignal[] = [];

  // Momentum: use strength+consistency relative.
  const momentumStrength = (performanceScores.strengthScore + performanceScores.consistencyScore) / 2;
  const momentumBand = stabilityBand(momentumStrength, true);

  // Recovery: directly from recoveryScore.
  const recoveryBand = stabilityBand(performanceScores.recoveryScore, true);

  // Balance: measure spread across pillars.
  const values = [
    performanceScores.strengthScore,
    performanceScores.consistencyScore,
    performanceScores.mobilityScore,
    performanceScores.enduranceScore,
    performanceScores.skillScore,
    performanceScores.recoveryScore,
  ];
  const spread = Math.max(...values) - Math.min(...values);
  const balanceBand = spread <= 15 ? 'good' : spread >= 28 ? 'warn' : 'neutral';

  // Conditioning state: use provided conditioning metrics if present.
  const condStability01 = conditioning.stability ?? undefined;
  const volatility01 = conditioning.volatility ?? undefined;

  // 1) Momentum signal
  if (momentumBand === 'good') {
    if (trends?.progressionDirection) {
      signals.push({
        type: 'momentum',
        text: `Momentum aligns with recent progression ${directionGlyph(trends.progressionDirection)}.`,
      });
    } else {
      signals.push({
        type: 'momentum',
        text: 'Momentum is building across the main pillars.',
      });
    }
  } else if (momentumBand === 'warn') {
    signals.push({
      type: 'momentum',
      text: 'Main-pillar momentum is flattening compared to the recent baseline.',
    });
  }

  // 2) Recovery signal (keep calm/observational)
  if (recoveryBand === 'good') {
    signals.push({
      type: 'recovery',
      text: 'Recovery capacity is holding steady, supporting cleaner next sessions.',
    });
  } else if (recoveryBand === 'warn') {
    signals.push({
      type: 'recovery',
      text: 'Recovery capacity is lagging, which can slow adaptation if intensity stays high.',
    });
  }

  // 3) Balance signal
  if (balanceBand === 'good') {
    signals.push({
      type: 'balance',
      text: 'Pillar balance is stabilizing across strength, mobility, and endurance.',
    });
  } else if (balanceBand === 'warn') {
    signals.push({
      type: 'balance',
      text: 'Pillar spread is widening, indicating a growing bottleneck.',
    });
  }

  // 4) Conditioning / adaptation signal (only if we have enough information)
  const canCondition = condStability01 !== undefined || volatility01 !== undefined;
  if (canCondition) {
    const stability = condStability01 ?? 0.5;
    const volatility = volatility01 ?? 0.5;
    const cooling = stability < 0.48 || volatility > 0.6;

    if (cooling) {
      signals.push({
        type: 'conditioning',
        text: 'Conditioning rhythm shows more fluctuation than usual over the recent window.',
      });
    } else {
      signals.push({
        type: 'conditioning',
        text: 'Conditioning stability looks steady across the recent window.',
      });
    }
  } else if (trends?.adaptationQuality) {
    if (trends.adaptationQuality === 'plateauing') {
      signals.push({
        type: 'adaptation',
        text: 'Adaptation quality is flattening, suggesting a plateau in growth.',
      });
    }
  }

  // Optional trajectory: if we have previous scores
  if (prev) {
    const dRecovery = scoreDelta(performanceScores.recoveryScore, prev.recoveryScore);
    if (Math.abs(dRecovery) > 0.12) {
      signals.push({
        type: 'trajectory',
        text: dRecovery >= 0 ? 'Recovery trajectory is trending upward.' : 'Recovery trajectory is trending downward.',
      });
    }
  }

  // De-duplicate by text
  const unique: EvolutionSignal[] = [];
  const seen = new Set<string>();
  for (const s of signals) {
    if (seen.has(s.text)) continue;
    seen.add(s.text);
    unique.push(s);
  }

  // Keep max 2-4 (prefer 3 if available)
  const final = pickMostRelevant(unique, 4);

  // Determine mood
  const cautious = recoveryBand === 'warn' || balanceBand === 'warn';
  const mood = cautious ? 'cautious' : 'calm';

  return {
    signals: final,
    mood,
  };
};

