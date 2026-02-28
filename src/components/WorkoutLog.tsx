import React, { useState, useEffect, useRef } from 'react';
import { Plus, Save, Trash2, Calendar as CalendarIcon, Minus, Moon } from 'lucide-react';
import { WorkoutService } from '../services/workoutService';
import { StatsService } from '../services/statsService';
import { auth } from '../services/firebase';
import type { Workout, WorkoutExercise, Exercise, WorkoutTemplate } from '../types';
import { ExerciseSelector } from './ExerciseSelector';
import { useNotification } from '../context/NotificationContext';
import { Trophy, Copy, ClipboardList, X } from 'lucide-react';

interface WorkoutLogProps {
    initialDate?: string | null;
}

export const WorkoutLog: React.FC<WorkoutLogProps> = ({ initialDate }) => {
    // helper that returns a YYYY-MM-DD string in local timezone (avoids UTC shift)
    const getLocalDateString = (d: Date = new Date()) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // derive today's date (YYYY-MM-DD) each render; used when the user hasn't picked a specific day
    const today = getLocalDateString();

    // track if the date was explicitly chosen by the user (picker or calendar)
    const [isUserSelected, setIsUserSelected] = useState(false);

    const [date, setDate] = useState(initialDate || today);
    const [workout, setWorkout] = useState<Workout>({ date: initialDate || today, exercises: [] });
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [allTimePRs, setAllTimePRs] = useState<Record<string, number>>({});
    const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [showSaveTemplateName, setShowSaveTemplateName] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const { showToast, confirm } = useNotification();
    const cachedPRs = useRef<Record<string, number>>({});
    const prsLoaded = useRef(false);

    const closeSelector = React.useCallback(() => setIsSelectorOpen(false), []);

    // Sync date when initialDate prop changes (calendar navigation)
    // mark user selection appropriately and clear when navigation is removed.
    useEffect(() => {
        if (initialDate) {
            setDate(initialDate);
            setIsUserSelected(true);
        } else {
            // initialDate reset (e.g. when leaving calendar); allow auto-sync again
            setIsUserSelected(false);
            // optionally reset date to today immediately
            // setDate(today);
        }
    }, [initialDate, today]);

    // if the user hasn't manually picked a date, keep the picker synced with
    // the true current day and bump at local midnight.
    useEffect(() => {
        if (initialDate || isUserSelected) {
            return;
        }

        if (date !== today) {
            setDate(today);
        }

        let timer: ReturnType<typeof setTimeout> | null = null;
        const scheduleNext = () => {
            const now = new Date();
            const msUntilMidnight =
                new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() -
                now.getTime();
            timer = setTimeout(() => {
                setDate(getLocalDateString());
                scheduleNext();
            }, msUntilMidnight + 1000);
        };

        scheduleNext();
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [initialDate, isUserSelected, date, today]);




    useEffect(() => {
        const loadWorkout = async () => {
            if (!auth.currentUser) return;
            setLoading(true);

            try {
                // Only load all workouts once or if forced
                if (!prsLoaded.current) {
                    const allWorkouts = await WorkoutService.getAllWorkouts(auth.currentUser.uid);
                    cachedPRs.current = StatsService.calculatePRs(allWorkouts);
                    prsLoaded.current = true;
                }

                const data = await WorkoutService.getWorkoutForDate(auth.currentUser.uid, date);
                setWorkout(data || { date, exercises: [] });

                // Use cached PRs
                setAllTimePRs(cachedPRs.current);
            } catch (error) {
                console.error("Error loading workout/PRs:", error);
                showToast("Failed to load workout data", "error");
            } finally {
                setLoading(false);
            }
        };
        loadWorkout();
    }, [date, showToast]);

    // Handle Escape key for modals
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsTemplateModalOpen(false);
                setShowSaveTemplateName(false);
                setIsSelectorOpen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

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

    const duplicateExercise = (index: number) => {
        const exerciseToCopy = workout.exercises[index];
        const duplicatedEx = { ...exerciseToCopy };
        const newExercises = [...workout.exercises];
        // Insert the duplicated exercise right after the original one
        newExercises.splice(index + 1, 0, duplicatedEx);
        setWorkout(prev => ({ ...prev, exercises: newExercises }));
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

                // Refresh PR cache
                const allWorkouts = await WorkoutService.getAllWorkouts(auth.currentUser.uid);
                cachedPRs.current = StatsService.calculatePRs(allWorkouts);
                setAllTimePRs(cachedPRs.current);

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

            // Refresh PR cache
            const allWorkouts = await WorkoutService.getAllWorkouts(auth.currentUser.uid);
            cachedPRs.current = StatsService.calculatePRs(allWorkouts);
            setAllTimePRs(cachedPRs.current);

            setWorkout(finalWorkout);
            showToast('Workout saved successfully!', 'success');
        } catch (_error) {
            showToast('Failed to save workout', 'error');
        } finally {
            setSaving(false);
        }
    };

    const [templateSaving, setTemplateSaving] = useState(false);

    const handleSaveAsTemplate = async () => {
        if (!auth.currentUser || !templateName.trim()) return;

        setTemplateSaving(true);
        try {
            // Sanitize exercises to ensure no undefined values
            const sanitizedExercises = workout.exercises.map(ex => ({
                name: ex.name || '',
                sets: ex.sets || 0,
                reps: ex.reps || 0,
                weight: ex.weight || 0,
                duration: ex.duration || 0
            }));

            await WorkoutService.saveTemplate(
                auth.currentUser.uid,
                templateName.trim(),
                sanitizedExercises
            );

            showToast('Template saved successfully!', 'success');
            setShowSaveTemplateName(false);
            setTemplateName('');
        } catch (error) {
            console.error('Template save error:', error);
            showToast('Failed to save template. Please try again.', 'error');
        } finally {
            setTemplateSaving(false);
        }
    };

    const loadTemplates = async () => {
        if (!auth.currentUser) return;
        try {
            const data = await WorkoutService.getTemplates(auth.currentUser.uid);
            setTemplates(data);
            setIsTemplateModalOpen(true);
        } catch (error) {
            console.error('Failed to load templates:', error);
            showToast('Failed to load templates', 'error');
        }
    };

    const applyTemplate = (template: WorkoutTemplate) => {
        const deepClonedExercises = template.exercises.map(ex => ({ ...ex }));
        setWorkout(prev => ({
            ...prev,
            exercises: deepClonedExercises,
            isRestDay: false
        }));
        setIsTemplateModalOpen(false);
        showToast(`Loaded "${template.name}"`, 'success');
    };

    const deleteTemplate = async (id: string, name: string) => {
        if (!auth.currentUser) return;
        const confirmed = await confirm({
            title: 'Delete Template',
            message: `Are you sure you want to delete "${name}"?`,
            confirmText: 'Delete',
            cancelText: 'Keep'
        });

        if (!confirmed) return;

        try {
            await WorkoutService.deleteTemplate(auth.currentUser.uid, id);
            setTemplates(prev => prev.filter(t => t.id !== id));
            showToast('Template deleted', 'success');
        } catch (_error) {
            showToast('Failed to delete template', 'error');
        }
    };

    const isExercisePR = (ex: WorkoutExercise, idx: number) => {
        const weight = Number(ex.weight) || 0;
        if (weight <= 0) return false;

        // 1. Find max weight for this exercise in the current workout
        const allWeightsForThisEx = workout.exercises
            .filter(e => e.name === ex.name)
            .map(e => Number(e.weight) || 0);

        const maxWeightInWorkout = Math.max(...allWeightsForThisEx);

        // Only consider the current exercise if it's the max weight in this log
        if (weight !== maxWeightInWorkout) return false;

        // If multiple entries have the same max weight, only show on the last one
        const lastIdx = workout.exercises.reduce((acc, e, i) =>
            (e.name === ex.name && (Number(e.weight) || 0) === maxWeightInWorkout) ? i : acc, -1);

        if (idx !== lastIdx) return false;

        // 2. Compare against global PR
        const globalMax = allTimePRs[ex.name] || 0;

        // Show PR if this weight is >= the global record
        // (will be == for saved PRs, > for new unsaved PRs)
        return weight >= globalMax;
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
                        onChange={(e) => {
                            setDate(e.target.value);
                            setIsUserSelected(true);
                        }}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl p-3 min-[375px]:p-4 sm:p-8 border dark:border-zinc-800">
                {workout.exercises.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-zinc-50 dark:bg-zinc-800/20 rounded-3xl border-2 border-dashed dark:border-zinc-800">
                        <Plus size={48} className="mb-4 text-zinc-700" />
                        <h3 className="text-xl font-black dark:text-zinc-400 uppercase tracking-tight">Empty Log</h3>
                        <p className="text-zinc-500 font-bold mt-1 mb-8">Ready to start? Add your first exercise!</p>

                        <button
                            onClick={loadTemplates}
                            className="flex items-center gap-2 px-6 py-3 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-xl font-bold transition-all"
                        >
                            <ClipboardList size={18} />
                            Load from Template
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-end pr-2">
                            <button
                                onClick={() => setShowSaveTemplateName(true)}
                                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-500 hover:text-cyan-400 transition-colors"
                            >
                                <Copy size={14} />
                                Save as Template
                            </button>
                        </div>
                        {workout.exercises.map((ex, idx) => (
                            <div key={idx} className="bg-zinc-50 dark:bg-zinc-800/40 p-3 min-[375px]:p-4 sm:p-6 rounded-3xl border dark:border-zinc-700/50 relative group transition-all hover:border-cyan-500/30">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                    <div className="lg:col-span-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">Exercise</label>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-black dark:text-gray-100 text-lg uppercase tracking-tight">{ex.name}</p>
                                                    {isExercisePR(ex, idx) && (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded-full border border-yellow-500/20 text-[8px] font-black uppercase tracking-tighter animate-bounce">
                                                            <Trophy size={8} /> PR
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => duplicateExercise(idx)}
                                                    className="text-zinc-400 hover:text-cyan-500 transition-colors p-1"
                                                    title="Duplicate Exercise"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                                <button
                                                    onClick={() => removeExercise(idx)}
                                                    className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                                                    title="Remove Exercise"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 lg:col-span-3 gap-1.5 min-[375px]:gap-2 sm:gap-3">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-cyan-500 mb-2 block">Sets</label>
                                            <div className="flex items-center bg-white dark:bg-zinc-900 border dark:border-zinc-700 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-cyan-500/50 transition-all">
                                                <button
                                                    onClick={() => updateExercise(idx, 'sets', Math.max(0, (Number(ex.sets) || 0) - 1))}
                                                    className="p-1.5 min-[375px]:p-2 sm:p-3 text-zinc-500 hover:text-cyan-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                >
                                                    <Minus size={16} strokeWidth={3} />
                                                </button>
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent text-center font-bold dark:text-gray-100 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                                                    value={ex.sets || ''}
                                                    onChange={(e) => updateExercise(idx, 'sets', parseInt(e.target.value) || 0)}
                                                />
                                                <button
                                                    onClick={() => updateExercise(idx, 'sets', (Number(ex.sets) || 0) + 1)}
                                                    className="p-1.5 min-[375px]:p-2 sm:p-3 text-zinc-500 hover:text-cyan-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
                                                    className="p-1.5 min-[375px]:p-2 sm:p-3 text-zinc-500 hover:text-indigo-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                >
                                                    <Minus size={16} strokeWidth={3} />
                                                </button>
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent text-center font-bold dark:text-gray-100 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                                                    value={ex.reps || ''}
                                                    onChange={(e) => updateExercise(idx, 'reps', parseInt(e.target.value) || 0)}
                                                />
                                                <button
                                                    onClick={() => updateExercise(idx, 'reps', (Number(ex.reps) || 0) + 1)}
                                                    className="p-1.5 min-[375px]:p-2 sm:p-3 text-zinc-500 hover:text-indigo-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
                                                    className="p-1.5 min-[375px]:p-2 sm:p-3 text-zinc-500 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                >
                                                    <Minus size={16} strokeWidth={3} />
                                                </button>
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent text-center font-bold dark:text-gray-100 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                                                    value={ex.weight || ''}
                                                    onChange={(e) => updateExercise(idx, 'weight', parseFloat(e.target.value) || 0)}
                                                />
                                                <button
                                                    onClick={() => updateExercise(idx, 'weight', (Number(ex.weight) || 0) + 2.5)}
                                                    className="p-1.5 min-[375px]:p-2 sm:p-3 text-zinc-500 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
                    onClose={closeSelector}
                />
            )}

            {/* Template Selection Modal */}
            {isTemplateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fade-in_0.2s]">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border dark:border-zinc-800 w-full max-w-md p-6 relative">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">Your Templates</h3>
                            <button onClick={() => setIsTemplateModalOpen(false)} className="text-zinc-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        {templates.length === 0 ? (
                            <div className="text-center py-10 text-zinc-500 font-bold">
                                No templates saved yet.
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {templates.map(t => (
                                    <div key={t.id} className="group flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border dark:border-zinc-700/50 hover:border-cyan-500/30 transition-all cursor-pointer" onClick={() => applyTemplate(t)}>
                                        <div>
                                            <p className="font-black dark:text-white uppercase tracking-tight">{t.name}</p>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase">{t.exercises.length} Exercises</p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id, t.name); }}
                                            className="p-2 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Save Template Modal */}
            {showSaveTemplateName && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fade-in_0.2s]">
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSaveAsTemplate(); }}
                        className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border dark:border-zinc-800 w-full max-w-sm p-6 relative"
                    >
                        <h3 className="text-xl font-black dark:text-white uppercase tracking-tight mb-4">Template Name</h3>
                        <input
                            type="text"
                            placeholder="e.g. Chest Day A"
                            className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl border dark:border-zinc-700 dark:text-white font-bold outline-none focus:ring-2 focus:ring-cyan-500 mb-6"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowSaveTemplateName(false)} className="flex-1 p-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all">Cancel</button>
                            <button
                                type="submit"
                                disabled={!templateName.trim() || templateSaving}
                                className="flex-1 p-4 bg-cyan-500 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {templateSaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
