import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import { ExerciseService } from '../services/exerciseService';
import { EXERCISE_CATEGORIES } from '../data/exercises';
import type { Exercise } from '../types';
import { auth } from '../services/firebase';

export const ExerciseLibrary: React.FC = () => {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const categories = useMemo(() => {
        const uniqueCategories = new Set<string>();
        exercises.forEach(ex => {
            // Try to match with a standard category case-insensitively
            const standardMatch = EXERCISE_CATEGORIES.find(
                cat => cat.toLowerCase() === ex.category.trim().toLowerCase()
            );
            uniqueCategories.add(standardMatch || ex.category);
        });
        return Array.from(uniqueCategories).sort();
    }, [exercises]);

    useEffect(() => {
        const loadExercises = async () => {
            if (!auth.currentUser) {
                setLoading(false);
                return;
            }
            try {
                const all = await ExerciseService.getAllExercises(auth.currentUser.uid);
                setExercises(all);
                setFilteredExercises(all);
            } catch (error) {
                console.error('Error loading exercises:', error);
            } finally {
                setLoading(false);
            }
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
            result = result.filter(ex => ex.category.toLowerCase() === activeCategory.toLowerCase());
        }
        setFilteredExercises(result);
    }, [searchTerm, activeCategory, exercises]);

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold dark:text-gray-100">Exercise Library</h2>
                <p className="text-gray-500 dark:text-gray-400">Browse, search, and manage your exercises.</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl p-4 sm:p-6 mb-8 border dark:border-zinc-800">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-cyan-500 transition-colors" size={24} />
                    <input
                        type="text"
                        placeholder="Search exercises by name..."
                        className="w-full pl-12 pr-4 py-4 border dark:border-zinc-700/50 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 dark:text-gray-100 font-bold placeholder:text-zinc-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-nowrap gap-2 mt-6 overflow-x-auto no-scrollbar pb-2">
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap border-2 ${activeCategory === null
                            ? 'bg-cyan-500 border-cyan-500 text-zinc-950 shadow-lg shadow-cyan-500/20 active:scale-95'
                            : 'bg-zinc-50 dark:bg-zinc-800/50 border-transparent text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                    >
                        All
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap border-2 ${activeCategory === cat
                                ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95'
                                : 'bg-zinc-50 dark:bg-zinc-800/50 border-transparent text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 shadow-lg shadow-cyan-500/20"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredExercises.length > 0 ? (
                        filteredExercises.map((ex) => (
                            <div key={ex.id} className="bg-white dark:bg-zinc-900 px-6 py-6 rounded-3xl shadow-xl border dark:border-zinc-800 hover:border-cyan-500/30 transition-all duration-300 flex flex-col justify-between group">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-black text-lg dark:text-gray-100 group-hover:text-cyan-400 transition-colors leading-tight uppercase tracking-tight">{ex.name}</h4>
                                        {ex.isCustom && (
                                            <span title="Custom Exercise" className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg">
                                                <Filter size={14} fill="currentColor" />
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-cyan-500">{ex.category}</p>
                                </div>
                                <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mt-6 border-t dark:border-zinc-800 pt-3 uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full" />
                                    {ex.fields.join(' • ')}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-24 text-center bg-zinc-50 dark:bg-zinc-900 rounded-3xl border-2 border-dashed dark:border-zinc-800">
                            <Search size={48} className="mx-auto mb-4 text-zinc-700" />
                            <h3 className="text-xl font-black text-zinc-950 dark:text-gray-100 uppercase tracking-tight">No Results</h3>
                            <p className="mt-2 text-zinc-500 font-bold">Try adjusting your workout search filters.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
