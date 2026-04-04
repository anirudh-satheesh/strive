export interface Exercise {
    id: string;
    name: string;
    category: string;
    fields: string[];
    isCustom?: boolean;
}

export interface WorkoutSet {
    id?: string;
    weight?: number | string;
    reps?: number | string;
    duration?: number | string;
    distance?: number | string;
    completed: boolean;
}

export interface WorkoutExercise {
    name: string;
    sets: WorkoutSet[];
    // Legacy fields for backward compatibility
    reps?: number | string;
    weight?: number | string;
    duration?: number | string;
    distance?: number | string;
}

export interface Workout {
    id?: string;
    date: string;
    exercises: WorkoutExercise[];
    isRestDay?: boolean;
}

export interface WorkoutTemplate {
    id: string;
    name: string;
    exercises: WorkoutExercise[];
    createdAt: string;
}

export interface UserStats {
    totalWorkouts: number;
    totalVolume: number;
    monthlyWorkouts: number;
}
