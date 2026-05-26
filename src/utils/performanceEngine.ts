import type { Workout } from '../types';
import { calculateStreak } from './workoutAnalytics';
import { generatePerformanceEvents } from './performanceEvents';

export interface PerformanceScores {
    strengthScore: number;
    consistencyScore: number;
    mobilityScore: number;
    enduranceScore: number;
    skillScore: number;
    recoveryScore: number;
}

/**
 * Normalizes scores between 0 and 100, ensuring they are valid numbers.
 */
const clampScore = (score: number, defaultVal = 50): number => {
    if (isNaN(score) || !isFinite(score)) return defaultVal;
    return Math.max(0, Math.min(100, Math.round(score)));
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const avg = (nums: number[]) => {
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
};

/**
 * Phase 1.3/1.4 implementation approach:
 * - We keep the public output contract unchanged.
 * - Internally we derive “hidden raw components” from generated performance events.
 * - Then we map those raw components into the 6 pillar scores.
 *
 * This makes the system architecture event-first without breaking existing UI.
 */
export const calculatePerformanceScores = (workouts: Workout[]): PerformanceScores => {

    if (!workouts || workouts.length === 0) {
        return {
            strengthScore: 50,
            consistencyScore: 50,
            mobilityScore: 50,
            enduranceScore: 50,
            skillScore: 50,
            recoveryScore: 50,
        };
    }

    const events = generatePerformanceEvents(workouts);

    // ==========================
    // Hidden raw components
    // ==========================

    const last28DaysAgo = (() => {
        const now = new Date();
        const d = new Date(now);
        d.setDate(d.getDate() - 28);
        return d;
    })();

    const inLast28 = (timestamp: string) => {
        const t = new Date(timestamp);
        return t >= last28DaysAgo && t <= new Date();
    };

    const recentEvents = events.filter(e => inLast28(e.timestamp));

    // adaptation: how much net beneficial intensity exists vs recovery costs
    const beneficialIntensity = avg(
        recentEvents
            .filter(e => e.attribute !== 'recovery')
            .map(e => e.intensity)
    );

    const fatigueProxy = avg(recentEvents.filter(e => e.recoveryCost > 0).map(e => e.recoveryCost));

    const adaptationRaw = clamp01(beneficialIntensity * 1.1 - fatigueProxy * 0.9);

    // overload score: strength/endurance intensity with costs
    const overloadStrength = avg(
        recentEvents
            .filter(e => e.attribute === 'strength' || e.eventType === 'strength_fatigue_proxy')
            .map(e => e.intensity)
    );

    const overloadEndurance = avg(
        recentEvents
            .filter(e => e.attribute === 'endurance')
            .map(e => e.intensity)
    );

    const overloadRaw = clamp01(overloadStrength * 0.55 + overloadEndurance * 0.45);

    // fatigue raw: recoveryCost weighted
    const fatigueRaw = clamp01(fatigueProxy * 1.3);

    // consistency quality: frequency/proximity proxy based on consistency events
    const consistencyIntensity = avg(
        recentEvents
            .filter(e => e.attribute === 'consistency')
            .map(e => e.intensity)
    );

    const currentStreak = calculateStreak(workouts);
    const streakRaw = clamp01(currentStreak / 30);

    const consistencyQualityRaw = clamp01(consistencyIntensity * 0.7 + streakRaw * 0.3);

    // recovery balance: encourages mobility and recovery events, discourages fatigue
    const mobilityRaw = avg(recentEvents.filter(e => e.attribute === 'mobility').map(e => e.intensity));
    const recoveryRawEvent = avg(recentEvents.filter(e => e.attribute === 'recovery').map(e => e.intensity));

    const recoveryBalanceRaw = clamp01(recoveryRawEvent * 0.55 + mobilityRaw * 0.45 - fatigueRaw * 0.25);

    // movement balance: use distribution across push/pull isn't available in events yet,
    // so approximate via spread of non-recovery attribute intensities.
    const spreadValues = [
        avg(recentEvents.filter(e => e.attribute === 'strength').map(e => e.intensity)),
        avg(recentEvents.filter(e => e.attribute === 'endurance').map(e => e.intensity)),
        avg(recentEvents.filter(e => e.attribute === 'mobility').map(e => e.intensity)),
        avg(recentEvents.filter(e => e.attribute === 'skill').map(e => e.intensity)),
    ];
    const maxSpread = Math.max(...spreadValues, 0);
    const minSpread = Math.min(...spreadValues, 0);
    const balanceRaw = clamp01(1 - (maxSpread - minSpread) * 0.7);

    // readiness: blend adaptation + consistency + recovery
    const readinessRaw = clamp01(
        adaptationRaw * 0.35 +
        consistencyQualityRaw * 0.25 +
        recoveryBalanceRaw * 0.25 +
        balanceRaw * 0.15
    );

    // ==========================
    // Map raw components -> 0..100 pillars
    // ==========================

    // Preserve “feel” from previous engine by biasing around 50.
    const base = 50;

    const strengthScore = base + (overloadRaw * 0.6 + adaptationRaw * 0.25 - fatigueRaw * 0.15) * 50;
    const consistencyScore = base + consistencyQualityRaw * 50;
    const mobilityScore = base + (mobilityRaw * 0.7 + recoveryBalanceRaw * 0.3) * 50;
    const enduranceScore = base + (overloadEndurance * 0.65 + adaptationRaw * 0.25 - fatigueRaw * 0.1) * 50;
    const skillScore = base + (avg(recentEvents.filter(e => e.attribute === 'skill').map(e => e.intensity)) * 1.0) * 50;
    const recoveryScore = base + (recoveryBalanceRaw * 0.7 + readinessRaw * 0.3) * 50;

    return {
        strengthScore: clampScore(strengthScore, 70),
        consistencyScore: clampScore(consistencyScore, 65),
        mobilityScore: clampScore(mobilityScore, 50),
        enduranceScore: clampScore(enduranceScore, 50),
        skillScore: clampScore(skillScore, 50),
        recoveryScore: clampScore(recoveryScore, 75),
    };
};

