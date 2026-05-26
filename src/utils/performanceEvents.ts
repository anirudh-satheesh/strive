import type { PerformanceEvent, PerformanceAttribute, Workout, WorkoutExercise, WorkoutSet } from '../types';

import { PREDEFINED_EXERCISES } from '../data/exercises';

const exerciseMetaMap = new Map(PREDEFINED_EXERCISES.map(ex => [ex.name.toLowerCase(), ex]));

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const getCompletedSets = (ex: WorkoutExercise): WorkoutSet[] => {
    if (Array.isArray(ex.sets)) return ex.sets.filter(s => !!s.completed);
    return [];
};

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
    // We'll create one event per workout with attribute=consistency.
    const sorted = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const w of sorted) {
        const isRest = !!w.isRestDay;
        if (!w.exercises || w.exercises.length === 0) {
            if (isRest) {
                pushEvent(events, {
                    eventType: 'consistency_workout',
                    attribute: 'consistency',
                    intensity: 0.35,
                    recoveryCost: 0,
                    timestamp: w.date,
                    workoutId: w.id,
                });
            }
            continue;
        }

        // Completion quality: assume workout counts as 1 "consistency" unit.
        // Rest days partially support consistency.
        const intensity = isRest ? 0.25 : 0.7;
        pushEvent(events, {
            eventType: 'consistency_workout',
            attribute: 'consistency',
            intensity,
            recoveryCost: isRest ? 0 : 0.12,
            timestamp: w.date,
            workoutId: w.id,
        });
    }

    // Per-exercise events.
    for (const w of sorted) {
        if (!w.exercises) continue;
        for (const ex of w.exercises) {
            const meta = exerciseMetaMap.get(ex.name.toLowerCase());
            if (!meta) continue;

            const timestamp = w.date;
            const completedSets = getCompletedSets(ex);

            // Strength / Overload-ish proxy
            const isStrength = meta.performanceTypes?.includes('strength');
            if (isStrength) {
                let volume = 0;
                let intensityProxy = 0;

                if (completedSets.length > 0) {
                    for (const s of completedSets) {
                        const weight = safeNum(s.weight);
                        const reps = safeNum(s.reps);
                        volume += reps * weight;
                        // intensity proxy: heavier & lower reps tends to matter.
                        // Normalize roughly by weight.
                        intensityProxy = Math.max(intensityProxy, clamp01(weight / 100));
                    }
                } else {
                    // Fallback for legacy/un-normalized
                    const legacy = ex as unknown as Partial<{ weight: number | string; reps: number | string; sets: number | string }>;
                    const weight = safeNum(legacy.weight);
                    const reps = safeNum(legacy.reps);
                    const setsCount = safeNum(legacy.sets);


                    volume = setsCount * reps * weight;
                    intensityProxy = clamp01(weight / 100);
                }

                const eventIntensity = clamp01(intensityProxy * 0.8 + clamp01(volume / 5000) * 0.2);
                pushEvent(events, {
                    eventType: 'strength_progress',
                    attribute: 'strength' satisfies PerformanceAttribute,
                    intensity: eventIntensity,
                    recoveryCost: clamp01(volume / 12000) * 0.35,
                    timestamp,
                    workoutId: w.id,
                    exerciseName: ex.name,
                });

                // Optional: mark fatigue component (hidden scoring will derive it too)
                pushEvent(events, {
                    eventType: 'strength_fatigue_proxy',
                    attribute: 'recovery',
                    intensity: eventIntensity * 0.6,
                    recoveryCost: clamp01(volume / 12000) * 0.45,
                    timestamp,
                    workoutId: w.id,
                    exerciseName: ex.name,
                });
            }

            // Mobility / Duration proxy
            const isMobility = meta.isMobility || meta.performanceTypes?.includes('mobility');
            if (isMobility) {
                let totalSeconds = 0;
                for (const s of completedSets) {
                    totalSeconds += safeNum(s.duration);
                }

                const secRatio = clamp01(totalSeconds / 600); // 10 min
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
                for (const s of completedSets) {
                    distance += safeNum(s.distance);
                    duration += safeNum(s.duration);
                }

                const distRatio = clamp01(distance / 50000); // 50k
                const durRatio = clamp01(duration / 7200); // 2h
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

            // Skill proxy
            const isSkill = meta.isSkillBased || meta.performanceTypes?.includes('skill');
            if (isSkill) {
                let best = 0;
                for (const s of completedSets) {
                    best = Math.max(best, safeNum(s.duration) || safeNum(s.reps));
                }
                const intensity = clamp01(best / 200);
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
                for (const s of completedSets) {
                    stretchSeconds += safeNum(s.duration);
                }
                const intensity = clamp01(stretchSeconds / 600); // 10 min
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
    }

    return events;
};

