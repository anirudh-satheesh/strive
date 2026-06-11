import React, { useState } from 'react';
import { AuthService } from '../services/authService';
import { Mail, Lock, ArrowRight } from 'lucide-react';

export const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            if (isLogin) {
                await AuthService.login(email, password);
            } else {
                await AuthService.signup(email, password);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        if (loading) return;
        setLoading(true);
        try {
            await AuthService.loginWithGoogle();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />

            <div className="bg-zinc-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-zinc-800 p-8 w-full max-w-md relative z-10">
                <div className="flex flex-col items-center mb-10">
                    <div className="relative mb-2 group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                        <img src="/strive-logo-full.png" alt="Strive Logo" className="relative h-36 w-36 object-contain" />
                    </div>
                    <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs mt-1">
                        {isLogin ? 'Welcome Back' : 'Join the Elite'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-500 transition-colors" size={20} />
                            <input
                                type="email"
                                placeholder="Email address"
                                className="w-full pl-12 pr-4 py-4 border border-zinc-800 rounded-2xl bg-zinc-950/50 text-gray-100 font-medium placeholder:text-zinc-600 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-500 transition-colors" size={20} />
                            <input
                                type="password"
                                placeholder="Password"
                                className="w-full pl-12 pr-4 py-4 border border-zinc-800 rounded-2xl bg-zinc-950/50 text-gray-100 font-medium placeholder:text-zinc-600 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                {isLogin ? 'Sign In' : 'Create Account'}
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="my-8 relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-800"></div>
                    </div>
                    <span className="relative z-10 bg-zinc-900 px-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Or continue with</span>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white p-4 rounded-2xl font-bold border border-zinc-700 hover:border-zinc-600 transition-all flex items-center justify-center gap-3 group"
                >
                    <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 48 48">
                        <path fill="#4285F4" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                        <path fill="#34A853" d="M43.611,20.083H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l5.657,5.657C40.074,36.336,44,30.659,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                        <path fill="#FBBC05" d="M10.21,28.641c-0.581-1.77-0.903-3.655-0.903-5.641s0.322-3.871,0.903-5.641l-5.657-5.657C2.353,15.56,1,19.63,1,24s1.353,8.44,3.65,11.951L10.21,28.641z"></path>
                        <path fill="#EA4335" d="M24,48c5.268,0,9.946-1.753,13.291-4.664l-5.657-5.657c-1.716,1.154-3.915,1.823-6.634,1.823c-5.223,0-9.659-3.35-11.303-7.951l-5.657,5.657C7.953,42.44,15.325,48,24,48z"></path>
                    </svg>
                    Google
                </button>

                <p className="text-center text-zinc-500 mt-8 text-sm font-medium">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-cyan-500 font-bold hover:text-cyan-400 transition-colors ml-1 uppercase tracking-wider text-xs"
                    >
                        {isLogin ? 'Sign up' : 'Sign In'}
                    </button>
                </p>
            </div>
        </div>
    );
};
