import type { Exercise } from '../types';

export const PREDEFINED_EXERCISES: Exercise[] = [
    // Abs
    { id: "3002", name: "Bicycle Crunches", category: "Abs", fields: ["reps", "sets", "weight"] },
    { id: "0247", name: "Crunches", category: "Abs", fields: ["reps", "sets", "weight"] },
    { id: "0459", name: "Flutter Kicks", category: "Abs", fields: ["reps", "sets", "weight"] },
    { id: "3003", name: "Heel Touches", category: "Abs", fields: ["reps", "sets", "weight"] },
    { id: "3020", name: "Leg Raises", category: "Abs", fields: ["reps", "sets", "weight"] },
    { id: "3223", name: "Mountain Climbers", category: "Abs", fields: ["reps", "sets", "weight"] },
    { id: "0871", name: "Plank", category: "Abs", fields: ["duration", "sets"] },
    { id: "0657", name: "Russian Twists", category: "Abs", fields: ["reps", "sets", "weight"] },
    { id: "3001", name: "Sit-ups", category: "Abs", fields: ["reps", "sets", "weight"] },
    { id: "3005", name: "Spiderman Crunches", category: "Abs", fields: ["reps", "sets", "weight"] },
    { id: "3004", name: "V-Ups", category: "Abs", fields: ["reps", "sets", "weight"] },

    // Back
    { id: "3010", name: "Barbell Row", category: "Back", fields: ["reps", "sets", "weight"] },
    { id: "0478", name: "Hyperextensions", category: "Back", fields: ["reps", "sets", "weight"] },
    { id: "3006", name: "Lat Pulldown", category: "Back", fields: ["reps", "sets", "weight"] },
    { id: "3007", name: "Seated Row", category: "Back", fields: ["reps", "sets", "weight"] },
    { id: "3009", name: "T-Bar Row", category: "Back", fields: ["reps", "sets", "weight"] },

    // Biceps
    { id: "0292", name: "Barbell Incline Curl", category: "Biceps", fields: ["reps", "sets", "weight"] },
    { id: "0265", name: "Biceps Curl", category: "Biceps", fields: ["reps", "sets", "weight"] },
    { id: "3011", name: "Concentration Curls", category: "Biceps", fields: ["reps", "sets", "weight"] },
    { id: "0287", name: "Hammer Curl", category: "Biceps", fields: ["reps", "sets", "weight"] },
    { id: "0348", name: "Preacher Curl", category: "Biceps", fields: ["reps", "sets", "weight"] },

    // Cardio
    { id: "1160", name: "Burpee", category: "Cardio", fields: ["reps", "sets"] },
    { id: "3015", name: "Cycling", category: "Cardio", fields: ["duration", "distance"] },
    { id: "0498", name: "Jump Rope", category: "Cardio", fields: ["duration", "reps"] },
    { id: "3222", name: "Jumping Jacks", category: "Cardio", fields: ["duration", "reps"] },
    { id: "3014", name: "Running", category: "Cardio", fields: ["duration", "distance"] },

    // Chest
    { id: "0025", name: "Barbell Bench Press", category: "Chest", fields: ["reps", "sets", "weight"] },
    { id: "0231", name: "Chest Dip", category: "Chest", fields: ["reps", "sets", "weight"] },
    { id: "0282", name: "Dumbbell Fly", category: "Chest", fields: ["reps", "sets", "weight"] },
    { id: "0289", name: "Dumbbell Incline Bench Press", category: "Chest", fields: ["reps", "sets", "weight"] },
    { id: "0628", name: "Push-up", category: "Chest", fields: ["reps", "sets", "weight"] },

    // Lats
    { id: "1321", name: "Chin-up", category: "Lats", fields: ["reps", "sets", "weight"] },
    { id: "0336", name: "Dumbbell One Arm Row", category: "Lats", fields: ["reps", "sets", "weight"] },
    { id: "0626", name: "Pull-up", category: "Lats", fields: ["reps", "sets", "weight"] },

    // Legs
    { id: "0032", name: "Barbell Deadlift", category: "Legs", fields: ["reps", "sets", "weight"] },
    { id: "0043", name: "Barbell Full Squat", category: "Legs", fields: ["reps", "sets", "weight"] },
    { id: "1494", name: "Bodyweight Squat", category: "Legs", fields: ["reps", "sets", "weight"] },
    { id: "0314", name: "Dumbbell Lunge", category: "Legs", fields: ["reps", "sets", "weight"] },
    { id: "0363", name: "Dumbbell Romanian Deadlift", category: "Legs", fields: ["reps", "sets", "weight"] },
    { id: "0417", name: "Dumbbell Standing Calf Raise", category: "Legs", fields: ["reps", "sets", "weight"] },
    { id: "0557", name: "Leverage Leg Extension", category: "Legs", fields: ["reps", "sets", "weight"] },
    { id: "0558", name: "Leverage Leg Press", category: "Legs", fields: ["reps", "sets", "weight"] },
    { id: "0570", name: "Leverage Seated Leg Curl", category: "Legs", fields: ["reps", "sets", "weight"] },

    // Shoulders
    { id: "3021", name: "Arnold Press", category: "Shoulders", fields: ["reps", "sets", "weight"] },
    { id: "0397", name: "Barbell Shoulder Press", category: "Shoulders", fields: ["reps", "sets", "weight"] },
    { id: "0110", name: "Barbell Upright Row", category: "Shoulders", fields: ["reps", "sets", "weight"] },
    { id: "0452", name: "EZ-Bar Standing Military Press", category: "Shoulders", fields: ["reps", "sets", "weight"] },
    { id: "0284", name: "Front Raise", category: "Shoulders", fields: ["reps", "sets", "weight"] },
    { id: "0312", name: "Lateral Raise", category: "Shoulders", fields: ["reps", "sets", "weight"] },
    { id: "0354", name: "Rear Delt Fly", category: "Shoulders", fields: ["reps", "sets", "weight"] },
    { id: "3024", name: "Shoulder Shrugs", category: "Shoulders", fields: ["reps", "sets", "weight"] },

    // Strength
    { id: "3019", name: "Clean and Jerk", category: "Strength", fields: ["reps", "sets", "weight"] },
    { id: "3017", name: "Farmer's Walk", category: "Strength", fields: ["duration", "weight", "distance"] },
    { id: "3018", name: "Kettlebell Swing", category: "Strength", fields: ["reps", "sets", "weight"] },
    { id: "3016", name: "Power Clean", category: "Strength", fields: ["reps", "sets", "weight"] },

    // Traps
    { id: "3022", name: "Barbell Shrug", category: "Traps", fields: ["reps", "sets", "weight"] },
    { id: "3023", name: "Dumbbell Shrug", category: "Traps", fields: ["reps", "sets", "weight"] },

    // Triceps
    { id: "0116", name: "Bench Dip (Knees Bent)", category: "Triceps", fields: ["reps", "sets", "weight"] },
    { id: "0237", name: "Close-grip Push-up", category: "Triceps", fields: ["reps", "sets", "weight"] },
    { id: "0310", name: "Dumbbell Kickback", category: "Triceps", fields: ["reps", "sets", "weight"] },
    { id: "0426", name: "Overhead Triceps Extension", category: "Triceps", fields: ["reps", "sets", "weight"] },
    { id: "0058", name: "Skull Crusher", category: "Triceps", fields: ["reps", "sets", "weight"] }
];
