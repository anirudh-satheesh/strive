import type { Workout } from '../types';

export const StatsService = {
    /**
     * Calculates All-Time Personal Records (Max Weight) for each exercise.
     */
    calculatePRs(workouts: Workout[]): Record<string, number> {
        const prs: Record<string, number> = {};

        workouts.forEach(workout => {
            if (workout.isRestDay) return;

            workout.exercises.forEach(ex => {
                let maxWeight = 0;
                
                // New nested structure
                if (ex.sets && Array.isArray(ex.sets)) {
                    ex.sets.forEach(set => {
                        const w = Number(set.weight) || 0;
                        if (w > maxWeight) maxWeight = w;
                    });
                }
                
                // Fallback for legacy format
                const legacyWeight = Number(ex.weight) || 0;
                if (legacyWeight > maxWeight) maxWeight = legacyWeight;

                if (maxWeight > 0) {
                    if (!prs[ex.name] || maxWeight > prs[ex.name]) {
                        prs[ex.name] = maxWeight;
                    }
                }
            });
        });

        return prs;
    }
};
