import React from 'react';
import { Plus, Trash2, Trophy, Check, Minus } from 'lucide-react';
import type { WorkoutExercise, WorkoutSet } from '../types';

interface ExerciseCardProps {
    exercise: WorkoutExercise;
    index: number;
    onUpdate: (updatedExercise: WorkoutExercise) => void;
    onRemove: () => void;
    isPR: boolean;
    exerciseFields: string[];
    restTimerEnabled: boolean;
    onStartRestTimer: () => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
    exercise,
    onUpdate,
    onRemove,
    isPR,
    exerciseFields,
    restTimerEnabled,
    onStartRestTimer,
}) => {
    // Determine active columns from exercise config
    const showWeight = exerciseFields.includes('weight');
    const showReps = exerciseFields.includes('reps');
    const showDuration = exerciseFields.includes('duration');
    const showDistance = exerciseFields.includes('distance');

    // Ensure backwards compatibility by guaranteeing a sets array
    const sets = Array.isArray(exercise.sets) ? exercise.sets : [];

    // Helper functions for updating a specific set
    const updateSet = (setIndex: number, updates: Partial<WorkoutSet>) => {
        const newSets = [...sets];
        newSets[setIndex] = { ...newSets[setIndex], ...updates };
        onUpdate({ ...exercise, sets: newSets });
    };

    const addSet = () => {
        const baseSet = sets.length > 0 ? sets[sets.length - 1] : { weight: 0, reps: 0, duration: 0, distance: 0, completed: false };
        const newSet: WorkoutSet = {
            id: crypto.randomUUID(),
            weight: baseSet.weight || 0,
            reps: baseSet.reps || 0,
            duration: baseSet.duration || 0,
            distance: baseSet.distance || 0,
            completed: false
        };
        onUpdate({ ...exercise, sets: [...sets, newSet] });
    };

    const removeSet = (setIndex: number) => {
        const newSets = sets.filter((_, i) => i !== setIndex);
        onUpdate({ ...exercise, sets: newSets });
    };

    const toggleSetComplete = (setIndex: number) => {
        const currentSet = sets[setIndex];
        const isCompleting = !currentSet.completed;
        updateSet(setIndex, { completed: isCompleting });

        if (isCompleting && restTimerEnabled) {
            onStartRestTimer();
        }
    };

    const completedCount = sets.filter(s => s.completed).length;
    const progressPercent = sets.length > 0 ? (completedCount / sets.length) * 100 : 0;
    const activeSetIndex = sets.findIndex(s => !s.completed);

    return (
        <div className="bg-white dark:bg-zinc-900/80 backdrop-blur-xl p-5 sm:p-7 rounded-[2rem] shadow-xl shadow-zinc-200/50 dark:shadow-black/50 border border-zinc-100 dark:border-zinc-800 relative group transition-all duration-300 hover:shadow-2xl hover:border-cyan-500/30">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col flex-1 pr-4">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-black text-2xl tracking-tight text-zinc-900 dark:text-white drop-shadow-sm">{exercise.name}</h3>
                        {isPR && (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-md shadow-yellow-500/20 animate-bounce">
                                <Trophy size={12} /> PR
                            </span>
                        )}
                    </div>
                    {/* Progress Bar & Subtitle */}
                    <div className="mt-1">
                        <div className="flex justify-between items-center text-[10px] font-black text-zinc-400 mb-2">
                            <span className="uppercase tracking-widest">Progress</span>
                            <span className={completedCount === sets.length && sets.length > 0 ? "text-emerald-500 tracking-widest" : "tracking-widest"}>{completedCount} / {sets.length} Sets</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden shadow-inner">
                            <div 
                                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-700 ease-out relative" 
                                style={{ width: `${progressPercent}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onRemove} className="text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-2xl hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/20 transition-all duration-300 active:scale-90" title="Remove Exercise">
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Sets Area */}
            <div className="space-y-3 mt-4">
                {sets.map((set, setIndex) => {
                    const isActive = setIndex === activeSetIndex;
                    return (
                        <div 
                            key={set.id || setIndex} 
                            className={`relative flex items-center justify-between p-3 sm:px-5 sm:py-4 rounded-3xl transition-all duration-300 ${
                                set.completed 
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 opacity-90 backdrop-blur-sm' 
                                : isActive 
                                ? 'bg-white dark:bg-zinc-800 shadow-xl shadow-cyan-500/10 border-2 border-cyan-400 dark:border-cyan-500 scale-[1.02] z-10' 
                                : 'bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 hover:bg-white dark:hover:bg-zinc-800'
                            }`}
                        >
                            <div className="flex items-center gap-4 sm:gap-6 flex-1">
                                {/* Set Number Pill */}
                                <div className={`flex items-center justify-center min-w-[32px] h-8 sm:w-10 sm:h-10 rounded-full text-sm sm:text-base font-black shadow-sm transition-all duration-300 ${
                                    set.completed ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/30' 
                                    : isActive ? 'bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-cyan-500/30' 
                                    : 'bg-white dark:bg-zinc-700 text-zinc-400 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-600'
                                }`}>
                                    {setIndex + 1}
                                </div>

                                {/* Inputs */}
                                <div className="flex flex-wrap gap-3 sm:gap-5 flex-1">
                                    {showWeight && (
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-1 ml-1">Weight</span>
                                            <div className="flex items-center bg-white dark:bg-zinc-900 rounded-xl p-1 border border-zinc-100 dark:border-zinc-700/50 shadow-sm focus-within:ring-2 focus-within:ring-cyan-500/50 transition-all">
                                                <button onClick={() => updateSet(setIndex, { weight: Math.max(0, Number(set.weight) - 2.5) })} className="p-1.5 text-zinc-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg active:scale-90 transition-all disabled:opacity-50" disabled={set.completed}><Minus size={14} strokeWidth={3}/></button>
                                                <input 
                                                    type="number" 
                                                    value={set.weight === 0 ? '' : set.weight} 
                                                    placeholder="0"
                                                    onChange={(e) => updateSet(setIndex, { weight: e.target.value === '' ? 0 : Number(e.target.value) })} 
                                                    className={`w-12 sm:w-14 text-center bg-transparent font-black text-base sm:text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none min-w-0 outline-none transition-colors ${set.completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`} 
                                                    disabled={set.completed}
                                                />
                                                <button onClick={() => updateSet(setIndex, { weight: Number(set.weight) + 2.5 })} className="p-1.5 text-zinc-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg active:scale-90 transition-all disabled:opacity-50" disabled={set.completed}><Plus size={14} strokeWidth={3}/></button>
                                            </div>
                                        </div>
                                    )}
                                    {showReps && (
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-1 ml-1">Reps</span>
                                            <div className="flex items-center bg-white dark:bg-zinc-900 rounded-xl p-1 border border-zinc-100 dark:border-zinc-700/50 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
                                                <button onClick={() => updateSet(setIndex, { reps: Math.max(0, Number(set.reps) - 1) })} className="p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg active:scale-90 transition-all disabled:opacity-50" disabled={set.completed}><Minus size={14} strokeWidth={3}/></button>
                                                <input 
                                                    type="number" 
                                                    value={set.reps === 0 ? '' : set.reps} 
                                                    placeholder="0"
                                                    onChange={(e) => updateSet(setIndex, { reps: e.target.value === '' ? 0 : Number(e.target.value) })} 
                                                    className={`w-10 sm:w-12 text-center bg-transparent font-black text-base sm:text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none min-w-0 outline-none transition-colors ${set.completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`} 
                                                    disabled={set.completed}
                                                />
                                                <button onClick={() => updateSet(setIndex, { reps: Number(set.reps) + 1 })} className="p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg active:scale-90 transition-all disabled:opacity-50" disabled={set.completed}><Plus size={14} strokeWidth={3}/></button>
                                            </div>
                                        </div>
                                    )}
                                    {showDuration && (
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-1 ml-1">Time</span>
                                            <div className="flex items-center justify-center gap-1 bg-white dark:bg-zinc-900 rounded-xl p-1 border border-zinc-100 dark:border-zinc-700/50 shadow-sm focus-within:ring-2 focus-within:ring-orange-500/50 transition-all">
                                                <button onClick={() => updateSet(setIndex, { duration: Math.max(0, Number(set.duration) - 15) })} className="p-1.5 text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg active:scale-90 disabled:opacity-50 transition-all" disabled={set.completed}><Minus size={14} strokeWidth={3}/></button>
                                                <input 
                                                    type="number" 
                                                    value={set.duration === 0 ? '' : set.duration} 
                                                    placeholder="0"
                                                    onChange={(e) => updateSet(setIndex, { duration: e.target.value === '' ? 0 : Number(e.target.value) })} 
                                                    className={`w-12 sm:w-14 text-center bg-transparent font-black text-base sm:text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none min-w-0 outline-none ${set.completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`} 
                                                    disabled={set.completed}
                                                />
                                                <span className="text-[10px] text-zinc-400 font-bold -ml-2 select-none">s</span>
                                                <button onClick={() => updateSet(setIndex, { duration: Number(set.duration) + 15 })} className="p-1.5 text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg active:scale-90 disabled:opacity-50 transition-all" disabled={set.completed}><Plus size={14} strokeWidth={3}/></button>
                                            </div>
                                        </div>
                                    )}
                                    {showDistance && (
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-1 ml-1">Dist</span>
                                            <div className="flex items-center justify-center gap-1 bg-white dark:bg-zinc-900 rounded-xl p-1 border border-zinc-100 dark:border-zinc-700/50 shadow-sm focus-within:ring-2 focus-within:ring-purple-500/50 transition-all">
                                                <button onClick={() => updateSet(setIndex, { distance: Math.max(0, Number(set.distance) - 0.5) })} className="p-1.5 text-zinc-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg active:scale-90 disabled:opacity-50 transition-all" disabled={set.completed}><Minus size={14} strokeWidth={3}/></button>
                                                <input 
                                                    type="number" 
                                                    value={set.distance === 0 ? '' : set.distance} 
                                                    placeholder="0"
                                                    onChange={(e) => updateSet(setIndex, { distance: e.target.value === '' ? 0 : Number(e.target.value) })} 
                                                    className={`w-12 text-center bg-transparent font-black text-base sm:text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none min-w-0 outline-none ${set.completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`} 
                                                    disabled={set.completed}
                                                />
                                                <button onClick={() => updateSet(setIndex, { distance: Number(set.distance) + 0.5 })} className="p-1.5 text-zinc-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg active:scale-90 disabled:opacity-50 transition-all" disabled={set.completed}><Plus size={14} strokeWidth={3}/></button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-center gap-3 pl-4 sm:pl-6 ml-auto sm:border-l border-zinc-200 dark:border-zinc-700/50">
                                <button 
                                    onClick={() => removeSet(setIndex)} 
                                    className="p-2 sm:p-2.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-300 active:scale-90" 
                                    title="Delete Set"
                                >
                                    <Trash2 size={16}/>
                                </button>
                                
                                <button
                                    onClick={() => toggleSetComplete(setIndex)}
                                    className={`w-10 h-10 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-md transform active:scale-90 ${
                                        set.completed 
                                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-none text-white shadow-emerald-500/40 rotate-[360deg]' 
                                        : isActive 
                                        ? 'bg-gradient-to-br from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 border-none text-white shadow-cyan-500/40 hover:shadow-cyan-500/60' 
                                        : 'bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:border-zinc-300 text-zinc-300 dark:text-zinc-500'
                                    }`}
                                >
                                    <Check size={24} strokeWidth={set.completed ? 4 : isActive ? 3 : 2} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button 
                onClick={addSet}
                className="mt-6 w-full py-4 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700/50 text-zinc-400 font-black uppercase tracking-widest text-[11px] sm:text-xs flex items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 hover:text-cyan-500 hover:border-cyan-400/50 transition-all duration-300 active:scale-[0.98] outline-none"
            >
                <Plus size={18} strokeWidth={3} /> Add Set
            </button>
        </div>
    );
};
