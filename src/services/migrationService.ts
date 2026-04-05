import { setDoc } from 'firebase/firestore';
import type { DocumentSnapshot } from 'firebase/firestore';
import type { Workout, WorkoutExercise, WorkoutSet } from '../types';

/** Maximum documents to process (migrate + clean) per invocation. */
const MAX_MIGRATIONS_PER_RUN = 10;

// ─── Detection ───────────────────────────────────────────────────────

/**
 * Old format: exercises have no `sets` array, or `sets` is a plain number
 * rather than an array of set objects.
 */
function isOldFormat(data: Workout): boolean {
    if (!data.exercises || data.exercises.length === 0) return false;
    const first = data.exercises[0];
    return !(
        Array.isArray(first.sets) &&
        first.sets.length > 0 &&
        typeof first.sets[0] === 'object'
    );
}

/**
 * Detects `version` incorrectly placed inside an exercise instead of root.
 */
function hasWrongVersionPlacement(data: Workout): boolean {
    return !!data.exercises?.some(ex => (ex as WorkoutExercise).version !== undefined);
}

/**
 * A document needs cleanup if any of these are true:
 *  - exercise-level legacy fields (reps, weight, duration, distance, category)
 *  - set-level string values for numeric fields
 *  - set missing an `id`
 *  - version inside an exercise object
 *  - missing createdAt
 */
function isDirty(data: Workout): boolean {
    // Structural issues at root level
    if (!data.createdAt) return true;
    if (hasWrongVersionPlacement(data)) return true;

    return !!data.exercises?.some(ex => {
        // Legacy flat fields lingering on the exercise object
        const hasLegacyExFields =
            ex.reps !== undefined ||
            ex.weight !== undefined ||
            ex.duration !== undefined ||
            ex.distance !== undefined ||
            ('category' in ex);

        // Set-level issues
        const hasDirtySets = ex.sets?.some(set =>
            !set.id ||
            typeof set.weight === 'string' ||
            typeof set.reps === 'string' ||
            typeof set.duration === 'string' ||
            typeof set.distance === 'string'
        );

        return hasLegacyExFields || hasDirtySets;
    });
}

// ─── Clean Rebuild ───────────────────────────────────────────────────

/**
 * Builds a pristine v2 set object from any existing set data.
 * Always includes weight (0 for bodyweight) for consistency.
 * Always includes reps for consistency.
 * Duration and distance only included when non-zero.
 */
function cleanSet(set: WorkoutSet): WorkoutSet {
    const cleaned: WorkoutSet = {
        id: set.id || crypto.randomUUID(),
        reps: Number(set.reps) || 0,
        weight: Number(set.weight) || 0,
        completed: set.completed ?? true,
    };

    const duration = Number(set.duration) || 0;
    const distance = Number(set.distance) || 0;

    if (duration) cleaned.duration = duration;
    if (distance) cleaned.distance = distance;

    return cleaned;
}

/**
 * Final clean rebuild — constructs a pristine v2 document from scratch.
 * No spread operators. Only valid fields are included.
 * - version: 2 at root only
 * - createdAt preserved or generated
 * - weight always included (0 for bodyweight)
 * - all numeric fields coerced to number
 */
function finalCleanWorkout(data: Workout): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {
        date: data.date,
        createdAt: data.createdAt || new Date().toISOString(),
        version: 2,
        exercises: (data.exercises || []).map((ex: WorkoutExercise) => ({
            name: ex.name,
            sets: (ex.sets || []).map(cleanSet),
        })),
    };

    if (data.isRestDay) cleaned.isRestDay = true;

    return cleaned;
}

/**
 * Converts an old-format workout (flat fields) into a clean v2 document.
 */
function normalizeOldWorkout(data: Workout): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {
        date: data.date,
        createdAt: data.createdAt || new Date().toISOString(),
        version: 2,
        exercises: (data.exercises || []).map((ex: WorkoutExercise) => ({
            name: ex.name,
            sets: Array.from({ length: Number(ex.sets) || 1 }).map(() => ({
                id: crypto.randomUUID(),
                reps: Number(ex.reps) || 0,
                weight: Number(ex.weight) || 0,
                duration: Number(ex.duration) || 0,
                distance: Number(ex.distance) || 0,
                completed: true,
            })),
        })),
    };

    if (data.isRestDay) cleaned.isRestDay = true;

    return cleaned;
}

// ─── Processing ──────────────────────────────────────────────────────

/**
 * Processes a single document through all checks:
 *  1. Old format → full normalize
 *  2. Wrong version placement → rebuild
 *  3. Dirty v2 (legacy fields, string types, missing ids) → rebuild
 *  4. Missing version stamp → rebuild
 *
 * Uses `setDoc` (full replace) so legacy fields are physically removed.
 * Returns the document ID if written, or `null` if skipped.
 */
async function processDocument(docSnap: DocumentSnapshot): Promise<string | null> {
    const data = docSnap.data() as Workout | undefined;
    if (!data) return null;

    let updated: Record<string, unknown> | null = null;

    if (isOldFormat(data)) {
        updated = normalizeOldWorkout(data);
    } else if (data.version !== 2 || hasWrongVersionPlacement(data) || isDirty(data)) {
        updated = finalCleanWorkout(data);
    }

    if (!updated) return null;

    await setDoc(docSnap.ref, updated);
    return docSnap.id;
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Runs a controlled background migration + cleanup pass.
 *
 * - Processes at most `MAX_MIGRATIONS_PER_RUN` documents per call.
 * - Handles: old format, wrong version placement, dirty v2, missing stamp.
 * - Skips documents that are already pristine v2.
 * - Errors on individual documents are caught and logged; they never break the loop.
 * - Uses `setDoc` to physically remove legacy fields.
 *
 * Usage:
 * ```ts
 * // Fire and forget — do NOT await to avoid blocking UI
 * runMigration(snapshot.docs);
 * ```
 */
export async function runMigration(docs: DocumentSnapshot[]): Promise<string[]> {
    const processed: string[] = [];

    for (const docSnap of docs) {
        if (processed.length >= MAX_MIGRATIONS_PER_RUN) break;

        try {
            const result = await processDocument(docSnap);
            if (result) {
                processed.push(result);
            }
        } catch (err) {
            console.error(`[MigrationService] Failed to process doc ${docSnap.id}:`, err);
        }
    }

    if (processed.length > 0) {
        console.log(
            `[MigrationService] Final cleaned docs (${processed.length}):`,
            processed
        );
    }

    return processed;
}

/**
 * Returns `true` if the given document needs any processing
 * (migration, cleanup, version fix, or createdAt backfill).
 */
export function needsProcessing(data: Workout): boolean {
    if (!data) return false;
    if (isOldFormat(data)) return true;
    if (data.version !== 2) return true;
    if (hasWrongVersionPlacement(data)) return true;
    if (isDirty(data)) return true;
    return false;
}
