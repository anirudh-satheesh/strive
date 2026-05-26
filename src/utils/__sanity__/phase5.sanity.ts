import type { PerformanceScores } from '../performanceEngine';
import { computeReadiness } from '../readinessEngine';
import { generateInsights } from '../dynamicInsightEngine';

const expect = (cond: boolean, msg: string) => {
  if (!cond) {
    throw new Error(`Assertion failed: ${msg}`);
  }
};

const runScenario = (name: string, scores: PerformanceScores) => {
  const readiness = computeReadiness(scores);
  const insights = generateInsights(scores, readiness);

  return { name, readiness, insights };
};

const scenarios: Array<{ name: string; scores: PerformanceScores; assertions: (r: ReturnType<typeof runScenario>) => void }> = [
  {
    name: 'low recovery => recoveryState warning + low intensity recommendation',
    scores: {
      strengthScore: 70,
      consistencyScore: 70,
      mobilityScore: 65,
      enduranceScore: 75,
      skillScore: 65,
      recoveryScore: 35,
    },
    assertions: (r) => {
      expect(r.readiness.recoveryState === 'recovering' || r.readiness.recoveryState === 'overreached', 'should warn on low recovery');
      expect(r.readiness.intensityRecommendation === 'low', 'should recommend low intensity');
      expect(r.insights.some((i) => /Recovery/i.test(i.title) || /Recovery/i.test(i.body)), 'should include recovery limiting insight');
    },
  },
  {
    name: 'high mobility / low strength => mobility-focused insight',
    scores: {
      strengthScore: 45,
      consistencyScore: 65,
      mobilityScore: 85,
      enduranceScore: 60,
      skillScore: 62,
      recoveryScore: 70,
    },
    assertions: (r) => {
      // Lowest is strength; should mention primary limiter.
      expect(r.insights.some((i) => /Primary limiter/i.test(i.title) || /limiter/i.test(i.title)), 'should include a limiting factor insight');
    },
  },
  {
    name: "balanced high scores => 'ready'/'peaking'",
    scores: {
      strengthScore: 80,
      consistencyScore: 78,
      mobilityScore: 82,
      enduranceScore: 76,
      skillScore: 74,
      recoveryScore: 85,
    },
    assertions: (r) => {
      expect(r.readiness.recoveryState === 'ready' || r.readiness.recoveryState === 'peaking', 'should be ready/peaking');
      expect(r.readiness.intensityRecommendation === 'moderate' || r.readiness.intensityRecommendation === 'high', 'should recommend moderate/high intensity');
    },
  },
  {
    name: 'endurance high but recovery low => overreached warning',
    scores: {
      strengthScore: 60,
      consistencyScore: 65,
      mobilityScore: 62,
      enduranceScore: 90,
      skillScore: 55,
      recoveryScore: 40,
    },
    assertions: (r) => {
      expect(r.readiness.recoveryState === 'overreached' || r.readiness.recoveryState === 'recovering', 'should indicate stressed state');
      // Prefer overreached.
      expect(r.readiness.intensityRecommendation === 'low', 'should recommend low intensity');
      expect(r.insights.length > 0, 'should return at least one insight');
    },
  },
];

const main = () => {
  for (const s of scenarios) {
    const r = runScenario(s.name, s.scores);
    s.assertions(r);
    // eslint-disable-next-line no-console
    console.log('phase5 sanity OK:', s.name, { readiness: r.readiness, insights: r.insights.map((i) => i.title) });
  }
  // eslint-disable-next-line no-console
  console.log('phase5 sanity checks: ALL PASSED');
};

main();

