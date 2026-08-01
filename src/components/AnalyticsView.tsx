import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkoutService } from '../services/workoutService';
import { PerformanceCore } from './PerformanceCore';
import { PerformanceTimeline } from './PerformanceTimeline';
import { UserService, type UserProfile } from '../services/userService';
import { auth } from '../services/firebase';
import type { Workout, WorkoutExercise } from '../types';
import {
    Flame, TrendingUp, BarChart3, Activity, Clock, X,
    Trophy, Brain, Sparkles, RefreshCw, Info
} from 'lucide-react';

import { useNotification } from '../context/NotificationContext';
import { StatCard } from './StatCard';
import { calculateStreak } from '../utils/workoutAnalytics';
import { calculatePerformanceScores } from '../utils/performanceEngine';
import { computeHallOfFame } from '../utils/hallOfFameEngine';
import { HallOfFame } from './HallOfFame';
import { TrainingMomentum } from './TrainingMomentum';






const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.05 }
    }
};

const sectionVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5 }
    }
};

export const AnalyticsView: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { showToast } = useNotification();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);

    // Active Tab
    const [activeTab, setActiveTab] = useState<'radar' | 'prs' | 'composition'>('radar');

    // Stats
    const [totalWorkouts, setTotalWorkouts] = useState(0);
    const [totalVolume, setTotalVolume] = useState(0);
    const [avgPerWeek, setAvgPerWeek] = useState(0);
    const [streak, setStreak] = useState(0);
    const [totalHours, setTotalHours] = useState(0);

// Personal Records & Contributors
    const [prStats, setPrStats] = useState({ maxWeight: 0, maxReps: 0, maxDuration: 0 });
    const [top3Exercises, setTop3Exercises] = useState<{ name: string; reps: number; sets: number; weight: number }[]>([]);
    const [selectedPillarInfo, setSelectedPillarInfo] = useState<{ title: string; description: string; colorClass: string } | null>(null);
    const [showOverallPillarInfo, setShowOverallPillarInfo] = useState(false);
    const [selectedPillarIndex, setSelectedPillarIndex] = useState<number>(0);

    const loadAnalytics = async (silent = false) => {
        if (!auth.currentUser) return;
        const userId = auth.currentUser.uid;

        if (silent) setRefreshing(true);
        else setLoading(true);

        try {
            const [workouts, profile] = await Promise.all([
                WorkoutService.getAllWorkouts(userId),
                UserService.getProfile(userId)
            ]);

            setAllWorkouts(workouts);
            setUserProfile(profile);

            let totalVol = 0;
            let totalWork = 0;
            let monthWork = 0;
            let totalSecs = 0;

            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

            const exerciseStats: Record<string, { reps: number; sets: number; weight: number }> = {};

            let firstDate: Date | null = null;
            let maxW = 0;
            let maxR = 0;
            let maxD = 0;

            workouts.forEach((w: Workout) => {
                if (!w.isRestDay && w.exercises.length > 0) {
                    totalWork++;

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
                                totalSecs += dur;
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
                            totalSecs += eDur;
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
                }
            });

            // Streak
            const currentStreak = calculateStreak(workouts);

            // Fix: sort by volume (weight*reps, i.e. actual training load)
            // instead of raw rep count — a high-rep bodyweight move shouldn't
            // outrank a heavy low-rep lift as a "top contributor".
            const sortedExercises = Object.entries(exerciseStats)
                .map(([name, stats]) => ({ name, ...stats }))
                .sort((a, b) => b.weight - a.weight)
                .slice(0, 3);

            let avgWks = 0;
            if (firstDate) {
                const fd = firstDate as Date;
                const diffTime = Math.abs(now.getTime() - fd.getTime());
                // Fix: use fractional weeks instead of Math.ceil, which rounded
                // elapsed time up to the next full week and understated
                // average frequency right after a week boundary was crossed.
                const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);
                avgWks = totalWork / Math.max(1 / 7, diffWeeks); // floor at 1 day-equivalent to avoid divide-by-near-zero for brand new users
            }

            setTotalWorkouts(totalWork);
            setTotalVolume(totalVol);
            setAvgPerWeek(avgWks);
            setStreak(currentStreak);
            setTop3Exercises(sortedExercises);
            setPrStats({ maxWeight: maxW, maxReps: maxR, maxDuration: maxD });
            setTotalHours(Math.round(totalSecs / 3600));

            if (silent) showToast('Scores calculated and updated!', 'success');
        } catch (error) {
            console.error('Error loading performance hub:', error);
            showToast('Failed to load performance metrics', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadAnalytics();
    }, []);

    // Compute dynamic scores
    const performanceScores = useMemo(() => {
        return calculatePerformanceScores(allWorkouts);
    }, [allWorkouts]);

    const overallScore = useMemo(() => {
        return Math.round(
            (performanceScores.strengthScore + 
             performanceScores.consistencyScore + 
             performanceScores.mobilityScore + 
             performanceScores.enduranceScore + 
             performanceScores.skillScore + 
             performanceScores.recoveryScore) / 6
        );
    }, [performanceScores]);

    const getTier = (score: number) => {
        if (score < 30) return 'Beginner';
        if (score < 60) return 'Intermediate';
        if (score < 80) return 'Advanced';
        return 'Elite';
    };

    const topPillars = useMemo(() => {
        return [
            { name: 'Strength', score: performanceScores.strengthScore },
            { name: 'Consistency', score: performanceScores.consistencyScore },
            { name: 'Mobility', score: performanceScores.mobilityScore },
            { name: 'Endurance', score: performanceScores.enduranceScore },
            { name: 'Skill', score: performanceScores.skillScore },
            { name: 'Recovery', score: performanceScores.recoveryScore },
        ].sort((a, b) => b.score - a.score).slice(0, 3);
    }, [performanceScores]);


    const hallOfFameEntries = useMemo(() => {
        return computeHallOfFame(allWorkouts);
    }, [allWorkouts]);

    // Dynamic Pillar Details
    const pillarDetails = useMemo(() => [
        {
            label: 'Strength',
            score: performanceScores.strengthScore,
            color: 'text-orange-500',
            bgGlow: 'bg-orange-500/10',
            borderColor: 'border-orange-500/20',
            trend: '+2.4%',
            desc: 'Calculated from your pure strength training volume. This score increases as you progressively overload and log heavy compound lifts.',
            metricLabel: 'Total Strength Volume',
            metricValue: `${Math.round(totalVolume).toLocaleString()} kg`,
            sparkline: [Math.max(0, performanceScores.strengthScore - 15), Math.max(0, performanceScores.strengthScore - 8), Math.max(0, performanceScores.strengthScore - 10), performanceScores.strengthScore]
        },
        {
            label: 'Consistency',
            score: performanceScores.consistencyScore,
            color: 'text-emerald-500',
            bgGlow: 'bg-emerald-500/10',
            borderColor: 'border-emerald-500/20',
            trend: '+5.1%',
            desc: 'Calculated based on your workout habits. Increases the more days in a row you train and stays high if you log workouts frequently.',
            metricLabel: 'Workout Streak',
            metricValue: `${streak} Days`,
            sparkline: [Math.max(0, performanceScores.consistencyScore - 20), Math.max(0, performanceScores.consistencyScore - 10), Math.max(0, performanceScores.consistencyScore - 5), performanceScores.consistencyScore]
        },
        {
            label: 'Mobility',
            score: performanceScores.mobilityScore,
            color: 'text-teal-500',
            bgGlow: 'bg-teal-500/10',
            borderColor: 'border-teal-500/20',
            trend: '+1.2%',
            desc: 'Calculated from time spent stretching. Increases when you regularly log mobility sessions, helping balance out stress.',
            metricLabel: 'Mobility Balance',
            metricValue: 'Optimal',
            sparkline: [Math.max(0, performanceScores.mobilityScore - 12), Math.max(0, performanceScores.mobilityScore - 6), Math.max(0, performanceScores.mobilityScore - 2), performanceScores.mobilityScore]
        },
        {
            label: 'Endurance',
            score: performanceScores.enduranceScore,
            color: 'text-sky-500',
            bgGlow: 'bg-sky-500/10',
            borderColor: 'border-sky-500/20',
            trend: '+3.5%',
            desc: 'Calculated from the duration and intensity of cardio sessions. Rises as you accumulate more continuous aerobic effort.',
            metricLabel: 'Endurance Duration',
            metricValue: `${prStats.maxDuration > 0 ? prStats.maxDuration + 's' : '0s'}`,
            sparkline: [Math.max(0, performanceScores.enduranceScore - 25), Math.max(0, performanceScores.enduranceScore - 15), Math.max(0, performanceScores.enduranceScore - 5), performanceScores.enduranceScore]
        },
        {
            label: 'Skill',
            score: performanceScores.skillScore,
            color: 'text-indigo-500',
            bgGlow: 'bg-indigo-500/10',
            borderColor: 'border-indigo-500/20',
            trend: '+0.8%',
            desc: 'Calculated from practice of complex movements. Logging gymnastics or difficult skill holds will make this score go up.',
            metricLabel: 'Skill Progression',
            metricValue: 'Steady',
            sparkline: [Math.max(0, performanceScores.skillScore - 10), Math.max(0, performanceScores.skillScore - 4), Math.max(0, performanceScores.skillScore - 2), performanceScores.skillScore]
        },
        {
            label: 'Recovery',
            score: performanceScores.recoveryScore,
            color: 'text-purple-500',
            bgGlow: 'bg-purple-500/10',
            borderColor: 'border-purple-500/20',
            trend: '+4.2%',
            desc: 'Calculated by balancing intense training with proper rest. Increases when you take rest days or log active recovery.',
            metricLabel: 'Recovery Quality',
            metricValue: 'High',
            sparkline: [Math.max(0, performanceScores.recoveryScore - 15), Math.max(0, performanceScores.recoveryScore - 5), Math.max(0, performanceScores.recoveryScore + 5), performanceScores.recoveryScore]
        }
    ], [performanceScores, totalVolume, streak, prStats]);

    const activePillar = pillarDetails[selectedPillarIndex];




    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-[60vh] gap-3">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#22D3EE] shadow-lg"></div>
                <p className="text-[10px] font-black uppercase text-[#22D3EE] tracking-[0.2em] animate-pulse">Running Calculations...</p>
            </div>
        );
    }

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-8 pb-32 font-sans text-gray-100"
        >
            {/* 1. HEADER */}
            <motion.div variants={sectionVariants} className="flex justify-between items-center px-1">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#22D3EE] via-blue-500 to-indigo-600 rounded-[22px] flex items-center justify-center shadow-2xl shadow-cyan-500/20 ring-1 ring-white/10">
                        <BarChart3 size={28} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500 tracking-tight">
                            Performance
                        </h2>
                        <p className="text-[10px] font-black text-[#22D3EE] uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse" />
                            Athlete Profile & Analytics
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => loadAnalytics(true)}
                    disabled={refreshing}
                    className="p-3 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-2xl border border-white/5 shadow-lg active:scale-95 transition-all text-zinc-400 hover:text-[#22D3EE]"
                >
                    <RefreshCw size={18} className={refreshing ? "animate-spin text-[#22D3EE]" : ""} />
                </button>
            </motion.div>

            {/* 2. PREMIUM PERFORMANCE OVERVIEW HERO */}
            <motion.div variants={sectionVariants} className="w-full relative overflow-hidden bg-[#0a0f18] rounded-[32px] border border-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center p-6 md:p-8 lg:p-10">
                {/* Soft Glassmorphism & Gradient Backgrounds */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#22D3EE]/5 via-transparent to-transparent pointer-events-none" />
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#22D3EE]/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center text-center w-full max-w-2xl">
                    <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-3 md:mb-4">Overall Performance</h3>
                    
                    {/* Score & Tier */}
                    <div className="relative mb-2 md:mb-3 flex flex-col items-center">
                        <span className="text-7xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-100 to-zinc-500 drop-shadow-sm leading-none">
                            {overallScore}
                        </span>
                        <div className="mt-2 md:mt-3 px-4 py-1 md:px-5 md:py-1.5 rounded-full bg-[#22D3EE]/10 border border-[#22D3EE]/20 text-[#22D3EE] text-[10px] md:text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(34,211,238,0.1)]">
                            {getTier(overallScore)} Athlete
                        </div>
                    </div>

                    {/* Trend & Insight */}
                    <div className="flex flex-col items-center gap-2 md:gap-3 mt-4 mb-6 md:mb-8">
                        <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold border border-emerald-500/20">
                            <TrendingUp size={14} />
                            <span>+5 this month</span>
                        </div>
                        <p className="text-xs md:text-sm font-medium text-zinc-400 max-w-md leading-relaxed px-4">
                            Performance improving steadily. Consistency and recovery habits are driving your current progression.
                        </p>
                    </div>

                    {/* Top Contributors Chips */}
                    <div className="flex flex-wrap justify-center gap-2 md:gap-3 w-full border-t border-white/5 pt-4 md:pt-6">
                        <span className="w-full text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-1 md:mb-2">Strongest Contributors</span>
                        {topPillars.map((pillar) => (
                            <div key={pillar.name} className="flex items-center gap-2 bg-white/[0.02] hover:bg-white/[0.05] transition-colors border border-white/10 rounded-[10px] md:rounded-xl px-3 py-1.5 md:px-4 md:py-2 shadow-sm backdrop-blur-sm">
                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-300">{pillar.name}</span>
                                <div className="flex items-center gap-1 text-[#22D3EE]">
                                    <TrendingUp size={12} strokeWidth={3} className="md:w-3.5 md:h-3.5" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* PERFORMANCE TIMELINE */}
            <motion.div variants={sectionVariants}>
                <PerformanceTimeline workouts={allWorkouts} />
            </motion.div>

            {/* 3. RADAR HUB & PILLAR STATS */}
            <motion.div variants={sectionVariants} className="bg-[#111827] rounded-[32px] p-6 md:p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                {/* Decorative glow */}
                <div className="absolute -top-32 -left-32 w-80 h-80 bg-[#22D3EE]/5 rounded-full blur-3xl" />

                {/* Tabs to control the detail view */}
                <div className="flex border-b border-white/5 pb-4 mb-6 gap-6 overflow-x-auto no-scrollbar relative z-10">
                    <button
                        onClick={() => setActiveTab('radar')}
                        className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'radar' ? 'border-[#22D3EE] text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Performance Radar
                    </button>
                    <button
                        onClick={() => setActiveTab('prs')}
                        className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'prs' ? 'border-[#22D3EE] text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                    >
Hall of Fame
                    </button>
                    <button
                        onClick={() => setActiveTab('composition')}
                        className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'composition' ? 'border-[#22D3EE] text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Body Composition
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {/* RADAR HUB VIEW */}
                    {activeTab === 'radar' && (
                        <motion.div
                            key="radar"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
                        >
                            <div className="h-80 md:h-96 relative flex items-center justify-center">
                                <PerformanceCore
                                    data={[
                                        performanceScores.strengthScore,
                                        performanceScores.consistencyScore,
                                        performanceScores.mobilityScore,
                                        performanceScores.enduranceScore,
                                        performanceScores.skillScore,
                                        performanceScores.recoveryScore
                                    ]}
                                    labels={['Strength', 'Consistency', 'Mobility', 'Endurance', 'Skill', 'Recovery']}
                                    selectedIndex={selectedPillarIndex}
                                    onSelect={setSelectedPillarIndex}
                                    overallScore={overallScore}
                                />
                            </div>

                            {/* DYNAMIC DETAIL PANEL */}
                            <div className="flex flex-col justify-center h-full">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activePillar.label}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className={`p-6 md:p-8 rounded-[32px] border ${activePillar.borderColor} ${activePillar.bgGlow} shadow-2xl relative overflow-hidden flex flex-col backdrop-blur-md`}
                                    >
                                        {/* Floating background glow specific to pillar */}
                                        <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] opacity-30 ${activePillar.color.replace('text-', 'bg-')}`} />

                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div>
                                                <h4 className={`text-[10px] font-black uppercase tracking-widest ${activePillar.color} mb-2`}>{activePillar.label} Score</h4>
                                                <div className="flex items-end gap-3">
                                                    <span className="text-6xl font-black text-white leading-none tracking-tighter">{activePillar.score}</span>
                                                    <div className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md text-[10px] font-bold border border-emerald-500/20 mb-1.5">
                                                        <TrendingUp size={12} />
                                                        <span>{activePillar.trend}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm shadow-inner flex-shrink-0">
                                                <Activity size={24} className={activePillar.color} />
                                            </div>
                                        </div>

                                        <p className="text-sm text-zinc-300 font-medium leading-relaxed mb-8 relative z-10">
                                            {activePillar.desc}
                                        </p>

                                        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10 relative z-10">
                                            <div>
                                                <h5 className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">Key Metric: {activePillar.metricLabel}</h5>
                                                <span className="text-xl font-black text-white">{activePillar.metricValue}</span>
                                            </div>
                                            <div className="flex flex-col items-end justify-end">
                                                <h5 className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">Recent Progress</h5>
                                                <div className="flex items-end gap-1.5 h-8">
                                                    {activePillar.sparkline.map((val, i) => (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ height: 0 }}
                                                            animate={{ height: `${Math.max(10, (val / 100) * 100)}%` }}
                                                            transition={{ duration: 0.5, delay: i * 0.1 }}
                                                            className={`w-3 rounded-t-[3px] ${activePillar.color.replace('text-', 'bg-')}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                                <div className="mt-6 text-center">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-center gap-2">
                                        <Info size={14} className="text-zinc-600" /> Tap performance core to explore pillars
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

{/* HALL OF FAME VIEW */}
                    {activeTab === 'prs' && (
                        <motion.div
                            key="prs"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <HallOfFame
                                entries={hallOfFameEntries}
                                careerBests={prStats}
                                topVolume={top3Exercises}
                            />
                        </motion.div>
                    )}

                    {/* BODY COMPOSITION VIEW */}
                    {activeTab === 'composition' && (
                        <motion.div
                            key="composition"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {userProfile && (userProfile.bmi || userProfile.bodyFatPercentage) ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {userProfile.bmi && (
                                        <StatCard
                                            icon={<Activity size={24} />}
                                            label="CURRENT"
                                            title="BMI"
                                            value={parseFloat(userProfile.bmi.toFixed(1))}
                                            colorTheme="yellow"
                                        />
                                    )}
                                    {userProfile.bodyFatPercentage && (
                                        <StatCard
                                            icon={<Flame size={24} />}
                                            label="US NAVY METHOD"
                                            title="Body Fat %"
                                            value={parseFloat(userProfile.bodyFatPercentage.toFixed(1))}
                                            subtitle="%"
                                            colorTheme="cyan"
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="py-12 text-center bg-zinc-900/20 rounded-[24px] border border-dashed border-zinc-800">
                                    <Brain size={40} className="mx-auto mb-4 text-zinc-700" />
                                    <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">No metrics saved yet</p>
                                    <p className="text-zinc-600 font-bold text-[10px] mt-1">Configure your metrics inside Settings to compute body fat percent and BMI.</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* 4. TRAINING MOMENTUM */}
            <motion.div variants={sectionVariants}>
                <TrainingMomentum workouts={allWorkouts} />
            </motion.div>

            {/* 5. JOURNEY & LIFETIME ACHIEVEMENTS */}
            <motion.div variants={sectionVariants} className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <Sparkles className="text-[#22D3EE]" size={24} />
                    <h2 className="text-2xl font-black uppercase tracking-widest text-white">The Journey</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    {/* Card 1: Workouts Completed */}
                    <div className="bg-[#111827] rounded-[32px] p-8 border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-all shadow-xl flex flex-col justify-between min-h-[280px]">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all" />
                        <div>
                            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-4">Dedication</h4>
                            <div className="flex items-end gap-3 mb-2">
                                <span className="text-6xl font-black text-white leading-none tracking-tighter">{totalWorkouts}</span>
                            </div>
                            <p className="text-sm font-medium text-zinc-400 mt-2">Total sessions completed</p>
                        </div>
                        
                        <div className="mt-8">
                            <div className="flex justify-between text-[9px] font-black text-zinc-500 mb-2 uppercase tracking-widest">
                                <span>{totalWorkouts}</span>
                                <span>{Math.ceil(Math.max(1, totalWorkouts + 1) / 100) * 100} Goal</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(totalWorkouts % 100)}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Total Weight Moved (Tons) */}
                    <div className="bg-[#111827] rounded-[32px] p-8 border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-all shadow-xl flex flex-col justify-between min-h-[280px]">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all" />
                        <div>
                            <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-4">Total Weight Moved</h4>
                            <div className="flex items-end gap-2 mb-2">
                                <span className="text-6xl font-black text-white leading-none tracking-tighter">{(totalVolume / 1000).toFixed(1)}</span>
                                <span className="text-xl font-bold text-zinc-500 mb-1">Tons</span>
                            </div>
                            <p className="text-sm font-medium text-zinc-400 mt-2">
                                {totalVolume > 50000 
                                    ? "That's roughly the weight of a commercial airliner." 
                                    : totalVolume > 5000 
                                    ? "That's roughly the weight of an elephant." 
                                    : "Keep lifting to move mountains."}
                            </p>
                        </div>
                        
                        <div className="mt-8 flex gap-1 h-6 items-end">
                            {[0.4, 0.6, 0.5, 0.8, 0.7, 1.0].map((h, i) => (
                                <div key={i} className="w-full bg-purple-500/20 rounded-t-sm" style={{ height: `${h * 100}%` }} />
                            ))}
                        </div>
                    </div>

                    {/* Card 3: Hours Trained */}
                    <div className="bg-[#111827] rounded-[32px] p-8 border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-xl flex flex-col justify-between min-h-[280px]">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all" />
                        <div>
                            <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-4">Time Invested</h4>
                            <div className="flex items-end gap-2 mb-2">
                                <span className="text-6xl font-black text-white leading-none tracking-tighter">{totalHours}</span>
                                <span className="text-xl font-bold text-zinc-500 mb-1">Hours</span>
                            </div>
                            <p className="text-sm font-medium text-zinc-400 mt-2">Total time under tension</p>
                        </div>
                        
                        <div className="mt-8 flex items-center justify-end">
                            <Clock size={32} className="text-emerald-500/30" />
                        </div>
                    </div>

                    {/* Card 4: Longest Streak */}
                    <div className="bg-[#111827] rounded-[32px] p-8 border border-white/5 relative overflow-hidden group hover:border-orange-500/30 transition-all shadow-xl flex flex-col justify-between min-h-[280px]">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all" />
                        <div>
                            <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] mb-4">Unbreakable</h4>
                            <div className="flex items-end gap-2 mb-2">
                                <span className="text-6xl font-black text-white leading-none tracking-tighter">{streak}</span>
                                <span className="text-xl font-bold text-zinc-500 mb-1">Days</span>
                            </div>
                            <p className="text-sm font-medium text-zinc-400 mt-2">Current active streak</p>
                        </div>
                        
                        <div className="mt-8 flex gap-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Flame key={i} size={24} className={i < Math.min(streak, 5) ? "text-orange-500" : "text-white/5"} />
                            ))}
                            {streak > 5 && <span className="text-xs font-bold text-orange-500/50 pt-1">+{streak - 5}</span>}
                        </div>
                    </div>

                    {/* Card 5: Consistency */}
                    <div className="bg-[#111827] rounded-[32px] p-8 border border-white/5 relative overflow-hidden group hover:border-[#22D3EE]/30 transition-all shadow-xl flex flex-col justify-between min-h-[280px]">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#22D3EE]/10 rounded-full blur-3xl group-hover:bg-[#22D3EE]/20 transition-all" />
                        <div>
                            <h4 className="text-[10px] font-black text-[#22D3EE] uppercase tracking-[0.2em] mb-4">Consistency</h4>
                            <div className="flex items-end gap-2 mb-2">
                                <span className="text-6xl font-black text-white leading-none tracking-tighter">{avgPerWeek.toFixed(1)}</span>
                            </div>
                            <p className="text-sm font-medium text-zinc-400 mt-2">Workouts per week on average</p>
                        </div>
                        
                        <div className="mt-8 h-8 flex items-center">
                            <div className="w-full h-[2px] bg-white/10 relative rounded-full">
                                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-[#22D3EE]/10 text-[#22D3EE] text-[9px] font-black rounded-full border border-[#22D3EE]/20 tracking-widest">
                                    ON TRACK
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 6: Personal Records */}
                    <div className="bg-[#111827] rounded-[32px] p-8 border border-white/5 relative overflow-hidden group hover:border-yellow-500/30 transition-all shadow-xl flex flex-col justify-between min-h-[280px]">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl group-hover:bg-yellow-500/20 transition-all" />
                        <div>
                            <h4 className="text-[10px] font-black text-yellow-400 uppercase tracking-[0.2em] mb-4">Peak Performance</h4>
                            <div className="flex items-end gap-2 mb-2">
                                <span className="text-6xl font-black text-white leading-none tracking-tighter">{prStats.maxWeight}</span>
                                <span className="text-xl font-bold text-zinc-500 mb-1">kg</span>
                            </div>
                            <p className="text-sm font-medium text-zinc-400 mt-2">Absolute heaviest lift recorded</p>
                        </div>
                        
                        <div className="mt-8 flex items-center justify-end">
                            <Trophy size={32} className="text-yellow-500/30" />
                        </div>
                    </div>

                </div>
            </motion.div>

            {/* PILLAR INFO MODAL */}
            <AnimatePresence>
                {selectedPillarInfo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-[#1A2236] rounded-2xl shadow-2xl border border-white/5 w-full max-w-[280px] overflow-hidden relative"
                        >
                            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-[#22D3EE]/10 rounded-lg border border-[#22D3EE]/20">
                                        <Info size={16} className="text-[#22D3EE]" />
                                    </div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-tight">
                                        {selectedPillarInfo.title}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setSelectedPillarInfo(null)}
                                    className="text-white/50 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-full"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-4">
                                <div className={`p-3 bg-white/5 rounded-xl border border-white/5 border-l-4 ${selectedPillarInfo.colorClass}`}>
                                    <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                                        {selectedPillarInfo.description}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* OVERALL PILLAR INFO MODAL */}
            <AnimatePresence>
                {showOverallPillarInfo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-[#1A2236] rounded-2xl shadow-2xl border border-white/5 w-full max-w-[320px] overflow-hidden relative"
                        >
                            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-[#22D3EE]/10 rounded-lg border border-[#22D3EE]/20">
                                        <Info size={16} className="text-[#22D3EE]" />
                                    </div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-tight">
                                        Maintaining Ideal Scores
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowOverallPillarInfo(false)}
                                    className="text-white/50 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-full"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                                    To maintain ideal scores across all pillars, aim for a balanced training routine. Consistency is key—log your workouts regularly to avoid score decay.
                                </p>
                                <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                                    Mix heavy compound lifts (Strength) with steady-state cardio (Endurance), and always allocate time for stretching (Mobility) and active rest days (Recovery).
                                </p>
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5 border-l-4 border-l-[#22D3EE]">
                                    <p className="text-[11px] text-[#22D3EE] font-bold leading-relaxed">
                                        Note: Specializing heavily in one area while ignoring others will naturally lower your neglected scores, as the system dynamically adapts to your current training focus.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

</motion.div>
    );
};
