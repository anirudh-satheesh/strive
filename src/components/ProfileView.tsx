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
import { auth } from '../services/firebase';
import type { UserStats } from '../types';

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

    useEffect(() => {
        const loadStats = async () => {
            if (!auth.currentUser) return;
            const workouts = await WorkoutService.getAllWorkouts(auth.currentUser.uid);

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

            workouts.forEach(w => {
                if (!w.isRestDay) {
                    totalWork++;
                    const workoutDate = new Date(w.date + 'T00:00:00');
                    if (workoutDate >= monthStart) monthWork++;

                    let dVol = 0;
                    w.exercises.forEach(ex => {
                        const vol = (Number(ex.sets) || 0) * (Number(ex.reps) || 0) * (Number(ex.weight) || 0);
                        dVol += vol;
                    });
                    totalVol += dVol;

                    if (workoutDate >= weekStart) {
                        const day = workoutDate.getDay();
                        weekVol[day] += dVol;
                        weekEx[day] += w.exercises.length;
                    }
                }
            });

            setStats({ totalWorkouts: totalWork, totalVolume: totalVol, monthlyWorkouts: monthWork });
            setWeeklyVolume(weekVol);
            setWeeklyExercises(weekEx);
            setLoading(false);
        };
        loadStats();
    }, []);

    const lineData = {
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [{
            label: 'Exercises Logged',
            data: weeklyExercises,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
        }]
    };

    const barData = {
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [{
            label: 'Volume (kg)',
            data: weeklyVolume,
            backgroundColor: 'rgba(59, 130, 246, 0.6)',
            borderRadius: 6,
        }]
    };

    if (loading) {
        return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div></div>;
    }

    return (
        <div className="space-y-6">
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col md:flex-row gap-6 items-center">
                <div className="h-28 w-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                    {auth.currentUser?.email?.[0].toUpperCase() || 'U'}
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold dark:text-gray-100">{auth.currentUser?.email}</h2>
                    <p className="text-gray-500 dark:text-gray-400">Keep crushing your goals!</p>
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Workouts</h3>
                    <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.totalWorkouts}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Volume (kg)</h3>
                    <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{Math.round(stats.totalVolume).toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">This Month</h3>
                    <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">{stats.monthlyWorkouts}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border dark:border-gray-700">
                    <h3 className="font-bold mb-4">Weekly Exercises</h3>
                    <Line data={lineData} options={{ responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border dark:border-gray-700">
                    <h3 className="font-bold mb-4">Weekly Volume</h3>
                    <Bar data={barData} options={{ responsive: true, scales: { y: { beginAtZero: true } } }} />
                </div>
            </div>

            <div className="pt-6 flex justify-center">
                <button
                    onClick={onLogout}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-10 rounded-xl shadow-lg hover:shadow-red-600/20 transition-all active:scale-95"
                >
                    Logout
                </button>
            </div>
        </div>
    );
};
