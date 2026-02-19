import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { ExerciseService } from '../services/exerciseService';
import type { Exercise } from '../types';
import { auth } from '../services/firebase';

interface ExerciseSelectorProps {
    onSelect: (exercise: Exercise) => void;
    onClose: () => void;
}

export const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({ onSelect, onClose }) => {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [filtered, setFiltered] = useState<Exercise[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!auth.currentUser) return;
            const all = await ExerciseService.getAllExercises(auth.currentUser.uid);
            setExercises(all);
            setFiltered(all);
            setLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        setFiltered(
            exercises.filter(ex =>
                ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ex.category.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [searchTerm, exercises]);

    return (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col border-t sm:border dark:border-zinc-800 overflow-hidden">
                <div className="p-6 border-b dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-black dark:text-gray-100 uppercase tracking-tight">Select Exercise</h3>
                        <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-cyan-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Find your next challenge..."
                            className="w-full pl-12 pr-4 py-4 border dark:border-zinc-700/50 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 dark:text-gray-100 font-bold placeholder:text-zinc-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="p-4 space-y-2 overflow-y-auto flex-grow no-scrollbar">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-500 shadow-lg shadow-cyan-500/20"></div>
                        </div>
                    ) : filtered.length > 0 ? (
                        filtered.map((ex) => (
                            <button
                                key={ex.id}
                                onClick={() => onSelect(ex)}
                                className="w-full text-left p-4 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all group border-2 border-transparent hover:border-cyan-500/20"
                            >
                                <p className="font-black dark:text-gray-100 group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{ex.name}</p>
                                <p className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-1">{ex.category}</p>
                            </button>
                        ))
                    ) : (
                        <div className="p-12 text-center">
                            <Search size={40} className="mx-auto mb-4 text-zinc-700" />
                            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No exercises matched</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
