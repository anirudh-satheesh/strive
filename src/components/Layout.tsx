import React from 'react';
import { User, Dumbbell, BookOpen, CalendarDays } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    activePage: string;
    setActivePage: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activePage, setActivePage }) => {
    const navItems = [
        { id: 'workout', label: 'Log Workout', icon: Dumbbell },
        { id: 'exercises', label: 'Exercises', icon: BookOpen },
        { id: 'calendar', label: 'Calendar', icon: CalendarDays },
        { id: 'profile', label: 'Profile', icon: User },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* Unified Top Navbar (Desktop) / Minimal Header (Mobile) */}
            <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
                    {/* Branding */}
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActivePage('workout')}>
                        <div className="h-9 w-9 bg-gradient-to-br from-cyan-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                            <img src="/images/strive-logo.png" alt="Strive Logo" className="h-6 w-6 brightness-0 invert" />
                        </div>
                        <h1 className="text-xl font-black bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
                            Strive
                        </h1>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1 h-full">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activePage === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActivePage(item.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all duration-300 ${isActive
                                        ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-lg shadow-cyan-500/20 scale-105'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-800'
                                        }`}
                                >
                                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto p-3 sm:p-4 pb-24 md:pt-10 md:pb-12">
                {children}
            </main>

            {/* Mobile Bottom Tab Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-lg border-t dark:border-zinc-800 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-50">
                <div className="flex justify-around items-center h-16">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activePage === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActivePage(item.id)}
                                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${isActive
                                        ? 'text-cyan-500 dark:text-cyan-400 scale-110'
                                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'
                                    }`}
                            >
                                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                                    {item.label.split(' ').pop()}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};
