import React, { useState, useEffect } from 'react';
import { ChevronLeft, Save } from 'lucide-react';
import { auth } from '../services/firebase';
import { UserService, type UserProfile } from '../services/userService';
import { useNotification } from '../context/NotificationContext';

interface EditProfileViewProps {
    onBack: () => void;
}

const calculateBMI = (weightKg: number, heightCm: number): number | undefined => {
    if (!weightKg || !heightCm) return undefined;
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
};

const calculateBodyFat = (
    gender: 'male' | 'female',
    heightCm: number,
    waistCm: number,
    neckCm: number,
    hipsCm?: number
): number | undefined => {
    if (!heightCm || !waistCm || !neckCm) return undefined;
    if (gender === 'female' && !hipsCm) return undefined;

    if (gender === 'male') {
        const val = 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450;
        return val > 0 && val < 60 ? val : undefined;
    } else {
        const val = 495 / (1.29579 - 0.35004 * Math.log10(waistCm + (hipsCm || 0) - neckCm) + 0.22100 * Math.log10(heightCm)) - 450;
        return val > 0 && val < 60 ? val : undefined;
    }
};

export const EditProfileView: React.FC<EditProfileViewProps> = ({ onBack }) => {
    const { showToast } = useNotification();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState<Partial<UserProfile>>({
        displayName: '',
        email: '',
        height: undefined,
        weight: undefined,
        age: undefined,
        gender: 'male',
        waist: undefined,
        neck: undefined,
        hips: undefined,
    });

    useEffect(() => {
        const loadData = async () => {
            if (!auth.currentUser) return;
            try {
                const profile = await UserService.getProfile(auth.currentUser.uid);
                if (profile) {
                    setForm({
                        displayName: profile.displayName || '',
                        email: profile.email || auth.currentUser.email || '',
                        height: profile.height,
                        weight: profile.weight,
                        age: profile.age,
                        gender: profile.gender || 'male',
                        waist: profile.waist,
                        neck: profile.neck,
                        hips: profile.hips,
                    });
                }
            } catch (error) {
                console.error(error);
                showToast('Failed to load profile data', 'error');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [showToast]);

    const handleSave = async () => {
        if (!auth.currentUser) return;

        if (!form.displayName?.trim()) {
            showToast('Name cannot be empty', 'warning');
            return;
        }

        if (form.height && form.height <= 0) {
            showToast('Height must be greater than zero', 'warning');
            return;
        }

        let calculatedBMI = undefined;
        let calculatedBodyFat = undefined;

        if (form.weight && form.height) {
            calculatedBMI = calculateBMI(form.weight, form.height);
        }

        if (form.gender && form.height && form.waist && form.neck) {
            calculatedBodyFat = calculateBodyFat(
                form.gender, 
                form.height, 
                form.waist, 
                form.neck, 
                form.hips
            );
        }

        const updateData: any = {
            ...form,
            bmi: calculatedBMI,
            bodyFatPercentage: calculatedBodyFat,
        };

        // Goal is intentionally not editable from the Edit Profile screen.
        delete updateData.goal;

        // Firestore does not accept undefined values, so we must remove them
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        setSaving(true);
        try {
            await UserService.updateUserProfile(auth.currentUser.uid, updateData);
            showToast('Profile updated successfully!', 'success');
            onBack();
        } catch (error) {
            console.error(error);
            showToast('Failed to save profile', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#22D3EE] shadow-lg shadow-cyan-500/20"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 animate-[fade-in_0.4s_ease-out]">
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-[#94a3b8] hover:text-white transition-colors group"
                >
                    <div className="p-2 bg-white/5 rounded-xl group-hover:bg-[#22D3EE]/20 transition-colors">
                        <ChevronLeft size={20} className="group-hover:text-[#22D3EE]" />
                    </div>
                    <span className="font-bold text-sm tracking-wide">Back</span>
                </button>

                <h2 className="text-xl font-black text-white uppercase tracking-wider">Edit Profile</h2>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 p-2 px-4 bg-gradient-to-r from-[#22D3EE] to-[#3B82F6] text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50 text-xs"
                >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>

            <div className="space-y-6">
                {/* Section 1: Personal Info */}
                <section className="bg-[#1A2236] rounded-3xl shadow-xl border border-white/5 p-6">
                    <h3 className="text-[10px] font-black text-white/30 mb-5 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-8 h-1 bg-[#3B82F6] rounded-full" />
                        Personal Info
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-[#94a3b8] mb-1 block">Display Name</label>
                            <input
                                type="text"
                                value={form.displayName || ''}
                                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                                className="w-full p-4 bg-white/5 rounded-2xl border border-white/5 text-white font-bold outline-none focus:ring-2 focus:ring-[#22D3EE] transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[#94a3b8] mb-1 block">Email (Read-only)</label>
                            <input
                                type="email"
                                value={form.email || ''}
                                readOnly
                                className="w-full p-4 bg-white/5 rounded-2xl border border-white/5 text-[#94a3b8] font-bold outline-none opacity-70"
                            />
                        </div>
                    </div>
                </section>

                {/* Section 2: Body Metrics */}
                <section className="bg-[#1A2236] rounded-3xl shadow-xl border border-white/5 p-6">
                    <h3 className="text-[10px] font-black text-white/30 mb-5 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-8 h-1 bg-[#22D3EE] rounded-full" />
                        Body Metrics
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-[#94a3b8] mb-1 block">Height (cm)</label>
                            <input
                                type="number"
                                value={form.height || ''}
                                onChange={(e) => setForm({ ...form, height: Number(e.target.value) || undefined })}
                                className="w-full p-4 bg-white/5 rounded-2xl border border-white/5 text-white font-bold outline-none focus:ring-2 focus:ring-[#22D3EE] transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[#94a3b8] mb-1 block">Weight (kg)</label>
                            <input
                                type="number"
                                value={form.weight || ''}
                                onChange={(e) => setForm({ ...form, weight: Number(e.target.value) || undefined })}
                                className="w-full p-4 bg-white/5 rounded-2xl border border-white/5 text-white font-bold outline-none focus:ring-2 focus:ring-[#22D3EE] transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[#94a3b8] mb-1 block">Age</label>
                            <input
                                type="number"
                                value={form.age || ''}
                                onChange={(e) => setForm({ ...form, age: Number(e.target.value) || undefined })}
                                className="w-full p-4 bg-white/5 rounded-2xl border border-white/5 text-white font-bold outline-none focus:ring-2 focus:ring-[#22D3EE] transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[#94a3b8] mb-1 block">Gender</label>
                            <select
                                value={form.gender || 'male'}
                                onChange={(e) => setForm({ ...form, gender: e.target.value as 'male' | 'female' })}
                                className="w-full p-4 bg-white/5 rounded-2xl border border-white/5 text-white font-bold outline-none focus:ring-2 focus:ring-[#22D3EE] transition-all appearance-none"
                            >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>

                    </div>
                </section>

                {/* Section 3: Advanced Measurements */}
                <section className="bg-[#1A2236] rounded-3xl shadow-xl border border-white/5 p-6">
                    <h3 className="text-[10px] font-black text-white/30 mb-5 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-8 h-1 bg-[#F97316] rounded-full" />
                        Advanced Measurements
                    </h3>
                    <p className="text-xs text-[#94a3b8]/70 mb-4">Required for Body Fat % calculation (US Navy method).</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-[#94a3b8] mb-1 block">Waist (cm)</label>
                            <input
                                type="number"
                                value={form.waist || ''}
                                onChange={(e) => setForm({ ...form, waist: Number(e.target.value) || undefined })}
                                className="w-full p-4 bg-white/5 rounded-2xl border border-white/5 text-white font-bold outline-none focus:ring-2 focus:ring-[#22D3EE] transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[#94a3b8] mb-1 block">Neck (cm)</label>
                            <input
                                type="number"
                                value={form.neck || ''}
                                onChange={(e) => setForm({ ...form, neck: Number(e.target.value) || undefined })}
                                className="w-full p-4 bg-white/5 rounded-2xl border border-white/5 text-white font-bold outline-none focus:ring-2 focus:ring-[#22D3EE] transition-all"
                            />
                        </div>
                        {form.gender === 'female' && (
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-[#94a3b8] mb-1 block">Hips (cm)</label>
                                <input
                                    type="number"
                                    value={form.hips || ''}
                                    onChange={(e) => setForm({ ...form, hips: Number(e.target.value) || undefined })}
                                    className="w-full p-4 bg-white/5 rounded-2xl border border-white/5 text-white font-bold outline-none focus:ring-2 focus:ring-[#22D3EE] transition-all"
                                />
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};
