import React, { useState, useEffect } from 'react';
import { UserService, type UserProfile } from '../services/userService';
import { auth } from '../services/firebase';
import { Edit2, LogOut, Settings, ChevronRight, Scale, Ruler, Target, Activity, Flame, X } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { SettingsView } from './SettingsView';
import { EditProfileView } from './EditProfileView';

const getBMICategory = (bmi?: number) => {
    if (!bmi) return 'N/A';
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
};

const getTargetBMI = (goal?: string, currentBMI?: number) => {
    if (!goal) return { target: 22, type: 'approx' };
    if (goal === 'Lose weight') return { target: 22, type: 'approx' };
    if (goal === 'Gain muscle') return { target: 24, type: 'approx' };
    if (goal === 'Maintain') {
        if (currentBMI && currentBMI >= 18.5 && currentBMI <= 24.9) {
            return { target: currentBMI, type: 'exact' };
        }
        return { target: 22, type: 'approx' };
    }
    return { target: 22, type: 'approx' };
};

const getTargetWeight = (targetBMI: number, heightCm?: number) => {
    if (!heightCm) return null;
    return targetBMI * Math.pow(heightCm / 100, 2);
};

const getBodyFatTarget = (gender?: string) => {
    if (gender === 'female') return { min: 18, max: 25 };
    return { min: 12, max: 18 };
};

const renderDifference = (current: number, target: number) => {
    const diff = current - target;
    const absDiff = Math.abs(diff);
    if (absDiff < 0.5) return <span className="text-[#22C55E]">Healthy balance maintained</span>;
    if (absDiff <= 2.0) return <span className="text-[#EAB308]">You are {absDiff.toFixed(1)} away from target</span>;
    return <span className="text-[#EF4444]">You are {absDiff.toFixed(1)} away from target</span>;
};

const renderWeightDifference = (current: number, target: number) => {
    const diff = current - target;
    const absDiff = Math.abs(diff);
    if (absDiff < 1.0) return <span className="text-[#22C55E]">Holding steady at target weight</span>;
    
    const action = diff > 0 ? 'Lose' : 'Gain';
    if (absDiff <= 4.0) return <span className="text-[#EAB308]">{action} {absDiff.toFixed(1)} kg to reach target</span>;
    return <span className="text-[#EF4444]">{action} {absDiff.toFixed(1)} kg to reach target</span>;
};

const renderBodyFatStatus = (current: number, min: number, max: number) => {
    if (current >= min && current <= max) return <span className="text-[#22C55E]">Healthy range maintained</span>;
    
    const diffToClosest = Math.min(Math.abs(current - min), Math.abs(current - max));
    const status = current > max ? 'Above ideal range' : 'Below ideal range';
    
    if (diffToClosest <= 3.0) return <span className="text-[#EAB308]">{status} (Close)</span>;
    return <span className="text-[#EF4444]">{status}</span>;
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

    const loadData = async () => {
        if (!auth.currentUser) return;
        try {
            const profile = await UserService.getProfile(auth.currentUser.uid);
            setProfileData(profile);
            if (profile?.displayName) setUserName(profile.displayName);
        } catch (error) {
            console.error('Error loading profile:', error);
            showToast('Failed to load profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const openEditProfile = () => {
        setIsEditingProfile(true);
    };

    // ─── Settings Sub-Page ─────────────────────────────────────────────
    if (showSettings) {
        return <SettingsView onBack={() => setShowSettings(false)} />;
    }

    if (isEditingProfile) {
        return <EditProfileView onBack={() => { setIsEditingProfile(false); loadData(); }} />;
    }

    // ─── Loading ───────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex justify-center p-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500 shadow-lg shadow-cyan-500/20"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 animate-[fade-in_0.4s_ease-out]">
            {/* Profile Header */}
            <section className="bg-[#1A2236] rounded-3xl shadow-xl overflow-hidden border border-white/5 p-6 sm:p-8 relative">
                <div className="flex flex-col items-center text-center">
                    <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-[2rem] bg-gradient-to-br from-[#22D3EE] via-[#3B82F6] to-[#818cf8] flex items-center justify-center text-5xl sm:text-6xl font-black text-white shadow-2xl shadow-cyan-500/20 rotate-3 overflow-hidden relative mb-5">
                        <span className="-rotate-3">{userName ? userName[0].toUpperCase() : (auth.currentUser?.email?.[0].toUpperCase() || 'U')}</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{userName || auth.currentUser?.email}</h2>
                    <p className="text-[#22D3EE] font-black uppercase tracking-[0.2em] text-xs mt-1">Strive Athlete</p>
                    <p className="text-[#94a3b8] text-xs mt-1 mb-6">{auth.currentUser?.email}</p>
                    
                    <button
                        onClick={openEditProfile}
                        className="flex items-center gap-2 px-8 py-3.5 bg-white/5 hover:bg-white/10 active:scale-95 transition-all rounded-2xl border border-white/5 hover:border-white/10 text-white font-bold text-sm group shadow-lg"
                    >
                        <Edit2 size={16} className="text-[#94a3b8] group-hover:text-[#22D3EE] transition-colors" />
                        Edit Profile
                    </button>
                </div>
            </section>

            {/* Body Metrics */}
            <section className="bg-[#1A2236] rounded-3xl shadow-xl border border-white/5 p-6">
                <h3 className="text-[10px] font-black text-white/30 mb-5 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-8 h-1 bg-[#22C55E] rounded-full" />
                    Body Metrics
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    <div className="py-6 text-center bg-white/5 rounded-2xl border border-white/5">
                        <Scale size={24} className="mx-auto mb-2 text-[#22D3EE]" />
                        <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-wider">Weight</p>
                        <p className="text-white font-bold text-sm mt-1">{profileData?.weight ? `${profileData.weight}kg` : '--'}</p>
                    </div>
                    <div className="py-6 text-center bg-white/5 rounded-2xl border border-white/5">
                        <Ruler size={24} className="mx-auto mb-2 text-[#22D3EE]" />
                        <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-wider">Height</p>
                        <p className="text-white font-bold text-sm mt-1">{profileData?.height ? `${profileData.height}cm` : '--'}</p>
                    </div>
                    <div className="py-6 text-center bg-white/5 rounded-2xl border border-white/5">
                        <Target size={24} className="mx-auto mb-2 text-[#22D3EE]" />
                        <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-wider">Goal</p>
                        <p className="text-white font-bold text-xs mt-1 px-1">{profileData?.goal || '--'}</p>
                    </div>
                </div>
            </section>

            {/* Target Analysis (Calculated) */}
            <section className="bg-[#1A2236] rounded-3xl shadow-xl border border-white/5 p-6">
                <h3 className="text-[10px] font-black text-white/30 mb-5 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-8 h-1 bg-[#F97316] rounded-full" />
                    Target Analysis
                </h3>
                <div className="space-y-4">
                    {/* Weight Card */}
                    {profileData?.weight && profileData?.height && (
                        <div className="p-5 bg-white/5 rounded-2xl border border-white/5 flex flex-col relative overflow-hidden">
                            <div className="flex items-center gap-3 mb-4">
                                <Scale className="text-[#22D3EE]" size={20} />
                                <h4 className="text-white font-black uppercase tracking-wider text-sm">Weight</h4>
                            </div>
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Current</p>
                                    <p className="text-2xl font-black text-white">{profileData.weight.toFixed(1)} <span className="text-sm text-white/50">kg</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Target ({profileData.goal})</p>
                                    <p className="text-xl font-black text-[#22D3EE]">{getTargetWeight(getTargetBMI(profileData.goal, profileData.bmi).target, profileData.height)?.toFixed(1)} <span className="text-sm text-[#22D3EE]/50">kg</span></p>
                                </div>
                            </div>
                            <div className="mt-2 text-xs font-bold bg-black/20 p-3 rounded-xl text-center border border-white/5">
                                {renderWeightDifference(profileData.weight, getTargetWeight(getTargetBMI(profileData.goal, profileData.bmi).target, profileData.height)!)}
                            </div>
                        </div>
                    )}

                    {/* BMI Card */}
                    {profileData?.bmi && profileData?.height && (
                        <div className="p-5 bg-white/5 rounded-2xl border border-white/5 flex flex-col relative overflow-hidden">
                            <div className="flex items-center gap-3 mb-4">
                                <Activity className="text-[#F97316]" size={20} />
                                <h4 className="text-white font-black uppercase tracking-wider text-sm">BMI</h4>
                            </div>
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Current ({getBMICategory(profileData.bmi)})</p>
                                    <p className="text-2xl font-black text-white">{profileData.bmi.toFixed(1)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Target BMI</p>
                                    <p className="text-xl font-black text-[#F97316]">
                                        {getTargetBMI(profileData.goal, profileData.bmi).type === 'approx' ? '~' : ''}{getTargetBMI(profileData.goal, profileData.bmi).target.toFixed(1)}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2 text-xs font-bold bg-black/20 p-3 rounded-xl text-center border border-white/5">
                                {renderDifference(profileData.bmi, getTargetBMI(profileData.goal, profileData.bmi).target)}
                            </div>
                        </div>
                    )}

                    {/* Body Fat Card */}
                    {profileData?.bodyFatPercentage && (
                        <div className="p-5 bg-white/5 rounded-2xl border border-white/5 flex flex-col relative overflow-hidden">
                            <div className="flex items-center gap-3 mb-4">
                                <Flame className="text-[#3B82F6]" size={20} />
                                <h4 className="text-white font-black uppercase tracking-wider text-sm">Body Fat</h4>
                            </div>
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Current</p>
                                    <p className="text-2xl font-black text-white">{profileData.bodyFatPercentage.toFixed(1)} <span className="text-sm text-white/50">%</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Ideal (Fit)</p>
                                    <p className="text-xl font-black text-[#3B82F6]">
                                        {getBodyFatTarget(profileData.gender).min} - {getBodyFatTarget(profileData.gender).max} <span className="text-sm text-[#3B82F6]/50">%</span>
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2 text-xs font-bold bg-black/20 p-3 rounded-xl text-center border border-white/5">
                                {renderBodyFatStatus(profileData.bodyFatPercentage, getBodyFatTarget(profileData.gender).min, getBodyFatTarget(profileData.gender).max)}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Menu Items */}
            <section className="bg-[#1A2236] rounded-3xl shadow-xl border border-white/5 overflow-hidden">
                {/* Settings Row */}
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
                            <p className="text-[10px] text-[#94a3b8]/60 uppercase tracking-widest font-black">Preferences & Templates</p>
                        </div>
                    </div>
                    <ChevronRight size={20} className="text-white/10 group-hover:text-[#22D3EE] group-hover:translate-x-1 transition-all" />
                </button>

                <div className="h-px bg-white/5 mx-5"></div>

                {/* Logout Row */}
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

            {/* Logout Confirmation Modal */}
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
                        <p className="text-[#94a3b8] font-bold text-sm mb-8">Are you sure you want to log out of your Strive Athlete account?</p>
                        
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
