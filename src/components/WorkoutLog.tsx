import React, { useState, useEffect, useRef } from 'react';
import { Plus, Save, Trash2, Calendar as CalendarIcon, Moon } from 'lucide-react';
import { WorkoutService } from '../services/workoutService';
import { StatsService } from '../services/statsService';
import { ExerciseService } from '../services/exerciseService';
import { auth } from '../services/firebase';
import type { Workout, WorkoutExercise, Exercise, WorkoutTemplate, WorkoutSet } from '../types';
import { ExerciseSelector } from './ExerciseSelector';
import { ExerciseCard } from './ExerciseCard';
import { UserService } from './../services/userService';
import { useNotification } from '../context/NotificationContext';
import { Copy, ClipboardList, X } from 'lucide-react';

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
    const [allExercisesMap, setAllExercisesMap] = useState<Record<string, Exercise>>({});
    const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [showSaveTemplateName, setShowSaveTemplateName] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [restTimerEnabled, setRestTimerEnabled] = useState(false);
    const [isRestTimerActive, setIsRestTimerActive] = useState(false);
    const [restTimeRemaining, setRestTimeRemaining] = useState(90);
    const { showToast, confirm } = useNotification();
    const cachedPRs = useRef<Record<string, number>>({});
    const prsLoaded = useRef(false);

    useEffect(() => {
        const fetchSettings = async () => {
            if (auth.currentUser) {
                const profile = await UserService.getProfile(auth.currentUser.uid);
                if (profile?.restTimerEnabled) {
                    setRestTimerEnabled(true);
                }
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        let interval: any;
        if (isRestTimerActive && restTimeRemaining > 0) {
            interval = setInterval(() => {
                setRestTimeRemaining(prev => prev - 1);
            }, 1000);
        } else if (restTimeRemaining === 0) {
            setIsRestTimerActive(false);
        }
        return () => clearInterval(interval);
    }, [isRestTimerActive, restTimeRemaining]);

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
                    
                    const allFetched = await ExerciseService.getAllExercises(auth.currentUser.uid);
                    const map: Record<string, Exercise> = {};
                    for (const ex of allFetched) {
                        map[ex.name] = ex;
                    }
                    setAllExercisesMap(map);
                }

                if (!date) {
                    setWorkout({ date: '', exercises: [] });
                    setLoading(false);
                    return;
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



    const repeatLastWorkout = async () => {
        if (!auth.currentUser) return;
        setLoading(true);
        try {
            const allWorkouts = await WorkoutService.getAllWorkouts(auth.currentUser.uid);
            const pastWorkouts = allWorkouts.filter(w => w.date !== date && w.exercises.length > 0);
            if (pastWorkouts.length > 0) {
                const last = pastWorkouts[0];
                const cleanExercises = last.exercises.map(ex => ({
                    ...ex,
                    sets: Array.isArray(ex.sets) ? ex.sets.map(s => ({...s, id: crypto.randomUUID(), completed: false})) : [{
                        id: crypto.randomUUID(),
                        weight: Number(ex.weight) || 0,
                        reps: Number(ex.reps) || 0,
                        duration: Number(ex.duration) || 0,
                        distance: Number(ex.distance) || 0,
                        completed: false
                    }]
                }));
                setWorkout(prev => ({ ...prev, exercises: cleanExercises, isRestDay: false }));
                showToast('Loaded last workout!', 'success');
            } else {
                showToast('No previous workouts found.', 'warning');
            }
        } catch (e) {
            showToast('Failed to load last workout', 'error');
        } finally {
            setLoading(false);
        }
    };

    const addExercise = async (exercise: Exercise) => {
        setIsSelectorOpen(false);
        
        let initialSets: WorkoutSet[] = [{
            id: crypto.randomUUID(),
            weight: 0, reps: 0, duration: 0, distance: 0, completed: false
        }];

        if (auth.currentUser) {
            try {
                const allWorkouts = await WorkoutService.getAllWorkouts(auth.currentUser.uid);
                for (const w of allWorkouts) {
                    if (w.date === date) continue;
                    const match = w.exercises.find(e => e.name === exercise.name);
                    if (match) {
                        if (Array.isArray(match.sets) && match.sets.length > 0) {
                            initialSets = match.sets.map(s => ({ ...s, id: crypto.randomUUID(), completed: false }));
                        } else {
                            initialSets = [{
                                id: crypto.randomUUID(),
                                weight: Number(match.weight) || 0,
                                reps: Number(match.reps) || 0,
                                duration: Number(match.duration) || 0,
                                distance: Number(match.distance) || 0,
                                completed: false
                            }];
                        }
                        break;
                    }
                }
            } catch (e) { /* ignore */ }
        }

        const newEx: WorkoutExercise = {
            name: exercise.name,
            sets: initialSets
        };
        setWorkout(prev => ({
            ...prev,
            exercises: [...prev.exercises, newEx],
            isRestDay: false
        }));
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
                duration: ex.duration || 0,
                distance: ex.distance || 0
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

            <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-zinc-200/50 dark:shadow-black/50 p-4 min-[375px]:p-5 sm:p-8 border border-zinc-200/50 dark:border-zinc-800/50 relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none"></div>
                
                {workout.exercises.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 px-4 bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-800/50 dark:to-zinc-900/50 rounded-[2rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800 relative group overflow-hidden">
                        <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500">
                            <Plus size={32} className="text-zinc-400 dark:text-zinc-500 group-hover:text-cyan-500 transition-colors duration-500" />
                        </div>
                        <h3 className="text-2xl font-black text-zinc-800 dark:text-zinc-300 uppercase tracking-tight mb-2">Build Your Session</h3>
                        <p className="text-zinc-500 font-bold mb-10 text-sm tracking-wide text-center max-w-xs">Start from scratch or load a previous routine to crush your goals today.</p>

                        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md relative z-10">
                            <button
                                onClick={loadTemplates}
                                className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500 text-zinc-900 dark:text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all duration-300 shadow-sm hover:shadow-xl active:scale-[0.98]"
                            >
                                <ClipboardList size={18} className="text-zinc-400 group-hover:text-zinc-600" />
                                Templates
                            </button>
                            <button
                                onClick={repeatLastWorkout}
                                className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-br from-cyan-400 to-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98] border border-cyan-300/50"
                            >
                                <Copy size={18} />
                                Repeat Last
                            </button>
                        </div>
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
                            <ExerciseCard 
                                key={idx} 
                                exercise={ex} 
                                index={idx}
                                onUpdate={(updatedEx) => {
                                    const newExercises = [...workout.exercises];
                                    newExercises[idx] = updatedEx;
                                    setWorkout(prev => ({ ...prev, exercises: newExercises }));
                                }}
                                onRemove={() => removeExercise(idx)}
                                isPR={isExercisePR(ex, idx)}
                                exerciseFields={allExercisesMap[ex.name]?.fields || ['sets', 'reps', 'weight']}
                                restTimerEnabled={restTimerEnabled}
                                onStartRestTimer={() => {
                                    setRestTimeRemaining(90);
                                    setIsRestTimerActive(true);
                                }}
                            />
                        ))}
                    </div>
                )}

                <div className="mt-10 flex flex-col sm:flex-row gap-4 relative z-10">
                    <button
                        onClick={() => setIsSelectorOpen(true)}
                        className="flex-1 flex items-center justify-center gap-3 p-5 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all duration-300 border-2 border-zinc-100 dark:border-zinc-700/50 shadow-sm hover:shadow-xl active:scale-[0.98] outline-none"
                    >
                        <Plus size={20} className="text-cyan-500" strokeWidth={3} />
                        Add Exercise
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || workout.exercises.length === 0}
                        className="flex-1 flex items-center justify-center gap-3 p-5 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:transform-none disabled:shadow-none border border-emerald-300/50 outline-none"
                    >
                        {saving ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                        ) : (
                            <>
                                <Save size={20} strokeWidth={3} />
                                Complete Workout
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
            {/* Rest Timer Modal */}
            {isRestTimerActive && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-[slide-up_0.4s_ease-out]">
                    <div className="bg-zinc-900/90 dark:bg-zinc-800/90 backdrop-blur-xl text-white rounded-[2rem] shadow-2xl shadow-cyan-500/20 border border-zinc-700/50 flex items-center pr-2 pl-6 py-2.5 gap-5">
                        <div className="font-black tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                            <span className="text-cyan-400 text-xs uppercase">Resting</span>
                            <span className="text-lg tabular-nums">{Math.floor(restTimeRemaining/60)}:{(restTimeRemaining % 60).toString().padStart(2, '0')}</span>
                        </div>
                        <button onClick={() => setRestTimeRemaining(prev => prev + 30)} className="text-zinc-300 hover:text-white hover:bg-zinc-700 px-3 py-1 text-xs font-black uppercase tracking-widest bg-zinc-800 rounded-xl transition-colors">+30s</button>
                        <button onClick={() => setIsRestTimerActive(false)} className="text-zinc-400 hover:text-red-500 hover:bg-zinc-800 p-2 rounded-xl transition-colors"><X size={16} strokeWidth={3} /></button>
                    </div>
                </div>
            )}
        </div>
    );
};
