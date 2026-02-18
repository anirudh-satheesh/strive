import React, { useState } from 'react';
import { Menu, X, User } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    activePage: string;
    setActivePage: (page: string) => void;
    onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activePage, setActivePage, onLogout }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navItems = [
        { id: 'workout', label: 'Log Workout' },
        { id: 'exercises', label: 'Exercises' },
        { id: 'calendar', label: 'Calendar' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* Header */}
            <header className="bg-blue-600 text-white p-4 shadow-lg sticky top-0 z-50">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center">
                        <img src="/images/strive-logo.png" alt="Strive Logo" className="h-8 w-8 mr-3" />
                        <h1 className="text-2xl font-bold">Strive</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setActivePage('profile')}
                            className="hidden md:flex items-center gap-2 bg-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-white font-semibold"
                        >
                            <User size={18} />
                            Profile
                        </button>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="md:hidden p-2 rounded-md hover:bg-blue-700 transition"
                        >
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Desktop Nav */}
            <nav className="hidden md:block bg-white dark:bg-gray-800 shadow-md">
                <div className="max-w-4xl mx-auto flex">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActivePage(item.id)}
                            className={`flex-1 px-4 py-3 font-semibold transition border-b-2 ${activePage === item.id
                                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                                    : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700/50'
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden bg-white dark:bg-gray-800 shadow-lg border-b dark:border-gray-700">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActivePage(item.id);
                                setIsMenuOpen(false);
                            }}
                            className="block w-full text-left py-3 px-4 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            {item.label}
                        </button>
                    ))}
                    <button
                        onClick={() => {
                            setActivePage('profile');
                            setIsMenuOpen(false);
                        }}
                        className="block w-full text-left py-3 px-4 bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                    >
                        Profile
                    </button>
                </div>
            )}

            {/* Main Content */}
            <main className="max-w-4xl mx-auto p-4 pb-20">
                {children}
            </main>
        </div>
    );
};
