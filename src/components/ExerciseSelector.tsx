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
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
                <div className="p-4 border-b dark:border-gray-700">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xl font-bold dark:text-gray-100">Select Exercise</h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg bg-transparent dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="p-2 space-y-1 overflow-y-auto flex-grow">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    ) : filtered.length > 0 ? (
                        filtered.map((ex) => (
                            <button
                                key={ex.id}
                                onClick={() => onSelect(ex)}
                                className="w-full text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                            >
                                <p className="font-semibold dark:text-gray-200 group-hover:text-blue-500">{ex.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest">{ex.category}</p>
                            </button>
                        ))
                    ) : (
                        <p className="p-4 text-center text-gray-500">No exercises found.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
