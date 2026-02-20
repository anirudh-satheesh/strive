import React, { useState } from 'react';
import { UserService } from '../services/userService';
import { useNotification } from '../context/NotificationContext';
import { User } from 'lucide-react';

interface OnboardingModalProps {
    userId: string;
    email: string | null;
    onComplete: (name: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ userId, email, onComplete }) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const { showToast } = useNotification();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            await UserService.createUserProfile(userId, {
                displayName: name.trim(),
                email: email || ''
            });
            showToast('Profile created!', 'success');
            onComplete(name.trim());
        } catch (error) {
            console.error('Error creating profile:', error);
            showToast('Failed to save profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fade-in_0.3s]">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 w-full max-w-md p-8 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 to-blue-600" />
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg rotate-3">
                        <span className="text-3xl">👋</span>
                    </div>
                    <h2 className="text-2xl font-black dark:text-gray-100 tracking-tight mb-2">Welcome to Strive!</h2>
                    <p className="text-zinc-500 font-medium">Let's get to know you. What should we call you?</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-cyan-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Your Name"
                            className="w-full pl-12 pr-4 py-4 border border-zinc-200 dark:border-zinc-700 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 text-gray-900 dark:text-gray-100 font-bold placeholder:text-zinc-500 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                    >
                        {loading ? 'Saving...' : 'Get Started'}
                    </button>
                </form>
            </div>
        </div>
    );
};
