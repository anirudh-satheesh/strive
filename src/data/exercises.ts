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
    { id: "0058", name: "Skull Crusher", category: "Triceps", fields: ["reps", "sets", "weight"] },

    // Yoga - Balance
    { id: "4001", name: "Tree Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Balance" },
    { id: "4002", name: "Eagle Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Balance" },
    { id: "4003", name: "Dancer Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Balance" },
    { id: "4004", name: "Half Moon Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Balance" },
    { id: "4005", name: "Standing Knee Hug", category: "Yoga", fields: ["duration", "reps"], subcategory: "Balance" },
    { id: "4006", name: "Airplane Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Balance" },
    { id: "4007", name: "Crow Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Balance" },
    { id: "4008", name: "Side Crow Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Balance" },
    { id: "4009", name: "Warrior III", category: "Yoga", fields: ["duration", "reps"], subcategory: "Balance" },

    // Yoga - Flexibility
    { id: "4010", name: "Mountain Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4011", name: "Triangle Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4012", name: "Revolved Triangle Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4013", name: "Extended Side Angle Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4014", name: "Pyramid Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4015", name: "Standing Forward Fold", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4016", name: "Wide-Legged Forward Fold", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4017", name: "Seated Forward Fold", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4018", name: "Head-to-Knee Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4019", name: "Butterfly Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4020", name: "Pigeon Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4021", name: "Double Pigeon Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4022", name: "Lizard Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4023", name: "Frog Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4024", name: "Garland Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4025", name: "Camel Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4026", name: "Cow Face Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4027", name: "Bow Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4028", name: "Wheel Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4029", name: "Cobra Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4030", name: "Upward Facing Dog", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },
    { id: "4031", name: "Downward Facing Dog", category: "Yoga", fields: ["duration", "reps"], subcategory: "Flexibility" },

    // Yoga - Recovery
    { id: "4032", name: "Child’s Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Recovery" },
    { id: "4033", name: "Reclined Butterfly Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Recovery" },
    { id: "4034", name: "Happy Baby Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Recovery" },
    { id: "4035", name: "Puppy Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Recovery" },
    { id: "4036", name: "Sphinx Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Recovery" },
    { id: "4037", name: "Fish Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Recovery" },
    { id: "4038", name: "Corpse Pose (Savasana)", category: "Yoga", fields: ["duration", "reps"], subcategory: "Recovery" },

    // Yoga - Mobility
    { id: "4039", name: "Cat-Cow Stretch", category: "Yoga", fields: ["duration", "reps"], subcategory: "Mobility" },
    { id: "4040", name: "Warrior Flow", category: "Yoga", fields: ["duration", "reps"], subcategory: "Mobility" },
    { id: "4041", name: "Vinyasa Flow", category: "Yoga", fields: ["duration", "reps"], subcategory: "Mobility" },
    { id: "4042", name: "Plank to Downward Dog", category: "Yoga", fields: ["duration", "reps"], subcategory: "Mobility" },
    { id: "4043", name: "Dolphin Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Mobility" },
    { id: "4044", name: "Warrior I", category: "Yoga", fields: ["duration", "reps"], subcategory: "Mobility" },
    { id: "4045", name: "Warrior II", category: "Yoga", fields: ["duration", "reps"], subcategory: "Mobility" },
    { id: "4046", name: "Reverse Warrior", category: "Yoga", fields: ["duration", "reps"], subcategory: "Mobility" },
    { id: "4047", name: "Crescent Lunge", category: "Yoga", fields: ["duration", "reps"], subcategory: "Mobility" },
    { id: "4048", name: "High Lunge", category: "Yoga", fields: ["duration", "reps"], subcategory: "Mobility" },
    { id: "4049", name: "Low Lunge", category: "Yoga", fields: ["duration", "reps"], subcategory: "Mobility" },

    // Yoga - Power Yoga
    { id: "4050", name: "Plank Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Power Yoga" },
    { id: "4051", name: "Side Plank", category: "Yoga", fields: ["duration", "reps"], subcategory: "Power Yoga" },
    { id: "4052", name: "Chair Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Power Yoga" },
    { id: "4053", name: "Half Chair Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Power Yoga" },
    { id: "4054", name: "Boat Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Power Yoga" },
    { id: "4055", name: "Forearm Plank", category: "Yoga", fields: ["duration", "reps"], subcategory: "Power Yoga" },
    { id: "4056", name: "Hollow Body Hold", category: "Yoga", fields: ["duration", "reps"], subcategory: "Power Yoga" },
    { id: "4057", name: "Dead Bug Yoga Variation", category: "Yoga", fields: ["duration", "reps"], subcategory: "Power Yoga" },
    { id: "4058", name: "Sun Salutation A", category: "Yoga", fields: ["duration", "reps"], subcategory: "Power Yoga" },
    { id: "4059", name: "Sun Salutation B", category: "Yoga", fields: ["duration", "reps"], subcategory: "Power Yoga" },
    { id: "4060", name: "Yoga Burpees", category: "Yoga", fields: ["duration", "reps"], subcategory: "Power Yoga" },
    { id: "4061", name: "Chaturanga", category: "Yoga", fields: ["duration", "reps"], subcategory: "Power Yoga" },
    { id: "4062", name: "Dolphin Push-Up", category: "Yoga", fields: ["duration", "reps"], subcategory: "Power Yoga" },
    { id: "4063", name: "Chair Pose Hold", category: "Yoga", fields: ["duration", "reps"], subcategory: "Power Yoga" },
    { id: "4064", name: "Bear Pose Hold", category: "Yoga", fields: ["duration", "reps"], subcategory: "Power Yoga" },
    { id: "4065", name: "Bridge Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Power Yoga" },

    // Yoga - Meditation/Breathing
    { id: "4066", name: "Easy Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Meditation/Breathing" },
    { id: "4067", name: "Thunderbolt Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Meditation/Breathing" },
    { id: "4068", name: "Staff Pose", category: "Yoga", fields: ["duration", "reps"], subcategory: "Meditation/Breathing" }
];

export const EXERCISE_CATEGORIES = Array.from(
    new Set(PREDEFINED_EXERCISES.map(ex => ex.category))
).sort();
