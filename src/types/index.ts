export interface Exercise {
    id: string;
    name: string;
    category: string;
    fields: string[];
    isCustom?: boolean;
}

export interface WorkoutExercise {
    name: string;
    sets: number | string;
    reps: number | string;
    weight?: number | string;
    duration?: number | string;
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
