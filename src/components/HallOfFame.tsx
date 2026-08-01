import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Trophy, TrendingUp, CalendarDays, Dumbbell, Activity, Clock, Award, ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { HallOfFameEntry } from '../utils/hallOfFameEngine';
import {
    formatPRNumber, formatPRUnit, formatAchievementDate, SIGNIFICANCE_META,
} from '../utils/hallOfFameEngine';

interface HallOfFameProps {
    entries: HallOfFameEntry[];
    careerBests: { maxWeight: number; maxReps: number; maxDuration: number };
    topVolume: { name: string; reps: number; sets: number; weight: number }[];
}

// ─── Featured Hero Card ───────────────────────────────────────────────
const FeaturedCard: React.FC<{ entry: HallOfFameEntry }> = ({ entry }) => {
    const meta = SIGNIFICANCE_META[entry.significance];
    const numberStr = formatPRNumber(entry.current, entry.metric);
    const unitStr = formatPRUnit(entry.current, entry.metric);
    const hasImprovement = entry.previous !== null && entry.improvement > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-[32px] border border-white/5 bg-[#111827] shadow-2xl group"
        >
            {/* Background glow — tints toward the significance colour */}
            <div className={`absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-700 ${meta.bgGlow}`}>
                <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 p-8 md:p-10">
                {/* Eyebrow */}
                <div className="flex items-center gap-3 mb-5">
                    <span className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border bg-white/5 border-white/10 text-zinc-400">
                        <Trophy size={12} className="text-amber-400" />
                        Latest Achievement
                    </span>
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${meta.badgeClass}`}>
                        <Award size={12} />
                        {meta.label}
                    </span>
                </div>

                {/* Exercise name */}
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-3">
                    {entry.exerciseName}
                </h2>

                {/* Record value + unit */}
                <div className="flex items-baseline gap-2 mb-5">
                    <span className="text-6xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-zinc-400 leading-none">
                        {numberStr}
                    </span>
                    <span className="text-2xl font-black text-zinc-500 leading-none">
                        {unitStr}
                    </span>
                </div>

                {/* Improvement chip */}
                {hasImprovement && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest mb-6">
                        <TrendingUp size={14} />
                        <span>+{entry.improvementPct}%</span>
                        <span className="text-emerald-500/60 font-bold normal-case">
                            ({formatPRNumber(entry.improvement, entry.metric)}{unitStr})
                        </span>
                    </div>
                )}

                {/* Date & PR count */}
                <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    <span className="flex items-center gap-2">
                        <CalendarDays size={14} className="text-zinc-600" />
                        {formatAchievementDate(entry.date)}
                    </span>
                    <span className="flex items-center gap-2">
                        <Award size={14} className="text-zinc-600" />
                        {entry.prCount} Record{entry.prCount !== 1 ? 's' : ''}
                    </span>
                    {entry.previous !== null && (
                        <span className="text-zinc-600">
                            Previous: {formatPRNumber(entry.previous, entry.metric)}{unitStr}
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// ─── Career Record Card (for the scrollable gallery) ───────────────────
const RecordCard: React.FC<{ entry: HallOfFameEntry }> = ({ entry }) => {
    const meta = SIGNIFICANCE_META[entry.significance];
    const numStr = formatPRNumber(entry.current, entry.metric);
    const unitStr = formatPRUnit(entry.current, entry.metric);
    const hasImprovement = entry.previous !== null && entry.improvement > 0;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="relative flex-shrink-0 w-[280px] sm:w-[310px] rounded-[28px] border border-white/5 bg-[#111827] p-6 overflow-hidden group hover:border-white/10 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
        >
            {/* Subtle top glow */}
            <div className={`absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity ${meta.bgGlow}`}>
                <div className="absolute -top-16 -left-16 w-40 h-40 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 flex flex-col h-full">
                {/* Rarity badge + exercise name */}
                <div className="flex items-start justify-between mb-4">
                    <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full border ${meta.badgeClass}`}>
                        {meta.label}
                    </span>
                    <span className="text-[9px] font-black text-zinc-600 tabular-nums">
                        #{entry.prCount}
                    </span>
                </div>

                <h3 className="text-lg font-black text-white tracking-tight leading-tight mb-3">
                    {entry.exerciseName}
                </h3>

                {/* Value */}
                <div className="flex items-baseline gap-1.5 mb-4">
                    <span className="text-4xl font-black tracking-tighter text-white leading-none">
                        {numStr}
                    </span>
                    <span className="text-sm font-black text-zinc-500">
                        {unitStr}
                    </span>
                </div>

                {/* Improvement */}
                {hasImprovement && (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-3">
                        <TrendingUp size={12} />
                        +{entry.improvementPct}%
                    </div>
                )}

                {/* Date & previous */}
                <div className="mt-auto pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                        <CalendarDays size={11} className="text-zinc-600" />
                        {formatAchievementDate(entry.date)}
                    </div>
                    {entry.previous !== null && (
                        <p className="text-[9px] text-zinc-600 mt-1 tracking-wide">
                            Prev: {formatPRNumber(entry.previous, entry.metric)}{unitStr}
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// ─── Hero-level career best stat ──────────────────────────────────────
const CareerBestPill: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subtitle?: string;
    color: string;
}> = ({ icon, label, value, subtitle, color }) => (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color.replace('text-', 'bg-').replace('500', '500/15')} border ${color.replace('text-', 'border-').replace('500', '500/20')}`}>
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">{label}</p>
            <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black tracking-tight ${color}`}>{value}</span>
                {subtitle && <span className="text-[10px] font-bold text-zinc-500">{subtitle}</span>}
            </div>
        </div>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────
export const HallOfFame: React.FC<HallOfFameProps> = ({ entries, careerBests, topVolume }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (dir: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const amount = 340;
        scrollRef.current.scrollBy({
            left: dir === 'left' ? -amount : amount,
            behavior: 'smooth',
        });
    };

    const hasRecords = entries.length > 0;
    const featured = hasRecords ? entries[0] : null;
    const gallery = hasRecords ? entries.slice(1) : [];

    return (
        <div className="space-y-8">
            {/* ── Section header ── */}
            <div className="flex items-center gap-3 px-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-rose-500/20 border border-amber-400/20 flex items-center justify-center">
                    <Trophy size={20} className="text-amber-400" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-white tracking-tight">Hall of Fame</h3>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                        {hasRecords ? `${entries.length} Career Records` : 'No records yet'}
                    </p>
                </div>
            </div>

            {!hasRecords ? (
                /* ── Empty state ── */
                <div className="py-16 text-center bg-[#111827] rounded-[32px] border border-dashed border-zinc-800">
                    <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-5">
                        <Award size={32} className="text-zinc-600" />
                    </div>
                    <p className="text-zinc-400 font-black uppercase tracking-widest text-sm mb-2">
                        No Personal Records Yet
                    </p>
                    <p className="text-zinc-600 text-xs font-bold max-w-[240px] mx-auto leading-relaxed">
                        Log your first workout with weight, reps, or duration and your achievements will appear here.
                    </p>
                </div>
            ) : (
                <>
                    {/* ── Featured Latest Achievement ── */}
                    {featured && <FeaturedCard entry={featured} />}

                    {/* ── Career Bests (replaces old stat cards) ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <CareerBestPill
                            icon={<Activity size={18} className="text-amber-400" />}
                            label="Heaviest Lift"
                            value={careerBests.maxWeight}
                            subtitle="kg"
                            color="text-amber-400"
                        />
                        <CareerBestPill
                            icon={<Activity size={18} className="text-emerald-400" />}
                            label="Most Reps (Single Set)"
                            value={careerBests.maxReps}
                            subtitle="reps"
                            color="text-emerald-400"
                        />
                        <CareerBestPill
                            icon={<Clock size={18} className="text-sky-400" />}
                            label="Longest Duration"
                            value={careerBests.maxDuration > 0 ? careerBests.maxDuration : '--'}
                            subtitle={careerBests.maxDuration > 0 ? 's' : ''}
                            color="text-sky-400"
                        />
                    </div>

                    {/* ── Horizontally scrollable career records gallery ── */}
                    {gallery.length > 0 && (
                        <div className="relative group/scroll">
                            {/* Scroll buttons */}
                            <button
                                onClick={() => scroll('left')}
                                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#1A2236]/90 backdrop-blur-sm border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 transition-all opacity-0 group-hover/scroll:opacity-100 -ml-4 shadow-lg"
                                aria-label="Scroll left"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={() => scroll('right')}
                                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#1A2236]/90 backdrop-blur-sm border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 transition-all opacity-0 group-hover/scroll:opacity-100 -mr-4 shadow-lg"
                                aria-label="Scroll right"
                            >
                                <ChevronRight size={18} />
                            </button>

                            {/* Scrollable container */}
                            <div
                                ref={scrollRef}
                                className="flex gap-4 overflow-x-auto no-scrollbar pb-2 pt-1 px-1"
                            >
                                {gallery.map((entry) => (
                                    <RecordCard key={`${entry.exerciseName}-${entry.date}`} entry={entry} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Top Volume Contributors (preserved info) ── */}
                    {topVolume.length > 0 && (
                        <div className="pt-2">
                            <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 px-1">
                                Top Volume Contributors
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {topVolume.map((ex, i) => {
                                    const labels = ['Champion', 'Contender', 'Challenger'];
                                    const colors = ['text-amber-400', 'text-zinc-300', 'text-orange-400'];
                                    return (
                                        <div
                                            key={ex.name}
                                            className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                                <Dumbbell size={16} className={colors[i]} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">
                                                    {labels[i]}
                                                </p>
                                                <p className="font-bold text-white truncate text-sm">{ex.name}</p>
                                                <p className="text-[10px] text-zinc-500 font-bold">
                                                    {ex.reps.toLocaleString()} total reps
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
