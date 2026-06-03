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
                        const tierOrder: Record<string, number> = { gold: 4, orange: 3, purple: 2, blue: 1 };
                        const iconToTier: Record<string, string> = {
                            Trophy: 'gold',
                            Flame: 'orange',
                            Medal: 'purple',
                            Sparkles: 'blue',
                            Clock: 'blue',
                            Star: 'blue',
                        };
                        const sorted = [...profileData.achievements]
                            .sort((a, b) => {
                                const tierA = tierOrder[iconToTier[a.icon] ?? 'blue'];
                                const tierB = tierOrder[iconToTier[b.icon] ?? 'blue'];
                                if (tierA !== tierB) return tierB - tierA;
                                const timeA = new Date(a.unlockedAt || 0).getTime();
                                const timeB = new Date(b.unlockedAt || 0).getTime();
                                return timeB - timeA;
                            })
                            .slice(0, 3);
                        const IconMap: Record<string, any> = { Trophy, Flame, Medal, Sparkles, Clock, Star };
                        const primary = sorted[0];
                        const secondary = sorted.slice(1);
                        return (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Primary large card */}
                                {primary && (
                                    <div className="col-span-1 md:col-span-2 relative group rounded-2xl border bg-gradient-to-br from-[#2e1065] to-[#161d30] p-6 transition-transform hover:scale-[1.02] hover:shadow-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 bg-gradient-to-br from-[#22D3EE] to-[#3B82F6] rounded-xl flex items-center justify-center text-3xl font-black text-white shadow-lg">
                                                {React.createElement(IconMap[primary.icon] || Trophy, { size: 32 })}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-white font-black text-lg uppercase">{primary.title}</p>
                                                <p className="text-sm text-zinc-400 mt-1">Unlocked {new Date(primary.unlockedAt || '').toLocaleDateString()}</p>
                                            </div>
                                            <span className="px-2 py-1 text-xs font-black uppercase rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">{(primary.icon === 'Trophy' ? 'Gold' : primary.icon === 'Flame' ? 'Orange' : primary.icon === 'Medal' ? 'Purple' : 'Blue')}</span>
                                        </div>
                                    </div>
                                )}
                                {/* Secondary cards */}
                                <div className="flex flex-col gap-4">
                                    {secondary.map((ach) => (
                                        <div key={ach.id} className="relative group rounded-2xl border bg-gradient-to-br from-[#3B82F6] to-[#818cf8] p-4 transition-transform hover:scale-[1.02] hover:shadow-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-gradient-to-br from-[#ff7f50] to-[#ffa500] rounded-lg flex items-center justify-center text-xl font-black text-white">
                                                    {React.createElement(IconMap[ach.icon] || Trophy, { size: 20 })}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-white font-black text-sm uppercase">{ach.title}</p>
                                                    <p className="text-xs text-zinc-400 mt-1">Unlocked {new Date(ach.unlockedAt || '').toLocaleDateString()}</p>
                                                </div>
                                                <span className="px-2 py-0.5 text-xs font-black uppercase rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">{(ach.icon === 'Trophy' ? 'Gold' : ach.icon === 'Flame' ? 'Orange' : ach.icon === 'Medal' ? 'Purple' : 'Blue')}</span>
                                            </div>
                                        </div>
                                    ))}
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

