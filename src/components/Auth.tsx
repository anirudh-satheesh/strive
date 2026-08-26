import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

    const container = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08, delayChildren: 0.1 },
        },
    };

    const item = {
        hidden: { opacity: 0, y: 18 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] as const },
        },
    };

    return (
        <div className="h-screen min-h-0 flex items-center justify-center p-3 sm:p-4 bg-[#0A0A0A] relative overflow-hidden">
            {/* Background: soft charcoal gradient + subtle radial gold spotlight behind logo */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111111] to-[#0A0A0A]" />
            <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[70%] h-[50%] rounded-full bg-[radial-gradient(ellipse,rgba(200,167,90,0.08),transparent_60%)] blur-[80px]" />
            <div className="absolute bottom-[-15%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[radial-gradient(circle,rgba(200,167,90,0.05),transparent_60%)] blur-[100px]" />
            {/* Fine grain / vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />

            <motion.div
                initial="hidden"
                animate="visible"
                variants={container}
                className="bg-[#151515]/90 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-[#1C1C1C] p-5 sm:p-8 w-full max-w-md max-h-full overflow-hidden relative z-10"
            >
                {/* Logo Section — brand focal point */}
                <motion.div variants={item} className="flex flex-col items-center mb-4 sm:mb-10">
                    <div className="relative mb-1 sm:mb-2 group">
                        {/* Subtle radial spotlight behind logo */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(200,167,90,0.18),transparent_70%)] rounded-full blur-xl opacity-60 group-hover:opacity-90 transition-opacity duration-500" />
                        <motion.img
                            src="/Logo/strive-512.png"
                            alt="Strive Logo"
                            className="relative h-20 w-20 min-[500px]:h-28 min-[500px]:w-28 sm:h-36 sm:w-36 object-contain drop-shadow-[0_0_20px_rgba(200,167,90,0.15)]"
                            whileHover={{ scale: 1.04 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        />
                    </div>
                    <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs mt-1">
                        {isLogin ? 'Welcome Back' : 'Join the Elite'}
                    </p>
                </motion.div>

                <motion.form onSubmit={handleSubmit} className="space-y-3 sm:space-y-5" variants={item}>
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="p-3 sm:p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium flex items-center gap-2 overflow-hidden"
                            >
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="space-y-2 sm:space-y-4">
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#C8A75A] transition-colors" size={20} />
                            <input
                                type="email"
                                placeholder="Email address"
                                className="w-full pl-12 pr-4 py-3 sm:py-4 border border-[#1C1C1C] rounded-2xl bg-[#111111]/80 text-gray-100 font-medium placeholder:text-zinc-600 focus:border-[#C8A75A]/60 focus:ring-4 focus:ring-[#C8A75A]/10 outline-none transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#C8A75A] transition-colors" size={20} />
                            <input
                                type="password"
                                placeholder="Password"
                                className="w-full pl-12 pr-4 py-3 sm:py-4 border border-[#1C1C1C] rounded-2xl bg-[#111111]/80 text-gray-100 font-medium placeholder:text-zinc-600 focus:border-[#C8A75A]/60 focus:ring-4 focus:ring-[#C8A75A]/10 outline-none transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Primary gold-gradient button with soft elevation & press animation */}
                    <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full bg-gradient-to-r from-[#C8A75A] via-[#D4AF37] to-[#A8862E] text-[#0A0A0A] p-3 sm:p-4 rounded-2xl font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(200,167,90,0.18),0_2px_8px_rgba(0,0,0,0.4)] transition-shadow hover:shadow-[0_14px_36px_rgba(200,167,90,0.28),0_2px_10px_rgba(0,0,0,0.5)] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-[#0A0A0A]/30 border-t-[#0A0A0A] rounded-full animate-spin" />
                        ) : (
                            <>
                                {isLogin ? 'Sign In' : 'Create Account'}
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </motion.button>
                </motion.form>

                <motion.div variants={item} className="my-4 sm:my-8 relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#1C1C1C]"></div>
                    </div>
                    <span className="relative z-10 bg-[#151515] px-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                        Or continue with
                    </span>
                </motion.div>

                <motion.button
                    variants={item}
                    onClick={handleGoogleLogin}
                    whileTap={{ scale: 0.97 }}
                    className="w-full bg-[#1C1C1C] hover:bg-[#242424] text-white p-3 sm:p-4 rounded-2xl font-bold border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all flex items-center justify-center gap-3 group"
                >
                    <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 48 48">
                        <path fill="#4285F4" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                        <path fill="#34A853" d="M43.611,20.083H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l5.657,5.657C40.074,36.336,44,30.659,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                        <path fill="#FBBC05" d="M10.21,28.641c-0.581-1.77-0.903-3.655-0.903-5.641s0.322-3.871,0.903-5.641l-5.657-5.657C2.353,15.56,1,19.63,1,24s1.353,8.44,3.65,11.951L10.21,28.641z"></path>
                        <path fill="#EA4335" d="M24,48c5.268,0,9.946-1.753,13.291-4.664l-5.657-5.657c-1.716,1.154-3.915,1.823-6.634,1.823c-5.223,0-9.659-3.35-11.303-7.951l-5.657,5.657C7.953,42.44,15.325,48,24,48z"></path>
                    </svg>
                    Google
                </motion.button>

                <motion.p variants={item} className="text-center text-zinc-500 mt-4 sm:mt-8 text-sm font-medium">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-[#C8A75A] font-bold hover:text-[#D4AF37] transition-colors ml-1 uppercase tracking-wider text-xs"
                    >
                        {isLogin ? 'Sign up' : 'Sign In'}
                    </button>
                </motion.p>
            </motion.div>
        </div>
    );
};
