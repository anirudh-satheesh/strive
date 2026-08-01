import type { Workout, WorkoutExercise } from '../types';
import { PREDEFINED_EXERCISES } from '../data/exercises';
import { generatePerformanceEvents } from './performanceEvents';

/**
 * Shared analytics layer for the Training Calendar.
 *
 * Reused by Timeline / Journey / Performance DNA — classification, PR
 * detection, day scoring and monthly summaries all live here so the
 * calendar never re-implements its own heuristics.
 */

const exerciseMetaMap = new Map(PREDEFINED_EXERCISES.map(ex => [ex.name.toLowerCase(), ex]));

export type DayType = 'strength' | 'cardio' | 'recovery' | 'mixed' | 'double' | 'rest' | 'none';

export interface DayAnalysis {
    date: string;
    type: DayType;
    isRestDay: boolean;
    hasWorkout: boolean;
    /** Number of distinct workouts logged on this date (2+ = double session). */
    workoutCount: number;
    exerciseCount: number;
    totalSets: number;
    /** Total volume in kg (sum of reps × weight). */
    totalVolume: number;
    /** Total logged duration in seconds. */
    durationSec: number;
    /** 0–100 score derived from the performance event engine. */
    performanceScore: number;
    prCount: number;
    prExercises: string[];
    exerciseNames: string[];
}

export interface MonthSummary {
    totalWorkouts: number;
    activeDays: number;
    restDays: number;
    averagePerformanceScore: number;
    prCount: number;
    prExercises: string[];
    /** Active days ÷ total days in the month (0–100). */
    trainingDensity: number;
    /** Active days ÷ elapsed days so far this month (0–100). */
    consistencyScore: number;
}

const safeNum = (v: unknown): number => {
    const n = Number(v);
    return isFinite(n) ? n : 0;
};

// ─────────────────────────────────────────────────────────────
// Per-exercise helpers
// ─────────────────────────────────────────────────────────────

export const getExerciseMaxWeight = (ex: WorkoutExercise): number => {
    if (Array.isArray(ex.sets) && ex.sets.length > 0) {
        return Math.max(...ex.sets.map(s => safeNum(s.weight)));
    }
    return safeNum(ex.weight);
};

export const getExerciseDurationSec = (ex: WorkoutExercise): number => {
    if (Array.isArray(ex.sets) && ex.sets.length > 0) {
        return ex.sets.reduce((acc, s) => acc + safeNum(s.duration), 0);
    }
    return safeNum(ex.duration);
};

export const getExerciseVolume = (ex: WorkoutExercise): number => {
    if (Array.isArray(ex.sets) && ex.sets.length > 0) {
        return ex.sets.reduce((acc, s) => acc + safeNum(s.reps) * safeNum(s.weight), 0);
    }
    return safeNum(ex.reps) * safeNum(ex.weight);
};

export const getExerciseDistance = (ex: WorkoutExercise): number => {
    if (Array.isArray(ex.sets) && ex.sets.length > 0) {
        return ex.sets.reduce((acc, s) => acc + safeNum(s.distance), 0);
    }
    return safeNum(ex.distance);
};

// ─────────────────────────────────────────────────────────────
// Classification
// ─────────────────────────────────────────────────────────────

type ExerciseClass = 'strength' | 'cardio' | 'recovery' | 'other';

const classifyExercise = (ex: WorkoutExercise): ExerciseClass => {
    const meta = exerciseMetaMap.get(ex.name.toLowerCase());
    if (meta) {
        const types = meta.performanceTypes ?? [];
        if (types.includes('strength')) return 'strength';
        if (types.includes('endurance')) return 'cardio';
        if (types.includes('recovery') || types.includes('mobility')) return 'recovery';
        if (types.includes('skill')) return 'recovery'; // bodyweight skill/holds read as active recovery
    }

    // Best-effort inference from the shape of the logged data.
    const hasWeight = Array.isArray(ex.sets)
        ? ex.sets.some(s => safeNum(s.weight) > 0)
        : safeNum(ex.weight) > 0;
    const hasDistance = Array.isArray(ex.sets)
        ? ex.sets.some(s => safeNum(s.distance) > 0)
        : safeNum(ex.distance) > 0;
    const hasDuration = Array.isArray(ex.sets)
        ? ex.sets.some(s => safeNum(s.duration) > 0)
        : safeNum(ex.duration) > 0;

    if (hasWeight) return 'strength';
    if (hasDistance) return 'cardio';
    if (hasDuration) return 'recovery';
    return 'other';
};

/**
 * Classifies one calendar day from all workouts logged on that date.
 * A double session means two or more distinct workouts on the same day.
 */
const classifyWorkout = (workoutsForDate: Workout[]): DayType => {
    const activeWorkouts = workoutsForDate.filter(w => !w.isRestDay && (w.exercises ?? []).length > 0);

    // Double session — two distinct workouts logged on the same date.
    if (activeWorkouts.length >= 2) return 'double';

    // Active recovery — a rest day with light work logged.
    if (activeWorkouts.length === 0 && workoutsForDate.some(w => w.isRestDay && (w.exercises ?? []).length > 0)) {
        return 'recovery';
    }

    if (activeWorkouts.length === 0) {
        return workoutsForDate.some(w => w.isRestDay) ? 'rest' : 'none';
    }

    const workout = activeWorkouts[0];
    const counts = { strength: 0, cardio: 0, recovery: 0 };
    let classified = 0;

    for (const ex of (workout.exercises ?? [])) {
        const cls = classifyExercise(ex);
        if (cls === 'strength') { counts.strength++; classified++; }
        else if (cls === 'cardio') { counts.cardio++; classified++; }
        else if (cls === 'recovery') { counts.recovery++; classified++; }
    }

    if (classified === 0) return 'mixed';

    const entries = (Object.entries(counts) as [keyof typeof counts, number][]).filter(([, c]) => c > 0);
    if (entries.length === 1) return entries[0][0];

    const sorted = entries.sort((a, b) => b[1] - a[1]);
    const [topType, topCount] = sorted[0];
    return topCount / classified >= 0.7 ? topType : 'mixed';
};

// ─────────────────────────────────────────────────────────────
// Day scores (0–100) via the performance event engine
// ─────────────────────────────────────────────────────────────

export const computeDayScores = (workouts: Workout[]): Map<string, number> => {
    const result = new Map<string, number>();
    if (!workouts || workouts.length === 0) return result;

    const events = generatePerformanceEvents(workouts);
    const byDate = new Map<string, number[]>();

    for (const e of events) {
        if (e.attribute === 'consistency') continue; // score reflects actual training signal
        const date = e.timestamp.slice(0, 10);
        const list = byDate.get(date) || [];
        list.push(e.intensity);
        byDate.set(date, list);
    }

    for (const [date, intensities] of byDate) {
        if (intensities.length === 0) continue;
        const avg = intensities.reduce((a, b) => a + b, 0) / intensities.length;
        result.set(date, Math.round(Math.max(0, Math.min(1, avg)) * 100));
    }

    return result;
};

// ─────────────────────────────────────────────────────────────
// Personal records (chronological max-weight comparison)
// ─────────────────────────────────────────────────────────────

export interface PRInfo {
    count: number;
    exercises: string[];
}

export const computeDayPRs = (workouts: Workout[]): Map<string, PRInfo> => {
    const result = new Map<string, PRInfo>();
    const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date));
    const priorMax = new Map<string, number>();

    for (const w of sorted) {
        if (w.isRestDay) continue;

        const dayPRs: string[] = [];
        for (const ex of (w.exercises ?? [])) {
            const weight = getExerciseMaxWeight(ex);
            if (weight <= 0) continue;

            const prior = priorMax.get(ex.name) || 0;
            if (weight > prior) {
                dayPRs.push(ex.name);
                priorMax.set(ex.name, weight);
            }
        }

        if (dayPRs.length > 0) {
            result.set(w.date, { count: dayPRs.length, exercises: dayPRs });
        }
    }

    return result;
};

// ─────────────────────────────────────────────────────────────
// Full day analysis map
// ─────────────────────────────────────────────────────────────

export const analyzeWorkouts = (workouts: Workout[]): Map<string, DayAnalysis> => {
    const byDate = new Map<string, Workout[]>();
    for (const w of workouts) {
        const list = byDate.get(w.date) || [];
        list.push(w);
        byDate.set(w.date, list);
    }

    const scores = computeDayScores(workouts);
    const prs = computeDayPRs(workouts);
    const result = new Map<string, DayAnalysis>();

    for (const [date, wos] of byDate) {
        const activeWorkouts = wos.filter(w => !w.isRestDay && (w.exercises ?? []).length > 0);
        const hasRestDay = wos.some(w => w.isRestDay);

        let exerciseCount = 0;
        let totalSets = 0;
        let totalVolume = 0;
        let durationSec = 0;
        const exerciseNames: string[] = [];

        for (const w of activeWorkouts) {
            for (const ex of (w.exercises ?? [])) {
                exerciseCount++;
                totalSets += Array.isArray(ex.sets) ? ex.sets.length : Number(ex.sets) || 0;
                totalVolume += getExerciseVolume(ex);
                durationSec += getExerciseDurationSec(ex);
                if (!exerciseNames.includes(ex.name)) exerciseNames.push(ex.name);
            }
        }

        const dayPR = prs.get(date);
        const type = classifyWorkout(wos);

        result.set(date, {
            date,
            type,
            isRestDay: hasRestDay && activeWorkouts.length === 0,
            hasWorkout: activeWorkouts.length > 0,
            workoutCount: activeWorkouts.length,
            exerciseCount,
            totalSets,
            totalVolume,
            durationSec,
            performanceScore: scores.get(date) ?? 0,
            prCount: dayPR?.count ?? 0,
            prExercises: dayPR?.exercises ?? [],
            exerciseNames,
        });
    }

    // Fill in missing dates (no data) — not strictly needed but useful for lookups.
    return result;
};

// ─────────────────────────────────────────────────────────────
// Monthly summary
// ─────────────────────────────────────────────────────────────

export const computeMonthSummary = (
    analysis: Map<string, DayAnalysis>,
    year: number,
    month: number, // 0-indexed
): MonthSummary => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const elapsedDays = isCurrentMonth ? Math.min(today.getDate(), daysInMonth) : daysInMonth;

    let totalWorkouts = 0;
    let activeDays = 0;
    let restDays = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    const prSet = new Set<string>();

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const day = analysis.get(dateStr);
        if (!day) continue;

        if (day.hasWorkout) {
            totalWorkouts += day.workoutCount;
            activeDays++;
        }
        if (day.isRestDay) restDays++;

        if (day.performanceScore > 0) {
            scoreSum += day.performanceScore;
            scoreCount++;
        }

        for (const ex of day.prExercises) {
            prSet.add(ex);
        }
    }

    const trainingDensity = daysInMonth > 0 ? Math.round((activeDays / daysInMonth) * 100) : 0;
    const consistencyScore = elapsedDays > 0 ? Math.round((activeDays / elapsedDays) * 100) : 0;

    return {
        totalWorkouts,
        activeDays,
        restDays,
        averagePerformanceScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0,
        prCount: prSet.size,
        prExercises: Array.from(prSet),
        trainingDensity,
        consistencyScore,
    };
};

// ─────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────

export const formatDuration = (seconds: number): string => {
    if (seconds <= 0) return '—';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
};

export const formatVolume = (kg: number): string => {
    if (kg <= 0) return '—';
    if (kg >= 1000) {
        const t = (kg / 1000).toFixed(1);
        return `${t}t`;
    }
    return `${Math.round(kg)}kg`;
};

export const DAY_TYPE_META: Record<DayType, {
    label: string;
    icon: string;
    color: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
}> = {
    strength: {
        label: 'Strength',
        icon: 'Dumbbell',
        color: '#FB923C',
        bgClass: 'bg-orange-500/10',
        textClass: 'text-orange-400',
        borderClass: 'border-orange-500/20',
    },
    cardio: {
        label: 'Cardio',
        icon: 'Heart',
        color: '#22D3EE',
        bgClass: 'bg-cyan-500/10',
        textClass: 'text-cyan-400',
        borderClass: 'border-cyan-500/20',
    },
    recovery: {
        label: 'Recovery',
        icon: 'Leaf',
        color: '#4ADE80',
        bgClass: 'bg-emerald-500/10',
        textClass: 'text-emerald-400',
        borderClass: 'border-emerald-500/20',
    },
    mixed: {
        label: 'Mixed',
        icon: 'Activity',
        color: '#818CF8',
        bgClass: 'bg-indigo-500/10',
        textClass: 'text-indigo-400',
        borderClass: 'border-indigo-500/20',
    },
    double: {
        label: 'Double',
        icon: 'Zap',
        color: '#FACC15',
        bgClass: 'bg-yellow-500/10',
        textClass: 'text-yellow-400',
        borderClass: 'border-yellow-500/20',
    },
    rest: {
        label: 'Rest',
        icon: 'Moon',
        color: '#A1A1AA',
        bgClass: 'bg-zinc-500/10',
        textClass: 'text-zinc-400',
        borderClass: 'border-zinc-500/20',
    },
    none: {
        label: 'Missed',
        icon: 'Minus',
        color: '#3F3F46',
        bgClass: 'bg-zinc-800/20',
        textClass: 'text-zinc-600',
        borderClass: 'border-zinc-800/30',
    },
};
