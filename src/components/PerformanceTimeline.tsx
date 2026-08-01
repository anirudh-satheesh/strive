import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip as ChartTooltip,
    Filler,
    type ChartOptions,
    type ChartData,
    type ScriptableContext
} from 'chart.js';
import type { Workout } from '../types';
import { calculatePerformanceScores } from '../utils/performanceEngine';
import { getLocalDateString } from '../utils/workoutAnalytics';
import { Activity, Trophy, Dumbbell, Clock, Zap } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    ChartTooltip,
    Filler
);

type TimeRange = '1W' | '1M' | '3M' | '1Y' | 'ALL';

interface TimelineDataPoint {
    date: Date;
    dateString: string;
    score: number;
    volume: number;
    duration: number;
    dominantPillar: { name: string; score: number };
    exercises: string[];
    isMilestone: boolean;
    milestoneLabel?: string;
    milestoneIcon?: 'trophy' | 'zap' | 'star';
}

interface PerformanceTimelineProps {
    workouts: Workout[];
}

export const PerformanceTimeline: React.FC<PerformanceTimelineProps> = ({ workouts }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('1M');
    const [selectedPoint, setSelectedPoint] = useState<TimelineDataPoint | null>(null);
    const [isHovering, setIsHovering] = useState(false);

    const chartDataPoints = useMemo(() => {
        const points: TimelineDataPoint[] = [];
        if (!workouts || workouts.length === 0) return points;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let startDate = new Date(now);
        if (timeRange === '1W') startDate.setDate(now.getDate() - 7);
        else if (timeRange === '1M') startDate.setMonth(now.getMonth() - 1);
        else if (timeRange === '3M') startDate.setMonth(now.getMonth() - 3);
        else if (timeRange === '1Y') startDate.setFullYear(now.getFullYear() - 1);
        else {
            // ALL TIME
            const earliestWorkout = workouts.reduce((earliest, w) => {
                const wDate = new Date(w.date);
                return wDate < earliest ? wDate : earliest;
            }, new Date());
            startDate = new Date(earliestWorkout);
            startDate.setDate(startDate.getDate() - 7); // give some padding
        }

        const daysDiff = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const numDays = Math.max(7, daysDiff + 1);

        let maxScore = 0;

        for (let i = 0; i < numDays; i++) {
            const evalDate = new Date(startDate);
            evalDate.setDate(startDate.getDate() + i);
            evalDate.setHours(23, 59, 59, 999); // end of that day

            const dateStr = getLocalDateString(evalDate);
            const workoutsOnDay = workouts.filter(w => w.date === dateStr);

            // Calculate scores up to this date
            const scores = calculatePerformanceScores(workouts, evalDate);
            const overallScore = Math.round(
                (scores.strengthScore + scores.consistencyScore + scores.mobilityScore +
                scores.enduranceScore + scores.skillScore + scores.recoveryScore) / 6
            );

            // Dominant pillar
            const pillars = [
                { name: 'Strength', score: scores.strengthScore },
                { name: 'Consistency', score: scores.consistencyScore },
                { name: 'Mobility', score: scores.mobilityScore },
                { name: 'Endurance', score: scores.enduranceScore },
                { name: 'Skill', score: scores.skillScore },
                { name: 'Recovery', score: scores.recoveryScore }
            ].sort((a, b) => b.score - a.score);

            let dayVol = 0;
            let dayDur = 0;
            const dayExercises: string[] = [];

            workoutsOnDay.forEach(w => {
                if (!w.isRestDay) {
                    w.exercises.forEach(ex => {
                        dayExercises.push(ex.name);
                        const dur = Number(ex.duration) || 0;
                        dayDur += dur;

                        let eSets = Array.isArray(ex.sets) ? ex.sets.length : (Number(ex.sets) || 0);
                        if (Array.isArray(ex.sets)) {
                            ex.sets.forEach(set => {
                                const r = Number(set.reps) || 0;
                                const weight = Number(set.weight) || 0;
                                dayVol += (r * weight);
                            });
                        } else {
                            const eReps = Number(ex.reps) || 0;
                            const eWeight = Number(ex.weight) || 0;
                            dayVol += (eSets * eReps * eWeight);
                        }
                    });
                }
            });

            let isMilestone = false;
            let milestoneLabel = undefined;
            let milestoneIcon: 'trophy' | 'zap' | 'star' | undefined = undefined;

            // Simple milestone logic
            if (overallScore > maxScore && overallScore > 50 && i > 5) {
                isMilestone = true;
                milestoneLabel = 'New Performance Peak';
                milestoneIcon = 'trophy';
                maxScore = overallScore;
            } else if (dayVol > 5000) {
                isMilestone = true;
                milestoneLabel = 'Massive Volume Day';
                milestoneIcon = 'zap';
            }

            // De-duplicate exercises
            const uniqueEx = Array.from(new Set(dayExercises));

            points.push({
                date: new Date(evalDate),
                dateString: dateStr,
                score: overallScore,
                volume: dayVol,
                duration: dayDur,
                dominantPillar: pillars[0],
                exercises: uniqueEx,
                isMilestone,
                milestoneLabel,
                milestoneIcon
            });
        }

        return points;
    }, [workouts, timeRange]);

    // Auto-select latest data point when not hovering
    useEffect(() => {
        if (!isHovering && chartDataPoints.length > 0) {
            setSelectedPoint(chartDataPoints[chartDataPoints.length - 1]);
        }
    }, [isHovering, chartDataPoints]);

    const chartData: ChartData<'line'> = {
        labels: chartDataPoints.map(p => p.dateString),
        datasets: [
            {
                label: 'Performance Score',
                data: chartDataPoints.map(p => p.score),
                borderColor: '#22D3EE',
                borderWidth: 3,
                pointBackgroundColor: chartDataPoints.map(p => p.isMilestone ? '#FBBF24' : '#111827'),
                pointBorderColor: chartDataPoints.map(p => p.isMilestone ? '#FBBF24' : '#22D3EE'),
                pointBorderWidth: chartDataPoints.map(p => p.isMilestone ? 2 : 2),
                pointRadius: chartDataPoints.map(p => p.isMilestone ? 5 : 0),
                pointHoverRadius: 8,
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#22D3EE',
                pointHoverBorderWidth: 3,
                tension: 0.4,
                fill: true,
                backgroundColor: (context: ScriptableContext<'line'>) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, context.chart.height);
                    gradient.addColorStop(0, 'rgba(34, 211, 238, 0.2)');
                    gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');
                    return gradient;
                }
            }
        ]
    };

    const chartOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 1500,
            easing: 'easeOutQuart'
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: false, // We use a custom external tooltip (selectedPoint)
                external: (context) => {
                    if (context.tooltip.opacity === 0) {
                        setIsHovering(false);
                        return;
                    }
                    setIsHovering(true);
                    const index = context.tooltip.dataPoints[0].dataIndex;
                    setSelectedPoint(chartDataPoints[index]);
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    maxTicksLimit: timeRange === '1W' ? 7 : timeRange === '1M' ? 8 : timeRange === '3M' ? 6 : 12,
                    color: '#52525B', // zinc-600
                    font: { family: 'inherit', size: 10, weight: 'bold' },
                    callback: function(value) {
                        const label = this.getLabelForValue(value as number);
                        const date = new Date(label);
                        if (timeRange === '1W' || timeRange === '1M') {
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }
                        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                    }
                }
            },
            y: {
                min: 0,
                max: 100,
                grid: {
                    color: 'rgba(255, 255, 255, 0.03)'
                },
                ticks: {
                    stepSize: 25,
                    color: '#52525B',
                    font: { family: 'inherit', size: 10, weight: 'bold' },
                }
            }
        }
    };

    return (
        <div className="bg-[#111827] rounded-[32px] p-6 md:p-8 border border-white/5 shadow-2xl relative overflow-hidden flex flex-col">
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#22D3EE]/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative z-10 gap-6">
                <div>
                    <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        Performance Timeline
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22D3EE] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22D3EE]"></span>
                        </span>
                    </h3>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">
                        Historical Progression & Milestones
                    </p>
                </div>

                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                    {(['1W', '1M', '3M', '1Y', 'ALL'] as TimeRange[]).map(range => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                                timeRange === range 
                                ? 'bg-[#22D3EE] text-black shadow-[0_0_15px_rgba(34,211,238,0.3)]' 
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                            }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 relative z-10">
                {/* Chart Area */}
                <div className="flex-1 min-w-0 h-[300px] md:h-[400px] relative">
                    <Line data={chartData} options={chartOptions as any} />
                    
                    {/* Animated Milestones Layer overlaying the chart could go here, but PointElement rendering is cleaner */}
                </div>

                {/* Contextual Summary Panel */}
                <div className="w-full lg:w-80 flex-shrink-0 flex flex-col">
                    <AnimatePresence mode="wait">
                        {selectedPoint ? (
                            <motion.div
                                key={selectedPoint.dateString}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="bg-zinc-900/60 border border-white/5 rounded-2xl p-6 h-full flex flex-col relative overflow-hidden backdrop-blur-sm"
                            >
                                {selectedPoint.isMilestone && (
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />
                                )}

                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 flex items-center justify-between">
                                    {selectedPoint.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                                    {selectedPoint.isMilestone && (
                                        <div className="flex items-center gap-1 text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-md border border-yellow-500/20">
                                            {selectedPoint.milestoneIcon === 'trophy' ? <Trophy size={10} /> : <Zap size={10} />}
                                            <span className="text-[8px]">{selectedPoint.milestoneLabel}</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-baseline gap-2 mb-6">
                                    <span className="text-5xl font-black text-white tracking-tighter">{selectedPoint.score}</span>
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Score</span>
                                </div>

                                <div className="space-y-4 flex-1">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
                                                <Dumbbell size={12} />
                                                <span className="text-[9px] font-black uppercase tracking-wider">Volume</span>
                                            </div>
                                            <div className="text-sm font-bold text-white">
                                                {selectedPoint.volume > 0 ? `${(selectedPoint.volume).toLocaleString()} kg` : '--'}
                                            </div>
                                        </div>
                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
                                                <Clock size={12} />
                                                <span className="text-[9px] font-black uppercase tracking-wider">Duration</span>
                                            </div>
                                            <div className="text-sm font-bold text-white">
                                                {selectedPoint.duration > 0 ? `${Math.round(selectedPoint.duration / 60)} min` : '--'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Activity size={14} className="text-[#22D3EE]" />
                                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Dominant Pillar</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-black text-white">{selectedPoint.dominantPillar.name}</span>
                                            <span className="text-sm font-bold text-[#22D3EE]">{selectedPoint.dominantPillar.score}</span>
                                        </div>
                                        <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#22D3EE] rounded-full" style={{ width: `${selectedPoint.dominantPillar.score}%` }} />
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Activity</h4>
                                        {selectedPoint.exercises.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {selectedPoint.exercises.slice(0, 5).map((ex, i) => (
                                                    <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] font-bold text-zinc-300">
                                                        {ex}
                                                    </span>
                                                ))}
                                                {selectedPoint.exercises.length > 5 && (
                                                    <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] font-bold text-zinc-500">
                                                        +{selectedPoint.exercises.length - 5} more
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-zinc-600 font-medium italic px-1">
                                                No specific movements logged this day.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 h-full flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                                    <Activity size={20} className="text-zinc-500" />
                                </div>
                                <p className="text-xs font-bold text-zinc-400 max-w-[200px]">
                                    Hover over the timeline to reveal daily performance context and milestones.
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
