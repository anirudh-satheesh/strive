import type { Workout, WorkoutExercise } from '../types';

export type RecordMetric = 'weight' | 'reps' | 'duration' | 'distance';

export type SignificanceTier = 'debut' | 'new-mark' | 'milestone' | 'career-record';

export interface HallOfFameEntry {
    exerciseName: string;
    metric: RecordMetric;
    /** Current all-time personal record value. */
    current: number;
    /** Previous personal record value (null when this is the first record). */
    previous: number | null;
    /** Date the current record was achieved. */
    date: string;
    /** Date the first record for this exercise was achieved. */
    firstDate: string;
    /** Absolute improvement over the previous record (0 for first records). */
    improvement: number;
    /** Percentage improvement over the previous record (0 for first records). */
    improvementPct: number;
    /** Number of times the record has been broken (1 = first record). */
    prCount: number;
    significance: SignificanceTier;
}

const safeNum = (v: unknown): number => {
    const n = Number(v);
    return isFinite(n) ? n : 0;
};

interface MetricValues {
    weight: number;
    reps: number;
    duration: number;
    distance: number;
}

const getInstanceMetrics = (ex: WorkoutExercise): MetricValues => {
    const out: MetricValues = { weight: 0, reps: 0, duration: 0, distance: 0 };
    if (Array.isArray(ex.sets) && ex.sets.length > 0) {
        for (const s of ex.sets) {
            out.weight = Math.max(out.weight, safeNum(s.weight));
            out.reps = Math.max(out.reps, safeNum(s.reps));
            out.duration = Math.max(out.duration, safeNum(s.duration));
            out.distance = Math.max(out.distance, safeNum(s.distance));
        }
    } else {
        out.weight = Math.max(out.weight, safeNum(ex.weight));
        out.reps = Math.max(out.reps, safeNum(ex.reps));
        out.duration = Math.max(out.duration, safeNum(ex.duration));
        out.distance = Math.max(out.distance, safeNum(ex.distance));
    }
    return out;
};

/**
 * Chooses the metric that defines a personal record for an exercise.
 * Weighted movements are tracked by load, timed holds by duration,
 * cardio by distance, and everything else (bodyweight movements) by reps.
 */
const detectPrimaryMetric = (instances: MetricValues[]): RecordMetric => {
    const hasWeight = instances.some(m => m.weight > 0);
    const hasDuration = instances.some(m => m.duration > 0);
    const hasDistance = instances.some(m => m.distance > 0);
    if (hasWeight) return 'weight';
    if (hasDuration) return 'duration';
    if (hasDistance) return 'distance';
    return 'reps';
};

/**
 * Ranks how meaningful the latest record is relative to the athlete's own
 * history. Combines the relative jump, the absolute gain, and a magnitude
 * factor so a small percentage improvement at a high performance level is
 * still recognised — progress simply gets harder the higher you climb.
 * This deliberately avoids judging significance purely by percentage.
 */
const significanceOf = (entry: Omit<HallOfFameEntry, 'significance'>): SignificanceTier => {
    if (entry.prCount <= 1) return 'debut';

    const relative = entry.current > 0 ? entry.improvement / entry.current : 0;
    const magnitudeBoost = 1 + Math.log10(Math.max(entry.current, 1)) / 3;
    const score = relative * 100 * magnitudeBoost + Math.min(entry.improvement / 20, 10);

    if (score >= 22) return 'career-record';
    if (score >= 9) return 'milestone';
    return 'new-mark';
};

/**
 * Reconstructs the full personal-record history for every exercise from the
 * athlete's own workout log, then returns one entry per exercise describing
 * the current record, when it was set, and how much it improved over the
 * previous one. Entries are sorted most-recently-achieved first so the
 * featured hero is always the latest achievement.
 */
export const computeHallOfFame = (workouts: Workout[]): HallOfFameEntry[] => {
    const sorted = [...workouts]
        .filter(w => !w.isRestDay)
        .sort((a, b) => a.date.localeCompare(b.date));

    const byExercise = new Map<string, { date: string; metrics: MetricValues }[]>();

    for (const w of sorted) {
        for (const ex of w.exercises) {
            const metrics = getInstanceMetrics(ex);
            const list = byExercise.get(ex.name) || [];
            list.push({ date: w.date, metrics });
            byExercise.set(ex.name, list);
        }
    }

    const entries: HallOfFameEntry[] = [];

    for (const [exerciseName, instances] of byExercise) {
        const metric = detectPrimaryMetric(instances.map(i => i.metrics));

        let best = 0;
        const moments: { date: string; value: number }[] = [];

        for (const inst of instances) {
            const value = inst.metrics[metric];
            if (value > best) {
                best = value;
                moments.push({ date: inst.date, value });
            }
        }

        if (moments.length === 0) continue;

        const latest = moments[moments.length - 1];
        const previous = moments.length >= 2 ? moments[moments.length - 2] : null;

        const improvement = previous ? latest.value - previous.value : 0;
        const improvementPct = previous && previous.value > 0
            ? Math.round((improvement / previous.value) * 100)
            : 0;

        const baseEntry = {
            exerciseName,
            metric,
            current: latest.value,
            previous: previous ? previous.value : null,
            date: latest.date,
            firstDate: moments[0].date,
            improvement,
            improvementPct,
            prCount: moments.length,
        };

        entries.push({ ...baseEntry, significance: significanceOf(baseEntry) });
    }

    // Most recently achieved record first — used as the featured hero.
    return entries.sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date);
        if (dateCmp !== 0) return dateCmp;
        return b.prCount - a.prCount;
    });
};

/** Formats a record value as a number (without a unit suffix). */
export const formatPRNumber = (value: number, metric: RecordMetric): string => {
    if (metric === 'duration') {
        const total = Math.round(value);
        if (total >= 60) {
            const m = Math.floor(total / 60);
            const s = total % 60;
            return `${m}:${String(s).padStart(2, '0')}`;
        }
        return String(total);
    }
    if (metric === 'weight' || metric === 'distance') {
        return value % 1 === 0 ? String(value) : value.toFixed(1);
    }
    return String(Math.round(value));
};

/** Formats the unit suffix for a record value. */
export const formatPRUnit = (value: number, metric: RecordMetric): string => {
    switch (metric) {
        case 'weight': return 'kg';
        case 'reps': return 'reps';
        case 'duration': return value >= 60 ? '' : 's';
        case 'distance': return 'm';
    }
};

export const formatAchievementDate = (dateStr?: string): string => {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const SIGNIFICANCE_META: Record<SignificanceTier, {
    label: string;
    textClass: string;
    badgeClass: string;
    glowClass: string;
    bgGlow: string;
    gradient: string;
}> = {
    debut: {
        label: 'Debut',
        textClass: 'text-zinc-300',
        badgeClass: 'bg-zinc-400/10 border-zinc-400/25 text-zinc-300',
        glowClass: 'shadow-[0_0_24px_rgba(161,161,170,0.12)]',
        bgGlow: 'bg-zinc-400/10',
        gradient: 'from-zinc-300 to-zinc-500',
    },
    'new-mark': {
        label: 'New Mark',
        textClass: 'text-sky-300',
        badgeClass: 'bg-sky-400/10 border-sky-400/25 text-sky-300',
        glowClass: 'shadow-[0_0_28px_rgba(56,189,248,0.15)]',
        bgGlow: 'bg-sky-400/10',
        gradient: 'from-sky-400 to-blue-500',
    },
    milestone: {
        label: 'Milestone',
        textClass: 'text-amber-300',
        badgeClass: 'bg-amber-400/10 border-amber-400/30 text-amber-300',
        glowClass: 'shadow-[0_0_32px_rgba(251,191,36,0.2)]',
        bgGlow: 'bg-amber-400/10',
        gradient: 'from-amber-400 to-orange-500',
    },
    'career-record': {
        label: 'Career Record',
        textClass: 'text-amber-200',
        badgeClass: 'bg-amber-400/15 border-amber-300/30 text-amber-200',
        glowClass: 'shadow-[0_0_40px_rgba(251,191,36,0.28)]',
        bgGlow: 'bg-amber-400/15',
        gradient: 'from-amber-300 via-yellow-400 to-rose-400',
    },
};

