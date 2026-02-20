import React, { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { WorkoutService } from '../services/workoutService';
import { ExerciseService } from '../services/exerciseService';
import { UserService } from '../services/userService';
import { auth } from '../services/firebase';
import { EXERCISE_CATEGORIES } from '../data/exercises';
import type { UserStats, Exercise, Workout, WorkoutExercise, WorkoutTemplate } from '../types';
import { Flame, Trophy, Medal, Plus, Trash2, ChevronDown, ChevronUp, Edit2, X } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export const ProfileView: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [stats, setStats] = useState<UserStats>({ totalWorkouts: 0, totalVolume: 0, monthlyWorkouts: 0 });
    const [weeklyVolume, setWeeklyVolume] = useState<number[]>(new Array(7).fill(0));
    const [weeklyExercises, setWeeklyExercises] = useState<number[]>(new Array(7).fill(0));
    const [loading, setLoading] = useState(true);
    const { showToast, confirm } = useNotification();

    // Progress stats
    const [streak, setStreak] = useState(0);
    const [bestWeekVolume, setBestWeekVolume] = useState(0);
    const [top3Exercises, setTop3Exercises] = useState<{ name: string; count: number }[]>([]);

    // Custom exercises
    const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newExName, setNewExName] = useState('');
    const [newExCategory, setNewExCategory] = useState('Strength');
    const [customSectionOpen, setCustomSectionOpen] = useState(false);

    // Templates
    const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
    const [templatesSectionOpen, setTemplatesSectionOpen] = useState(false);

    // User profile
    const [userName, setUserName] = useState<string>('');
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    const categories = EXERCISE_CATEGORIES;

    useEffect(() => {
        const loadData = async () => {
            if (!auth.currentUser) return;
            const userId = auth.currentUser.uid;

            const [workouts, custom, profile, templateDocs] = await Promise.all([
                WorkoutService.getAllWorkouts(userId),
                ExerciseService.getCustomExercises(userId),
                UserService.getProfile(userId),
                WorkoutService.getTemplates(userId)
            ]);

            if (profile?.displayName) {
                setUserName(profile.displayName);
            }

            setCustomExercises(custom);
            setTemplates(templateDocs);

            let totalVol = 0;
            let totalWork = 0;
            let monthWork = 0;
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

            const weekVol = new Array(7).fill(0);
            const weekEx = new Array(7).fill(0);
            const weekStart = new Date();
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);

            // Exercise frequency map
            const exerciseFreq: Record<string, number> = {};

            // For streak calculation
            const workoutDates = new Set<string>();

            // Weekly volume tracking for best week
            const weeklyVolumes: Record<string, number> = {};

            workouts.forEach((w: Workout) => {
                if (!w.isRestDay) {
                    totalWork++;
                    workoutDates.add(w.date);
                    const workoutDate = new Date(w.date + 'T00:00:00');
                    if (workoutDate >= monthStart) monthWork++;

                    let dVol = 0;
                    w.exercises.forEach((ex: WorkoutExercise) => {
                        const vol = (Number(ex.sets) || 0) * (Number(ex.reps) || 0) * (Number(ex.weight) || 0);
                        dVol += vol;
                        const reps = (Number(ex.sets) || 0) * (Number(ex.reps) || 0);
                        exerciseFreq[ex.name] = (exerciseFreq[ex.name] || 0) + reps;
                    });
                    totalVol += dVol;

                    if (workoutDate >= weekStart) {
                        const day = workoutDate.getDay();
                        weekVol[day] += dVol;
                        weekEx[day] += w.exercises.length;
                    }

                    // Track weekly volumes
                    const weekKey = getWeekKey(workoutDate);
                    weeklyVolumes[weekKey] = (weeklyVolumes[weekKey] || 0) + dVol;
                }
            });

            // Calculate streak
            let currentStreak = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const checkDate = new Date(today);
            while (true) {
                const dateStr = checkDate.toISOString().split('T')[0];
                if (workoutDates.has(dateStr)) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }

            // Top 3 exercises
            const sortedExercises = Object.entries(exerciseFreq)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3);

            // Best week volume
            const bestWeek = Math.max(0, ...Object.values(weeklyVolumes));

            setStats({ totalWorkouts: totalWork, totalVolume: totalVol, monthlyWorkouts: monthWork });
            setWeeklyVolume(weekVol);
            setWeeklyExercises(weekEx);
            setStreak(currentStreak);
            setBestWeekVolume(bestWeek);
            setTop3Exercises(sortedExercises);

            setLoading(false);
        };
        loadData();
    }, []);

    const getWeekKey = (date: Date) => {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        return d.toISOString().split('T')[0];
    };

    const handleAddCustom = async () => {
        if (!auth.currentUser || !newExName.trim()) return;
        try {
            const id = await ExerciseService.addCustomExercise(auth.currentUser.uid, {
                name: newExName.trim(),
                category: newExCategory,
                fields: ['sets', 'reps', 'weight'],
                isCustom: true
            });
            setCustomExercises(prev => [...prev, { id, name: newExName.trim(), category: newExCategory, fields: ['sets', 'reps', 'weight'], isCustom: true }]);
            setNewExName('');
            setShowAddForm(false);
            showToast('Custom exercise added!', 'success');
        } catch (error) {
            showToast('Failed to add exercise', 'error');
        }
    };

    const handleDeleteCustom = async (exerciseId: string, name: string) => {
        if (!auth.currentUser) return;

        const confirmed = await confirm({
            title: 'Delete custom exercise',
            message: `Are you sure you want to delete "${name}"? This cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Keep'
        });

        if (!confirmed) return;

        try {
            await ExerciseService.deleteCustomExercise(auth.currentUser.uid, exerciseId);
            setCustomExercises(prev => prev.filter(e => e.id !== exerciseId));
            showToast('Exercise deleted', 'success');
        } catch (error) {
            showToast('Failed to delete exercise', 'error');
        }
    };

    const handleDeleteTemplate = async (templateId: string, name: string) => {
        if (!auth.currentUser) return;

        const confirmed = await confirm({
            title: 'Delete Template',
            message: `Are you sure you want to delete "${name}"?`,
            confirmText: 'Delete',
            cancelText: 'Keep'
        });

        if (!confirmed) return;

        try {
            await WorkoutService.deleteTemplate(auth.currentUser.uid, templateId);
            setTemplates(prev => prev.filter(t => t.id !== templateId));
            showToast('Template deleted', 'success');
        } catch (error) {
            showToast('Failed to delete template', 'error');
        }
    };

    const handleSaveProfile = async () => {
        if (!auth.currentUser) return;
        setEditLoading(true);
        try {
            await UserService.updateUserProfile(auth.currentUser.uid, {
                displayName: editName.trim()
            });

            setUserName(editName.trim());
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

    const lineData = {
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [{
            label: 'Exercises',
            data: weeklyExercises,
            borderColor: '#22d3ee',
            backgroundColor: 'rgba(34, 211, 238, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#22d3ee',
            pointBorderColor: '#fff',
            pointHoverRadius: 6,
        }]
    };

    const barData = {
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [{
            label: 'Volume (kg)',
            data: weeklyVolume,
            backgroundColor: 'rgba(99, 102, 241, 0.6)',
            hoverBackgroundColor: '#6366f1',
            borderRadius: 8,
        }]
    };

    if (loading) {
        return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div></div>;
    }

    return (
        <div className="space-y-6">
            {/* Profile Header */}
            <section className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl overflow-hidden border dark:border-zinc-800 p-6 flex flex-col md:flex-row gap-6 items-center relative">
                <button
                    onClick={openEditProfile}
                    className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-cyan-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
                >
                    <Edit2 size={20} />
                </button>

                <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-3xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center text-4xl sm:text-5xl font-black text-white shadow-2xl rotate-3 overflow-hidden relative">
                    <span className="-rotate-3">{userName ? userName[0].toUpperCase() : (auth.currentUser?.email?.[0].toUpperCase() || 'U')}</span>
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl sm:text-3xl font-black dark:text-gray-100 tracking-tight">{userName || auth.currentUser?.email}</h2>
                    <p className="text-cyan-500 font-bold uppercase tracking-widest text-sm mt-1">Strive Athlete</p>
                </div>
            </section>

            {/* Favorite Exercises Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold dark:text-gray-100 px-2">Favorite Exercises</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {top3Exercises.length > 0 ? (
                        top3Exercises.map((ex, i) => {

                            const medals = ['🥇', '🥈', '🥉'];
                            const rankNames = ['Champion', 'Contender', 'Bronze'];

                            return (
                                <div key={ex.name} className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900 text-white shadow-lg flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.05] hover:shadow-cyan-500/10 hover:border-cyan-500/30 group">
                                    <div className="relative mb-3 transition-transform group-hover:scale-110">
                                        <span className="text-5xl">{medals[i]}</span>
                                        <div className="absolute -bottom-1 -right-1 bg-cyan-500 text-zinc-950 rounded-full px-2 py-0.5 text-[10px] font-black shadow-sm uppercase">
                                            #{i + 1}
                                        </div>
                                    </div>
                                    <p className="font-bold text-lg mb-1 leading-tight line-clamp-2 min-h-[3.5rem] flex items-center justify-center group-hover:text-cyan-400 transition-colors">
                                        {ex.name}
                                    </p>
                                    <div className="mt-auto pt-3 border-t border-zinc-800 w-full mb-2" />
                                    <p className="text-sm font-black uppercase tracking-widest text-cyan-500">{ex.count.toLocaleString()} reps</p>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">{rankNames[i]}</p>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full py-12 text-center bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed dark:border-gray-700 text-gray-500">
                            <Medal size={48} className="mx-auto mb-3 opacity-20" />
                            <p className="font-medium">Keep working out to see your favorites!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Weekly Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg border dark:border-gray-700">
                    <h3 className="font-bold mb-4">Weekly Exercises</h3>
                    <Line data={lineData} options={{ responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg border dark:border-gray-700">
                    <h3 className="font-bold mb-4">Weekly Volume</h3>
                    <Bar data={barData} options={{ responsive: true, scales: { y: { beginAtZero: true } } }} />
                </div>
            </div>

            {/* View Progress Section */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border dark:border-zinc-800 p-6">
                <h3 className="text-lg font-black dark:text-gray-100 mb-6 uppercase tracking-widest text-center md:text-left flex items-center gap-2">
                    <span className="w-8 h-1 bg-cyan-500 rounded-full" />
                    LifeTime Progress
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border dark:border-zinc-700/50 hover:border-orange-500/30 transition-colors">
                        <div className="p-3 bg-orange-500 rounded-xl shadow-lg shadow-orange-500/20">
                            <Flame size={24} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Current Streak</p>
                            <p className="text-2xl font-black text-orange-600 dark:text-orange-400">{streak} day{streak !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border dark:border-zinc-700/50 hover:border-cyan-500/30 transition-colors">
                        <div className="p-3 bg-cyan-500 rounded-xl shadow-lg shadow-cyan-500/20">
                            <Trophy size={24} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Best Week</p>
                            <p className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{Math.round(bestWeekVolume).toLocaleString()} kg</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-xl border dark:border-zinc-800 text-center hover:scale-105 transition-transform">
                    <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Total Workouts</h3>
                    <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400 mt-2">{stats.totalWorkouts}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-xl border dark:border-zinc-800 text-center hover:scale-105 transition-transform">
                    <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Total Volume</h3>
                    <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{Math.round(stats.totalVolume).toLocaleString()}<span className="text-sm font-bold ml-1">kg</span></p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-xl border dark:border-zinc-800 text-center hover:scale-105 transition-transform">
                    <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">This Month</h3>
                    <p className="text-4xl font-black text-cyan-600 dark:text-cyan-400 mt-2">{stats.monthlyWorkouts}</p>
                </div>
            </div>

            {/* Manage Custom Exercises */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700">
                <button
                    onClick={() => setCustomSectionOpen(!customSectionOpen)}
                    className="w-full p-4 sm:p-6 flex justify-between items-center text-left"
                >
                    <h3 className="text-lg font-bold dark:text-gray-100">
                        Manage Custom Exercises
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">({customExercises.length})</span>
                    </h3>
                    {customSectionOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {customSectionOpen && (
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3">
                        {customExercises.length > 0 ? (
                            <div className="space-y-2">
                                {customExercises.map(ex => (
                                    <div key={ex.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-700">
                                        <div>
                                            <p className="font-semibold dark:text-gray-200">{ex.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{ex.category}</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteCustom(ex.id, ex.name)}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No custom exercises yet.</p>
                        )}

                        {showAddForm ? (
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-700 space-y-3">
                                <input
                                    type="text"
                                    placeholder="Exercise name"
                                    className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newExName}
                                    onChange={e => setNewExName(e.target.value)}
                                    autoFocus
                                />
                                <select
                                    className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newExCategory}
                                    onChange={e => setNewExCategory(e.target.value)}
                                >
                                    {categories.map((cat: string) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAddCustom}
                                        disabled={!newExName.trim()}
                                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => { setShowAddForm(false); setNewExName(''); }}
                                        className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                            >
                                <Plus size={18} />
                                Add Custom Exercise
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Manage Templates */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700">
                <button
                    onClick={() => setTemplatesSectionOpen(!templatesSectionOpen)}
                    className="w-full p-4 sm:p-6 flex justify-between items-center text-left"
                >
                    <h3 className="text-lg font-bold dark:text-gray-100">
                        Manage Templates
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">({templates.length})</span>
                    </h3>
                    {templatesSectionOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {templatesSectionOpen && (
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3">
                        {templates.length > 0 ? (
                            <div className="space-y-2">
                                {templates.map(t => (
                                    <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-700">
                                        <div>
                                            <p className="font-semibold dark:text-gray-200">{t.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{t.exercises.length} Exercises</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteTemplate(t.id, t.name)}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No templates saved yet.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Logout */}
            <div className="pt-2 pb-4 flex justify-center">
                <button
                    onClick={onLogout}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-10 rounded-xl shadow-lg hover:shadow-red-600/20 transition-all active:scale-95"
                >
                    Logout
                </button>
            </div>

            {/* Edit Profile Modal */}
            {isEditingProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fade-in_0.2s]">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border dark:border-zinc-800 w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setIsEditingProfile(false)}
                            className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                            <X size={24} />
                        </button>

                        <h3 className="text-xl font-bold dark:text-white mb-6">Edit Profile</h3>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Display Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent focus:border-cyan-500 outline-none font-bold text-zinc-900 dark:text-white transition-all"
                                    placeholder="Enter your name"
                                />
                            </div>

                            <button
                                onClick={handleSaveProfile}
                                disabled={editLoading || !editName.trim()}
                                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {editLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
