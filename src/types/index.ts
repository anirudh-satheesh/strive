export interface Exercise {
    id: string;
    name: string;
    category: string;
    fields: string[];
    isCustom?: boolean;
    subcategory?: string;
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
    // Legacy fields — stripped during migration, kept for read-time compat
    reps?: number | string;
    weight?: number | string;
    duration?: number | string;
    distance?: number | string;
    version?: number; // incorrectly placed in some old docs
}

export interface Workout {
    id?: string;
    date: string;
    createdAt?: string;
    exercises: WorkoutExercise[];
    isRestDay?: boolean;
    version?: number;
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
