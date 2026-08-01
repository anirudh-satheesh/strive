import type { PerformanceEvent, PerformanceAttribute, Workout, WorkoutExercise, WorkoutSet } from '../types';

import { PREDEFINED_EXERCISES } from '../data/exercises';

const exerciseMetaMap = new Map(PREDEFINED_EXERCISES.map(ex => [ex.name.toLowerCase(), ex]));

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const safeNum = (v: unknown): number => {
    const n = Number(v);
    return isFinite(n) ? n : 0;
};

const pushEvent = (
    events: PerformanceEvent[],
    partial: Omit<PerformanceEvent, 'timestamp'> & { timestamp?: string }
) => {
    events.push({
        ...partial,
        timestamp: partial.timestamp ?? new Date().toISOString(),
    });
};

// ==========================================================
// Tunable constants — named so future calibration is intentional,
// not buried inline. TODO: once PREDEFINED_EXERCISES exposes a
// per-exercise "typical volume" / "typical working weight" field,
// swap these flat normalizers for per-exercise ones.
// ==========================================================
const NORMALIZERS = {
    strengthVolume: 1500,       // reps*weight per exercise-session considered "high" effort
    strengthWeightBonusCap: 100, // kg considered "very heavy" for the small PR bonus
    mobilitySeconds: 600,       // 10 min
    enduranceDistance: 50000,   // 50k
    enduranceDuration: 3600,    // 1h
    skillDurationSeconds: 60,  // 1 min hold considered elite
    skillReps: 30,
};

const WEIGHTS = {
    strengthVolumeWeight: 0.85,
    strengthPrBonusWeight: 0.15,
    incompleteSetCredit: 0.5, // partial credit multiplier for logged-but-not-marked-completed sets
    implicitMobilityIntensity: 0.45, // baseline credit for warm-up/cool-down stretching around a strength session, when no mobility work is logged separately
    implicitRecoveryIntensity: { passive: 0.5, active: 0.65 }, // rest days are a legitimate recovery signal — see note below
};

/**
 * Returns sets with an associated credit multiplier:
 * - fully completed sets => 1.0
 * - logged but not marked completed => partial credit (used to be dropped entirely)
 * Sets with no meaningful data (no reps/weight/duration/distance) are excluded either way.
 */
const getEffectiveSets = (ex: WorkoutExercise): { set: WorkoutSet; credit: number }[] => {
    if (!Array.isArray(ex.sets)) return [];
    return ex.sets
        .filter(s => safeNum(s.reps) > 0 || safeNum(s.weight) > 0 || safeNum(s.duration) > 0 || safeNum(s.distance) > 0)
        .map(s => ({ set: s, credit: s.completed ? 1 : WEIGHTS.incompleteSetCredit }));
};

/**
 * Phase 1.3 (scaffolding): event generation layer.
 *
 * Important: this is intentionally heuristic.
 * It generates stable, plausible events for existing UI + scoring.
 */
export const generatePerformanceEvents = (workouts: Workout[]): PerformanceEvent[] => {
    if (!workouts || workouts.length === 0) return [];

    const events: PerformanceEvent[] = [];

    // Consistency (attribute-level): derive from workout frequency.
    const sorted = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const w of sorted) {
        const isRest = !!w.isRestDay;
        if (!w.exercises || w.exercises.length === 0) {
            if (isRest) {
                // Pure rest day, nothing logged beyond "this was a rest day".
                pushEvent(events, {
                    eventType: 'consistency_workout',
                    attribute: 'consistency',
                    intensity: 0.3,
                    recoveryCost: 0,
                    timestamp: w.date,
                    workoutId: w.id,
                });
                // Fix: rest days are the primary recovery signal for strength-focused
                // users, who realistically never log a Yoga "Recovery" pose. Without
                // this, the Recovery pillar was structurally unfillable for them —
                // nothing else in the exercise catalog outside Yoga generates a
                // recovery-attribute event.
                pushEvent(events, {
                    eventType: 'recovery_progress',
                    attribute: 'recovery',
                    intensity: WEIGHTS.implicitRecoveryIntensity.passive,
                    recoveryCost: 0,
                    timestamp: w.date,
                    workoutId: w.id,
                });
            }
            continue;
        }

        // Fix: active recovery (logged mobility/light work on a rest day) should
        // score HIGHER than a passive rest day with nothing logged, not lower.
        const intensity = isRest ? 0.45 : 0.7;
        pushEvent(events, {
            eventType: 'consistency_workout',
            attribute: 'consistency',
            intensity,
            recoveryCost: isRest ? 0 : 0.12,
            timestamp: w.date,
            workoutId: w.id,
        });

        // Active recovery day (isRestDay=true but something light was logged)
        // gets slightly more recovery credit than a fully passive rest day.
        if (isRest) {
            pushEvent(events, {
                eventType: 'recovery_progress',
                attribute: 'recovery',
                intensity: WEIGHTS.implicitRecoveryIntensity.active,
                recoveryCost: 0,
                timestamp: w.date,
                workoutId: w.id,
            });
        }
    }

    // Per-exercise events.
    for (const w of sorted) {
        if (!w.exercises) continue;

        let mobilityEventsThisWorkout = 0;
        let hadStrengthThisWorkout = false;

        for (const ex of w.exercises) {
            const meta = exerciseMetaMap.get(ex.name.toLowerCase());
            const timestamp = w.date;
            const effectiveSets = getEffectiveSets(ex);

            // Fix: unmatched/custom exercises no longer vanish from scoring.
            // Best-effort categorize from the logged data shape itself.
            if (!meta) {
                const hasWeight = effectiveSets.some(({ set }) => safeNum(set.weight) > 0);
                const hasDuration = effectiveSets.some(({ set }) => safeNum(set.duration) > 0);
                const hasDistance = effectiveSets.some(({ set }) => safeNum(set.distance) > 0);

                if (hasWeight) {
                    hadStrengthThisWorkout = true;
                    let volume = 0;
                    for (const { set, credit } of effectiveSets) {
                        volume += safeNum(set.reps) * safeNum(set.weight) * credit;
                    }
                    const intensity = clamp01(volume / NORMALIZERS.strengthVolume) * 0.7; // lower confidence than a matched exercise
                    pushEvent(events, {
                        eventType: 'strength_progress_unmatched',
                        attribute: 'strength',
                        intensity,
                        recoveryCost: clamp01(volume / 12000) * 0.35,
                        timestamp,
                        workoutId: w.id,
                        exerciseName: ex.name,
                    });
                } else if (hasDistance) {
                    let distance = 0, duration = 0;
                    for (const { set, credit } of effectiveSets) {
                        distance += safeNum(set.distance) * credit;
                        duration += safeNum(set.duration) * credit;
                    }
                    const intensity = Math.max(
                        clamp01(distance / NORMALIZERS.enduranceDistance),
                        clamp01(duration / NORMALIZERS.enduranceDuration)
                    ) * 0.7;
                    pushEvent(events, {
                        eventType: 'endurance_progress_unmatched',
                        attribute: 'endurance',
                        intensity,
                        recoveryCost: 0.08 + intensity * 0.22,
                        timestamp,
                        workoutId: w.id,
                        exerciseName: ex.name,
                    });
                } else if (hasDuration) {
                    let seconds = 0;
                    for (const { set, credit } of effectiveSets) seconds += safeNum(set.duration) * credit;
                    const intensity = clamp01(seconds / NORMALIZERS.mobilitySeconds) * 0.7;
                    mobilityEventsThisWorkout++;
                    pushEvent(events, {
                        eventType: 'mobility_progress_unmatched',
                        attribute: 'mobility',
                        intensity,
                        recoveryCost: 0.04 + intensity * 0.08,
                        timestamp,
                        workoutId: w.id,
                        exerciseName: ex.name,
                    });
                }
                // If we truly can't tell anything about the logged sets, skip —
                // there's nothing meaningful to score, but this is now the rare
                // case rather than the default for any unmatched exercise name.
                continue;
            }

            // Strength — fixed to be volume-driven, with weight treated as a
            // small bonus rather than 80% of the score.
            const isStrength = meta.performanceTypes?.includes('strength');
            if (isStrength) {
                hadStrengthThisWorkout = true;

                let volume = 0;
                let heaviestSet = 0;

                if (effectiveSets.length > 0) {
                    for (const { set, credit } of effectiveSets) {
                        const weight = safeNum(set.weight);
                        const reps = safeNum(set.reps);
                        volume += reps * weight * credit;
                        heaviestSet = Math.max(heaviestSet, weight);
                    }
                } else {
                    // Fallback for legacy/un-normalized single-value exercises
                    const legacy = ex as unknown as Partial<{ weight: number | string; reps: number | string; sets: number | string }>;
                    const weight = safeNum(legacy.weight);
                    const reps = safeNum(legacy.reps);
                    const setsCount = safeNum(legacy.sets);
                    volume = setsCount * reps * weight;
                    heaviestSet = weight;
                }

                const volumeRatio = clamp01(volume / NORMALIZERS.strengthVolume);
                const prBonus = clamp01(heaviestSet / NORMALIZERS.strengthWeightBonusCap);
                const eventIntensity = clamp01(
                    volumeRatio * WEIGHTS.strengthVolumeWeight +
                    prBonus * WEIGHTS.strengthPrBonusWeight
                );

                // Fix: single merged event carries its own recoveryCost —
                // no more duplicate strength_fatigue_proxy event double-counting
                // fatigue and mislabeling it as attribute:'recovery'.
                pushEvent(events, {
                    eventType: 'strength_progress',
                    attribute: 'strength' satisfies PerformanceAttribute,
                    intensity: eventIntensity,
                    recoveryCost: clamp01(volume / 12000) * 0.4,
                    timestamp,
                    workoutId: w.id,
                    exerciseName: ex.name,
                });
            }

            // Mobility / Duration proxy
            const isMobility = meta.isMobility || meta.performanceTypes?.includes('mobility');
            if (isMobility) {
                let totalSeconds = 0;
                for (const { set, credit } of effectiveSets) {
                    totalSeconds += safeNum(set.duration) * credit;
                }

                const secRatio = clamp01(totalSeconds / NORMALIZERS.mobilitySeconds);
                mobilityEventsThisWorkout++;
                pushEvent(events, {
                    eventType: 'mobility_progress',
                    attribute: 'mobility',
                    intensity: secRatio,
                    recoveryCost: 0.04 + secRatio * 0.08,
                    timestamp,
                    workoutId: w.id,
                    exerciseName: ex.name,
                });
            }

            // Endurance proxy
            const isEndurance = meta.performanceTypes?.includes('endurance');
            if (isEndurance) {
                let distance = 0;
                let duration = 0;
                for (const { set, credit } of effectiveSets) {
                    distance += safeNum(set.distance) * credit;
                    duration += safeNum(set.duration) * credit;
                }

                const distRatio = clamp01(distance / NORMALIZERS.enduranceDistance);
                const durRatio = clamp01(duration / NORMALIZERS.enduranceDuration);
                const intensity = Math.max(distRatio, durRatio);

                pushEvent(events, {
                    eventType: 'endurance_progress',
                    attribute: 'endurance',
                    intensity,
                    recoveryCost: 0.08 + intensity * 0.22,
                    timestamp,
                    workoutId: w.id,
                    exerciseName: ex.name,
                });
            }

            // Skill proxy — fixed to not compare duration-based and rep-based
            // moves on the same raw 0-200 scale.
            const isSkill = meta.isSkillBased || meta.performanceTypes?.includes('skill');
            if (isSkill) {
                let bestDuration = 0;
                let bestReps = 0;
                for (const { set, credit } of effectiveSets) {
                    bestDuration = Math.max(bestDuration, safeNum(set.duration) * credit);
                    bestReps = Math.max(bestReps, safeNum(set.reps) * credit);
                }
                // Duration-based skill move (e.g. a hold) and rep-based skill move
                // (e.g. high-rep bodyweight skill work) are normalized on their own scales.
                const intensity = bestDuration > 0
                    ? clamp01(bestDuration / NORMALIZERS.skillDurationSeconds)
                    : clamp01(bestReps / NORMALIZERS.skillReps);

                pushEvent(events, {
                    eventType: 'skill_progress',
                    attribute: 'skill',
                    intensity,
                    recoveryCost: 0.03 + intensity * 0.1,
                    timestamp,
                    workoutId: w.id,
                    exerciseName: ex.name,
                });
            }

            // Recovery proxy
            const isRecovery = meta.isRecoveryFocused || meta.performanceTypes?.includes('recovery');
            if (isRecovery) {
                let stretchSeconds = 0;
                for (const { set, credit } of effectiveSets) {
                    stretchSeconds += safeNum(set.duration) * credit;
                }
                const intensity = clamp01(stretchSeconds / NORMALIZERS.mobilitySeconds);
                pushEvent(events, {
                    eventType: 'recovery_progress',
                    attribute: 'recovery',
                    intensity,
                    recoveryCost: 0,
                    timestamp,
                    workoutId: w.id,
                    exerciseName: ex.name,
                });
            }
        }

        // Implicit mobility credit: strength-focused users routinely stretch
        // before/after lifting without logging it as its own exercise. If a
        // strength session happened and no mobility work was logged separately,
        // give a small baseline credit — additive floor, not a replacement for
        // real logged mobility work (which still scores higher on its own).
        if (hadStrengthThisWorkout && mobilityEventsThisWorkout === 0) {
            pushEvent(events, {
                eventType: 'mobility_implicit_credit',
                attribute: 'mobility',
                intensity: WEIGHTS.implicitMobilityIntensity,
                recoveryCost: 0,
                timestamp: w.date,
                workoutId: w.id,
            });
        }
    }

    return events;
};