import type { Workout } from '../types';

export const getLocalDateString = (date: Date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Calculates current workout streak.
 * A streak is maintained if there's a non-rest day workout with exercises.
 * Returns the number of consecutive days ending today or yesterday.
 */
export const calculateStreak = (workouts: Workout[]): number => {
    const workoutDates = new Set(
        workouts
            .filter(w => !w.isRestDay)
            .map(w => w.date)
    );

    if (workoutDates.size === 0) return 0;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    let checkDate = new Date(now);
    const todayStr = getLocalDateString(now);

    // If no workout today, check if streak maintained until yesterday
    if (!workoutDates.has(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    let streak = 0;
    while (true) {
        const ds = getLocalDateString(checkDate);
        if (workoutDates.has(ds)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
};

/**
 * Calculates growth percentage between two values.
 */
export const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
};
