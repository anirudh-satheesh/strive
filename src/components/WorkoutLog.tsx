import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { WorkoutService } from '../services/workoutService';
import { auth } from '../services/firebase';
import type { Workout, WorkoutExercise, Exercise } from '../types';
import { ExerciseSelector } from './ExerciseSelector';

export const WorkoutLog: React.FC = () => {
    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(today);
    const [workout, setWorkout] = useState<Workout>({ date: today, exercises: [] });
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadWorkout = async () => {
            if (!auth.currentUser) return;
            setLoading(true);
            const data = await WorkoutService.getWorkoutForDate(auth.currentUser.uid, date);
            setWorkout(data || { date, exercises: [] });
            setLoading(false);
        };
        loadWorkout();
    }, [date]);

    const addExercise = (exercise: Exercise) => {
        const newEx: WorkoutExercise = {
            name: exercise.name,
            sets: 3,
            reps: 10,
            weight: exercise.fields.includes('weight') ? 60 : 0,
            duration: exercise.fields.includes('duration') ? 30 : 0,
        };
        setWorkout(prev => ({
            ...prev,
            exercises: [...prev.exercises, newEx]
        }));
        setIsSelectorOpen(false);
    };

    const updateExercise = (index: number, field: keyof WorkoutExercise, value: string | number) => {
        const newExercises = [...workout.exercises];
        newExercises[index] = { ...newExercises[index], [field]: value };
        setWorkout({ ...workout, exercises: newExercises });
    };

    const removeExercise = (index: number) => {
        setWorkout(prev => ({
            ...prev,
            exercises: prev.exercises.filter((_, i) => i !== index)
        }));
    };

    const handleSave = async () => {
        if (!auth.currentUser) return;
        setSaving(true);
        await WorkoutService.saveWorkout(auth.currentUser.uid, workout);
        setSaving(false);
        alert('Workout saved successfully!');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold dark:text-gray-100">Log Workout</h2>
                    <p className="text-gray-500 dark:text-gray-400">Log or edit a workout for a specific day.</p>
                </div>
                <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                    <input
                        type="date"
                        className="pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border dark:border-gray-700">
                <div className="space-y-6 mb-8">
                    {workout.exercises.length > 0 ? (
                        workout.exercises.map((ex, idx) => (
                            <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-700 group">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-lg text-blue-600 dark:text-blue-400">{ex.name}</h4>
                                    <button onClick={() => removeExercise(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Sets</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 border dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-gray-200"
                                            value={ex.sets}
                                            onChange={(e) => updateExercise(idx, 'sets', parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Reps</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 border dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-gray-200"
                                            value={ex.reps}
                                            onChange={(e) => updateExercise(idx, 'reps', parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                    {ex.weight !== undefined && (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Weight (kg)</label>
                                            <input
                                                type="number"
                                                className="w-full p-2 border dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-gray-200"
                                                value={ex.weight}
                                                onChange={(e) => updateExercise(idx, 'weight', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    )}
                                    {ex.duration !== undefined && (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Duration (s)</label>
                                            <input
                                                type="number"
                                                className="w-full p-2 border dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-gray-200"
                                                value={ex.duration}
                                                onChange={(e) => updateExercise(idx, 'duration', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed dark:border-gray-700 rounded-lg">
                            <p className="text-gray-500 dark:text-gray-400">No exercises added for this day yet.</p>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => setIsSelectorOpen(true)}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white p-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
                    >
                        <Plus size={20} />
                        Add Exercise
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving || workout.exercises.length === 0}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white p-4 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={20} />
                        {saving ? 'Saving...' : 'Save Workout'}
                    </button>
                </div>
            </div>

            {isSelectorOpen && (
                <ExerciseSelector
                    onSelect={addExercise}
                    onClose={() => setIsSelectorOpen(false)}
                />
            )}
        </div>
    );
};
