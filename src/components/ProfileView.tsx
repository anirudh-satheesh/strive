import type { Page } from '../App';
import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '../services/firebase';
import type { UserProfile } from '../services/userService';
import { UserService } from '../services/userService';
import { WorkoutService } from '../services/workoutService';
import { computeRefinedArchetype } from '../utils/athleteIdentityEngine';
import { calculatePerformanceScores } from '../utils/performanceEngine';
import { Edit2, LogOut, Settings, ChevronRight, X, Trophy, Flame, Medal, Sparkles, Clock, Star } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { SettingsView } from './SettingsView';
import { EditProfileView } from './EditProfileView';

type Archetype = {
    name: string;
    emoji: string;
};

const formatMemberSince = (createdAt?: any) => {
    try {
        if (!createdAt) return '--';
        const d = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
        if (Number.isNaN(d.getTime())) return '--';
        const month = d.toLocaleString('en-US', { month: 'short' });
        return `${month} ${d.getFullYear()}`;
    } catch {
        return '--';
    }
};



export const ProfileView: React.FC<{ onLogout: () => void; setActivePage: (page: Page) => void }> = ({ onLogout, setActivePage }) => {
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);

    const { showToast } = useNotification();

    // User profile
    const [userName, setUserName] = useState<string>('');
    const [profileData, setProfileData] = useState<UserProfile | null>(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Archetype
    const [workouts, setWorkouts] = useState<Awaited<ReturnType<typeof WorkoutService.getAllWorkouts>>>([]);

    const performanceScores = useMemo(() => calculatePerformanceScores(workouts), [workouts]);
    const athleteIdentity = useMemo(() => {
        return computeRefinedArchetype(performanceScores, { recoveryBias: true });
    }, [performanceScores]);

    const archetype: Archetype = useMemo(
        () => ({ name: athleteIdentity.name, emoji: athleteIdentity.emoji }),
        [athleteIdentity.name, athleteIdentity.emoji]
    );

    // Chronological numbering & descending ordering for fancy Achievements UI


    const loadData = async () => {
        if (!auth.currentUser) return;
        try {
            const [profile, allWorkouts] = await Promise.all([
                UserService.getProfile(auth.currentUser.uid),
                WorkoutService.getAllWorkouts(auth.currentUser.uid),
            ]);

            setProfileData(profile);
            if (profile?.displayName) setUserName(profile.displayName);
            setWorkouts(allWorkouts);
        } catch (error) {
            console.error('Error loading profile:', error);
            showToast('Failed to load profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openEditProfile = () => setIsEditingProfile(true);

    // ─── Settings Sub-Page ─────────────────────────────────────────────
    if (showSettings) {
        return <SettingsView onBack={() => setShowSettings(false)} />;
    }

    if (isEditingProfile) {
        return <EditProfileView onBack={() => {
            setIsEditingProfile(false);
            loadData();
        }} />;
    }

    // ─── Loading ───────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex justify-center p-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500 shadow-lg shadow-cyan-500/20" />
            </div>
        );
    }

    const displayEmail = auth.currentUser?.email || profileData?.email || '--';

    return (
        <div className="space-y-5 pb-24 animate-[fade-in_0.4s_ease-out]">
            {/* ───────────────────────── PROFILE HERO ───────────────────────── */}
            <section className="bg-[#1A2236] rounded-3xl shadow-xl overflow-hidden border border-white/5 p-6 relative">
                <div className="flex flex-col items-center text-center">
                    <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-[1.65rem] bg-gradient-to-br from-[#22D3EE] via-[#3B82F6] to-[#818cf8] flex items-center justify-center text-4xl sm:text-5xl font-black text-white shadow-2xl shadow-cyan-500/20 rotate-3 overflow-hidden relative mb-3">
                        <span className="-rotate-3">
                            {userName
                                ? userName[0].toUpperCase()
                                : (auth.currentUser?.email?.[0]?.toUpperCase() || 'U')}
                        </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                        {userName || auth.currentUser?.email}
                    </h2>

                    {/* Athlete Archetype Badge */}
                    <div className="mt-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 bg-gradient-to-r from-[#22D3EE]/10 via-[#3B82F6]/10 to-[#818cf8]/10 text-[#E0F2FE]">
                            <span>{archetype.emoji}</span>
                            <span>{archetype.name}</span>
                        </div>
                    </div>

                    <div className="text-[10px] text-[#94a3b8] font-black uppercase tracking-widest mt-3">
                        Joined <span className="text-white">{formatMemberSince(profileData?.createdAt)}</span>
                    </div>

                    <div className="text-[#94a3b8] text-xs mt-2">{displayEmail}</div>

                    <button
                        onClick={openEditProfile}
                        className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 active:scale-95 transition-all rounded-2xl border border-white/5 hover:border-white/10 text-white font-bold text-sm group shadow-lg"
                    >
                        <Edit2 size={16} className="text-[#94a3b8] group-hover:text-[#22D3EE] transition-colors" />
                        Edit Profile
                    </button>
                </div>
            </section>

            {/* ───────────────────────── ACHIEVEMENT SHOWCASE ───────────────────────── */}
            <section className="bg-[#1A2236] rounded-3xl shadow-xl border border-white/5 p-6 relative overflow-hidden mb-6">
                <h3 className="text-xs font-black text-white/30 mb-4 uppercase tracking-[0.2em]">Top Achievements</h3>
                {/* Compute top 3 achievements */}
                {profileData?.achievements && (
                    (() => {
                        type Rarity = 'gold' | 'orange' | 'purple' | 'blue';

                        const fallbackRarity: Rarity = 'blue';

                        const iconToRarity: Record<string, Rarity> = {
                            Trophy: 'gold',
                            Flame: 'orange',
                            Medal: 'purple',
                            Sparkles: 'blue',
                            Clock: 'blue',
                            Star: 'blue',
                        };

                        const getRarity = (ach: { icon?: string }): Rarity => {
                            const rarity = ach?.icon ? iconToRarity[ach.icon] : undefined;
                            return rarity ?? fallbackRarity;
                        };

                        const rarityLabel: Record<Rarity, string> = {
                            gold: 'Gold',
                            orange: 'Orange',
                            purple: 'Purple',
                            blue: 'Blue',
                        };

                        const tierOrder: Record<Rarity, number> = { gold: 4, orange: 3, purple: 2, blue: 1 };

                        const IconMap: Record<string, any> = { Trophy, Flame, Medal, Sparkles, Clock, Star };

                        const rarityStyles: Record<
                            Rarity,
                            {
                                cardBg: string;
                                cardBorder: string;
                                cardGlow: string;
                                iconBg: string;
                                iconGlow: string;
                                badgeBg: string;
                                badgeBorder: string;
                                badgeText: string;
                                iconColor: string;
                            }
                        > = {
                            gold: {
                                cardBg: 'from-[#2a1a05] via-[#3b2a10] to-[#161d30]',
                                cardBorder: 'border-amber-500/35',
                                cardGlow: 'shadow-[0_0_24px_rgba(245,158,11,0.35)]',
                                iconBg: 'from-amber-400 to-yellow-600',
                                iconGlow: 'shadow-[0_0_18px_rgba(245,158,11,0.35)]',
                                badgeBg: 'bg-amber-500/15',
                                badgeBorder: 'border-amber-500/35',
                                badgeText: 'text-amber-300',
                                iconColor: 'text-white',
                            },
                            orange: {
                                cardBg: 'from-[#3a1208] via-[#5a1d10] to-[#161d30]',
                                cardBorder: 'border-orange-500/35',
                                cardGlow: 'shadow-[0_0_24px_rgba(249,115,22,0.35)]',
                                iconBg: 'from-orange-400 to-amber-500',
                                iconGlow: 'shadow-[0_0_18px_rgba(249,115,22,0.35)]',
                                badgeBg: 'bg-orange-500/15',
                                badgeBorder: 'border-orange-500/35',
                                badgeText: 'text-orange-200',
                                iconColor: 'text-white',
                            },
                            purple: {
                                cardBg: 'from-[#2e1065] via-[#3a1b7c] to-[#161d30]',
                                cardBorder: 'border-purple-500/35',
                                cardGlow: 'shadow-[0_0_24px_rgba(168,85,247,0.35)]',
                                iconBg: 'from-purple-400 to-fuchsia-500',
                                iconGlow: 'shadow-[0_0_18px_rgba(168,85,247,0.35)]',
                                badgeBg: 'bg-purple-500/15',
                                badgeBorder: 'border-purple-500/35',
                                badgeText: 'text-purple-200',
                                iconColor: 'text-white',
                            },
                            blue: {
                                cardBg: 'from-[#0b2a5a] via-[#0f3a8a] to-[#161d30]',
                                cardBorder: 'border-cyan-500/35',
                                cardGlow: 'shadow-[0_0_24px_rgba(34,211,238,0.28)]',
                                iconBg: 'from-cyan-400 to-blue-600',
                                iconGlow: 'shadow-[0_0_18px_rgba(34,211,238,0.28)]',
                                badgeBg: 'bg-cyan-500/15',
                                badgeBorder: 'border-cyan-500/35',
                                badgeText: 'text-cyan-200',
                                iconColor: 'text-white',
                            },
                        };

                        const sorted = [...profileData.achievements]
                            .sort((a, b) => {
                                const rarityA = getRarity(a);
                                const rarityB = getRarity(b);
                                const tierA = tierOrder[rarityA];
                                const tierB = tierOrder[rarityB];
                                if (tierA !== tierB) return tierB - tierA;
                                const timeA = new Date(a.unlockedAt || 0).getTime();
                                const timeB = new Date(b.unlockedAt || 0).getTime();
                                return timeB - timeA;
                            })
                            .slice(0, 3);

                        const primary = sorted[0];
                        const secondary = sorted.slice(1);

                        const formatUnlocked = (unlockedAt?: any) => {
                            const d = unlockedAt ? new Date(unlockedAt) : null;
                            if (!d || Number.isNaN(d.getTime())) return '—';
                            return d.toLocaleDateString();
                        };

                        const TrophyBadge = ({ rarity }: { rarity: Rarity }) => {
                            const s = rarityStyles[rarity];
                            return (
                                <span
                                    className={[
                                        'inline-flex items-center',
                                        'px-2.5 py-1',
                                        'text-[10px] font-black uppercase tracking-widest',
                                        'rounded-full',
                                        s.badgeBg,
                                        s.badgeBorder,
                                        s.badgeText,
                                        'shadow-[0_0_0_1px_rgba(255,255,255,0.03)]',
                                    ].join(' ')}
                                >
                                    <span className="opacity-90">{rarityLabel[rarity]}</span>
                                </span>
                            );
                        };

                        return (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Primary large card */}
                                {primary && (() => {
                                    const rarity = getRarity(primary);
                                    const s = rarityStyles[rarity];
                                    const Icon = IconMap[primary.icon] || Trophy;

                                    return (
                                        <div
                                            className={[
                                                'col-span-1 md:col-span-2 relative group rounded-2xl border p-6 transition-all',
                                                'bg-gradient-to-br',
                                                s.cardBg,
                                                s.cardBorder,
                                                'hover:scale-[1.02] hover:shadow-lg',
                                                s.cardGlow,
                                            ].join(' ')}
                                        >
                                            {/* Spotlight behind icon */}
                                            <div className="absolute inset-0 pointer-events-none">
                                                <div
                                                    className={[
                                                        'absolute -top-16 -left-16 h-44 w-44 rounded-full blur-2xl opacity-80',
                                                        rarity === 'gold'
                                                            ? 'bg-amber-500/25'
                                                            : rarity === 'orange'
                                                              ? 'bg-orange-500/25'
                                                              : rarity === 'purple'
                                                                ? 'bg-purple-500/25'
                                                                : 'bg-cyan-500/25',
                                                    ].join(' ')}
                                                />
                                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/5 via-transparent to-transparent" />
                                            </div>

                                            <div className="relative flex items-center gap-4">
                                                <div className="relative">
                                                    <div
                                                        className={[
                                                            'w-16 h-16 rounded-xl flex items-center justify-center text-3xl font-black text-white',
                                                            'bg-gradient-to-br',
                                                            s.iconBg,
                                                            'shadow-lg',
                                                            s.iconGlow,
                                                            'transition-transform group-hover:scale-[1.04]',
                                                        ].join(' ')}
                                                    >
                                                        <div className="absolute inset-0 rounded-xl bg-white/15 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        {React.createElement(Icon, { size: 32, className: s.iconColor })}
                                                    </div>
                                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-3 rounded-full bg-white/5 blur-md opacity-60" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-black text-lg uppercase leading-tight break-words">
                                                        {primary.title}
                                                    </p>
                                                    <p className="text-sm text-zinc-400 mt-1">
                                                        Unlocked {formatUnlocked(primary.unlockedAt)}
                                                    </p>
                                                </div>

                                                <TrophyBadge rarity={rarity} />
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Secondary cards */}
                                <div className="flex flex-col gap-4">
                                    {secondary.map((ach) => {
                                        const rarity = getRarity(ach);
                                        const s = rarityStyles[rarity];
                                        const Icon = IconMap[ach.icon] || Trophy;

                                        return (
                                            <div
                                                key={ach.id}
                                                className={[
                                                    'relative group rounded-2xl border p-4 transition-all',
                                                    'bg-gradient-to-br',
                                                    s.cardBg,
                                                    s.cardBorder,
                                                    'hover:scale-[1.02] hover:shadow-lg',
                                                    'hover:border-white/15',
                                                ].join(' ')}
                                            >
                                                {/* inner highlight */}
                                                <div className="absolute inset-0 pointer-events-none rounded-2xl">
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/6 via-transparent to-transparent" />
                                                </div>

                                                <div className="relative flex items-center gap-3">
                                                    <div className="relative">
                                                        <div
                                                            className={[
                                                                'w-12 h-12 rounded-lg flex items-center justify-center text-xl font-black text-white',
                                                                'bg-gradient-to-br',
                                                                s.iconBg,
                                                                s.iconGlow,
                                                                'shadow-lg',
                                                                'transition-transform group-hover:scale-[1.03]',
                                                            ].join(' ')}
                                                        >
                                                            <div className="absolute inset-0 rounded-lg bg-white/12 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            {React.createElement(Icon, { size: 20, className: s.iconColor })}
                                                        </div>
                                                        {/* subtle icon spotlight */}
                                                        <div
                                                            className={[
                                                                'absolute -inset-2 rounded-full blur-xl opacity-70 pointer-events-none',
                                                                rarity === 'gold'
                                                                    ? 'bg-amber-500/20'
                                                                    : rarity === 'orange'
                                                                      ? 'bg-orange-500/20'
                                                                      : rarity === 'purple'
                                                                        ? 'bg-purple-500/20'
                                                                        : 'bg-cyan-500/18',
                                                            ].join(' ')}
                                                        />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-black text-sm uppercase leading-tight break-words">
                                                            {ach.title}
                                                        </p>
                                                        <p className="text-xs text-zinc-400 mt-1">
                                                            Unlocked {formatUnlocked(ach.unlockedAt)}
                                                        </p>
                                                    </div>

                                                    <TrophyBadge rarity={rarity} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()
                )}
            </section>

            {/* ───────────────────────── BODY METRICS ───────────────────────── */}
            <section className="bg-[#1A2236] rounded-3xl shadow-xl border border-white/5 p-5">
                <h3 className="text-[10px] font-black text-white/30 mb-4 uppercase tracking-[0.2em]">
                    Body Metrics
                </h3>

                <div className="grid grid-cols-3 gap-2">
                    <div className="py-3 text-center bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest">Weight</p>
                        <p className="text-white font-black text-sm mt-1">{profileData?.weight ? `${profileData.weight}kg` : '--'}</p>
                    </div>
                    <div className="py-3 text-center bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest">Height</p>
                        <p className="text-white font-black text-sm mt-1">{profileData?.height ? `${profileData.height}cm` : '--'}</p>
                    </div>
                    <div className="py-3 text-center bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest">Member Since</p>
                        <p className="text-white font-black text-sm mt-1">{formatMemberSince(profileData?.createdAt)}</p>
                    </div>
                </div>
            </section>

            {/* ───────────────────────── ACHIEVEMENTS ───────────────────────── */}
            {/* ───────────────────────── ACHIEVEMENT HISTORY NAVIGATION ───────────────────────── */}
            <section className="bg-[#1A2236] rounded-3xl shadow-xl border border-white/5 p-5 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setActivePage('achievements')}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Trophy size={20} className="text-cyan-400" />
                        <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Achievements History</h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-cyan-400">
                        <span>{profileData?.achievements?.length || 0} Unlocked</span>
                        <ChevronRight size={16} />
                    </div>
                </div>
                {(profileData?.achievements?.length ?? 0) > 0 && (
                    <p className="mt-2 text-sm text-zinc-400">
                        Latest: {profileData!.achievements!.at(-1)?.title}
                    </p>
                )}
            </section>


            {/* ───────────────────────── SETTINGS ───────────────────────── */}
            <section className="bg-[#1A2236] rounded-3xl shadow-xl border border-white/5 overflow-hidden">
                <button
                    onClick={() => setShowSettings(true)}
                    className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-white/5 transition-colors group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-[#22D3EE]/10 transition-colors">
                            <Settings size={20} className="text-[#94a3b8] group-hover:text-[#22D3EE] transition-colors" />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-white text-sm">Settings</p>
                            <p className="text-[10px] text-[#94a3b8]/60 uppercase tracking-widest font-black">
                                Preferences & Templates
                            </p>
                        </div>
                    </div>
                    <ChevronRight size={20} className="text-white/10 group-hover:text-[#22D3EE] group-hover:translate-x-1 transition-all" />
                </button>

                <div className="h-px bg-white/5 mx-5" />

                <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-[#EF4444]/5 transition-colors group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#EF4444]/10 rounded-2xl flex items-center justify-center">
                            <LogOut size={20} className="text-[#EF4444]" />
                        </div>
                        <p className="font-bold text-[#EF4444] text-sm uppercase tracking-widest">Log Out</p>
                    </div>
                    <ChevronRight size={20} className="text-[#EF4444]/20 group-hover:translate-x-1 transition-all" />
                </button>
            </section>

            {/* ───────────────────────── Logout Confirmation Modal ───────────────────────── */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fade-in_0.2s]">
                    <div className="bg-[#1A2236] rounded-[2.5rem] shadow-2xl border border-white/10 w-full max-w-sm p-8 relative animate-[slide-up_0.3s_ease-out] text-center">
                        <button
                            onClick={() => setShowLogoutConfirm(false)}
                            className="absolute top-6 right-6 text-[#94a3b8] hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                        <div className="w-16 h-16 bg-[#EF4444]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 mt-2">
                            <LogOut size={32} className="text-[#EF4444]" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Log Out</h3>
                        <p className="text-[#94a3b8] font-bold text-sm mb-8">
                            Are you sure you want to log out of your Strive Athlete account?
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 p-4 bg-white/5 text-[#94a3b8] font-bold rounded-2xl hover:bg-white/10 transition-all text-xs uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowLogoutConfirm(false);
                                    onLogout();
                                }}
                                className="flex-1 p-4 bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-red-500/30 active:scale-95 transition-all text-xs"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

