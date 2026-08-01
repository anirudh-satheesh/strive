export type PerformanceType = 'strength' | 'consistency' | 'mobility' | 'endurance' | 'skill' | 'recovery';

// Phase 1.3 — Performance Event System (scaffolding types)
export type PerformanceAttribute = PerformanceType;

// Phase 2 — Attribute XP persistence / progression
export interface AttributeProgress {
    xp: number;
    level: number;
    tier: number;
}

export type AttributeProgressMap = Record<PerformanceAttribute, AttributeProgress>;

export type AttributeXpGain = Record<PerformanceAttribute, number>;


export type PerformanceEventType =
    | 'strength_progress'
    | 'strength_progress_unmatched'
    | 'consistency_workout'
    | 'mobility_progress'
    | 'mobility_progress_unmatched'
    | 'mobility_implicit_credit'
    | 'endurance_progress'
    | 'endurance_progress_unmatched'
    | 'skill_progress'
    | 'recovery_progress';

export interface PerformanceEvent {
    eventType: PerformanceEventType;
    attribute: PerformanceAttribute;

    // Internal 0..1 proxy values used by the hidden raw score engine
    intensity: number;
    recoveryCost: number;

    timestamp: string;

    // Optional context (helps future intelligence / debugging)
    workoutId?: string;
    exerciseName?: string;
}


export type MovementType = 'push' | 'pull' | 'hinge' | 'squat' | 'carry' | 'cardio' | 'isometric' | 'mobility' | 'other';

export type IntensityType = 'weighted' | 'bodyweight' | 'timed' | 'distance' | 'none';

export type TrackingMode = 
    | 'weight' 
    | 'reps' 
    | 'sets' 
    | 'volume' 
    | 'holdDuration' 
    | 'flexibilityLevel' 
    | 'romImprovement' 
    | 'distance' 
    | 'pace' 
    | 'duration' 
    | 'calories' 
    | 'progressionStage' 
    | 'holdTime' 
    | 'completionQuality' 
    | 'stretchTime' 
    | 'recoverySessions' 
    | 'sorenessLevel';

export interface Exercise {
    id: string;
    name: string;
    category: string;
    fields: string[];
    isCustom?: boolean;
    subcategory?: string;

    // Phase 1: Exercise Classification System
    performanceTypes?: PerformanceType[];
    primaryAttributes?: string[];
    secondaryAttributes?: string[];
    movementType?: MovementType;
    intensityType?: IntensityType;
    isWeighted?: boolean;
    isBodyweight?: boolean;
    isMobility?: boolean;
    isSkillBased?: boolean;
    isRecoveryFocused?: boolean;
    trackingModes?: TrackingMode[];
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
