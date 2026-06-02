import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Achievement } from '../services/userService';
import { Trophy, Flame, Medal, Sparkles, Clock, Star, X } from 'lucide-react';

interface AchievementContextType {
    triggerAchievement: (achievement: Achievement) => void;
}

const AchievementContext = createContext<AchievementContextType | undefined>(undefined);

export const useAchievement = () => {
    const context = useContext(AchievementContext);
    if (!context) throw new Error('useAchievement must be used within AchievementProvider');
    return context;
};

const IconMap: Record<string, React.FC<any>> = {
    Trophy, Flame, Medal, Sparkles, Clock, Star
};

export const AchievementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [queue, setQueue] = useState<Achievement[]>([]);

    const triggerAchievement = (achievement: Achievement) => {
        setQueue(prev => [...prev, achievement]);
        // Auto remove after 5 seconds
        setTimeout(() => {
            setQueue(prev => prev.filter(a => a.id !== achievement.id));
        }, 5000);
    };

    const removeAchievement = (id: string) => {
        setQueue(prev => prev.filter(a => a.id !== id));
    };

    return (
        <AchievementContext.Provider value={{ triggerAchievement }}>
            {children}
            
            <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {queue.map(ach => {
                        const Icon = IconMap[ach.icon] || Trophy;
                        return (
                            <motion.div
                                key={ach.id}
                                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9, x: 50 }}
                                className="pointer-events-auto overflow-hidden relative group"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-yellow-500/5 backdrop-blur-xl border border-amber-500/30 rounded-2xl"></div>
                                <div className="absolute inset-0 bg-black/60 rounded-2xl z-0"></div>
                                
                                <div className="relative z-10 flex items-center p-4 pr-10 min-w-[300px] shadow-2xl shadow-amber-500/10">
                                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30 mr-4 relative">
                                        <div className="absolute inset-0 bg-white/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <Icon size={24} className="text-white relative z-10" />
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="text-[10px] uppercase font-black tracking-widest text-amber-500 mb-0.5">Achievement Unlocked</p>
                                        <p className="text-sm font-black text-white leading-tight">{ach.title}</p>
                                        <p className="text-xs text-zinc-400 mt-1">{ach.description}</p>
                                    </div>
                                    <button 
                                        onClick={() => removeAchievement(ach.id)}
                                        className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </AchievementContext.Provider>
    );
};
