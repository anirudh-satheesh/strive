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
                const weight = Number(ex.weight) || 0;
                if (weight > 0) {
                    if (!prs[ex.name] || weight > prs[ex.name]) {
                        prs[ex.name] = weight;
                    }
                }
            });
        });

        return prs;
    }
};
