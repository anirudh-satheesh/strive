import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Dumbbell, Heart, Leaf, Activity, Zap, Moon, Trophy, BarChart3, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkoutService } from '../services/workoutService';
import { auth } from '../services/firebase';
import type { Workout } from '../types';
import { useNotification } from '../context/NotificationContext';
import {
    analyzeWorkouts,
    computeMonthSummary,
    formatDuration,
    formatVolume,
    DAY_TYPE_META,
    type DayType,
} from '../utils/trainingAnalytics';

interface CalendarViewProps {
    onNavigateToWorkout?: (date: string) => void;
}

// ─── Icon resolver ───────────────────────────────────────────────
const TypeIcon: Record<string, React.FC<{ size?: number; className?: string }>> = {
    Dumbbell,
    Heart,
    Leaf,
    Activity,
    Zap,
    Moon,
    Minus: () => <span className="opacity-30">—</span>,
};

// ─── Component ───────────────────────────────────────────────────
export const CalendarView: React.FC<CalendarViewProps> = ({ onNavigateToWorkout }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const { showToast } = useNotification();

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // ── Load data ────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            if (!auth.currentUser) {
                setLoading(false);
                return;
            }
            try {
                const all = await WorkoutService.getAllWorkouts(auth.currentUser.uid);
                setWorkouts(all);
            } catch (e) {
                console.error('Error loading workouts:', e);
                showToast('Failed to load workouts', 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // ── Subscribe to live updates ────────────────────────────────
    useEffect(() => {
        if (!auth.currentUser) return;
        const unsub = WorkoutService.subscribeToWorkouts(auth.currentUser.uid, (updated) => {
            setWorkouts(updated);
        });
        return () => unsub();
    }, []);

    // ── Derived data ─────────────────────────────────────────────
    const analysis = useMemo(() => analyzeWorkouts(workouts), [workouts]);

    const monthSummary = useMemo(
        () => computeMonthSummary(analysis, year, month),
        [analysis, year, month],
    );

    const selectedDay = selectedDate ? analysis.get(selectedDate) ?? null : null;

    // ── Calendar grid helpers ────────────────────────────────────
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const getDateStr = (day: number) =>
        `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const days: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const totalCells = days.length;
    const rowCount = Math.ceil(totalCells / 7);

    // ── Navigation ───────────────────────────────────────────────
    const prevMonth = () => {
        setCurrentMonth(new Date(year, month - 1, 1));
        setSelectedDate(null);
    };
    const nextMonth = () => {
        setCurrentMonth(new Date(year, month + 1, 1));
        setSelectedDate(null);
    };

    // ── Select day & scroll into view ────────────────────────────
    const handleDayClick = (day: number) => {
        const ds = getDateStr(day);
        setSelectedDate((prev) => (prev === ds ? null : ds));
        // Scroll to panel after a brief render delay
        setTimeout(() => {
            panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    };

// ── Streak connectors ────────────────────────────────────────
    const streakConnectors = useMemo(() => {
        const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
        const cellW = 100 / 7; // percent
        const cellH = 100 / rowCount;

        // Horizontal: day N → day N+1 (both active)
        for (let i = 0; i < days.length - 1; i++) {
            if (days[i] === null || days[i + 1] === null) continue;
            const d1 = getDateStr(days[i]!);
            const d2 = getDateStr(days[i + 1]!);
            const a1 = analysis.get(d1);
            const a2 = analysis.get(d2);
            if (!a1?.hasWorkout || !a2?.hasWorkout) continue;

            const col = i % 7;
            const row = Math.floor(i / 7);
            const cx1 = (col + 0.5) * cellW;
            const cy1 = (row + 0.5) * cellH;
            const cx2 = (col + 1.5) * cellW;
            const cy2 = (row + 0.5) * cellH;
            lines.push({ x1: cx1, y1: cy1, x2: cx2, y2: cy2 });
        }

        // Vertical: day N → day N+7 (both active, wraps to next week)
        for (let i = 0; i < days.length - 7; i++) {
            if (days[i] === null || days[i + 7] === null) continue;
            const d1 = getDateStr(days[i]!);
            const d2 = getDateStr(days[i + 7]!);
            const a1 = analysis.get(d1);
            const a2 = analysis.get(d2);
            if (!a1?.hasWorkout || !a2?.hasWorkout) continue;

            const col = i % 7;
            const row = Math.floor(i / 7);
            const cx = (col + 0.5) * cellW;
            const cy1 = (row + 0.5) * cellH;
            const cy2 = (row + 1.5) * cellH;
            lines.push({ x1: cx, y1: cy1, x2: cx, y2: cy2 });
        }

        return lines;
    }, [days, analysis, rowCount]);

    const monthYear = currentMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' });

    // ── Render ───────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-4 animate-[fade-in_0.4s_ease-out]">
            {/* ─── Header ─── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 bg-gradient-to-br from-[#1A2236] to-[#111827] p-5 sm:p-6 rounded-[2rem] border border-white/5 relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-bl from-cyan-500/10 via-indigo-500/5 to-transparent rounded-full blur-[80px] pointer-events-none" />
                <div className="relative z-10">
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                            <CalendarDays size={20} className="text-white" />
                        </div>
                        Training Journal
                    </h2>
                    <p className="text-zinc-400 text-xs font-bold mt-1 tracking-wide">
                        Your fitness journey, day by day
                    </p>
                </div>

                <div className="flex gap-3 relative z-10 w-full sm:w-auto">
                    <div className="flex-1 sm:flex-none bg-white/5 px-4 py-2.5 rounded-2xl flex flex-col items-center border border-white/5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">Workouts</span>
                        <span className="text-xl font-black text-white">{monthSummary.totalWorkouts}</span>
                    </div>
                    <div className="flex-1 sm:flex-none bg-white/5 px-4 py-2.5 rounded-2xl flex flex-col items-center border border-white/5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">Streak</span>
                        <span className="text-xl font-black text-emerald-400 flex items-center gap-1.5">
                            <Trophy size={14} className="text-yellow-500" />
                            {(() => {
                                // Calculate current streak from analysis
                                let streak = 0;
                                const d = new Date();
                                for (let i = 0; i < 365; i++) {
                                    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                    const day = analysis.get(ds);
                                    if (day?.hasWorkout || day?.isRestDay) {
                                        streak++;
                                        d.setDate(d.getDate() - 1);
                                    } else if (i !== 0) {
                                        break;
                                    } else {
                                        break;
                                    }
                                }
                                return streak;
                            })()}
                        </span>
                    </div>
                </div>
            </div>

            {/* ─── Calendar Card ─── */}
            <div className="bg-[#1A2236] rounded-[2.5rem] border border-white/5 overflow-hidden relative shadow-xl">
                {/* Month Navigation */}
                <div className="flex justify-between items-center p-4 sm:p-5 border-b border-white/5">
                    <button
                        onClick={prevMonth}
                        aria-label="Previous month"
                        className="p-2.5 bg-white/5 text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                        <ChevronLeft size={18} strokeWidth={3} />
                    </button>
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                        {monthYear}
                    </h3>
                    <button
                        onClick={nextMonth}
                        aria-label="Next month"
                        className="p-2.5 bg-white/5 text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                        <ChevronRight size={18} strokeWidth={3} />
                    </button>
                </div>

                {/* Calendar Grid */}
                <div className="p-4 sm:p-5">
                    {/* Day-of-week header */}
                    <div className="grid grid-cols-7 mb-2">
                        {[
                            { full: 'Sunday', short: 'S' },
                            { full: 'Monday', short: 'M' },
                            { full: 'Tuesday', short: 'T' },
                            { full: 'Wednesday', short: 'W' },
                            { full: 'Thursday', short: 'T' },
                            { full: 'Friday', short: 'F' },
                            { full: 'Saturday', short: 'S' },
                        ].map((d, i) => (
                            <div
                                key={d.full}
                                className={`text-center text-[9px] font-black uppercase tracking-widest py-1 ${
                                    i === 0 || i === 6 ? 'text-zinc-600' : 'text-zinc-500'
                                }`}
                            >
                                {d.short}
                            </div>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]" />
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Streak connector SVG */}
                            <svg
                                className="absolute inset-0 w-full h-full pointer-events-none z-0"
                                style={{ overflow: 'visible' }}
                            >
                                {streakConnectors.map((line, i) => (
                                    <line
                                        key={i}
                                        x1={`${line.x1}%`}
                                        y1={`${line.y1}%`}
                                        x2={`${line.x2}%`}
                                        y2={`${line.y2}%`}
                                        stroke="rgba(34,211,238,0.15)"
                                        strokeWidth="1.5"
                                        strokeDasharray="3 2"
                                    />
                                ))}
                            </svg>

                            <div
                                className="grid grid-cols-7 gap-1.5 relative z-10"
                                style={{
                                    gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
                                }}
                            >
                                {days.map((day, idx) => {
                                    if (day === null) return <div key={`empty-${idx}`} className="w-full aspect-square" />;

                                    const dateStr = getDateStr(day);
                                    const dayAnalysis = analysis.get(dateStr);
                                    const isToday = dateStr === todayStr;
                                    const isSelected = selectedDate === dateStr;

                                    const type: DayType = dayAnalysis?.type ?? 'none';
                                    const meta = DAY_TYPE_META[type];
                                    const hasPR = (dayAnalysis?.prCount ?? 0) > 0;
                                    const Icon = TypeIcon[meta.icon] || TypeIcon.Minus;

                                    return (
                                        <button
                                            key={day}
                                            onClick={() => handleDayClick(day)}
                                            aria-label={`${day} ${monthYear} — ${meta.label}`}
                                            aria-selected={isSelected}
                                            aria-current={isToday ? 'date' : undefined}
                                            className={`
                                                relative w-full aspect-square flex flex-col items-center justify-center rounded-xl
                                                transition-all duration-200 outline-none group/cell
                                                ${isSelected
                                                    ? 'bg-white/10 ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-500/10 scale-105 z-20'
                                                    : dayAnalysis?.hasWorkout
                                                        ? `${meta.bgClass} hover:bg-white/10`
                                                        : dayAnalysis?.isRestDay
                                                            ? 'bg-zinc-800/20 hover:bg-white/5'
                                                            : 'hover:bg-white/5'
                                                }
                                            `}
                                        >
                                            {/* Today ring */}
                                            {isToday && (
                                                <div className="absolute inset-0 rounded-xl border-2 border-cyan-400/40 shadow-[0_0_12px_rgba(34,211,238,0.15)]" />
                                            )}

                                            {/* Day number */}
                                            <span className={`
                                                text-xs font-black leading-none transition-colors duration-200
                                                ${isToday
                                                    ? 'text-cyan-400'
                                                    : isSelected
                                                        ? 'text-white'
                                                        : dayAnalysis?.hasWorkout
                                                            ? meta.textClass
                                                            : dayAnalysis?.isRestDay
                                                                ? 'text-zinc-400'
                                                                : 'text-zinc-600'
                                                }
                                            `}>
                                                {day}
                                            </span>

                                            {/* Type icon */}
                                            {dayAnalysis?.hasWorkout && (
                                                <div className="mt-0.5 opacity-60 group-hover/cell:opacity-90 transition-opacity">
                                                    <Icon size={10} className={meta.textClass} />
                                                </div>
                                            )}

                                            {/* Rest indicator */}
                                            {dayAnalysis?.isRestDay && !dayAnalysis.hasWorkout && (
                                                <div className="mt-0.5 opacity-40">
                                                    <Moon size={10} className="text-zinc-500" />
                                                </div>
                                            )}

                                            {/* PR gold dot */}
                                            {hasPR && (
                                                <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-[0_0_6px_rgba(234,179,8,0.5)]">
                                                    <Trophy size={6} className="text-white" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Expanding Detail Panel ─── */}
            <AnimatePresence>
                {selectedDate && selectedDay && (
                    <motion.div
                        key={selectedDate}
                        ref={panelRef}
                        initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginBottom: 0 }}
                        exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="bg-[#1A2236] rounded-[2rem] border border-white/5 p-6 sm:p-7 shadow-xl relative overflow-hidden">
                            {/* Decorative glow */}
                            <div className="absolute -top-20 -right-20 w-48 h-48 bg-cyan-500/5 rounded-full blur-[60px] pointer-events-none" />

                            <div className="relative z-10">
                                {/* Header row */}
                                <div className="flex justify-between items-start mb-5">
                                    <div>
                                        <h4 className="text-lg sm:text-xl font-black text-white tracking-tight">
                                            {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                                                weekday: 'long',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`
                                                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest
                                                ${DAY_TYPE_META[selectedDay.type].bgClass}
                                                ${DAY_TYPE_META[selectedDay.type].textClass}
                                                border ${DAY_TYPE_META[selectedDay.type].borderClass}
                                            `}>
                                                {(() => {
                                                    const I = TypeIcon[DAY_TYPE_META[selectedDay.type].icon];
                                                    return I ? <I size={10} /> : null;
                                                })()}
                                                {DAY_TYPE_META[selectedDay.type].label}
                                            </span>
                                            {selectedDay.prCount > 0 && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
                                                    <Trophy size={10} />
                                                    {selectedDay.prCount} PR{selectedDay.prCount > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedDate(null)}
                                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-all active:scale-90"
                                    >
                                        <span className="text-lg leading-none">&times;</span>
                                    </button>
                                </div>

                                {/* Stats grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                                    <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Score</p>
                                        <p className="text-xl font-black text-cyan-400">{selectedDay.performanceScore}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Duration</p>
                                        <p className="text-xl font-black text-white">{formatDuration(selectedDay.durationSec)}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Volume</p>
                                        <p className="text-xl font-black text-white">{formatVolume(selectedDay.totalVolume)}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Exercises</p>
                                        <p className="text-xl font-black text-white">{selectedDay.exerciseCount}</p>
                                    </div>
                                </div>

                                {/* PR highlight */}
                                {selectedDay.prCount > 0 && (
                                    <div className="mb-5 p-3.5 bg-yellow-500/5 rounded-2xl border border-yellow-500/15">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-yellow-500 mb-2">Personal Records</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedDay.prExercises.map((ex) => (
                                                <span
                                                    key={ex}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-500/10 rounded-lg text-yellow-300 text-[10px] font-bold border border-yellow-500/20"
                                                >
                                                    <Trophy size={10} />
                                                    {ex}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Exercise names */}
                                <div className="mb-6">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                                        Exercises ({selectedDay.exerciseCount})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedDay.exerciseNames.map((ex) => (
                                            <span
                                                key={ex}
                                                className="px-2.5 py-1 bg-white/5 rounded-lg text-zinc-300 text-[10px] font-bold border border-white/5"
                                            >
                                                {ex}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Action */}
                                <button
                                    onClick={() => {
                                        if (onNavigateToWorkout) onNavigateToWorkout(selectedDate);
                                    }}
                                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300"
                                >
                                    View Workout
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Monthly Summary ─── */}
            <div className="bg-[#1A2236] rounded-[2rem] border border-white/5 p-5 sm:p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <BarChart3 size={16} className="text-white" />
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.15em]">
                        {currentMonth.toLocaleString(undefined, { month: 'long' })} Summary
                    </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                    <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Workouts</p>
                        <p className="text-xl font-black text-white">{monthSummary.totalWorkouts}</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Avg Score</p>
                        <p className="text-xl font-black text-cyan-400">{monthSummary.averagePerformanceScore}</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">PRs</p>
                        <p className="text-xl font-black text-yellow-400">{monthSummary.prCount}</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Density</p>
                        <p className="text-xl font-black text-white">{monthSummary.trainingDensity}%</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5 sm:col-span-1 col-span-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Consistency</p>
                        <p className="text-xl font-black text-emerald-400">{monthSummary.consistencyScore}%</p>
                    </div>
                </div>

                {/* Density bar */}
                <div className="mt-3">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                        <span>Training Density</span>
                        <span>{monthSummary.activeDays} / {new Date(year, month + 1, 0).getDate()} days active</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${monthSummary.trainingDensity}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                    </div>
                </div>

                {/* PR exercised list */}
                {monthSummary.prCount > 0 && (
                    <div className="mt-5 pt-4 border-t border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-yellow-500 mb-2">
                            Records Set This Month
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {monthSummary.prExercises.map((ex) => (
                                <span
                                    key={ex}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-500/10 rounded-lg text-yellow-300 text-[10px] font-bold border border-yellow-500/20"
                                >
                                    <Trophy size={10} />
                                    {ex}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
