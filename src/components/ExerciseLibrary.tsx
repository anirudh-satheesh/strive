import React, { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { ExerciseService } from '../services/exerciseService';
import type { Exercise } from '../types';
import { auth } from '../services/firebase';

export const ExerciseLibrary: React.FC = () => {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const categories = [
        'Abs', 'Back', 'Biceps', 'Cardio', 'Chest',
        'Flexibility', 'Lats', 'Legs', 'Shoulders',
        'Strength', 'Traps', 'Triceps'
    ];

    useEffect(() => {
        const loadExercises = async () => {
            if (!auth.currentUser) return;
            setLoading(true);
            const all = await ExerciseService.getAllExercises(auth.currentUser.uid);
            setExercises(all);
            setFilteredExercises(all);
            setLoading(false);
        };
        loadExercises();
    }, []);

    useEffect(() => {
        let result = exercises;
        if (searchTerm) {
            result = result.filter(ex =>
                ex.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (activeCategory) {
            result = result.filter(ex => ex.category === activeCategory);
        }
        setFilteredExercises(result);
    }, [searchTerm, activeCategory, exercises]);

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-3xl font-bold dark:text-gray-100">Exercise Library</h2>
                <p className="text-gray-500 dark:text-gray-400">Browse, search, and manage your exercises.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 md:p-6 mb-6">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Search exercises by name..."
                        className="w-full pl-10 pr-4 py-3 border dark:border-gray-600 rounded-lg bg-transparent dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-nowrap gap-2 mt-4 overflow-x-auto no-scrollbar pb-2">
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors whitespace-nowrap ${activeCategory === null
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        All
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors whitespace-nowrap ${activeCategory === cat
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredExercises.length > 0 ? (
                        filteredExercises.map((ex) => (
                            <div key={ex.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-transparent hover:border-blue-500/30 transition-all flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-lg dark:text-gray-200">{ex.name}</h4>
                                        {ex.isCustom && (
                                            <span title="Custom Exercise" className="text-blue-500">
                                                <Filter size={16} fill="currentColor" />
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{ex.category}</p>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-4 border-t dark:border-gray-700 pt-2">
                                    Tracks: {ex.fields.join(', ')}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-16 border-2 border-dashed dark:border-gray-700 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No Exercises Found</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your search or filter.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
