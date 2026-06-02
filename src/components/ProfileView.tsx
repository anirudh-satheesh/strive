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

export const ProfileView: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
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
            {profileData?.achievements && profileData.achievements.length > 0 && (
                <section className="bg-[#1A2236] rounded-3xl shadow-xl border border-white/5 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                            Trophy Room
                        </h3>
                        <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest bg-cyan-500/10 px-2 py-0.5 rounded-full">
                            {profileData.achievements.length} Unlocked
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {profileData.achievements.map(ach => {
                            const IconMap: Record<string, React.FC<any>> = { Trophy, Flame, Medal, Sparkles, Clock, Star };
                            const Icon = IconMap[ach.icon] || Trophy;
                            
                            return (
                                <div key={ach.id} className="flex items-center p-3 bg-white/5 rounded-2xl border border-white/5 group hover:border-white/10 hover:bg-white/10 transition-colors">
                                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 rounded-xl flex items-center justify-center mr-3 shrink-0 border border-cyan-500/20 group-hover:border-cyan-500/40 transition-colors">
                                        <Icon size={20} className="text-cyan-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-white font-black text-xs uppercase tracking-tight truncate">{ach.title}</p>
                                        <p className="text-[10px] text-zinc-400 font-bold mt-0.5 line-clamp-2">{ach.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

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

