import React from 'react';
import { Home, Dumbbell, CalendarDays, BarChart3, User as UserIcon } from 'lucide-react';
import type { Page } from '../App';
import type { User } from 'firebase/auth';
import { motion } from 'framer-motion';

interface LayoutProps {
    children: React.ReactNode;
    activePage: Page;
    setActivePage: (page: Page) => void;
    user?: User | null;
}

export const Layout: React.FC<LayoutProps> = ({ children, activePage, setActivePage, user }) => {
    const navItems: { id: Page; label: string; icon: any }[] = [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'workout', label: 'Workout', icon: Dumbbell },
        { id: 'calendar', label: 'Calendar', icon: CalendarDays },
        { id: 'analytics', label: 'Performance', icon: BarChart3 },
        { id: 'profile', label: 'Profile', icon: UserIcon },
    ];

    // Format current date: e.g. "Mon, May 18"
    const formattedDate = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

    const userInitial = user?.displayName
        ? user.displayName[0].toUpperCase()
        : (user?.email?.[0].toUpperCase() || 'A');

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0B1220] text-gray-900 dark:text-gray-100 transition-colors duration-300">
            {/* Floating Top Navbar Wrapper */}
            <div className="sticky top-0 pt-4 pb-2 z-50 w-full max-w-5xl mx-auto px-4 sm:px-6">
                <header className="bg-white/70 dark:bg-[#1A2236]/80 backdrop-blur-xl border border-black/5 dark:border-cyan-500/15 rounded-3xl shadow-lg dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] dark:shadow-cyan-950/20 px-4 sm:px-6 h-16 flex justify-between items-center transition-all duration-300">
                    {/* Branding */}
                    <button
                        className="flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500/20 rounded-lg p-1 transition-all"
                        onClick={() => setActivePage('home')}
                        aria-label="Go to Home"
                    >
                        <img src="/strive-logo.png" alt="Strive Logo" className="h-8 w-8 object-contain" />
                        <h1 className="text-xl font-black bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
                            Strive
                        </h1>
                    </button>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1.5 h-full">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activePage === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActivePage(item.id)}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`relative flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 ${isActive
                                        ? 'text-cyan-500 dark:text-cyan-400 scale-105'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100/50 dark:hover:bg-white/5'
                                        }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeDesktopBackground"
                                            className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-indigo-500/5 dark:from-cyan-400/10 dark:to-indigo-500/10 border border-cyan-500/10 dark:border-cyan-400/20 rounded-xl shadow-[0_0_12px_rgba(34,211,238,0.08)] -z-10"
                                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                    <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Header Right Element */}
                    <div className="flex items-center gap-4">
                        {/* Current Date */}
                        <div className="hidden sm:flex flex-col text-right">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Today</span>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{formattedDate}</span>
                        </div>

                        {/* Athlete Profile Avatar */}
                        <button
                            onClick={() => setActivePage('profile')}
                            className="flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-cyan-500/20 rounded-xl p-0.5 transition-all"
                            aria-label="Go to Profile"
                        >
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#22D3EE] via-[#3B82F6] to-[#818cf8] flex items-center justify-center text-sm font-black text-white shadow-md shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer overflow-hidden border border-white/10">
                                {userInitial}
                            </div>
                        </button>
                    </div>
                </header>
            </div>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto p-3 sm:p-4 pb-28 md:pt-6 md:pb-12">
                {children}
            </main>

            {/* Mobile Bottom Tab Bar */}
            <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-50">
                <nav className="bg-white/75 dark:bg-[#1A2236]/80 backdrop-blur-xl border border-black/5 dark:border-cyan-500/15 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.3)] dark:shadow-cyan-950/40 px-2 py-2">
                    <div className="flex justify-around items-center relative">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activePage === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActivePage(item.id)}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-full transition-all duration-300 ${
                                        isActive
                                            ? 'text-cyan-500 dark:text-cyan-400 scale-105'
                                            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                                    }`}
                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                >
                                    {/* Active Tab Glowing Background */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeNavBackground"
                                            className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 dark:from-cyan-400/15 dark:to-indigo-500/15 border border-cyan-500/20 dark:border-cyan-400/25 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.15)] -z-10"
                                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                        />
                                    )}

                                    <motion.div
                                        whileTap={{ scale: 0.9 }}
                                        whileHover={{ scale: 1.05 }}
                                        className="flex flex-col items-center gap-0.5"
                                    >
                                        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                                            {item.label}
                                        </span>
                                    </motion.div>
                                </button>
                            );
                        })}
                    </div>
                </nav>
            </div>
        </div>
    );
};
