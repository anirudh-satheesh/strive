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
 * Fix: the old per-pillar "default" values (70/65/50/50/50/75) were dead code —
 * avg([]) returns 0, not NaN, so this branch almost never fired. One honest
 * default (0) now, with the empty-workouts early-return below being the real
 * place "no data yet" is represented.
 */
const clampScore = (score: number, defaultVal = 0): number => {
    if (isNaN(score) || !isFinite(score)) return defaultVal;
    return Math.max(0, Math.min(100, Math.round(score)));
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const avg = (nums: number[]) => {
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
};

// ==========================================================
// Named weights — was previously scattered as unlabeled magic
// numbers throughout the formulas below. Tune here, intentionally.
// ==========================================================
const WEIGHTS = {
    strength: { overload: 0.6, adaptation: 0.25, fatigue: 0.15 },
    consistency: { activeDays: 0.5, eventQuality: 0.3, streak: 0.2 },
    mobility: { mobilityRaw: 0.7, recoveryBalance: 0.3 },
    endurance: { overload: 0.65, adaptation: 0.25 }, // fatigue intentionally NOT applied here anymore — see note below
    recovery: { recoveryBalance: 0.7, readiness: 0.3 },
    recoveryBalance: { recoveryEvent: 0.55, mobility: 0.45 }, // fatigue intentionally NOT applied here anymore — see note below
    readiness: { adaptation: 0.35, consistency: 0.25, recoveryBalance: 0.25, balance: 0.15 },
};

// Below what sample size a pillar's signal is treated as low-confidence and
// dampened. Fixes the "one skill event spikes the whole pillar" issue —
// a single logged event can no longer swing a score as hard as a
// well-supported average of many events.
const CONFIDENCE_FLOOR_SAMPLE_SIZE = 4;
const confidenceDamp = (raw: number, sampleSize: number): number => {
    if (sampleSize === 0) return 0;
    const confidence = clamp01(sampleSize / CONFIDENCE_FLOOR_SAMPLE_SIZE);
    return raw * confidence;
};

/**
 * Phase 1.3/1.4 implementation approach:
 * - We keep the public output contract unchanged.
 * - Internally we derive "hidden raw components" from generated performance events.
 * - Then we map those raw components into the 6 pillar scores.
 *
 * Fix summary (see AnalyticsView session notes):
 * 1. Scores are now `raw * 100` instead of `50 + raw*50` — pillars can
 *    actually go near 0 when there's genuinely no supporting activity,
 *    instead of floor-ing at ~50 regardless of behavior.
 * 2. Fatigue is scoped to Strength + Readiness only (was incorrectly
 *    dragging down Endurance and Mobility/Recovery too, off a fatigue
 *    signal that was itself dominated by strength volume).
 * 3. overloadStrength no longer mixes in strength_fatigue_proxy events —
 *    those no longer exist as a separate event type (merged in
 *    performanceEvents.ts), so strength score reflects real strength
 *    training only, undiluted.
 * 4. Consistency now accounts for actual logging gaps (activeDaysRatio),
 *    not just the average quality of days that *were* logged.
 *
 * TODO: readinessEngine.ts computes a second, independent notion of
 * "readiness" for the Readiness Index card. That should be refactored to
 * consume `readinessRaw`/the pillar scores from this file rather than
 * recomputing its own — otherwise the Readiness card and the Recovery
 * pillar can visibly disagree. Needs that file to complete the merge.
 */
export const calculatePerformanceScores = (workouts: Workout[], evaluationDate: Date = new Date()): PerformanceScores => {

    if (!workouts || workouts.length === 0) {
        return {
            strengthScore: 0,
            consistencyScore: 0,
            mobilityScore: 0,
            enduranceScore: 0,
            skillScore: 0,
            recoveryScore: 0,
        };
    }

    const events = generatePerformanceEvents(workouts);

    // ==========================
    // Time window
    // ==========================
    const now = evaluationDate;
    const last28DaysAgo = (() => {
        const d = new Date(now);
        d.setDate(d.getDate() - 28);
        return d;
    })();

    const inLast28 = (timestamp: string) => {
        const t = new Date(timestamp);
        return t >= last28DaysAgo && t <= now;
    };

    const recentEvents = events.filter(e => inLast28(e.timestamp));

    // Helper to aggregate event intensities (or recovery costs) per day before averaging.
    // Fixes the issue where multiple exercises in one workout diluted the average 
    // instead of accumulating their volume/effort for the day's total.
    const getDailySums = (eventList: typeof recentEvents, valueMapper: (e: typeof recentEvents[0]) => number) => {
        const sums = new Map<string, number>();
        for (const e of eventList) {
            const dateStr = e.timestamp.slice(0, 10);
            sums.set(dateStr, (sums.get(dateStr) || 0) + valueMapper(e));
        }
        return Array.from(sums.values());
    };

    // ==========================
    // Fatigue — scoped to strength only now, not a blended cross-category average.
    // (Strength is this app's dominant, well-instrumented training signal;
    // applying fatigue derived from it to unrelated pillars like Mobility/
    // Endurance was never a meaningful relationship.)
    // ==========================
    const strengthEvents = recentEvents.filter(e => e.attribute === 'strength');
    const fatigueProxy = avg(getDailySums(strengthEvents.filter(e => e.recoveryCost > 0), e => e.recoveryCost).map(clamp01));
    const fatigueRaw = clamp01(fatigueProxy * 1.3);

    // adaptation: net beneficial intensity vs recovery cost, still cross-category
    // for the readiness blend (this one is fine to stay broad — readiness is
    // meant to reflect overall training load, not one pillar).
    const nonRecoveryEvents = recentEvents.filter(e => e.attribute !== 'recovery');
    const beneficialIntensity = avg(getDailySums(nonRecoveryEvents, e => e.intensity).map(clamp01));
    const overallFatigueForReadiness = avg(getDailySums(recentEvents.filter(e => e.recoveryCost > 0), e => e.recoveryCost).map(clamp01));
    const adaptationRaw = clamp01(beneficialIntensity * 1.1 - overallFatigueForReadiness * 0.9);

    // ==========================
    // Overload (Strength / Endurance)
    // ==========================
    // Fix: only real strength events feed this now — no more mixing in
    // dampened fatigue-proxy duplicates that used to dilute the signal.
    const overloadStrength = avg(getDailySums(strengthEvents, e => e.intensity).map(clamp01));

    const enduranceEvents = recentEvents.filter(e => e.attribute === 'endurance');
    const overloadEndurance = avg(getDailySums(enduranceEvents, e => e.intensity).map(clamp01));

    // ==========================
    // Consistency — now gap-aware, not just average quality of logged days.
    // ==========================
    const consistencyEvents = recentEvents.filter(e => e.attribute === 'consistency');
    const consistencyIntensity = avg(getDailySums(consistencyEvents, e => e.intensity).map(clamp01));

    const uniqueLoggedDays = new Set(consistencyEvents.map(e => e.timestamp.slice(0, 10))).size;
    const activeDaysRatio = clamp01(uniqueLoggedDays / 28);

    const currentStreak = calculateStreak(workouts);
    const streakRaw = clamp01(currentStreak / 30);

    const consistencyRaw = clamp01(
        activeDaysRatio * WEIGHTS.consistency.activeDays +
        consistencyIntensity * WEIGHTS.consistency.eventQuality +
        streakRaw * WEIGHTS.consistency.streak
    );

    // ==========================
    // Mobility / Recovery balance
    // ==========================
    const mobilityEvents = recentEvents.filter(e => e.attribute === 'mobility');
    const mobilityDaily = getDailySums(mobilityEvents, e => e.intensity).map(clamp01);
    const mobilityRaw = confidenceDamp(avg(mobilityDaily), mobilityDaily.length);

    const recoveryEvents = recentEvents.filter(e => e.attribute === 'recovery');
    const recoveryRawEvent = avg(getDailySums(recoveryEvents, e => e.intensity).map(clamp01));

    // Fix: no longer subtracts fatigueRaw — fatigue is scoped to strength/readiness now.
    const recoveryBalanceRaw = clamp01(
        recoveryRawEvent * WEIGHTS.recoveryBalance.recoveryEvent +
        mobilityRaw * WEIGHTS.recoveryBalance.mobility
    );

    // ==========================
    // Skill — dampened by sample size so one logged event can't spike it.
    // ==========================
    const skillEvents = recentEvents.filter(e => e.attribute === 'skill');
    const skillDaily = getDailySums(skillEvents, e => e.intensity).map(clamp01);
    const skillRaw = confidenceDamp(avg(skillDaily), skillDaily.length);

    // ==========================
    // Balance across categories (still used for readiness only)
    // ==========================
    const spreadValues = [overloadStrength, overloadEndurance, mobilityRaw, skillRaw];
    const maxSpread = Math.max(...spreadValues, 0);
    const minSpread = Math.min(...spreadValues, 0);
    const balanceRaw = clamp01(1 - (maxSpread - minSpread) * 0.7);

    // ==========================
    // Readiness — still a blend, fatigue-aware via adaptationRaw above.
    // ==========================
    const readinessRaw = clamp01(
        adaptationRaw * WEIGHTS.readiness.adaptation +
        consistencyRaw * WEIGHTS.readiness.consistency +
        recoveryBalanceRaw * WEIGHTS.readiness.recoveryBalance +
        balanceRaw * WEIGHTS.readiness.balance
    );

    // ==========================
    // Map raw components -> 0..100 pillars
    // Fix: score = raw * 100, not 50 + raw*50. Neglected pillars can now
    // genuinely read low instead of floor-ing near 50 regardless of activity.
    // ==========================
    const strengthRaw = clamp01(
        overloadStrength * WEIGHTS.strength.overload +
        adaptationRaw * WEIGHTS.strength.adaptation -
        fatigueRaw * WEIGHTS.strength.fatigue
    );
    const enduranceRaw = clamp01(
        overloadEndurance * WEIGHTS.endurance.overload +
        adaptationRaw * WEIGHTS.endurance.adaptation
    );
    const mobilityScoreRaw = clamp01(
        mobilityRaw * WEIGHTS.mobility.mobilityRaw +
        recoveryBalanceRaw * WEIGHTS.mobility.recoveryBalance
    );
    const recoveryScoreRaw = clamp01(
        recoveryBalanceRaw * WEIGHTS.recovery.recoveryBalance +
        readinessRaw * WEIGHTS.recovery.readiness
    );

    return {
        strengthScore: clampScore(strengthRaw * 100),
        consistencyScore: clampScore(consistencyRaw * 100),
        mobilityScore: clampScore(mobilityScoreRaw * 100),
        enduranceScore: clampScore(enduranceRaw * 100),
        skillScore: clampScore(skillRaw * 100),
        recoveryScore: clampScore(recoveryScoreRaw * 100),
    };
};