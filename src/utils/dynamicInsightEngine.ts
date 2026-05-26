import type { PerformanceScores } from './performanceEngine';
import type { IntensityRecommendation, RecoveryState } from './readinessEngine';
import type { PerformanceAttribute } from '../types';

export interface DynamicInsight {

  id: string;
  title: string;
  body: string;
  tone: 'good' | 'warn' | 'neutral';
}




const attrFromPillar = (key: keyof PerformanceScores): PerformanceAttribute => {
  switch (key) {
    case 'strengthScore':
      return 'strength';
    case 'consistencyScore':
      return 'consistency';
    case 'mobilityScore':
      return 'mobility';
    case 'enduranceScore':
      return 'endurance';
    case 'skillScore':
      return 'skill';
    case 'recoveryScore':
      return 'recovery';
    default:
      return 'strength';
  }
};

const topN = (scores: PerformanceScores, n: number) => {
  const entries: Array<[keyof PerformanceScores, number]> = [
    ['strengthScore', scores.strengthScore],
    ['consistencyScore', scores.consistencyScore],
    ['mobilityScore', scores.mobilityScore],
    ['enduranceScore', scores.enduranceScore],
    ['skillScore', scores.skillScore],
    ['recoveryScore', scores.recoveryScore],
  ];
  return entries.sort((a, b) => b[1] - a[1]).slice(0, n);
};

const bottomN = (scores: PerformanceScores, n: number) => {
  const entries: Array<[keyof PerformanceScores, number]> = [
    ['strengthScore', scores.strengthScore],
    ['consistencyScore', scores.consistencyScore],
    ['mobilityScore', scores.mobilityScore],
    ['enduranceScore', scores.enduranceScore],
    ['skillScore', scores.skillScore],
    ['recoveryScore', scores.recoveryScore],
  ];
  return entries.sort((a, b) => a[1] - b[1]).slice(0, n);
};

export const generateInsights = (
  performanceScores: PerformanceScores,
  readiness: { readinessScore: number; recoveryState: RecoveryState; intensityRecommendation: IntensityRecommendation }
): DynamicInsight[] => {
  const insights: DynamicInsight[] = [];

  const { recoveryState, intensityRecommendation, readinessScore } = readiness;

  const [lowest1] = bottomN(performanceScores, 2);
  const [highest1] = topN(performanceScores, 2);


  const add = (insight: Omit<DynamicInsight, 'id'>) => {
    insights.push({
      ...insight,
      id: `${insights.length}-${insight.title}`.replace(/\s+/g, '-').toLowerCase(),
    });
  };

  // Recovery-first warnings
  if (recoveryState === 'overreached' || intensityRecommendation === 'low') {
    add({
      title: 'Recovery is limiting adaptation',
      body:
        recoveryState === 'overreached'
          ? 'Your fatigue is higher than your recovery capacity. Reduce intensity, emphasize sleep, and keep sessions technique-focused.'
          : 'Recovery signals are low. Choose lighter work today and prioritize mobility + hydration to restore readiness.',
      tone: 'warn',
    });
  }

  // Limiting factor insight via lowest pillar
  const lowestAttr = attrFromPillar(lowest1[0]);
  const lowestScore = lowest1[1];
  const bestScore = highest1[1];
  const delta = bestScore - lowestScore;

  if (delta >= 20) {
    const attrName = (() => {
      switch (lowestAttr) {
        case 'mobility':
          return 'Mobility';
        case 'strength':
          return 'Strength';
        case 'endurance':
          return 'Endurance';
        case 'consistency':
          return 'Consistency';
        case 'skill':
          return 'Skill';
        case 'recovery':
          return 'Recovery';
        default:
          return 'Performance';
      }
    })();

    add({
      title: `Primary limiter: ${attrName}`,
      body: `Your ${attrName.toLowerCase()} score is significantly behind your top pillar. Address the bottleneck with focused work (without overloading recovery).`,
      tone: 'neutral',
    });
  }

  // Mobility/balance suggestions
  if (lowestAttr === 'mobility' && performanceScores.mobilityScore < 60) {
    add({
      title: 'Mobility focus will improve training quality',
      body: 'Add a short mobility routine before sessions and a dedicated stretch block after. Better range supports strength, skill, and safer endurance work.',
      tone: 'good',
    });
  }

  // Consistency growth reminder
  if (performanceScores.consistencyScore < 65 && readinessScore >= 55) {
    add({
      title: 'Consistency momentum is the next lever',
      body: 'Your recovery is acceptable, but training returns depend on keeping a steady habit. Log an easy session or recovery movement to build continuity.',
      tone: 'neutral',
    });
  }

  // Peaking / ready encouragement
  if (recoveryState === 'peaking') {
    add({
      title: 'You’re peaking—commit to quality',
      body: 'Recovery and adaptation signals look strong. Go for a high-quality session emphasizing progressive effort and crisp technique.',
      tone: 'good',
    });
  }

  // Cap 2-4 insights
  return insights.slice(0, 4);
};

