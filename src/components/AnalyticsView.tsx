import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Chart as ChartJS,
    RadialLinearScale,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { WorkoutService } from '../services/workoutService';
import { UserService, type UserProfile } from '../services/userService';
import { auth } from '../services/firebase';
import type { Workout, WorkoutExercise } from '../types';
import { 
    Flame, TrendingUp, BarChart3, Activity, Clock, Zap, X, Dumbbell, 
    Calendar, Medal, Trophy, Brain, Sparkles, RefreshCw, Info
} from 'lucide-react';

import { useNotification } from '../context/NotificationContext';
import { StatCard, type CardColor } from './StatCard';
import { calculateStreak } from '../utils/workoutAnalytics';
import { calculatePerformanceScores } from '../utils/performanceEngine';
import { computeRefinedArchetype } from '../utils/athleteIdentityEngine';
import { computeReadiness } from '../utils/readinessEngine';
import { generateInsights } from '../utils/dynamicInsightEngine';



// Register ChartJS modules including RadialLinearScale for the Radar chart
ChartJS.register(
    RadialLinearScale,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

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
    const [activeTab, setActiveTab] = useState<'radar' | 'skills' | 'prs' | 'composition'>('radar');

    // Stats
    const [totalWorkouts, setTotalWorkouts] = useState(0);
    const [totalVolume, setTotalVolume] = useState(0);
    const [monthlyWorkouts, setMonthlyWorkouts] = useState(0);
    const [avgPerWeek, setAvgPerWeek] = useState(0);
    const [streak, setStreak] = useState(0);

    // Personal Records & Contributors
    const [prStats, setPrStats] = useState({ maxWeight: 0, maxReps: 0, maxDuration: 0 });
    const [top3Exercises, setTop3Exercises] = useState<{ name: string; reps: number; sets: number; weight: number }[]>([]);
    type SelectedExercise = { name: string; reps: number; sets: number; weight: number };
    const [selectedExercise, setSelectedExercise] = useState<SelectedExercise | null>(null);
    const [showPillarInfo, setShowPillarInfo] = useState(false);


    const getLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

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
                }
            });

            // Streak
            const currentStreak = calculateStreak(workouts);

            const sortedExercises = Object.entries(exerciseStats)
                .map(([name, stats]) => ({ name, ...stats }))
                .sort((a, b) => b.reps - a.reps)
                .slice(0, 3);

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
            setStreak(currentStreak);
            setTop3Exercises(sortedExercises);
            setPrStats({ maxWeight: maxW, maxReps: maxR, maxDuration: maxD });
            
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

    // Phase 5.3/5.4 — Refined Athlete Identity
    const athleteIdentity = useMemo(() => {
        return computeRefinedArchetype(performanceScores, { recoveryBias: true });
    }, [performanceScores]);

    // Phase 5.1/5.4 — Readiness Engine + Insights
    const readinessMetrics = useMemo(() => {
        const readiness = computeReadiness(performanceScores);

        const recommendation = (() => {
            if (readiness.recoveryState === 'overreached') {
                return 'Overreached signals detected. Keep intensity low today and prioritize recovery fundamentals.';
            }
            if (readiness.recoveryState === 'recovering') {
                return 'Recovery is building. Choose moderate-to-light work and include mobility + hydration to restore readiness.';
            }
            if (readiness.recoveryState === 'peaking') {
                return 'You’re peaking. This is a strong day for a high-quality training session—commit to effort with crisp technique.';
            }
            // ready
            if (performanceScores.mobilityScore < 60) {
                return 'Mobility balance looks low. Start with a mobility flow to improve range and session quality.';
            }
            return 'You are ready for performance. Train with intent and progress safely within today’s recommended intensity.';
        })();

        const insights = generateInsights(performanceScores, readiness);

        return {
            readiness: readiness.readinessScore,
            recommendation,
            readinessState: readiness.recoveryState,
            intensityRecommendation: readiness.intensityRecommendation,
            limitingFactor: readiness.limitingFactor,
            insights,
        };
    }, [performanceScores]);


    // Active momentum timeline grid (last 28 days: 4 weeks * 7 days)
    const momentumTimeline = useMemo(() => {
        const days = [];
        const today = new Date();
        
        for (let i = 27; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = getLocalDateString(date);

            const matchedWorkout = allWorkouts.find(w => w.date === dateStr);
            let state: 'none' | 'workout' | 'rest' = 'none';

            if (matchedWorkout) {
                state = matchedWorkout.isRestDay ? 'rest' : 'workout';
            }

            days.push({
                dateStr,
                label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                state
            });
        }
        return days;
    }, [allWorkouts]);

    // Skill Progression metrics
    const skillProgressTracks = useMemo(() => {
        const bestScores: Record<string, number> = {};
        
        allWorkouts.forEach(w => {
            w.exercises.forEach(ex => {
                const name = ex.name.toLowerCase();
                let score = 0;
                
                if (ex.sets && Array.isArray(ex.sets)) {
                    ex.sets.forEach(s => {
                        if (s.completed) {
                            const val = Number(s.duration) || Number(s.reps) || 0;
                            if (val > score) score = val;
                        }
                    });
                } else {
                    score = Number(ex.duration) || Number(ex.reps) || 0;
                }

                if (score > 0) {
                    bestScores[name] = Math.max(bestScores[name] || 0, score);
                }
            });
        });

        return [
            {
                name: "Plank Hold",
                current: bestScores["plank"] || bestScores["forearm plank"] || 0,
                unit: "s",
                tiers: [
                    { val: 30, name: "Beginner", icon: "🌱" },
                    { val: 60, name: "Pioneer", icon: "🔥" },
                    { val: 120, name: "Specialist", icon: "⚡" },
                    { val: 180, name: "Master", icon: "👑" }
                ]
            },
            {
                name: "Pull-Up Reps",
                current: bestScores["pull-up"] || 0,
                unit: "reps",
                tiers: [
                    { val: 1, name: "First Rep", icon: "🎯" },
                    { val: 5, name: "Contender", icon: "⚡" },
                    { val: 10, name: "Dominant", icon: "💥" },
                    { val: 15, name: "Master", icon: "👑" }
                ]
            },
            {
                name: "Crow Pose Balance",
                current: bestScores["crow pose"] || 0,
                unit: "s",
                tiers: [
                    { val: 5, name: "Beginner Balance", icon: "🤸" },
                    { val: 15, name: "Stable Control", icon: "🧘" },
                    { val: 30, name: "Master Stability", icon: "👑" }
                ]
            }
        ];
    }, [allWorkouts]);

    // Achievements List with Tiered Dynamic Progressions
    const dynamicAchievements = useMemo(() => {
        interface Tier {
            name: string;
            target: number;
            badge: string;
            color: string;
        }

        const getProgress = (
            currentVal: number,
            tiers: Tier[],
            unit: string,
            icon: string,
            baseDesc: string
        ) => {
            let activeIdx = -1;
            for (let i = 0; i < tiers.length; i++) {
                if (currentVal >= tiers[i].target) {
                    activeIdx = i;
                } else {
                    break;
                }
            }

            const unlocked = activeIdx >= 0;
            const nextIdx = activeIdx + 1;
            const hasNext = nextIdx < tiers.length;

            const currentTier = unlocked ? tiers[activeIdx] : null;
            const nextTier = hasNext ? tiers[nextIdx] : null;

            const activeTargetName = nextTier ? nextTier.name : (currentTier ? currentTier.name : tiers[0].name);
            const activeTargetVal = nextTier ? nextTier.target : tiers[tiers.length - 1].target;

            const desc = nextTier 
                ? `${baseDesc} Next tier: ${nextTier.name} (${nextTier.target}${unit}).`
                : `${baseDesc} Ultimate Mastery achieved!`;

            return {
                name: activeTargetName,
                desc,
                icon,
                unlocked,
                metric: `${currentVal} / ${activeTargetVal} ${unit}`,
                percent: Math.min(100, (currentVal / activeTargetVal) * 100),
                badgeName: currentTier ? currentTier.name : "Initiate",
                badgeColor: currentTier ? currentTier.color : "text-zinc-600 border-zinc-800",
                badgeBadge: currentTier ? currentTier.badge : "Bronze",
                unlockedCount: activeIdx + 1,
                totalTiers: tiers.length
            };
        };

        const list = [];

        // 1. Strength (Iron Athlete)
        const strengthTiers: Tier[] = [
            { name: "Bronze Lifter", target: 40, badge: "Bronze", color: "text-amber-600 border-amber-600/30 bg-amber-500/5 dark:text-amber-500" },
            { name: "Silver Lifter", target: 60, badge: "Silver", color: "text-slate-400 border-slate-400/30 bg-slate-400/5" },
            { name: "Gold Lifter", target: 80, badge: "Gold", color: "text-yellow-500 border-yellow-500/30 bg-yellow-500/5" },
            { name: "Platinum Lifter", target: 100, badge: "Platinum", color: "text-sky-300 border-sky-300/30 bg-sky-300/5" },
            { name: "Diamond Titan", target: 120, badge: "Diamond", color: "text-[#B9F2FF] border-[#B9F2FF]/30 bg-[#B9F2FF]/5" }
        ];
        list.push(getProgress(prStats.maxWeight, strengthTiers, "kg", "🏋️‍♂️", "Push your limits in traditional lifts."));

        // 2. Consistency (Habit Streak)
        const currentStreak = calculateStreak(allWorkouts);
        const consistencyTiers: Tier[] = [
            { name: "Daily Spark", target: 3, badge: "Bronze", color: "text-amber-600 border-amber-600/30 bg-amber-500/5 dark:text-amber-500" },
            { name: "Weekly Engine", target: 7, badge: "Silver", color: "text-slate-400 border-slate-400/30 bg-slate-400/5" },
            { name: "Monthly Momentum", target: 14, badge: "Gold", color: "text-yellow-500 border-yellow-500/30 bg-yellow-500/5" },
            { name: "Consistent Pro", target: 21, badge: "Platinum", color: "text-sky-300 border-sky-300/30 bg-sky-300/5" },
            { name: "Unstoppable Athlete", target: 30, badge: "Diamond", color: "text-[#B9F2FF] border-[#B9F2FF]/30 bg-[#B9F2FF]/5" }
        ];
        list.push(getProgress(currentStreak, consistencyTiers, "days", "🔥", "Maintain a consecutive training streak."));

        // 3. Mobility (Stretch Holds)
        let totalHold = 0;
        allWorkouts.forEach(w => w.exercises.forEach(ex => {
            if (ex.sets && Array.isArray(ex.sets)) {
                ex.sets.forEach(s => {
                    if (s.completed && (ex.name.toLowerCase().includes("pose") || ex.name.toLowerCase().includes("stretch"))) {
                        totalHold += Number(s.duration) || 0;
                    }
                });
            } else {
                if (ex.name.toLowerCase().includes("pose") || ex.name.toLowerCase().includes("stretch")) {
                    totalHold += Number(ex.duration) || 0;
                }
            }
        }));
        const mobilityTiers: Tier[] = [
            { name: "Zen Initiate", target: 60, badge: "Bronze", color: "text-amber-600 border-amber-600/30 bg-amber-500/5 dark:text-amber-500" },
            { name: "Zen Apprentice", target: 180, badge: "Silver", color: "text-slate-400 border-slate-400/30 bg-slate-400/5" },
            { name: "Zen Practitioner", target: 300, badge: "Gold", color: "text-yellow-500 border-yellow-500/30 bg-yellow-500/5" },
            { name: "Zen Master", target: 600, badge: "Platinum", color: "text-sky-300 border-sky-300/30 bg-sky-300/5" },
            { name: "Yogi Adept", target: 1200, badge: "Diamond", color: "text-[#B9F2FF] border-[#B9F2FF]/30 bg-[#B9F2FF]/5" }
        ];
        list.push(getProgress(totalHold, mobilityTiers, "s", "🧘", "Spend time holding deep stretching poses."));

        // 4. Endurance (Cardio Conditioning)
        let totalCardioDist = 0;
        allWorkouts.forEach(w => w.exercises.forEach(ex => {
            if (ex.sets && Array.isArray(ex.sets)) {
                ex.sets.forEach(s => {
                    if (s.completed && (ex.name.toLowerCase().includes("run") || ex.name.toLowerCase().includes("cycle") || ex.name.toLowerCase().includes("cardio"))) {
                        totalCardioDist += Number(s.distance) || 0;
                    }
                });
            } else {
                if (ex.name.toLowerCase().includes("run") || ex.name.toLowerCase().includes("cycle") || ex.name.toLowerCase().includes("cardio")) {
                    totalCardioDist += Number(ex.distance) || 0;
                }
            }
        }));
        const enduranceTiers: Tier[] = [
            { name: "Stamina Beginner", target: 3000, badge: "Bronze", color: "text-amber-600 border-amber-600/30 bg-amber-500/5 dark:text-amber-500" },
            { name: "Stamina Cruiser", target: 10000, badge: "Silver", color: "text-slate-400 border-slate-400/30 bg-slate-400/5" },
            { name: "Stamina Challenger", target: 20000, badge: "Gold", color: "text-yellow-500 border-yellow-500/30 bg-yellow-500/5" },
            { name: "Stamina Champion", target: 40000, badge: "Platinum", color: "text-sky-300 border-sky-300/30 bg-sky-300/5" },
            { name: "Endurance Pioneer", target: 80000, badge: "Diamond", color: "text-[#B9F2FF] border-[#B9F2FF]/30 bg-[#B9F2FF]/5" }
        ];
        list.push(getProgress(totalCardioDist, enduranceTiers, "m", "🏃‍♂️", "Accumulate road cardiorespiratory volume."));

        // 5. Skill (Pull-Up Reps)
        const bestScores: Record<string, number> = {};
        allWorkouts.forEach(w => w.exercises.forEach(ex => {
            const name = ex.name.toLowerCase();
            let score = 0;
            if (ex.sets && Array.isArray(ex.sets)) {
                ex.sets.forEach(s => {
                    if (s.completed) {
                        const val = Number(s.reps) || 0;
                        if (val > score) score = val;
                    }
                });
            } else {
                score = Number(ex.reps) || 0;
            }
            if (name.includes("pull-up") && score > 0) {
                bestScores["pull-up"] = Math.max(bestScores["pull-up"] || 0, score);
            }
        }));
        const pullUpCount = bestScores["pull-up"] || 0;
        const skillTiers: Tier[] = [
            { name: "First Pull-Up", target: 1, badge: "Bronze", color: "text-amber-600 border-amber-600/30 bg-amber-500/5 dark:text-amber-500" },
            { name: "Pull-Up Contender", target: 5, badge: "Silver", color: "text-slate-400 border-slate-400/30 bg-slate-400/5" },
            { name: "Pull-Up Dominant", target: 10, badge: "Gold", color: "text-yellow-500 border-yellow-500/30 bg-yellow-500/5" },
            { name: "Pull-Up Master", target: 15, badge: "Platinum", color: "text-sky-300 border-sky-300/30 bg-sky-300/5" },
            { name: "Gravity Defier", target: 20, badge: "Diamond", color: "text-[#B9F2FF] border-[#B9F2FF]/30 bg-[#B9F2FF]/5" }
        ];
        list.push(getProgress(pullUpCount, skillTiers, "reps", "🤸", "Unlock strict calisthenics pull-ups."));

        // 6. Recovery (Structural Balance)
        const recoveryTiers: Tier[] = [
            { name: "Rest Initiate", target: 60, badge: "Bronze", color: "text-amber-600 border-amber-600/30 bg-amber-500/5 dark:text-amber-500" },
            { name: "Balanced Rest", target: 70, badge: "Silver", color: "text-slate-400 border-slate-400/30 bg-slate-400/5" },
            { name: "Symmetry Guardian", target: 80, badge: "Gold", color: "text-yellow-500 border-yellow-500/30 bg-yellow-500/5" },
            { name: "Recovery Guru", target: 88, badge: "Platinum", color: "text-sky-300 border-sky-300/30 bg-sky-300/5" },
            { name: "Longevity Sage", target: 95, badge: "Diamond", color: "text-[#B9F2FF] border-[#B9F2FF]/30 bg-[#B9F2FF]/5" }
        ];
        list.push(getProgress(Math.round(performanceScores.recoveryScore), recoveryTiers, "pts", "🛡️", "Maintain push/pull and upper/lower symmetry."));

        return list;
    }, [allWorkouts, prStats, performanceScores]);

    // Radar Chart configuration
    const radarData = useMemo(() => ({
        labels: ['Strength', 'Consistency', 'Mobility', 'Endurance', 'Skill', 'Recovery'],
        datasets: [{
            label: 'Performance Level',
            data: [
                performanceScores.strengthScore,
                performanceScores.consistencyScore,
                performanceScores.mobilityScore,
                performanceScores.enduranceScore,
                performanceScores.skillScore,
                performanceScores.recoveryScore
            ],
            backgroundColor: 'rgba(34, 211, 238, 0.15)', // Glass cyan glow
            borderColor: '#22D3EE',
            borderWidth: 2,
            pointBackgroundColor: '#22D3EE',
            pointBorderColor: '#0B1220',
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#22D3EE',
            pointRadius: 4.5,
            pointHoverRadius: 7,
            fill: true
        }]
    }), [performanceScores]);

    const radarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            r: {
                angleLines: { color: 'rgba(255, 255, 255, 0.06)' },
                grid: { color: 'rgba(255, 255, 255, 0.06)' },
                pointLabels: {
                    color: '#94a3b8',
                    // chart.js typings don’t like arbitrary weight strings in nested font objects
                    font: { size: 10, family: 'Outfit, sans-serif' }
                },
                ticks: {
                    backdropColor: 'transparent',
                    color: '#4b5563',
                    font: { size: 8 },
                    max: 100,
                    min: 0,
                    stepSize: 20,
                    showLabelBackdrop: false
                },
                suggestedMin: 0,
                suggestedMax: 100
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#18181b',
                titleFont: { size: 12, weight: 'bold' as const },
                bodyFont: { size: 14, weight: 'bold' as const },
                padding: 12,
                cornerRadius: 12,
                displayColors: false,
            }
        }
    };


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

            {/* 2. ATHLETE IDENTITY & READINESS */}
            <motion.div variants={sectionVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Identity Archetype Card */}
                <div className={`lg:col-span-2 relative overflow-hidden bg-gradient-to-br ${athleteIdentity.color} rounded-[32px] p-8 shadow-2xl ${athleteIdentity.shadow} border border-white/10 flex flex-col justify-between group min-h-[220px]`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-4xl filter drop-shadow-md">{athleteIdentity.emoji}</span>
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none">
                                    {athleteIdentity.name}
                                </h3>
                                <p className="text-[9px] font-black text-white/70 uppercase tracking-widest mt-1">Calculated Archetype</p>
                            </div>
                        </div>
                        <p className="text-white/95 font-medium text-sm leading-relaxed max-w-xl">
                            {athleteIdentity.desc}
                        </p>
                    </div>

                    <div className="relative z-10 flex flex-wrap gap-4 mt-6 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2">
                            <Flame size={16} className="text-white/80" />
                            <span className="text-xs font-black uppercase text-white/95">{streak} Day Streak</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Trophy size={16} className="text-white/80" />
                            <span className="text-xs font-black uppercase text-white/95">{totalWorkouts} Workouts Logged</span>
                        </div>
                    </div>
                </div>

                {/* Readiness Score Card */}
                <div className="bg-[#111827] rounded-[32px] p-6 border border-white/5 flex flex-col justify-between shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Readiness Index</h4>
                            <Brain size={18} className="text-indigo-400" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-black tracking-tighter text-indigo-400">{readinessMetrics.readiness}%</span>
                        </div>
                    </div>

                        <div className="mt-4 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                        <p className="text-zinc-400 font-bold text-xs leading-relaxed flex items-start gap-2">
                            <Sparkles size={16} className="text-[#22D3EE] shrink-0 mt-0.5" />
                            <span>{readinessMetrics.recommendation}</span>
                        </p>

                        {/* Phase 5.2 — Dynamic coach-style insights */}
                        {readinessMetrics.insights?.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#22D3EE]/70" />
                                    Coach Insights
                                </div>
                                {readinessMetrics.insights.map((insight) => (
                                    <div
                                        key={insight.id}
                                        className={`p-3 rounded-xl border ${
                                            insight.tone === 'warn'
                                                ? 'bg-rose-500/5 border-rose-500/15 text-rose-200'
                                                : insight.tone === 'good'
                                                    ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-200'
                                                    : 'bg-white/5 border-white/10 text-zinc-200'
                                        }`}
                                    >
                                        <div className="text-[10px] font-black uppercase tracking-widest">
                                            {insight.title}
                                        </div>
                                        <div className="text-[10px] leading-relaxed mt-1 text-zinc-300/90 font-bold">
                                            {insight.body}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
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
                        onClick={() => setActiveTab('skills')}
                        className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'skills' ? 'border-[#22D3EE] text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Skill Milestones
                    </button>
                    <button
                        onClick={() => setActiveTab('prs')}
                        className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'prs' ? 'border-[#22D3EE] text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Records & Contributors
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
                                <Radar data={radarData} options={radarOptions} className="w-full h-full" />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pillar breakdown</h4>
                                    <button 
                                        onClick={() => setShowPillarInfo(true)}
                                        className="text-zinc-500 hover:text-[#22D3EE] transition-colors p-1"
                                        title="Learn how to influence these metrics"
                                    >
                                        <Info size={16} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'Strength', val: performanceScores.strengthScore, color: 'border-l-orange-500' },
                                        { label: 'Consistency', val: performanceScores.consistencyScore, color: 'border-l-emerald-500' },
                                        { label: 'Mobility', val: performanceScores.mobilityScore, color: 'border-l-teal-500' },
                                        { label: 'Endurance', val: performanceScores.enduranceScore, color: 'border-l-sky-500' },
                                        { label: 'Skill', val: performanceScores.skillScore, color: 'border-l-indigo-500' },
                                        { label: 'Recovery', val: performanceScores.recoveryScore, color: 'border-l-purple-500' }
                                    ].map(p => (
                                        <div key={p.label} className={`p-4 bg-white/5 rounded-2xl border border-white/5 border-l-4 ${p.color} hover:bg-white/10 transition-colors`}>
                                            <p className="text-zinc-500 font-black text-[9px] uppercase tracking-widest">{p.label}</p>
                                            <p className="text-2xl font-black mt-1 leading-none">{p.val}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* SKILL PROGRESSION VIEW */}
                    {activeTab === 'skills' && (
                        <motion.div 
                            key="skills"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {skillProgressTracks.map((track) => {
                                    // Find highest achieved tier
                                    const achievedTier = [...track.tiers].reverse().find(t => track.current >= t.val);
                                    const nextTier = track.tiers.find(t => track.current < t.val);
                                    
                                    // calculate progress percent
                                    const maxTarget = track.tiers[track.tiers.length - 1].val;
                                    const progressPercent = Math.min(100, (track.current / maxTarget) * 100);

                                    return (
                                        <div key={track.name} className="p-5 bg-white/5 border border-white/5 rounded-2xl relative overflow-hidden group">
                                            <h5 className="font-black text-sm text-white uppercase tracking-wide mb-1">{track.name}</h5>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase mb-4">
                                                Best: {track.current} {track.unit}
                                            </p>

                                            {/* Milestone Badge */}
                                            <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5 mb-6">
                                                <span className="text-xl">{achievedTier ? achievedTier.icon : "🌱"}</span>
                                                <div>
                                                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Active Rank</p>
                                                    <p className="text-xs font-black uppercase text-[#22D3EE]">
                                                        {achievedTier ? achievedTier.name : "Initiate"}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[9px] font-black uppercase text-zinc-500">
                                                    <span>Overall progress</span>
                                                    <span>{Math.round(progressPercent)}%</span>
                                                </div>
                                                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-[#22D3EE] to-blue-500 rounded-full" style={{ width: `${progressPercent}%` }} />
                                                </div>
                                            </div>

                                            {/* Next Tier */}
                                            {nextTier && (
                                                <p className="text-[9px] font-black uppercase text-zinc-500 mt-4 leading-relaxed flex items-center gap-1">
                                                    <span>Next unlock:</span>
                                                    <span className="text-white">{nextTier.name} ({nextTier.val} {track.unit})</span>
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Dynamic Tiered Achievement Showcase */}
                            <div className="mt-12 pt-8 border-t border-white/5 space-y-5 relative z-10">
                                <div>
                                    <h4 className="text-[10px] font-black text-[#22D3EE] uppercase tracking-[0.2em]">Trophy Room</h4>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight mt-1">Dynamic Athletic Progressions</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {dynamicAchievements.map((ach) => (
                                        <div 
                                            key={ach.name} 
                                            className={`p-5 rounded-3xl border flex flex-col justify-between transition-all relative overflow-hidden group hover:scale-[1.02] duration-300 ${
                                                ach.unlocked 
                                                    ? 'bg-[#1e293b]/30 dark:bg-white/5 border-cyan-500/15 shadow-[0_0_20px_rgba(34,211,238,0.03)]' 
                                                    : 'bg-zinc-950/20 border-zinc-900 opacity-60'
                                            }`}
                                        >
                                            {/* Glow overlay for unlocked */}
                                            {ach.unlocked && <div className="absolute top-0 right-0 w-20 h-20 bg-[#22D3EE]/5 rounded-full blur-2xl pointer-events-none" />}
                                            
                                            <div>
                                                <div className="flex items-start gap-4">
                                                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-md transition-colors ${
                                                        ach.unlocked ? 'bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/25' : 'bg-zinc-800 text-zinc-600 border border-zinc-800'
                                                    }`}>
                                                        {ach.icon}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h5 className={`font-black text-xs uppercase tracking-wide leading-none ${ach.unlocked ? 'text-white' : 'text-zinc-500'}`}>
                                                                {ach.name}
                                                            </h5>
                                                            {ach.unlocked && (
                                                                <span className={`text-[8px] font-black uppercase px-2.5 py-0.5 rounded-full border tracking-widest ${ach.badgeColor}`}>
                                                                    {ach.badgeBadge}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold leading-normal mt-2">
                                                            {ach.desc}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Dynamic progress bar and metric ratio */}
                                            <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
                                                <div className="flex justify-between items-baseline text-[9px] font-black uppercase tracking-wider">
                                                    <span className={ach.unlocked ? 'text-[#22D3EE]' : 'text-zinc-600'}>
                                                        {ach.unlocked ? `${ach.badgeName} Active` : 'Initiate Locked'}
                                                    </span>
                                                    <span className="text-zinc-400 dark:text-zinc-500 font-bold">{ach.metric}</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-zinc-800/80 dark:bg-zinc-950 rounded-full overflow-hidden shadow-inner">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                                                            ach.unlocked 
                                                                ? 'bg-gradient-to-r from-cyan-400 to-blue-500' 
                                                                : 'bg-gradient-to-r from-zinc-700 to-zinc-600'
                                                        }`} 
                                                        style={{ width: `${ach.percent}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* PERSONAL RECORDS VIEW */}
                    {activeTab === 'prs' && (
                        <motion.div 
                            key="prs"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
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

                            <div className="space-y-3 mt-6">
                                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Top Volume Contributors</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                            <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Log workouts to unlock contributions</p>
                                        </div>
                                    )}
                                </div>
                            </div>
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

            {/* 4. WEEKLY MOMENTUM HEATMAP */}
            <motion.div variants={sectionVariants} className="bg-[#111827] p-6 rounded-[24px] border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 relative z-10 flex items-center gap-2">
                    <span className="w-6 h-[2px] bg-[#22D3EE]" />
                    Rolling Consistency (Last 28 Days)
                </h3>

                <div className="grid grid-cols-7 gap-2 relative z-10 pt-2">
                    {momentumTimeline.map((day, idx) => {
                        let colorClass = "bg-zinc-800/40 border-zinc-800/80 hover:bg-zinc-800";
                        let glowClass = "";
                        
                        if (day.state === 'workout') {
                            colorClass = "bg-[#22D3EE]/25 border-[#22D3EE]/40 text-[#22D3EE] font-black";
                            glowClass = "shadow-[0_0_8px_rgba(34,211,238,0.15)]";
                        } else if (day.state === 'rest') {
                            colorClass = "bg-emerald-500/20 border-emerald-500/35 text-emerald-400 font-black";
                            glowClass = "shadow-[0_0_8px_rgba(16,185,129,0.15)]";
                        }

                        return (
                            <div
                                key={idx}
                                title={`${day.label}: ${day.state === 'workout' ? 'Workout Logged' : day.state === 'rest' ? 'Rest Day Logged' : 'No Activity'}`}
                                className={`aspect-square rounded-lg border flex flex-col items-center justify-center p-1 cursor-pointer transition-all ${colorClass} ${glowClass} hover:scale-105`}
                            >
                                <span className="text-[9px] font-black opacity-80">{idx + 1}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5 text-[9px] font-black uppercase text-zinc-500">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <div className="w-2.5 h-2.5 bg-[#22D3EE]/25 border border-[#22D3EE]/40 rounded" />
                            <span>Workout</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2.5 h-2.5 bg-emerald-500/20 border border-emerald-500/35 rounded" />
                            <span>Active Rest</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2.5 h-2.5 bg-zinc-800/40 border border-zinc-800/85 rounded" />
                            <span>Unlogged</span>
                        </div>
                    </div>
                    <span>{streak} Day Streak</span>
                </div>
            </motion.div>

            {/* 5. SUMMARY STATS GRID */}
            <motion.div variants={sectionVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard 
                    icon={<Calendar size={24} />}
                    label="LIFETIME"
                    title="Total Sessions"
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

            {/* PILLAR INFO MODAL */}
            <AnimatePresence>
                {showPillarInfo && (
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
                            className="bg-[#1A2236] rounded-[32px] shadow-2xl border border-white/5 w-full max-w-md max-h-[85vh] flex flex-col relative overflow-hidden"
                        >
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[#22D3EE]/10 rounded-xl border border-[#22D3EE]/20">
                                        <Info size={20} className="text-[#22D3EE]" />
                                    </div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight">
                                        Performance Pillars
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowPillarInfo(false)}
                                    className="text-white/50 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto no-scrollbar space-y-6">
                                <p className="text-xs text-zinc-400 font-bold leading-relaxed">
                                    Your scores dynamically adapt based on your logged training volume, intensity, and frequency.
                                </p>
                                
                                <div className="space-y-3">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 border-l-4 border-l-orange-500">
                                        <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                                            Strength
                                        </h4>
                                        <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                                            Influenced by maximum weight lifted and total volume in heavy compound movements (e.g., Squats, Deadlifts).
                                        </p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 border-l-4 border-l-emerald-500">
                                        <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                                            Consistency
                                        </h4>
                                        <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                                            Fueled by logging workouts regularly. Longer streaks and higher weekly frequency boost this score.
                                        </p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 border-l-4 border-l-teal-500">
                                        <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                                            Mobility
                                        </h4>
                                        <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                                            Driven by time under tension in stretches, poses, and flexibility-focused holds.
                                        </p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 border-l-4 border-l-sky-500">
                                        <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                                            Endurance
                                        </h4>
                                        <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                                            Improved by accumulating distance and duration in steady-state or high-intensity cardio activities.
                                        </p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 border-l-4 border-l-indigo-500">
                                        <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                                            Skill
                                        </h4>
                                        <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                                            Progresses by mastering complex bodyweight movements, gymnastics, and high-rep calisthenics limits.
                                        </p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 border-l-4 border-l-purple-500">
                                        <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                                            Recovery
                                        </h4>
                                        <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                                            Maintained by structural balance (push vs pull), taking active rest days, and avoiding extreme overtraining markers.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* EXERCISE MODAL */}
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
