import type { PerformanceScores } from './performanceEngine';
import type { PerformanceAttribute } from '../types';

export type ArchetypeEvolution =
  | 'evolving_toward_dominant'
  | 'stable'
  | 'unknown';


export interface RefinedAthleteIdentity {
  name: string;
  emoji: string;
  desc: string;
  color: string;
  shadow: string;
  dominantAttributes: PerformanceAttribute[];
}

const attrsInOrder = (scores: PerformanceScores): Array<[PerformanceAttribute, number]> => [

  ['strength', scores.strengthScore],
  ['consistency', scores.consistencyScore],
  ['mobility', scores.mobilityScore],
  ['endurance', scores.enduranceScore],
  ['skill', scores.skillScore],
  ['recovery', scores.recoveryScore],
];

const top2 = (scores: PerformanceScores): PerformanceAttribute[] => {
  const entries = attrsInOrder(scores).sort((a, b) => b[1] - a[1]);
  return [entries[0][0], entries[1][0]];
};

const rangeAcross = (scores: PerformanceScores) => {
  const values = [
    scores.strengthScore,
    scores.consistencyScore,
    scores.mobilityScore,
    scores.enduranceScore,
    scores.skillScore,
    scores.recoveryScore,
  ];
  return Math.max(...values) - Math.min(...values);
};

export const computeRefinedArchetype = (
  performanceScores: PerformanceScores,
  trajectorySignals?: { recoveryBias?: boolean; driftDirection?: PerformanceAttribute; evolutionStrength?: number }
): RefinedAthleteIdentity & { evolutionIndicator?: { evolution: ArchetypeEvolution; toward?: PerformanceAttribute } } => {

  const dominant = top2(performanceScores);
  const minVal = Math.min(
    performanceScores.strengthScore,
    performanceScores.consistencyScore,
    performanceScores.mobilityScore,
    performanceScores.enduranceScore,
    performanceScores.skillScore,
    performanceScores.recoveryScore
  );

  const range = rangeAcross(performanceScores);

  const allScores = [
    performanceScores.strengthScore,
    performanceScores.consistencyScore,
    performanceScores.mobilityScore,
    performanceScores.enduranceScore,
    performanceScores.skillScore,
    performanceScores.recoveryScore,
  ];
  const maxVal = Math.max(...allScores);

  // Fix: a specialist (e.g. strength-focused user) will legitimately have a low
  // recoveryScore simply because they don't log recovery-tagged activity — that's
  // not the same as recovery actually being their defining trait. Only treat
  // recovery as the identity-defining signal when it's critically low (not just
  // "lowest of six," which is close to guaranteed for any specialist) AND there
  // isn't already a clear, well-developed dominant pillar explaining the profile.
  const isClearSpecialist = maxVal - performanceScores.recoveryScore >= 25 && maxVal >= 60;

  const recoveryEmphasis =
    (trajectorySignals?.recoveryBias ?? false) ||
    (performanceScores.recoveryScore < 35 && !isClearSpecialist);

  const isBalanced = minVal >= 65 && range <= 15;

  if (recoveryEmphasis) {
    return {
      name: 'Recovery-Oriented Performer',
      emoji: '🌱',
      desc: 'Your training results are driven by recovery quality. You protect readiness, manage fatigue, and build long-term durability rather than chasing short-term intensity.',
      color: 'from-green-400 to-emerald-600',
      shadow: 'shadow-green-500/20',
      dominantAttributes: ['recovery', dominant[0] ?? 'consistency'],
    };
  }

  if (isBalanced) {
    return {
      name: 'Hybrid Athlete',
      emoji: '⚡',
      desc: 'Highly versatile. You maintain strong balance across strength, mobility, endurance, and skill while preserving recovery consistency.',
      color: 'from-cyan-400 via-blue-500 to-indigo-500',
      shadow: 'shadow-cyan-500/20',
      dominantAttributes: dominant,
    };
  }

  const [a1, a2] = dominant;

  const map: Record<PerformanceAttribute, Omit<RefinedAthleteIdentity, 'dominantAttributes'>> = {
    strength: {
      name: 'Strength Specialist',
      emoji: '🏋️‍♂️',
      desc: 'Your training optimizes overload and force production. You progress best when you can add meaningful work with consistent recovery.',
      color: 'from-amber-400 to-orange-600',
      shadow: 'shadow-orange-500/20',
    },
    mobility: {
      name: 'Mobility Practitioner',
      emoji: '🧘',
      desc: 'Range-of-motion and movement quality drive your progress. Your body responds well when sessions respect alignment and mobility continuity.',
      color: 'from-emerald-400 to-teal-600',
      shadow: 'shadow-emerald-500/20',
    },
    endurance: {
      name: 'Endurance Performer',
      emoji: '🏃‍♂️',
      desc: 'Conditioning and sustained effort are your advantage. You adapt best when you balance intensity with recovery windows.',
      color: 'from-sky-400 to-blue-600',
      shadow: 'shadow-blue-500/20',
    },
    skill: {
      name: 'Mastery & Skill Athlete',
      emoji: '🤸',
      desc: 'You develop control, coordination, and technical mastery. Your progress accelerates when you train skills with intent and feedback.',
      color: 'from-indigo-400 to-purple-600',
      shadow: 'shadow-purple-500/20',
    },
    consistency: {
      name: 'Habit Builder',
      emoji: '🔥',
      desc: 'Consistency is your superpower. Your training returns compound when you maintain streak momentum and avoid letting recovery lag.',
      color: 'from-yellow-400 to-amber-600',
      shadow: 'shadow-amber-500/20',
    },
    recovery: {
      name: 'Recovery-Oriented Performer',
      emoji: '🌱',
      desc: 'Recovery is your true training tool. You build readiness so every session has higher quality and better adaptation.',
      color: 'from-green-400 to-emerald-600',
      shadow: 'shadow-green-500/20',
    },
  };

  // If dominant are two different systems, create hybrid name.
  if (a1 !== a2) {
    const primary = map[a1];

    // Slow evolution: if driftDirection points to the secondary pillar and evolutionStrength is meaningful,
    // gently mention it as the direction without rapid switching.
    const driftDir = trajectorySignals?.driftDirection;
    const evolutionStrength = trajectorySignals?.evolutionStrength ?? 0;

    const shouldNudgeTowardSecondary =
      driftDir === a2 && evolutionStrength >= 0.55;

    return {
      ...primary,
      name: primary.name.includes('Specialist') || primary.name.includes('Practitioner') || primary.name.includes('Performer') || primary.name.includes('Athlete')
        ? primary.name
        : 'Hybrid Athlete',
      desc: shouldNudgeTowardSecondary
        ? `${primary.desc} Over time, your emphasis is drifting toward ${a2}. Keep the transition gradual so recovery stays coherent.`
        : `${primary.desc} Your second-strength is ${a2}—lean into both for smarter progression.`,
      dominantAttributes: dominant,
      evolutionIndicator: {
        evolution: shouldNudgeTowardSecondary ? 'evolving_toward_dominant' : 'stable',
        toward: shouldNudgeTowardSecondary ? a2 : undefined,
      },
    };
  }

  const driftDir = trajectorySignals?.driftDirection;
  const evolutionStrength = trajectorySignals?.evolutionStrength ?? 0;
  const toward = driftDir && driftDir !== a1 ? driftDir : undefined;

  const evolutionIndicator =
    toward && evolutionStrength >= 0.55
      ? { evolution: 'evolving_toward_dominant' as const, toward }
      : { evolution: 'stable' as const, toward: undefined };

  return {
    ...map[a1],
    dominantAttributes: [a1, a2].filter(Boolean) as PerformanceAttribute[],
    evolutionIndicator,
  };
};