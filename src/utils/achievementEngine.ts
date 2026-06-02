import type { Workout } from '../types';
import type { UserProfile, Achievement } from '../services/userService';
import { calculateStreak } from './workoutAnalytics';

export const checkAchievements = (
    currentWorkout: Workout,
    allWorkouts: Workout[], // Including currentWorkout
    userProfile: UserProfile
): Achievement[] => {
    const newAchievements: Achievement[] = [];
    const existingAchIds = new Set(userProfile.achievements?.map(a => a.id) || []);
    const now = new Date().toISOString();

    const addAch = (ach: Achievement) => {
        if (!existingAchIds.has(ach.id)) {
            newAchievements.push(ach);
            existingAchIds.add(ach.id);
        }
    };

    if (currentWorkout.isRestDay) {
        return []; // No achievements for rest days usually, unless it's a specific "took a rest" achievement
    }

    // 1. Total Workouts Milestone
    const pastWorkouts = allWorkouts.filter(w => !w.isRestDay && w.exercises.length > 0);
    const total = pastWorkouts.length;
    [1, 10, 50, 100, 365].forEach(milestone => {
        if (total >= milestone) {
            addAch({
                id: `milestone-${milestone}-workouts`,
                title: `${milestone} Workouts!`,
                description: `You've logged ${milestone} workouts.`,
                icon: 'Trophy',
                type: 'milestone',
                unlockedAt: now,
            });
        }
    });

    // 2. Streak Milestone
    const streak = calculateStreak(allWorkouts);
    [7, 30, 100].forEach(milestone => {
        if (streak >= milestone) {
            addAch({
                id: `milestone-streak-${milestone}`,
                title: `${milestone}-Day Streak!`,
                description: `You've worked out for ${milestone} days in a row.`,
                icon: 'Flame',
                type: 'milestone',
                unlockedAt: now,
            });
        }
    });

    // 3. New Exercises and PRs
    const pastWorkoutsBeforeCurrent = allWorkouts.filter(w => w.date < currentWorkout.date && !w.isRestDay);
    const pastMaxWeight: Record<string, number> = {};
    const pastMaxReps: Record<string, number> = {};
    const pastMaxDuration: Record<string, number> = {};

    pastWorkoutsBeforeCurrent.forEach(w => {
        w.exercises.forEach(ex => {
            let maxW = 0, maxR = 0, maxD = 0;
            if (ex.sets && Array.isArray(ex.sets)) {
                ex.sets.forEach(s => {
                    if ((Number(s.weight) || 0) > maxW) maxW = Number(s.weight);
                    if ((Number(s.reps) || 0) > maxR) maxR = Number(s.reps);
                    if ((Number(s.duration) || 0) > maxD) maxD = Number(s.duration);
                });
            } else {
                maxW = Number(ex.weight) || 0;
                maxR = Number(ex.reps) || 0;
                maxD = Number(ex.duration) || 0;
            }

            if (maxW > (pastMaxWeight[ex.name] || 0)) pastMaxWeight[ex.name] = maxW;
            if (maxR > (pastMaxReps[ex.name] || 0)) pastMaxReps[ex.name] = maxR;
            if (maxD > (pastMaxDuration[ex.name] || 0)) pastMaxDuration[ex.name] = maxD;
        });
    });

    currentWorkout.exercises.forEach(ex => {
        let maxW = 0, maxR = 0, maxD = 0;
        if (ex.sets && Array.isArray(ex.sets)) {
            ex.sets.forEach(s => {
                if ((Number(s.weight) || 0) > maxW) maxW = Number(s.weight);
                if ((Number(s.reps) || 0) > maxR) maxR = Number(s.reps);
                if ((Number(s.duration) || 0) > maxD) maxD = Number(s.duration);
            });
        } else {
            maxW = Number(ex.weight) || 0;
            maxR = Number(ex.reps) || 0;
            maxD = Number(ex.duration) || 0;
        }

        const safeIdName = ex.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

        // Check if first time
        if (!(ex.name in pastMaxWeight) && !(ex.name in pastMaxReps) && !(ex.name in pastMaxDuration)) {
            addAch({
                id: `first-${safeIdName}`,
                title: `New Exercise: ${ex.name}`,
                description: `Logged ${ex.name} for the first time!`,
                icon: 'Sparkles',
                type: 'first',
                unlockedAt: now,
            });
        } else {
            // Check PRs
            if (maxW > 0 && maxW > pastMaxWeight[ex.name]) {
                addAch({
                    id: `pr-weight-${safeIdName}-${maxW}`,
                    title: `Weight PR!`,
                    description: `${maxW} on ${ex.name} (Previous: ${pastMaxWeight[ex.name]})`,
                    icon: 'Medal',
                    type: 'pr',
                    unlockedAt: now,
                });
            } else if (maxR > 0 && maxR > pastMaxReps[ex.name] && maxW >= (pastMaxWeight[ex.name] * 0.8)) {
                // If it's a reps PR and weight is at least 80% of their max
                addAch({
                    id: `pr-reps-${safeIdName}-${maxR}`,
                    title: `Reps PR!`,
                    description: `${maxR} reps on ${ex.name}`,
                    icon: 'Medal',
                    type: 'pr',
                    unlockedAt: now,
                });
            } else if (maxD > 0 && maxD > pastMaxDuration[ex.name]) {
                addAch({
                    id: `pr-time-${safeIdName}-${maxD}`,
                    title: `Time PR!`,
                    description: `${maxD}s duration on ${ex.name}`,
                    icon: 'Clock',
                    type: 'pr',
                    unlockedAt: now,
                });
            }
        }
    });

    return newAchievements;
};
