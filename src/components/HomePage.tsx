import React, { useState, useEffect } from 'react';
import { Dumbbell, Flame, TrendingUp, Calendar, Zap, ChevronRight } from 'lucide-react';
import { WorkoutService } from '../services/workoutService';
import { UserService } from '../services/userService';
import type { Workout, WorkoutExercise } from '../types';
import { calculateStreak } from '../utils/workoutAnalytics';
import type { Page } from '../App';
import type { User } from 'firebase/auth';

interface HomePageProps {
    user: User;
    setActivePage: (page: Page) => void;
    onNavigateToWorkout: (date: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ user, setActivePage, onNavigateToWorkout }) => {

    const [userName, setUserName] = useState('');
    const [todayWorkout, setTodayWorkout] = useState<Workout | null>(null);
    const [streak, setStreak] = useState(0);
    const [totalWorkouts, setTotalWorkouts] = useState(0);
    const [weeklyWorkouts, setWeeklyWorkouts] = useState(0);
    const [lastWorkoutDate, setLastWorkoutDate] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const getLocalDateString = (d: Date = new Date()) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const today = getLocalDateString();

    useEffect(() => {
        let unsubscribe: (() => void) | null = null;

        const loadProfile = async () => {
            try {
                const profile = await UserService.getProfile(user.uid);
                if (profile?.displayName) setUserName(profile.displayName);
            } catch (error) {
                console.error('Error fetching profile:', error);
            }
        };

        const subscribeDashboard = () => {
            setLoading(true);
            unsubscribe = WorkoutService.subscribeToWorkouts(user.uid, (workouts) => {
                // workouts are expected normalized (normalizeWorkout applied in service)

                // Today's workout
                const todayW = workouts.find(w => w.date === today);
                setTodayWorkout(todayW || null);

                // Total workouts (non-rest days)
                const nonRest = workouts.filter(w => !w.isRestDay && w.exercises.length > 0);
                setTotalWorkouts(nonRest.length);

                // Last workout
                if (nonRest.length > 0) {
                    // Because getAllWorkouts returns newest-first, we rely on that ordering.
                    setLastWorkoutDate(nonRest[0].date);
                } else {
                    setLastWorkoutDate(null);
                }

                // Weekly workouts
                const weekStart = new Date();
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                weekStart.setHours(0, 0, 0, 0);
                const weekCount = nonRest.filter(w => {
                    const [y, m, d] = w.date.split('-').map(Number);
                    return new Date(y, m - 1, d) >= weekStart;
                }).length;
                setWeeklyWorkouts(weekCount);

                // Streak
                const s = calculateStreak(workouts);
                setStreak(s);

                setLoading(false);
            });
        };

        void loadProfile();
        subscribeDashboard();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user.uid, today]);


    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const motivationalMessages = [
        "The only bad workout is the one that didn't happen.",
        "Your body can stand almost anything. It's your mind you have to convince.",
        "Discipline is choosing between what you want now and what you want most.",
        "Every rep counts. Every set matters.",
        "Progress, not perfection.",
        "Train insane or remain the same.",
        "The pain you feel today will be the strength you feel tomorrow.",
    ];
    const dailyMessage = motivationalMessages[new Date().getDay()];

    const formatRelativeDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Yesterday';
        if (diff < 7) return `${diff} days ago`;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 shadow-lg shadow-cyan-500/20"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 animate-[fade-in_0.4s_ease-out]">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-[#0B1220] via-[#111827] to-[#1A2236] rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border border-white/5">
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-bl from-[#22D3EE]/10 to-transparent rounded-full blur-[60px]"></div>
                <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-tr from-[#3B82F6]/10 to-transparent rounded-full blur-[60px]"></div>

                <div className="relative z-10">
                    <p className="text-[#22D3EE] font-black uppercase tracking-[0.2em] text-[11px] mb-1">{getGreeting()}</p>
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
                        {userName || user.email?.split('@')[0] || 'Athlete'}

                    </h1>
                    <p className="text-[#94a3b8] text-sm font-bold italic max-w-md leading-relaxed">
                        "{dailyMessage}"
                    </p>
                </div>
            </section>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-[#1A2236] rounded-3xl p-4 sm:p-5 border border-white/5 shadow-lg text-center group hover:scale-[1.03] hover:shadow-xl transition-all">
                    <div className="mx-auto w-10 h-10 bg-[#FB923C]/10 rounded-2xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Flame size={20} className="text-[#FB923C]" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-[#FB923C]">{streak}</p>
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mt-1">Streak</p>
                </div>
                <div className="bg-[#1A2236] rounded-3xl p-4 sm:p-5 border border-white/5 shadow-lg text-center group hover:scale-[1.03] hover:shadow-xl transition-all">
                    <div className="mx-auto w-10 h-10 bg-[#22D3EE]/10 rounded-2xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Dumbbell size={20} className="text-[#22D3EE]" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-[#22D3EE]">{weeklyWorkouts}</p>
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mt-1">This Week</p>
                </div>
                <div className="bg-[#1A2236] rounded-3xl p-4 sm:p-5 border border-white/5 shadow-lg text-center group hover:scale-[1.03] hover:shadow-xl transition-all">
                    <div className="mx-auto w-10 h-10 bg-[#3B82F6]/10 rounded-2xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <TrendingUp size={20} className="text-[#3B82F6]" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-[#3B82F6]">{totalWorkouts}</p>
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mt-1">Total</p>
                </div>
            </div>

            {/* Today's Workout Preview */}
            <section className="bg-[#1A2236] rounded-3xl shadow-xl border border-white/5 overflow-hidden">
                <div className="p-6 sm:p-7">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">Today's Workout</h2>
                            <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em] mt-0.5">
                                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#22D3EE] to-[#3B82F6] flex items-center justify-center shadow-lg shadow-cyan-500/20">
                            <Calendar size={18} className="text-white" />
                        </div>
                    </div>

                    {todayWorkout && todayWorkout.exercises.length > 0 && !todayWorkout.exercises.every(ex => Array.isArray(ex.sets) && ex.sets.every(s => s.completed)) ? (
                        <div className="space-y-3">
                            {todayWorkout.exercises.slice(0, 4).map((ex: WorkoutExercise, i: number) => (
                                <div key={i} className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                                            <Dumbbell size={14} className="text-cyan-500" />
                                        </div>
                                        <p className="font-bold text-zinc-900 dark:text-white text-sm">{ex.name}</p>
                                    </div>
                                    <p className="text-xs font-bold text-zinc-400">
                                        {Array.isArray(ex.sets) ? `${ex.sets.length} sets` : '—'}
                                    </p>
                                </div>
                            ))}
                            {todayWorkout.exercises.length > 4 && (
                                <p className="text-center text-xs font-bold text-zinc-400">
                                    +{todayWorkout.exercises.length - 4} more exercises
                                </p>
                            )}
                            <button
                                onClick={() => onNavigateToWorkout(today)}
                                className="w-full mt-2 py-4 bg-gradient-to-r from-[#22D3EE] to-[#3B82F6] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:-translate-y-0.5 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                Edit Workout
                                <ChevronRight size={16} strokeWidth={3} />
                            </button>
                        </div>
                    ) : todayWorkout?.isRestDay ? (
                        <div className="py-8 text-center bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                            <p className="text-4xl mb-3">😴</p>
                            <p className="font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-sm">Rest Day</p>
                            <p className="text-zinc-400 text-xs mt-1 font-medium">Recovery is part of the process</p>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Zap size={28} className="text-zinc-300 dark:text-zinc-600" />
                            </div>
                            <p className="font-bold text-zinc-500 dark:text-zinc-400 mb-1">No workout logged yet</p>
                            <p className="text-xs text-zinc-400 mb-6">Start building your session for today</p>
                            <button
                                onClick={() => setActivePage('workout')}
                                className="px-8 py-4 bg-gradient-to-r from-[#22D3EE] to-[#3B82F6] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:-translate-y-0.5 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mx-auto"
                            >
                                <Dumbbell size={16} strokeWidth={3} />
                                Start Workout
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Last Workout + Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Last Workout */}
                <div className="bg-[#1A2236] rounded-3xl p-5 sm:p-6 border border-white/5 shadow-lg">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#94a3b8] mb-2">Last Workout</p>
                    {lastWorkoutDate ? (
                        <div className="flex items-center justify-between">
                            <p className="text-lg font-black text-white">{formatRelativeDate(lastWorkoutDate)}</p>
                            <button
                                onClick={() => onNavigateToWorkout(lastWorkoutDate)}
                                className="text-[#22D3EE] text-xs font-black uppercase tracking-widest hover:text-[#22D3EE]/80 transition-colors flex items-center gap-1"
                            >
                                View <ChevronRight size={12} strokeWidth={3} />
                            </button>
                        </div>
                    ) : (
                        <p className="text-[#94a3b8] font-bold text-sm">No workouts yet</p>
                    )}
                </div>

                {/* Quick Navigation */}
                <div className="bg-[#1A2236] rounded-3xl p-5 sm:p-6 border border-white/5 shadow-lg">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#94a3b8] mb-3">Weekly Summary</p>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 bg-white/5 rounded-full h-2.5 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#22D3EE] to-[#3B82F6] rounded-full transition-all duration-700"
                                style={{ width: `${Math.min((weeklyWorkouts / 5) * 100, 100)}%` }}
                            ></div>
                        </div>
                        <span className="text-xs font-black text-[#94a3b8]">{weeklyWorkouts}/5</span>
                    </div>
                    <p className="text-[10px] text-[#94a3b8]/60 mt-2 font-bold uppercase tracking-wider">
                        {weeklyWorkouts >= 5 ? '🎉 Goal reached!' : `${5 - weeklyWorkouts} more to hit your weekly goal`}
                    </p>
                </div>
            </div>
        </div>
    );
};
