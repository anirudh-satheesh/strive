import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WorkoutService } from '../services/workoutService';
import { auth } from '../services/firebase';
import type { Workout } from '../types';

export const CalendarView: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [workouts, setWorkouts] = useState<Record<string, Workout>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadWorkouts = async () => {
            if (!auth.currentUser) return;
            setLoading(true);
            const all = await WorkoutService.getAllWorkouts(auth.currentUser.uid);
            const mapped = all.reduce((acc, w) => ({ ...acc, [w.date]: w }), {});
            setWorkouts(mapped);
            setLoading(false);
        };
        loadWorkouts();
    }, []);

    const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

    const monthYear = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    const totalDays = daysInMonth(currentMonth);
    const startDay = firstDayOfMonth(currentMonth);

    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-3xl font-bold dark:text-gray-100">Calendar</h2>
                <p className="text-gray-500 dark:text-gray-400">Review your past activities and workouts.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border dark:border-gray-700">
                <div className="flex justify-between items-center mb-8">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <h3 className="text-xl font-bold dark:text-gray-200">{monthYear}</h3>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <ChevronRight size={24} />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, idx) => (
                        <div key={d} className={`text-xs font-bold uppercase tracking-widest ${idx === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                            {d}
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div></div>
                ) : (
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day, idx) => {
                            if (day === null) return <div key={`empty-${idx}`} className="aspect-square" />;

                            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const hasWorkout = workouts[dateStr];

                            return (
                                <div
                                    key={day}
                                    className={`aspect-square flex items-center justify-center rounded-lg text-sm transition-all relative cursor-pointer
                    ${hasWorkout ? 'bg-blue-600 text-white font-bold shadow-md hover:bg-blue-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300'}
                  `}
                                >
                                    {day}
                                    {hasWorkout && (
                                        <div className="absolute bottom-1 w-1 h-1 bg-white rounded-full"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                <span className="inline-block w-3 h-3 bg-blue-600 rounded-sm mr-2 align-middle"></span>
                Days with logged workouts
            </div>
        </div>
    );
};
