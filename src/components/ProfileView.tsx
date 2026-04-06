import React, { useState, useEffect } from 'react';
import { UserService } from '../services/userService';
import { auth } from '../services/firebase';
import { Edit2, X, LogOut, Settings, ChevronRight, Scale, Ruler, Target } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { SettingsView } from './SettingsView';

export const ProfileView: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const { showToast } = useNotification();

    // User profile
    const [userName, setUserName] = useState<string>('');
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (!auth.currentUser) return;
            try {
                const profile = await UserService.getProfile(auth.currentUser.uid);
                if (profile?.displayName) setUserName(profile.displayName);
            } catch (error) {
                console.error('Error loading profile:', error);
                showToast('Failed to load profile', 'error');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleSaveProfile = async () => {
        if (!auth.currentUser) return;
        const trimmedName = editName.trim();
        if (!trimmedName) {
            showToast('Name cannot be empty', 'warning');
            return;
        }
        setEditLoading(true);
        try {
            await UserService.updateUserProfile(auth.currentUser.uid, { displayName: trimmedName });
            setUserName(trimmedName);
            setIsEditingProfile(false);
            showToast('Profile updated!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to update profile', 'error');
        } finally {
            setEditLoading(false);
        }
    };

    const openEditProfile = () => {
        setEditName(userName || auth.currentUser?.email?.split('@')[0] || '');
        setIsEditingProfile(true);
    };

    // ─── Settings Sub-Page ─────────────────────────────────────────────
    if (showSettings) {
        return <SettingsView onBack={() => setShowSettings(false)} />;
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
                <button
                    onClick={openEditProfile}
                    className="absolute top-4 right-4 p-2.5 text-[#94a3b8] hover:text-[#22D3EE] hover:bg-white/5 rounded-xl transition-all"
                >
                    <Edit2 size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-[2rem] bg-gradient-to-br from-[#22D3EE] via-[#3B82F6] to-[#818cf8] flex items-center justify-center text-5xl sm:text-6xl font-black text-white shadow-2xl shadow-cyan-500/20 rotate-3 overflow-hidden relative mb-5">
                        <span className="-rotate-3">{userName ? userName[0].toUpperCase() : (auth.currentUser?.email?.[0].toUpperCase() || 'U')}</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{userName || auth.currentUser?.email}</h2>
                    <p className="text-[#22D3EE] font-black uppercase tracking-[0.2em] text-xs mt-1">Strive Athlete</p>
                    <p className="text-[#94a3b8] text-xs mt-1">{auth.currentUser?.email}</p>
                </div>
            </section>

            {/* Body Metrics Placeholder */}
            <section className="bg-[#1A2236] rounded-3xl shadow-xl border border-white/5 p-6">
                <h3 className="text-[10px] font-black text-white/30 mb-5 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-8 h-1 bg-[#22C55E] rounded-full" />
                    Body Metrics
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    <div className="py-6 text-center bg-white/5 rounded-2xl border-2 border-dashed border-white/5">
                        <Scale size={24} className="mx-auto mb-2 text-white/20" />
                        <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-wider">Weight</p>
                        <p className="text-white/10 text-[9px] mt-0.5">Coming Soon</p>
                    </div>
                    <div className="py-6 text-center bg-white/5 rounded-2xl border-2 border-dashed border-white/5">
                        <Ruler size={24} className="mx-auto mb-2 text-white/20" />
                        <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-wider">Height</p>
                        <p className="text-white/10 text-[9px] mt-0.5">Coming Soon</p>
                    </div>
                    <div className="py-6 text-center bg-white/5 rounded-2xl border-2 border-dashed border-white/5">
                        <Target size={24} className="mx-auto mb-2 text-white/20" />
                        <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-wider">Goal</p>
                        <p className="text-white/10 text-[9px] mt-0.5">Coming Soon</p>
                    </div>
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
                    onClick={onLogout}
                    className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-[#F97316]/5 transition-colors group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#F97316]/10 rounded-2xl flex items-center justify-center">
                            <LogOut size={20} className="text-[#F97316]" />
                        </div>
                        <p className="font-bold text-[#F97316] text-sm uppercase tracking-widest">Log Out</p>
                    </div>
                    <ChevronRight size={20} className="text-[#F97316]/20 group-hover:translate-x-1 transition-all" />
                </button>
            </section>
        </div>
    );
};
