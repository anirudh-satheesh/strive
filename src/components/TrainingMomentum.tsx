import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Activity, Zap, Trophy, Moon, X } from 'lucide-react';
import type { Workout } from '../types';
import {
    analyzeWorkouts,
    formatDuration,
    formatVolume,
    DAY_TYPE_META,
    type DayAnalysis,
} from '../utils/trainingAnalytics';
import { calculateStreak } from '../utils/workoutAnalytics';

interface TrainingMomentumProps {
    workouts: Workout[];
}

interface MomentumDay {
    index: number;
    date: Date;
    dateStr: string;
    dayOfMonth: number;
    col: number;
    row: number;
    analysis?: DayAnalysis;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Monochromatic cyan intensity scale (GitHub-style "Less → More").
// Level index is derived purely from the day's performance score.
const INTENSITY_LEVELS = [
    { bg: 'rgba(34,211,238,0.14)', border: 'rgba(34,211,238,0.30)', glow: 'rgba(34,211,238,0.06)' },
    { bg: 'rgba(34,211,238,0.32)', border: 'rgba(34,211,238,0.46)', glow: 'rgba(34,211,238,0.14)' },
    { bg: 'rgba(34,211,238,0.56)', border: 'rgba(34,211,238,0.68)', glow: 'rgba(34,211,238,0.28)' },
    { bg: 'rgba(34,211,238,0.84)', border: 'rgba(34,211,238,0.96)', glow: 'rgba(34,211,238,0.50)' },
];

const getIntensityLevel = (score: number): number => {
    if (score < 25) return 0;
    if (score < 50) return 1;
    if (score < 75) return 2;
    return 3;
};

const getMomentumLabel = (score: number): string => {
    if (score >= 80) return 'Peak';
    if (score >= 60) return 'Flowing';
    if (score >= 40) return 'Building';
    if (score >= 20) return 'Igniting';
    return 'Dormant';
};

const getLocalDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const TrainingMomentum: React.FC<TrainingMomentumProps> = ({ workouts }) => {
    const [hovered, setHovered] = useState<MomentumDay | null>(null);
    const [selectedStr, setSelectedStr] = useState<string | null>(null);

    const today = useMemo(() => {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return t;
    }, []);
    const todayStr = getLocalDateString(today);

    const analysis = useMemo(() => analyzeWorkouts(workouts), [workouts]);
    const streak = useMemo(() => calculateStreak(workouts), [workouts]);

    // ── 28-day timeline (today − 27 → today) ─────────────────────────
    const days = useMemo<MomentumDay[]>(() => {
        const start = new Date(today);
        start.setDate(start.getDate() - 27);
        start.setHours(0, 0, 0, 0);
        const startWeekday = start.getDay();

        const list: MomentumDay[] = [];
        for (let i = 0; i < 28; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            const dateStr = getLocalDateString(date);
            const pos = startWeekday + i;
            list.push({
                index: i,
                date,
                dateStr,
                dayOfMonth: date.getDate(),
                col: pos % 7,
                row: Math.floor(pos / 7),
                analysis: analysis.get(dateStr),
            });
        }
        return list;
    }, [today, analysis]);

    const startWeekday = useMemo(() => {
        const start = new Date(today);
        start.setDate(start.getDate() - 27);
        return start.getDay();
    }, [today]);

    const gridCells = useMemo<(MomentumDay | null)[]>(() => {
        const cells: (MomentumDay | null)[] = [];
        for (let c = 0; c < startWeekday; c++) cells.push(null);
        cells.push(...days);
        return cells;
    }, [startWeekday, days]);

    const rowCount = Math.max(1, Math.ceil(gridCells.length / 7));

    // ── Momentum summary ────────────────────────────────────────────
    const { activeDays, avgScore } = useMemo(() => {
        let active = 0;
        let sum = 0;
        for (const d of days) {
            if (d.analysis?.hasWorkout) {
                active++;
                sum += d.analysis.performanceScore || 0;
            }
        }
        return { activeDays: active, avgScore: active > 0 ? sum / active : 0 };
    }, [days]);

    const momentumScore = Math.round((activeDays / 28) * 60 + (avgScore / 100) * 40);
    const momentumLabel = getMomentumLabel(momentumScore);

    // ── Streak glow connectors (only truly consecutive workout days) ──
    const connectors = useMemo(() => {
        const paths: { d: string; wrap: boolean }[] = [];
        const colW = 100 / 7;
        const rowH = 100 / rowCount;

        for (let i = 0; i < days.length - 1; i++) {
            const a = days[i];
            const b = days[i + 1];
            if (!a.analysis?.hasWorkout || !b.analysis?.hasWorkout) continue;

            const x1 = (a.col + 0.5) * colW;
            const y1 = (a.row + 0.5) * rowH;
            const x2 = (b.col + 0.5) * colW;
            const y2 = (b.row + 0.5) * rowH;

            if (b.row === a.row) {
                paths.push({ d: `M ${x1} ${y1} L ${x2} ${y2}`, wrap: false });
            } else {
                // Week wrap: route down the right-hand gutter, then into next row.
                paths.push({ d: `M ${x1} ${y1} L 99.2 ${y1} L 99.2 ${y2} L ${x2} ${y2}`, wrap: true });
            }
        }
        return paths;
    }, [days, rowCount]);

    const selectedDay = useMemo(
        () => days.find(d => d.dateStr === selectedStr) ?? null,
        [days, selectedStr],
    );

    // ── Tooltip + detail renderers ──────────────────────────────────
    const renderTooltip = (h: MomentumDay) => {
        const isW = !!h.analysis?.hasWorkout;
        const isR = !!h.analysis?.isRestDay;
        const score = h.analysis?.performanceScore ?? 0;
        const prs = h.analysis?.prCount ?? 0;
        const dateLabel = h.date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });

        const leftPct = (h.col + 0.5) * (100 / 7);
        const topPct = (h.row + 0.5) * (100 / rowCount);
        const xT = h.col === 0 ? '0px' : h.col === 6 ? '-100%' : '-50%';
        const yT = h.row === 0 ? '18px' : 'calc(-100% - 10px)';

        return (
            <div
                className="absolute z-40 pointer-events-none w-52"
                style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: `translate(${xT}, ${yT})` }}
            >
                <div className="bg-[#0B1220]/95 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 shadow-2xl text-left">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{dateLabel}</p>
                        {isW && prs > 0 && (
                            <span className="flex items-center gap-1 text-amber-400 text-[8px] font-black uppercase tracking-widest">
                                <Trophy size={9} /> {prs} PR
                            </span>
                        )}
                    </div>

                    {isW ? (
                        <>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-2xl font-black text-[#22D3EE] leading-none">{score}</span>
                                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">score</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                                <span>{formatVolume(h.analysis!.totalVolume)}</span>
                                <span>{formatDuration(h.analysis!.durationSec)}</span>
                                <span>{h.analysis!.exerciseCount} ex</span>
                            </div>
                        </>
                    ) : isR ? (
                        <p className="text-[11px] font-bold text-zinc-400">Active rest day</p>
                    ) : (
                        <p className="text-[11px] font-bold text-zinc-500">No activity logged</p>
                    )}
                </div>
            </div>
        );
    };

    const renderDetail = (day: MomentumDay) => {
        const a = day.analysis;
        const isW = !!a?.hasWorkout;
        const isR = !!a?.isRestDay;
        const type = a?.type ?? 'none';
        const meta = DAY_TYPE_META[type];
        const dateLabel = day.date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
        });

        return (
            <motion.div
                key={day.dateStr}
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
            >
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 md:p-5 relative overflow-hidden">
                    <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#22D3EE]/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                                    {dateLabel}
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    {isW && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/20">
                                            <Activity size={9} /> {meta.label}
                                        </span>
                                    )}
                                    {isR && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-white/5 text-zinc-400 border border-white/10">
                                            <Moon size={9} /> Rest
                                        </span>
                                    )}
                                    {(a?.prCount ?? 0) > 0 && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                            <Trophy size={9} /> {a!.prCount} PR
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedStr(null)}
                                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {isW ? (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
                                    <div className="bg-[#0B1220]/60 rounded-xl p-3 border border-white/5">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Score</p>
                                        <p className="text-lg font-black text-[#22D3EE] leading-none">{a!.performanceScore}</p>
                                    </div>
                                    <div className="bg-[#0B1220]/60 rounded-xl p-3 border border-white/5">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Volume</p>
                                        <p className="text-lg font-black text-white leading-none">{formatVolume(a!.totalVolume)}</p>
                                    </div>
                                    <div className="bg-[#0B1220]/60 rounded-xl p-3 border border-white/5">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Duration</p>
                                        <p className="text-lg font-black text-white leading-none">{formatDuration(a!.durationSec)}</p>
                                    </div>
                                    <div className="bg-[#0B1220]/60 rounded-xl p-3 border border-white/5">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Exercises</p>
                                        <p className="text-lg font-black text-white leading-none">{a!.exerciseCount}</p>
                                    </div>
                                </div>
                                {a!.prCount > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {a!.prExercises.map(ex => (
                                            <span
                                                key={ex}
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 rounded-lg text-amber-300 text-[9px] font-bold border border-amber-500/20"
                                            >
                                                <Trophy size={8} /> {ex}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : isR ? (
                            <p className="text-xs font-bold text-zinc-400">
                                Rest day logged — recovery signal recorded.
                            </p>
                        ) : (
                            <p className="text-xs font-bold text-zinc-500">No workout was logged on this day.</p>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="bg-[#111827] rounded-[28px] border border-white/5 shadow-2xl relative overflow-hidden p-5 md:p-7">
            {/* Decorative glows */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#22D3EE]/5 rounded-full blur-[90px] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/5 rounded-full blur-[90px] pointer-events-none" />

            <div className="relative z-10">
                {/* ── Header ── */}
                <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/10 border border-[#22D3EE]/20 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.12)]">
                            <Zap size={18} className="text-[#22D3EE]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.18em]">
                                Training Momentum
                            </h3>
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                                Last 28 Days
                            </p>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-600">
                        <Activity size={11} className="text-[#22D3EE]/60" />
                        Tap a tile for details
                    </div>
                </div>

                {/* ── Momentum Summary ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 hover:border-[#22D3EE]/20 transition-colors">
                        <div className="w-9 h-9 rounded-xl bg-[#22D3EE]/10 border border-[#22D3EE]/20 flex items-center justify-center shadow-[0_0_16px_rgba(34,211,238,0.08)]">
                            <Flame size={16} className="text-[#22D3EE]" />
                        </div>
                        <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">Current Streak</p>
                            <p className="text-lg font-black text-white leading-none">
                                {streak} <span className="text-[10px] font-black text-zinc-500">days</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 hover:border-[#22D3EE]/20 transition-colors">
                        <div className="w-9 h-9 rounded-xl bg-[#22D3EE]/10 border border-[#22D3EE]/20 flex items-center justify-center shadow-[0_0_16px_rgba(34,211,238,0.08)]">
                            <Activity size={16} className="text-[#22D3EE]" />
                        </div>
                        <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">Active Days</p>
                            <p className="text-lg font-black text-white leading-none">
                                {activeDays} <span className="text-[10px] font-black text-zinc-500">/ 28</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 hover:border-[#22D3EE]/20 transition-colors">
                        <div className="w-9 h-9 rounded-xl bg-[#22D3EE]/10 border border-[#22D3EE]/20 flex items-center justify-center shadow-[0_0_16px_rgba(34,211,238,0.08)]">
                            <Zap size={16} className="text-[#22D3EE]" />
                        </div>
                        <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">Momentum</p>
                            <p className="text-lg font-black text-white leading-none">
                                {momentumScore} <span className="text-[10px] font-black text-[#22D3EE]">{momentumLabel}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Weekday headers ── */}
                <div className="grid grid-cols-7 gap-2 mb-1.5">
                    {WEEKDAY_LABELS.map((label, i) => (
                        <div
                            key={`${label}-${i}`}
                            className={`text-center text-[8px] font-black uppercase tracking-widest ${
                                i === 0 || i === 6 ? 'text-zinc-600' : 'text-zinc-500'
                            }`}
                        >
                            {label}
                        </div>
                    ))}
                </div>

                {/* ── Grid + glow connectors ── */}
                <div className="relative pt-2">
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none z-0"
                        style={{ overflow: 'visible' }}
                    >
                        <defs>
                            <filter id="momentum-glow" x="-40%" y="-40%" width="180%" height="180%">
                                <feGaussianBlur stdDeviation="2.4" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        {connectors.map((c, i) => (
                            <path
                                key={i}
                                d={c.d}
                                fill="none"
                                stroke={c.wrap ? 'rgba(34,211,238,0.14)' : 'rgba(34,211,238,0.22)'}
                                strokeWidth="1.4"
                                filter="url(#momentum-glow)"
                            />
                        ))}
                    </svg>

                    <div className="grid grid-cols-7 gap-2 relative z-10">
                        {gridCells.map((cell, idx) => {
                            if (!cell) return <div key={`empty-${idx}`} className="aspect-square" />;

                            const isWorkout = !!cell.analysis?.hasWorkout;
                            const isRest = !!cell.analysis?.isRestDay && !isWorkout;
                            const score = cell.analysis?.performanceScore ?? 0;
                            const levelIdx = isWorkout ? Math.max(0, getIntensityLevel(score)) : -1;
                            const level = levelIdx >= 0 ? INTENSITY_LEVELS[levelIdx] : null;
                            const isPR = (cell.analysis?.prCount ?? 0) > 0;
                            const isToday = cell.dateStr === todayStr;

                            const bg = level
                                ? level.bg
                                : isRest
                                    ? 'rgba(255,255,255,0.03)'
                                    : 'rgba(255,255,255,0.02)';
                            const border = level
                                ? level.border
                                : isRest
                                    ? 'rgba(255,255,255,0.08)'
                                    : 'rgba(255,255,255,0.05)';
                            const glow = level ? `0 0 12px ${level.glow}` : 'none';
                            const boxShadow = isPR
                                ? `${level ? glow + ', ' : ''}0 0 0 1px rgba(251,191,36,0.55), 0 0 16px rgba(251,191,36,0.20)`
                                : glow;

                            return (
                                <motion.button
                                    key={cell.dateStr}
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileHover={{ scale: 1.15, transition: { duration: 0.12, delay: 0 } }}
                                    transition={{ duration: 0.3, delay: Math.min(cell.index * 0.012, 0.35) }}
                                    onMouseEnter={() => setHovered(cell)}
                                    onMouseLeave={() => setHovered(null)}
                                    onClick={() =>
                                        setSelectedStr(prev => (prev === cell.dateStr ? null : cell.dateStr))
                                    }
                                    className={`relative aspect-square rounded-[9px] border flex items-center justify-center cursor-pointer outline-none transition-[brightness] duration-150 hover:brightness-125 hover:z-20 ${
                                        isToday ? 'ring-1 ring-[#22D3EE]/50 ring-offset-2 ring-offset-[#111827]' : ''
                                    }`}
                                    style={{ backgroundColor: bg, borderColor: border, boxShadow }}
                                >
                                    {isWorkout && (
                                        <span className="absolute inset-0 rounded-[9px] bg-gradient-to-br from-white/25 via-transparent to-transparent opacity-70 pointer-events-none" />
                                    )}
                                    <span
                                        className="relative text-[8px] font-black tabular-nums leading-none"
                                        style={{
                                            color: isWorkout
                                                ? 'rgba(4,14,24,0.60)'
                                                : isToday
                                                    ? '#22D3EE'
                                                    : '#52525b',
                                        }}
                                    >
                                        {cell.dayOfMonth}
                                    </span>
                                    {isRest && <Moon size={8} className="absolute bottom-1 text-zinc-600" />}
                                    {isPR && (
                                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-[0_0_8px_rgba(251,191,36,0.8)] ring-1 ring-amber-200/60">
                                            <Trophy size={6} className="text-amber-950" strokeWidth={3} />
                                        </span>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Hover tooltip */}
                    {hovered && renderTooltip(hovered)}
                </div>

                {/* ── Selected day detail panel ── */}
                <AnimatePresence>
                    {selectedDay && renderDetail(selectedDay)}
                </AnimatePresence>
            </div>
        </div>
    );
};

