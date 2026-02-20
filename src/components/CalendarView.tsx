import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Dumbbell, Moon, X } from 'lucide-react';
import { WorkoutService } from '../services/workoutService';
import { auth } from '../services/firebase';
import type { Workout } from '../types';
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
        } catch (error) {
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

    // Count workouts and rest days for this month
    let monthWorkouts = 0;
    let monthRestDays = 0;
    for (let d = 1; d <= totalDays; d++) {
        const ds = getDateStr(d);
        const w = workouts[ds];
        if (w) {
            if (w.isRestDay) monthRestDays++;
            else monthWorkouts++;
        }
    }

    return (
        <div className="space-y-6">
            <div className="mb-2">
                <h2 className="text-2xl sm:text-3xl font-bold dark:text-gray-100">Calendar</h2>
                <p className="text-gray-500 dark:text-gray-400">Track your workout history and rest days.</p>
            </div>

            {/* Calendar Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border dark:border-zinc-800 overflow-hidden">
                {/* Month Navigation */}
                <div className="flex justify-between items-center p-6 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-white shadow-lg">
                    <button onClick={prevMonth} className="p-2 hover:bg-white/20 rounded-xl transition-all hover:scale-110">
                        <ChevronLeft size={24} strokeWidth={2.5} />
                    </button>
                    <div className="flex flex-col items-center">
                        <h3 className="text-xl font-black uppercase tracking-widest">{monthYear}</h3>
                        <div className="flex gap-4 mt-1 opacity-80">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tighter">
                                <Dumbbell size={12} strokeWidth={3} /> {monthWorkouts} Workouts
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tighter">
                                <Moon size={12} strokeWidth={3} /> {monthRestDays} Rest
                            </div>
                        </div>
                    </div>
                    <button onClick={nextMonth} className="p-2 hover:bg-white/20 rounded-xl transition-all hover:scale-110">
                        <ChevronRight size={24} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="p-4 sm:p-6 pb-2">
                    <div className="grid grid-cols-7 mb-4">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="text-center text-xs font-black text-zinc-400 uppercase tracking-widest py-2">
                                {d}
                            </div>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-16"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div></div>
                    ) : (
                        <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
                            {days.map((day, idx) => {
                                if (day === null) return <div key={`empty-${idx}`} className="aspect-square" />;

                                const dateStr = getDateStr(day);
                                const workout = workouts[dateStr];
                                const isToday = dateStr === todayStr;
                                const isSelected = selectedDate === dateStr;

                                let bgColor = 'bg-zinc-50 dark:bg-zinc-800/50';
                                let borderColor = 'border-transparent';
                                let textColor = 'text-gray-900 dark:text-gray-100';

                                if (workout) {
                                    if (workout.isRestDay) {
                                        bgColor = 'bg-emerald-500/10 dark:bg-emerald-500/20';
                                        borderColor = 'border-emerald-500/40';
                                        textColor = 'text-emerald-600 dark:text-emerald-400';
                                    } else {
                                        bgColor = 'bg-cyan-500/10 dark:bg-cyan-500/20';
                                        borderColor = 'border-cyan-500/40';
                                        textColor = 'text-cyan-600 dark:text-cyan-400';
                                    }
                                }

                                return (
                                    <button
                                        key={day}
                                        onClick={() => handleDayClick(day)}
                                        className={`
                                        aspect-square relative flex items-center justify-center rounded-2xl text-sm font-bold transition-all duration-300 border-2
                                        ${bgColor} ${borderColor} ${textColor}
                                        ${isSelected ? 'ring-4 ring-cyan-500/20 scale-105 z-10 !border-cyan-500 dark:!border-cyan-400' : 'hover:scale-110'}
                                        ${isToday ? 'after:content-[""] after:absolute after:bottom-1 after:w-1.5 after:h-1.5 after:bg-indigo-500 after:rounded-full' : ''}
                                    `}
                                    >
                                        {day}
                                        {workout && !workout.isRestDay && (
                                            <Dumbbell size={10} className="absolute top-1 right-1 opacity-60" />
                                        )}
                                        {workout && workout.isRestDay && (
                                            <Moon size={10} className="absolute top-1 right-1 text-emerald-500 opacity-60" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Selected Date Details Panel */}
            {selectedDate && (
                <div className="p-6 border-t dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 border-b-0 animate-[fade-in_0.4s_ease-out]">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h4 className="text-xl font-black dark:text-gray-100 tracking-tight">
                                {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                            </h4>
                            <div className="flex gap-2 mt-2">
                                {selectedWorkout ? (
                                    selectedWorkout.isRestDay ? (
                                        <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-500/20">Rest Day</span>
                                    ) : (
                                        <span className="bg-cyan-500/10 text-cyan-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-cyan-500/20">Workout Logged</span>
                                    )
                                ) : (
                                    <span className="bg-zinc-500/10 text-zinc-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-zinc-500/20">No Data</span>
                                )}
                            </div>
                        </div>
                        <button onClick={() => setSelectedDate(null)} className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    {selectedWorkout ? (
                        selectedWorkout.isRestDay ? (
                            <div className="py-8 text-center bg-emerald-500/5 rounded-3xl border border-emerald-500/10 flex flex-col items-center">
                                <Moon size={48} className="mx-auto text-emerald-500 mb-4 animate-pulse" />
                                <p className="text-emerald-500 font-bold tracking-wide italic mb-6">"Muscle grows during rest!"</p>
                                <button
                                    onClick={handleRemoveRestDay}
                                    disabled={isSaving}
                                    className="px-6 py-2 bg-zinc-950 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50 border border-zinc-800"
                                >
                                    {isSaving ? 'Removing...' : 'Remove Rest Day'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {selectedWorkout.exercises.map((ex, idx) => (
                                    <div key={idx} className="bg-white dark:bg-zinc-800 p-4 rounded-2xl border dark:border-zinc-700 shadow-sm flex justify-between items-center group hover:border-cyan-500/30 transition-all">
                                        <div>
                                            <p className="font-black dark:text-gray-100 group-hover:text-cyan-400 transition-colors uppercase tracking-tight text-sm">{ex.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black dark:text-gray-200">{ex.sets} × {ex.reps}</p>
                                            {ex.weight && <p className="text-xs text-cyan-500 font-black">{ex.weight} kg</p>}
                                        </div>
                                    </div>
                                ))}
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <button
                                        onClick={handleLogWorkout}
                                        className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-2xl text-zinc-950 dark:text-white font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95 flex-1"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={handleDeleteWorkout}
                                        className="bg-red-500/10 text-red-500 p-4 rounded-2xl font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95 flex-1 border border-red-500/20"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                onClick={handleLogWorkout}
                                className="flex items-center justify-center gap-3 p-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                <Dumbbell size={24} />
                                Log Workout
                            </button>
                            <button
                                onClick={handleMarkRestDay}
                                disabled={isSaving}
                                className="flex items-center justify-center gap-3 p-6 bg-zinc-900 border border-zinc-700 text-white rounded-3xl font-black uppercase tracking-widest hover:bg-zinc-800 active:scale-95 transition-all disabled:opacity-50"
                            >
                                <Moon size={24} />
                                {isSaving ? 'Saving...' : 'Mark Rest Day'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 bg-blue-500 rounded-sm"></span>
                    Workout
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 rounded-sm"></span>
                    Rest Day
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm ring-2 ring-blue-500 ring-inset"></span>
                    Today
                </span>
            </div>
        </div>
    );
};
