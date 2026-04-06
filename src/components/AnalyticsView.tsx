import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { WorkoutService } from '../services/workoutService';
import { auth } from '../services/firebase';
import type { Workout, WorkoutExercise } from '../types';
import { Flame, TrendingUp, BarChart3, Activity, Clock, Zap, X, Dumbbell, Calendar, Info, Medal } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { StatCard, type CardColor } from './StatCard';
import { calculateStreak, calculateGrowth } from '../utils/workoutAnalytics';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
};

const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.6 }
    }
};

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export const AnalyticsView: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const { showToast } = useNotification();

    // Stats
    const [totalWorkouts, setTotalWorkouts] = useState(0);
    const [totalVolume, setTotalVolume] = useState(0);
    const [monthlyWorkouts, setMonthlyWorkouts] = useState(0);
    const [avgPerWeek, setAvgPerWeek] = useState(0);
    const [weeklyVolume, setWeeklyVolume] = useState<number[]>(new Array(7).fill(0));

    // Progress
    const [streak, setStreak] = useState(0);
    const [bestWeekVolume, setBestWeekVolume] = useState(0);
    const [thisWeekVolume, setThisWeekVolume] = useState(0);
    const [lastWeekVolume, setLastWeekVolume] = useState(0);

    // Personal Records
    const [prStats, setPrStats] = useState({ maxWeight: 0, maxReps: 0, maxDuration: 0 });
    const [top3Exercises, setTop3Exercises] = useState<{ name: string; reps: number; sets: number; weight: number }[]>([]);
    
    // UI State
    const [selectedExercise, setSelectedExercise] = useState<{ name: string; reps: number; sets: number; weight: number } | null>(null);

    const getLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getWeekKey = (date: Date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - d.getDay());
        return getLocalDateString(d);
    };

    useEffect(() => {
        const loadAnalytics = async () => {
            if (!auth.currentUser) return;
            const userId = auth.currentUser.uid;

            try {
                const workouts = await WorkoutService.getAllWorkouts(userId);

                let totalVol = 0;
                let totalWork = 0;
                let monthWork = 0;
                
                const now = new Date();
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

                const weekVol = new Array(7).fill(0);
                const weekStart = new Date();
                weekStart.setDate(now.getDate() - now.getDay());
                weekStart.setHours(0, 0, 0, 0);

                const exerciseStats: Record<string, { reps: number; sets: number; weight: number }> = {};
                const workoutDates = new Set<string>();
                const weeklyVolumes: Record<string, number> = {};
                
                let firstDate: Date | null = null;
                let maxW = 0;
                let maxR = 0;
                let maxD = 0;

                workouts.forEach((w: Workout) => {
                    if (!w.isRestDay && w.exercises.length > 0) {
                        totalWork++;
                        workoutDates.add(w.date);

                        const [y, m, d] = w.date.split('-').map(Number);
                        const workoutDate = new Date(y, m - 1, d);
                        
                        if (!firstDate || workoutDate < firstDate) firstDate = workoutDate;
                        if (workoutDate >= monthStart) monthWork++;

                        let dVol = 0;
                        w.exercises.forEach((ex: WorkoutExercise) => {
                            let totalReps = 0;
                            let eSets = 0;
                            let vol = 0;

                            if (ex.sets && Array.isArray(ex.sets)) {
                                eSets = ex.sets.length;
                                ex.sets.forEach(set => {
                                    const r = Number(set.reps) || 0;
                                    const weight = Number(set.weight) || 0;
                                    const dur = Number(set.duration) || 0;
                                    
                                    if (weight > maxW) maxW = weight;
                                    if (r > maxR) maxR = r;
                                    if (dur > maxD) maxD = dur;

                                    totalReps += r;
                                    vol += r * weight;
                                });
                            } else {
                                eSets = Number(ex.sets) || 0;
                                const eReps = Number(ex.reps) || 0;
                                const eWeight = Number(ex.weight) || 0;
                                const eDur = Number(ex.duration) || 0;
                                
                                if (eWeight > maxW) maxW = eWeight;
                                if (eReps > maxR) maxR = eReps;
                                if (eDur > maxD) maxD = eDur;

                                totalReps = eSets * eReps;
                                vol = eSets * eReps * eWeight;
                            }

                            dVol += vol;

                            if (!exerciseStats[ex.name]) {
                                exerciseStats[ex.name] = { reps: 0, sets: 0, weight: 0 };
                            }
                            exerciseStats[ex.name].reps += totalReps;
                            exerciseStats[ex.name].sets += eSets;
                            exerciseStats[ex.name].weight += vol;
                        });

                        totalVol += dVol;

                        if (workoutDate >= weekStart) {
                            const day = workoutDate.getDay();
                            weekVol[day] += dVol;
                        }

                        const weekKey = getWeekKey(workoutDate);
                        weeklyVolumes[weekKey] = (weeklyVolumes[weekKey] || 0) + dVol;
                    }
                });

                // Streak
                const currentStreak = calculateStreak(workouts);

                const sortedExercises = Object.entries(exerciseStats)
                    .map(([name, stats]) => ({ name, ...stats }))
                    .sort((a, b) => b.reps - a.reps)
                    .slice(0, 3);

                const bestWeek = Math.max(0, ...Object.values(weeklyVolumes));
                
                const currentWeekKey = getWeekKey(now);
                const lastWeekDate = new Date(now);
                lastWeekDate.setDate(lastWeekDate.getDate() - 7);
                const lastWeekKey = getWeekKey(lastWeekDate);

                let avgWks = 0;
                if (firstDate) {
                    const fd = firstDate as Date;
                    const diffTime = Math.abs(now.getTime() - fd.getTime());
                    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
                    avgWks = totalWork / Math.max(1, diffWeeks);
                }

                setTotalWorkouts(totalWork);
                setTotalVolume(totalVol);
                setMonthlyWorkouts(monthWork);
                setAvgPerWeek(avgWks);
                setWeeklyVolume(weekVol);
                setStreak(currentStreak);
                setBestWeekVolume(bestWeek);
                setThisWeekVolume(weeklyVolumes[currentWeekKey] || 0);
                setLastWeekVolume(weeklyVolumes[lastWeekKey] || 0);
                setTop3Exercises(sortedExercises);
                setPrStats({ maxWeight: maxW, maxReps: maxR, maxDuration: maxD });
                
            } catch (error) {
                console.error('Error loading analytics:', error);
                showToast('Failed to load analytics', 'error');
            } finally {
                setLoading(false);
            }
        };
        loadAnalytics();
    }, []);

    const lineData = useMemo(() => ({
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [{
            label: 'Volume (kg)',
            data: weeklyVolume,
            borderColor: '#22D3EE', 
            backgroundColor: (context: any) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                gradient.addColorStop(0, 'rgba(34, 211, 238, 0.4)');
                gradient.addColorStop(1, 'rgba(34, 211, 238, 0.0)');
                return gradient;
            },
            fill: true,
            tension: 0.4, // Smooth curve
            borderWidth: 3,
            pointBackgroundColor: '#22D3EE',
            pointBorderColor: '#0B1220',
            pointHoverRadius: 8,
            pointRadius: 4,
        }]
    }), [weeklyVolume]);

    const growthPercentage = calculateGrowth(thisWeekVolume, lastWeekVolume);
    const isPositiveGrowth = growthPercentage >= 0;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500 shadow-lg"></div>
            </div>
        );
    }

    return (
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-12 pb-32 font-sans"
        >
            {/* 1. HEADER */}
            <motion.div variants={sectionVariants} className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-[22px] flex items-center justify-center shadow-2xl shadow-indigo-500/20 ring-1 ring-white/10">
                    <BarChart3 size={28} className="text-white" />
                </div>
                <div>
                    <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500 tracking-tight">
                        Analytics
                    </h2>
                    <p className="text-[10px] font-black text-[#22D3EE] uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse" />
                        Insights & Progress
                    </p>
                </div>
            </motion.div>

            {/* 2. HERO SECTION */}
            <motion.div variants={sectionVariants} className="space-y-6">
                {/* Dominant Hero Card */}
                <motion.div 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="relative overflow-hidden bg-gradient-to-br from-[#FB923C] to-[#F97316] rounded-[24px] p-8 md:p-10 shadow-2xl shadow-orange-600/30 border border-white/10 group"
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                                    <Flame size={22} className="text-white/90" />
                                </motion.div>
                                <h3 className="text-xs font-black text-white/70 uppercase tracking-widest">Current Streak</h3>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <p className="text-7xl font-black text-white tracking-tighter drop-shadow-lg">
                                    {streak}
                                </p>
                                <span className="text-3xl font-bold text-white/80">Days</span>
                            </div>
                            <p className="text-white/80 font-bold mt-4 text-sm md:text-base max-w-xs uppercase tracking-wide">
                                {streak > 0 ? "You're building unstoppable momentum. Keep it up!" : "Commit to your first day and start your journey."}
                            </p>
                        </div>
                        <div className="hidden sm:flex h-32 w-32 bg-white/10 backdrop-blur-xl rounded-[32px] items-center justify-center border border-white/10 shadow-inner group-hover:rotate-6 transition-transform duration-500">
                            <Flame size={64} className="text-white drop-shadow-2xl" />
                        </div>
                    </div>
                </motion.div>

                {/* Sub Hero Cards unified to StatCard */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StatCard 
                        icon={<TrendingUp size={24} />}
                        label="WEEKLY"
                        title="This Week Volume"
                        value={thisWeekVolume}
                        subtitle="kg"
                        colorTheme="indigo"
                    />
                    <StatCard 
                        icon={<Medal size={24} />}
                        label="ALL TIME"
                        title="Best Week Volume"
                        value={bestWeekVolume}
                        subtitle="kg"
                        colorTheme="cyan"
                    />
                </div>
            </motion.div>

            {/* 6. INSIGHTS */}
            {(lastWeekVolume > 0 || thisWeekVolume > 0) && (
                <motion.div variants={sectionVariants}>
                    <div className="bg-[#111827] rounded-[20px] p-5 border border-white/5 flex items-start gap-5 shadow-xl border-l-[#22D3EE] border-l-4">
                        <div className={`p-3 rounded-2xl ${isPositiveGrowth ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20' : 'bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20'}`}>
                            {isPositiveGrowth ? <TrendingUp size={24} /> : <Info size={24} />}
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Weekly Insight</h4>
                            <p className="text-[#94a3b8] font-bold leading-relaxed">
                                {lastWeekVolume === 0 
                                    ? "Welcome back! Let's make this your strongest week yet." 
                                    : isPositiveGrowth 
                                        ? `Massive growth! You've increased your training volume by ${Math.round(growthPercentage)}% compared to last week.` 
                                        : `Recovery is key. You're giving your body space while maintaining ${Math.round(thisWeekVolume).toLocaleString()} kg of volume.`}
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* 3. PROGRESS GRAPH */}
            <motion.div variants={sectionVariants} className="bg-[#111827] p-6 md:p-8 rounded-[24px] shadow-2xl border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#22D3EE]/5 rounded-full blur-3xl -mr-32 -mt-32" />
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-8 relative z-10 flex items-center gap-2">
                    <span className="w-6 h-[2px] bg-[#22D3EE]" />
                    Weekly Progress
                </h3>
                <div className="w-full h-80 relative z-10">
                    <Line 
                        data={lineData} 
                        options={{ 
                            responsive: true, 
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    backgroundColor: '#18181b',
                                    titleFont: { size: 12, weight: 'bold' },
                                    bodyFont: { size: 14, weight: 'bold' },
                                    padding: 12,
                                    cornerRadius: 12,
                                    displayColors: false,
                                }
                            },
                            scales: { 
                                y: { 
                                    beginAtZero: true,
                                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                                    ticks: { color: '#94a3b8', font: { size: 10, weight: 'bold' } }
                                },
                                x: {
                                    grid: { display: false },
                                    ticks: { color: '#94a3b8', font: { size: 11, weight: 'bold' } }
                                }
                            } 
                        }} 
                    />
                </div>
            </motion.div>

            {/* 4. SUMMARY GRID */}
            <motion.div variants={sectionVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard 
                    icon={<Calendar size={24} />}
                    label="LIFETIME"
                    title="Total Workouts"
                    value={totalWorkouts}
                    colorTheme="blue"
                />
                <StatCard 
                    icon={<Dumbbell size={24} />}
                    label="LIFETIME"
                    title="Total Volume"
                    value={totalVolume}
                    subtitle="kg"
                    colorTheme="purple"
                />
                <StatCard 
                    icon={<Activity size={24} />}
                    label="MONTHLY"
                    title="This Month"
                    value={monthlyWorkouts}
                    colorTheme="green"
                />
                <StatCard 
                    icon={<TrendingUp size={24} />}
                    label="WEEKLY"
                    title="Avg per Week"
                    value={parseFloat(avgPerWeek.toFixed(1))}
                    colorTheme="cyan"
                />
            </motion.div>

            {/* 5. PERSONAL RECORDS */}
            <motion.div variants={sectionVariants} className="space-y-8">
                <div className="flex items-end justify-between px-1">
                    <h3 className="text-2xl font-black text-white leading-none">
                        Personal Records <span className="text-[#22D3EE]">🏆</span>
                    </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard 
                        icon={<Zap size={24} />}
                        label="PERSONAL BEST"
                        title="Heaviest Lift"
                        value={prStats.maxWeight}
                        subtitle="kg"
                        colorTheme="yellow"
                    />
                    <StatCard 
                        icon={<Activity size={24} />}
                        label="PERSONAL BEST"
                        title="Max Reps/Set"
                        value={prStats.maxReps}
                        subtitle="reps"
                        colorTheme="green"
                    />
                    <StatCard 
                        icon={<Clock size={24} />}
                        label="PERSONAL BEST"
                        title="Longest Dur."
                        value={prStats.maxDuration > 0 ? prStats.maxDuration : "--"}
                        subtitle={prStats.maxDuration > 0 ? "s" : ""}
                        colorTheme="blue"
                    />
                </div>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Top Volume Contributors</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {top3Exercises.length > 0 ? (
                            top3Exercises.map((ex, i) => {
                                const themes: CardColor[] = ['gold', 'silver', 'bronze'];
                                const labels = ['CHAMPION', 'CONTENDER', 'CHALLENGER'];
                                
                                return (
                                    <StatCard 
                                        key={ex.name}
                                        icon={<Medal size={24} />}
                                        label={labels[i]}
                                        title={ex.name}
                                        value={ex.reps}
                                        subtitle="total reps"
                                        colorTheme={themes[i]}
                                        onClick={() => setSelectedExercise(ex)}
                                    />
                                );
                            })
                        ) : (
                            <div className="col-span-full py-12 text-center bg-zinc-900/20 rounded-[24px] border border-dashed border-zinc-800">
                                <Dumbbell size={40} className="mx-auto mb-4 text-zinc-800" />
                                <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Log more to unlock rankings</p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* MODAL */}
            <AnimatePresence>
                {selectedExercise && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            className="bg-[#1A2236] rounded-[32px] shadow-2xl border border-white/5 w-full max-w-sm overflow-hidden relative"
                        >
                            <div className="h-32 bg-gradient-to-br from-[#22D3EE] via-[#3B82F6] to-[#818cf8] relative">
                                <button
                                    onClick={() => setSelectedExercise(null)}
                                    className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full backdrop-blur-sm z-10"
                                >
                                    <X size={20} />
                                </button>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                            </div>

                            <div className="px-8 pb-10 pt-0 text-center relative">
                                <div className="flex justify-center -mt-12 mb-6 relative z-10">
                                    <div className="h-24 w-24 rounded-[24px] bg-[#1A2236] p-2 shadow-2xl border border-white/5 transform rotate-3">
                                        <div className="h-full w-full rounded-[18px] bg-[#22D3EE]/10 flex items-center justify-center -rotate-3">
                                            <Dumbbell size={40} className="text-[#22D3EE]" />
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-white leading-tight">
                                    {selectedExercise.name}
                                </h3>
                                <p className="text-[#22D3EE] font-bold uppercase tracking-[0.2em] text-[9px] mt-2 mb-8">
                                    Personal Statistics
                                </p>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-[20px] border border-white/5">
                                        <span className="text-[#94a3b8] font-bold uppercase text-[10px] tracking-widest">Total Reps</span>
                                        <span className="text-xl font-black text-white">{selectedExercise.reps.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-[20px] border border-white/5">
                                        <span className="text-[#94a3b8] font-bold uppercase text-[10px] tracking-widest">Total Sets</span>
                                        <span className="text-xl font-black text-white">{selectedExercise.sets.toLocaleString()}</span>
                                    </div>
                                    {selectedExercise.weight > 0 && (
                                        <div className="flex items-center justify-between p-4 bg-[#22D3EE]/5 rounded-[20px] border border-[#22D3EE]/20">
                                            <span className="text-[#22D3EE] font-bold uppercase text-[10px] tracking-widest">Total Lifted</span>
                                            <span className="text-xl font-black text-[#22D3EE]">{Math.round(selectedExercise.weight).toLocaleString()} <span className="text-xs">kg</span></span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setSelectedExercise(null)}
                                    className="w-full mt-10 py-5 bg-white text-black rounded-[20px] font-black uppercase tracking-[0.1em] hover:bg-zinc-200 transition-all text-sm active:scale-95"
                                >
                                    Close Stats
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
