import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Calendar as CalendarIcon, Minus, Moon } from 'lucide-react';
import { WorkoutService } from '../services/workoutService';
import { auth } from '../services/firebase';
import type { Workout, WorkoutExercise, Exercise } from '../types';
import { ExerciseSelector } from './ExerciseSelector';
import { useNotification } from '../context/NotificationContext';

interface WorkoutLogProps {
    initialDate?: string | null;
}

export const WorkoutLog: React.FC<WorkoutLogProps> = ({ initialDate }) => {
    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(initialDate || today);
    const [workout, setWorkout] = useState<Workout>({ date: initialDate || today, exercises: [] });
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { showToast, confirm } = useNotification();

    // Sync date when initialDate prop changes
    useEffect(() => {
        if (initialDate) {
            setDate(initialDate);
        }
    }, [initialDate]);

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
            sets: 0,
            reps: 0,
            weight: 0,
            duration: 0,
        };
        setWorkout(prev => ({
            ...prev,
            exercises: [...prev.exercises, newEx],
            isRestDay: false
        }));
        setIsSelectorOpen(false);
    };

    const updateExercise = (index: number, field: keyof WorkoutExercise, value: string | number) => {
        const newExercises = [...workout.exercises];
        newExercises[index] = { ...newExercises[index], [field]: value };
        setWorkout({ ...workout, exercises: newExercises });
    };

    const removeExercise = async (index: number) => {
        const exerciseName = workout.exercises[index].name;

        const confirmed = await confirm({
            title: 'Remove Exercise',
            message: `Are you sure you want to remove ${exerciseName} from this workout?`,
            confirmText: 'Remove',
            cancelText: 'Keep'
        });

        if (!confirmed) return;

        const updatedExercises = workout.exercises.filter((_, i) => i !== index);
        const updatedWorkout = { ...workout, exercises: updatedExercises };

        setWorkout(updatedWorkout);

        if (auth.currentUser) {
            setSaving(true);
            try {
                await WorkoutService.saveWorkout(auth.currentUser.uid, updatedWorkout);
                showToast('Exercise removed permanently', 'success');
            } catch (error) {
                console.error("Failed to persist exercise removal:", error);
                showToast('Failed to remove exercise', 'error');
            } finally {
                setSaving(false);
            }
        }
    };

    const handleSave = async () => {
        if (!auth.currentUser) return;
        setSaving(true);
        try {
            const finalWorkout = {
                ...workout,
                isRestDay: workout.exercises.length === 0 ? workout.isRestDay : false
            };
            await WorkoutService.saveWorkout(auth.currentUser.uid, finalWorkout);
            setWorkout(finalWorkout);
            showToast('Workout saved successfully!', 'success');
        } catch (error) {
            showToast('Failed to save workout', 'error');
        } finally {
            setSaving(false);
        }
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
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-8">
                <div>
                    <h2 className="text-3xl sm:text-4xl font-black dark:text-gray-100 uppercase tracking-tight">Log Workout</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-cyan-500 font-bold uppercase tracking-widest text-xs">Push your limits today</p>
                        {workout.isRestDay && (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest animate-pulse">
                                <Moon size={10} />
                                Rest Day
                            </span>
                        )}
                    </div>
                </div>
                <div className="relative group">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-cyan-500 transition-colors" size={20} />
                    <input
                        type="date"
                        className="pl-12 pr-6 py-3 border dark:border-zinc-700/50 rounded-2xl bg-white dark:bg-zinc-900 dark:text-gray-100 font-bold outline-none focus:ring-4 focus:ring-cyan-500/10 transition-all shadow-xl"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl p-4 sm:p-8 border dark:border-zinc-800">
                {workout.exercises.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-800/20 rounded-3xl border-2 border-dashed dark:border-zinc-800">
                        <Plus size={48} className="mx-auto mb-4 text-zinc-700" />
                        <h3 className="text-xl font-black dark:text-zinc-400 uppercase tracking-tight">Empty Log</h3>
                        <p className="text-zinc-500 font-bold mt-1">Ready to start? Add your first exercise!</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {workout.exercises.map((ex, idx) => (
                            <div key={idx} className="bg-zinc-50 dark:bg-zinc-800/40 p-4 sm:p-6 rounded-3xl border dark:border-zinc-700/50 relative group transition-all hover:border-cyan-500/30">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                    <div className="lg:col-span-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">Exercise</label>
                                            <button
                                                onClick={() => removeExercise(idx)}
                                                className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                                                title="Remove Exercise"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <p className="font-black dark:text-gray-100 text-lg uppercase tracking-tight">{ex.name}</p>
                                    </div>

                                    <div className="grid grid-cols-3 lg:col-span-3 gap-3">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-cyan-500 mb-2 block">Sets</label>
                                            <div className="flex items-center bg-white dark:bg-zinc-900 border dark:border-zinc-700 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-cyan-500/50 transition-all">
                                                <button
                                                    onClick={() => updateExercise(idx, 'sets', Math.max(0, (Number(ex.sets) || 0) - 1))}
                                                    className="p-3 text-zinc-500 hover:text-cyan-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                >
                                                    <Minus size={16} strokeWidth={3} />
                                                </button>
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent text-center font-bold dark:text-gray-100 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    value={ex.sets || ''}
                                                    onChange={(e) => updateExercise(idx, 'sets', parseInt(e.target.value) || 0)}
                                                />
                                                <button
                                                    onClick={() => updateExercise(idx, 'sets', (Number(ex.sets) || 0) + 1)}
                                                    className="p-3 text-zinc-500 hover:text-cyan-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                >
                                                    <Plus size={16} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 block">Reps</label>
                                            <div className="flex items-center bg-white dark:bg-zinc-900 border dark:border-zinc-700 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
                                                <button
                                                    onClick={() => updateExercise(idx, 'reps', Math.max(0, (Number(ex.reps) || 0) - 1))}
                                                    className="p-3 text-zinc-500 hover:text-indigo-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                >
                                                    <Minus size={16} strokeWidth={3} />
                                                </button>
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent text-center font-bold dark:text-gray-100 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    value={ex.reps || ''}
                                                    onChange={(e) => updateExercise(idx, 'reps', parseInt(e.target.value) || 0)}
                                                />
                                                <button
                                                    onClick={() => updateExercise(idx, 'reps', (Number(ex.reps) || 0) + 1)}
                                                    className="p-3 text-zinc-500 hover:text-indigo-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                >
                                                    <Plus size={16} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2 block">Kg</label>
                                            <div className="flex items-center bg-white dark:bg-zinc-900 border dark:border-zinc-700 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/50 transition-all">
                                                <button
                                                    onClick={() => updateExercise(idx, 'weight', Math.max(0, (Number(ex.weight) || 0) - 2.5))}
                                                    className="p-3 text-zinc-500 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                >
                                                    <Minus size={16} strokeWidth={3} />
                                                </button>
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent text-center font-bold dark:text-gray-100 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    value={ex.weight || ''}
                                                    onChange={(e) => updateExercise(idx, 'weight', parseFloat(e.target.value) || 0)}
                                                />
                                                <button
                                                    onClick={() => updateExercise(idx, 'weight', (Number(ex.weight) || 0) + 2.5)}
                                                    className="p-3 text-zinc-500 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                >
                                                    <Plus size={16} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={() => setIsSelectorOpen(true)}
                        className="flex-1 flex items-center justify-center gap-3 p-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all border border-transparent active:scale-95"
                    >
                        <Plus size={20} strokeWidth={3} />
                        Add Exercise
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || workout.exercises.length === 0}
                        className="flex-1 flex items-center justify-center gap-3 p-5 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-cyan-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                        {saving ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                        ) : (
                            <>
                                <Save size={20} strokeWidth={3} />
                                Save Workout
                            </>
                        )}
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
