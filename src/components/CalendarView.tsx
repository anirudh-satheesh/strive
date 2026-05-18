import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Dumbbell, Moon, X, Trophy } from 'lucide-react';
import { WorkoutService } from '../services/workoutService';
import { auth } from '../services/firebase';
import type { Workout, WorkoutExercise } from '../types';
import { useNotification } from '../context/NotificationContext';

interface CalendarViewProps {
    onNavigateToWorkout?: (date: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onNavigateToWorkout }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [workouts, setWorkouts] = useState<Record<string, Workout>>({});
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast, confirm } = useNotification();

    useEffect(() => {
        const loadWorkouts = async () => {
            if (!auth.currentUser) {
                setLoading(false);
                return;
            }
            try {
                const all = await WorkoutService.getAllWorkouts(auth.currentUser.uid);
                const mapped = all.reduce((acc, w) => ({ ...acc, [w.date]: w }), {} as Record<string, Workout>);
                setWorkouts(mapped);
            } catch (error) {
                console.error('Error loading workouts:', error);
            } finally {
                setLoading(false);
            }
        };
        loadWorkouts();
    }, []);

    const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
        setSelectedDate(null);
    };
    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
        setSelectedDate(null);
    };

    const monthYear = currentMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    const totalDays = daysInMonth(currentMonth);
    const startDay = firstDayOfMonth(currentMonth);

    const days: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);

    const rowCount = Math.ceil(days.length / 7);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const getDateStr = (day: number) =>
        `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const handleDayClick = (day: number) => {
        const dateStr = getDateStr(day);
        setSelectedDate(prev => prev === dateStr ? null : dateStr);
    };

    const handleMarkRestDay = async () => {
        if (!auth.currentUser || !selectedDate) return;
        setIsSaving(true);
        try {
            const restDayWorkout: Workout = { date: selectedDate, exercises: [], isRestDay: true };
            await WorkoutService.saveWorkout(auth.currentUser.uid, restDayWorkout);
            setWorkouts(prev => ({ ...prev, [selectedDate]: restDayWorkout }));
            showToast('Enjoy your rest day!', 'success');
        } catch {
            showToast('Failed to save rest day', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveRestDay = async () => {
        if (!auth.currentUser || !selectedDate) return;

        const confirmed = await confirm({
            title: 'Remove Rest Day',
            message: 'Are you sure you want to remove this rest day?',
            confirmText: 'Remove',
            cancelText: 'Keep'
        });

        if (!confirmed) return;

        setIsSaving(true);
        try {
            await WorkoutService.deleteWorkout(auth.currentUser.uid, selectedDate);
            setWorkouts(prev => {
                const updated = { ...prev };
                delete updated[selectedDate];
                return updated;
            });
            showToast('Rest day removed', 'success');
        } catch (error) {
            console.error('Error removing rest day:', error);
            showToast('Failed to remove rest day', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteWorkout = async () => {
        if (!auth.currentUser || !selectedDate) return;

        const confirmed = await confirm({
            title: 'Delete Workout',
            message: 'Are you sure you want to delete this entire workout log? This cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Keep'
        });

        if (!confirmed) return;

        setIsSaving(true);
        try {
            await WorkoutService.deleteWorkout(auth.currentUser.uid, selectedDate);
            setWorkouts(prev => {
                const updated = { ...prev };
                delete updated[selectedDate];
                return updated;
            });
            showToast('Workout deleted successfully', 'success');
            setSelectedDate(null);
        } catch (error) {
            console.error('Error deleting workout:', error);
            showToast('Failed to delete workout', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogWorkout = () => {
        if (selectedDate && onNavigateToWorkout) {
            onNavigateToWorkout(selectedDate);
        }
    };

    const selectedWorkout = selectedDate ? workouts[selectedDate] : null;

    const getExMaxWeight = (exercise: WorkoutExercise) => {
        if (Array.isArray(exercise.sets) && exercise.sets.length > 0) {
            return Math.max(...exercise.sets.map(s => Number(s.weight) || 0));
        }
        return Number(exercise.weight) || 0;
    };

    const isExercisePR = (ex: WorkoutExercise, idx: number, workout: Workout) => {
        const weight = getExMaxWeight(ex);
        if (weight <= 0) return false;

        // 1. Find max weight for this exercise in the current workout session
        const allWeightsForThisEx = workout.exercises
            .filter(e => e.name === ex.name)
            .map(e => getExMaxWeight(e));

        const maxWeightInWorkout = Math.max(...allWeightsForThisEx);

        // Only consider the current exercise if it's the max weight in this log
        if (weight !== maxWeightInWorkout) return false;

        // If multiple entries have the same max weight, only show on the last one
        const lastIdx = workout.exercises.reduce((acc, e, i) =>
            (e.name === ex.name && getExMaxWeight(e) === maxWeightInWorkout) ? i : acc, -1);

        if (idx !== lastIdx) return false;

        // 2. Find the prior max from workouts logged strictly BEFORE this date
        const priorWorkouts = Object.values(workouts).filter(w => w.date < workout.date && !w.isRestDay);

        let priorMax = 0;
        priorWorkouts.forEach(pw => {
            pw.exercises.forEach(pe => {
                if (pe.name === ex.name) {
                    const pwWeight = getExMaxWeight(pe);
                    if (pwWeight > priorMax) priorMax = pwWeight;
                }
            });
        });

        // 3. True only if this weight is strictly greater than the prior max
        return weight > priorMax;
    };

    // Count workouts and rest days for this month
    let monthWorkouts = 0;
    let monthRestDays = 0;
    for (let d = 1; d <= totalDays; d++) {
        const ds = getDateStr(d);
        const w = workouts[ds];
        if (w) {
            if (w.isRestDay) monthRestDays++;
            else if (w.exercises.length > 0) monthWorkouts++;
        }
    }

    // Calculate Streak
    let currentStreak = 0;
    const todayDateTime = new Date();
    todayDateTime.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
        const d = new Date(todayDateTime);
        d.setDate(d.getDate() - i);
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        const w = workouts[ds];
        if (w && (w.isRestDay || w.exercises.length > 0)) {
            currentStreak++;
        } else if (i !== 0) { 
            break;
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-13.5rem)] md:h-[calc(100vh-11rem)] min-h-0 overflow-hidden justify-between animate-[fade-in_0.4s_ease-out] gap-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 shadow-2xl shadow-cyan-500/5 bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-900/90 p-4 sm:p-5 rounded-[2rem] border-2 border-white/50 dark:border-zinc-800/80 relative overflow-hidden group">
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-bl from-cyan-500/20 via-indigo-500/10 to-transparent pointer-events-none rounded-full blur-[80px] group-hover:from-cyan-500/30 transition-all duration-700 delay-100"></div>
                <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-emerald-500/10 to-transparent pointer-events-none rounded-full blur-[80px] group-hover:from-emerald-500/20 transition-all duration-700"></div>
                
                <div className="flex flex-col relative z-10">
                    <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 uppercase tracking-tight mb-0.5">Overview</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 font-bold text-xs tracking-wide">Track your consistency and history.</p>
                </div>
                
                <div className="flex gap-3 sm:gap-4 w-full sm:w-auto relative z-10 mt-1 sm:mt-0">
                    <div className="flex-1 sm:flex-none bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/30 dark:to-zinc-900 px-4 py-2 sm:py-2.5 rounded-2xl flex flex-col items-center justify-center min-w-[5rem] border border-cyan-100/50 dark:border-cyan-900/40 shadow-sm shadow-cyan-500/5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
                        <span className="text-[9px] font-black uppercase tracking-widest text-cyan-600/70 dark:text-cyan-500/70 mb-0.5">Workouts</span>
                        <span className="text-2xl font-black text-cyan-500 dark:text-cyan-400 drop-shadow-sm">{monthWorkouts}</span>
                    </div>
                    <div className="flex-1 sm:flex-none bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-zinc-900 px-4 py-2 sm:py-2.5 rounded-2xl flex flex-col items-center justify-center min-w-[5rem] border border-emerald-100/50 dark:border-emerald-900/40 shadow-sm shadow-emerald-500/5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600/70 dark:text-emerald-500/70 mb-0.5">Streak</span>
                        <span className="text-2xl font-black text-emerald-500 dark:text-emerald-400 drop-shadow-sm flex items-center gap-1.5">
                            <Trophy size={16} className="mb-0.5 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] animate-pulse"/> 
                            {currentStreak}
                        </span>
                    </div>
                </div>
            </div>

            {/* Calendar Card */}
            <div className="flex-1 min-h-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-3xl rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl shadow-indigo-500/5 border border-white dark:border-zinc-800 overflow-hidden relative flex flex-col justify-between group">
                
                {/* Month Navigation */}
                <div className="flex justify-between items-center p-3 sm:p-5 bg-transparent relative z-10 border-b border-black/5 dark:border-white/5">
                    <button onClick={prevMonth} aria-label="Previous month" className="p-2 sm:p-3 bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 group/btn">
                        <ChevronLeft size={18} strokeWidth={3} aria-hidden="true" className="group-hover/btn:-translate-x-0.5 transition-transform" />
                    </button>
                    <div className="flex flex-col items-center animate-[fade-in_0.3s_ease-out]">
                        <h3 className="text-base sm:text-lg font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-indigo-500 drop-shadow-sm">{monthYear}</h3>
                    </div>
                    <button onClick={nextMonth} aria-label="Next month" className="p-2 sm:p-3 bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 group/btn">
                        <ChevronRight size={18} strokeWidth={3} aria-hidden="true" className="group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                </div>

                <div className="p-3 sm:p-5 flex-1 min-h-0 flex flex-col justify-between relative z-10">
                    <div className="grid grid-cols-7 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                            <div key={d} className={`text-center text-[9px] font-black uppercase tracking-widest py-1 ${i === 0 || i === 6 ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400 dark:text-zinc-500'}`}>
                                {d}
                            </div>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex-1 flex items-center justify-center p-8"><div className="animate-spin rounded-full h-10 w-10 border-t-4 border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div></div>
                    ) : (
                        <div 
                            className="flex-1 min-h-0 grid grid-cols-7 gap-y-1.5 gap-x-1.5 sm:gap-x-3"
                            style={{
                                gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`
                            }}
                        >
                            {days.map((day, idx) => {
                                if (day === null) return <div key={`empty-${idx}`} className="w-full h-full" />;

                                const dateStr = getDateStr(day);
                                const workout = workouts[dateStr];
                                const isToday = dateStr === todayStr;
                                const isSelected = selectedDate === dateStr;

                                let isWorkout = false;
                                let isRest = false;

                                if (workout) {
                                    if (workout.isRestDay) isRest = true;
                                    else if (workout.exercises.length > 0) isWorkout = true;
                                }

                                const baseState = isWorkout 
                                    ? 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-200 dark:hover:border-emerald-800/50' 
                                    : isRest 
                                        ? 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:border-yellow-200 dark:hover:border-yellow-800/50'
                                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border-zinc-200 dark:hover:border-zinc-700';

                                const activeState = isSelected
                                    ? 'bg-gradient-to-br from-zinc-100 to-white dark:from-zinc-800 dark:to-zinc-700 shadow-xl shadow-zinc-500/10 dark:shadow-black/40 scale-105 z-20 border-2 border-indigo-400 dark:border-indigo-500'
                                    : `border-2 border-transparent bg-transparent ${baseState} hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/5 hover:z-10`;

                                const fullDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                                const ariaLabel = fullDate.toLocaleDateString(undefined, {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                });

                                return (
                                    <button
                                        key={day}
                                        onClick={() => handleDayClick(day)}
                                        aria-label={ariaLabel}
                                        aria-selected={isSelected}
                                        aria-current={isToday ? 'date' : undefined}
                                        className={`
                                        w-full h-full relative flex flex-col items-center justify-center rounded-xl sm:rounded-2xl transition-all duration-300 outline-none group/cell
                                        ${activeState}
                                    `}
                                    >
                                        <span className={`z-10 text-xs sm:text-sm font-black transition-all duration-300 ${
                                            isToday
                                            ? 'w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center border-2 border-indigo-500 dark:border-cyan-500 text-indigo-600 dark:text-cyan-400 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                                            : isSelected
                                                ? 'text-indigo-600 dark:text-cyan-400'
                                                : isWorkout
                                                    ? 'text-emerald-700 dark:text-emerald-400 group-hover/cell:text-emerald-600'
                                                    : isRest
                                                        ? 'text-yellow-600 dark:text-yellow-400 group-hover/cell:text-yellow-500'
                                                        : 'text-zinc-600 dark:text-zinc-400'
                                        }`}>
                                            {day}
                                        </span>

                                        <div className="absolute bottom-1 h-1 flex gap-1 items-center justify-center w-full">
                                            {isWorkout && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-[pulse_3s_ease-in-out_infinite]"></div>}
                                            {isRest && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)] opacity-90"></div>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Selected Date Modal Overlay */}
            {selectedDate && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]" onClick={() => setSelectedDate(null)}>
                    <div className="w-full max-w-lg bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-[slide-up_0.3s_ease-out] relative border border-zinc-200/50 dark:border-zinc-800/50 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        {/* Decorative Background */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none"></div>

                        <div className="relative z-10 p-6 sm:p-8 overflow-y-auto">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h4 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight drop-shadow-sm">
                                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </h4>
                                    <div className="flex gap-2 mt-3">
                                        {selectedWorkout ? (
                                            selectedWorkout.isRestDay ? (
                                                <span className="bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-yellow-500/20 shadow-sm shadow-yellow-500/5">Rest Day</span>
                                            ) : (
                                                selectedWorkout.exercises.length > 0 ? (
                                                    <span className="bg-gradient-to-r from-emerald-400/20 to-green-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-emerald-500/20 shadow-sm shadow-emerald-500/5">Workout Logged</span>
                                                ) : (
                                                    <span className="bg-zinc-500/10 text-zinc-500 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-zinc-500/20">No Data</span>
                                                )
                                            )
                                        ) : (
                                            <span className="bg-zinc-500/10 text-zinc-500 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-zinc-500/20">No Data</span>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => setSelectedDate(null)} className="p-2.5 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-90 shadow-sm">
                                    <X size={20} strokeWidth={3} />
                                </button>
                            </div>

                            {selectedWorkout && (selectedWorkout.isRestDay || selectedWorkout.exercises.length > 0) ? (
                                selectedWorkout.isRestDay ? (
                                    <div className="py-10 text-center bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-950/20 dark:to-zinc-900/50 rounded-[2rem] border border-yellow-100 dark:border-yellow-900/30 flex flex-col items-center shadow-inner">
                                        <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/40 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                            <Moon size={36} className="text-yellow-500 animate-[pulse_3s_ease-in-out_infinite]" />
                                        </div>
                                        <p className="text-yellow-600 dark:text-yellow-400 font-black tracking-wide uppercase mb-8">"Muscle grows during rest!"</p>
                                        <button
                                            onClick={handleRemoveRestDay}
                                            disabled={isSaving}
                                            className="px-8 py-3.5 bg-white dark:bg-zinc-800 text-red-500 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-all active:scale-[0.98] disabled:opacity-50 border border-red-200 dark:border-red-900/50 shadow-sm"
                                        >
                                            {isSaving ? 'Removing...' : 'Remove Rest Day'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {selectedWorkout.exercises.map((ex, idx) => (
                                            <div key={idx} className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md p-4 sm:p-5 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-700/50 shadow-sm flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between sm:items-center group hover:shadow-lg hover:shadow-cyan-500/10 hover:border-cyan-400/50 hover:-translate-y-0.5 transition-all duration-300">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-3">
                                                        <p className="font-black text-zinc-900 dark:text-white group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors uppercase tracking-tight text-base sm:text-lg">{ex.name}</p>
                                                        {isExercisePR(ex, idx, selectedWorkout) && (
                                                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm shadow-yellow-500/20">
                                                                <Trophy size={10} /> PR
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-left sm:text-right bg-zinc-50 dark:bg-zinc-900/50 sm:bg-transparent rounded-xl p-3 sm:p-0 border border-zinc-100 dark:border-zinc-800 sm:border-transparent">
                                                    <p className="text-base sm:text-lg font-black text-zinc-700 dark:text-zinc-300">
                                                        {Array.isArray(ex.sets) ? `${ex.sets.length} Sets` : `${ex.sets} × ${ex.reps}`}
                                                    </p>
                                                    {getExMaxWeight(ex) > 0 && <p className="text-[11px] uppercase tracking-widest text-cyan-500 font-bold mt-0.5">Top: <span className="font-black">{getExMaxWeight(ex)} kg</span></p>}
                                                </div>
                                            </div>
                                        ))}
                                        <div className="grid grid-cols-2 gap-4 mt-6">
                                            <button
                                                onClick={handleLogWorkout}
                                                className="bg-white dark:bg-zinc-800 p-4 rounded-2xl text-zinc-900 dark:text-white font-black uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all duration-300 active:scale-[0.98] border-2 border-zinc-100 dark:border-zinc-700/50 shadow-sm hover:shadow-md"
                                            >
                                                Edit Workout
                                            </button>
                                            <button
                                                onClick={handleDeleteWorkout}
                                                className="bg-white dark:bg-zinc-800 text-red-500 p-4 rounded-2xl font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-300 active:scale-[0.98] border-2 border-red-100 dark:border-red-900/30 shadow-sm hover:shadow-md"
                                            >
                                                Delete Log
                                            </button>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button
                                        onClick={handleLogWorkout}
                                        className="flex items-center justify-center gap-3 p-6 sm:p-8 bg-gradient-to-br from-cyan-400 to-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 border border-cyan-300/50"
                                    >
                                        <Dumbbell size={28} />
                                        Log Workout
                                    </button>
                                    <button
                                        onClick={handleMarkRestDay}
                                        disabled={isSaving}
                                        className="flex items-center justify-center gap-3 p-6 sm:p-8 bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700/50 text-zinc-900 dark:text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 shadow-sm hover:shadow-md"
                                    >
                                        <Moon size={28} className="text-yellow-500" />
                                        {isSaving ? 'Saving...' : 'Mark Rest Day'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs text-zinc-500 dark:text-zinc-400 py-0.5">
                <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"></div>
                    Workout
                </span>
                <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.6)]"></div>
                    Rest Day
                </span>
                <span className="flex items-center gap-2">
                    <span className="inline-block w-4 h-4 rounded-full border-2 border-indigo-500 dark:border-cyan-500 flex items-center justify-center bg-transparent"></span>
                    Today
                </span>
            </div>
        </div>
    );
};
