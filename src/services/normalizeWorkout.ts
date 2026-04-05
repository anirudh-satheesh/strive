import type { Workout } from '../types';

/**
 * Normalizes a workout from legacy (summary-based) format to the new
 * exercise → sets[] structure. Safe to call on already-normalized data.
 *
 * Legacy format stored flat fields like `weight`, `reps`, `sets` (as a count)
 * directly on each exercise. The new format nests these inside a `sets[]` array
 * where each element represents one individual set.
 */
export const normalizeWorkout = (workout: Workout): Workout => {
    return {
        ...workout,
        exercises: workout.exercises?.map(ex => {
            // Already in new format — leave as-is
            if (Array.isArray(ex.sets) && ex.sets.length > 0 && typeof ex.sets[0] === 'object') {
                return ex;
            }

            // Convert legacy flat fields → sets[]
            const numSets = Number(ex.sets) || 1;
            const legacySets = [];

            for (let i = 0; i < numSets; i++) {
                legacySets.push({
                    id: crypto.randomUUID(),
                    weight: Number(ex.weight) || 0,
                    reps: Number(ex.reps) || 0,
                    duration: Number(ex.duration) || 0,
                    distance: Number(ex.distance) || 0,
                    completed: true,
                });
            }

            return { ...ex, sets: legacySets };
        }) || [],
    };
};
