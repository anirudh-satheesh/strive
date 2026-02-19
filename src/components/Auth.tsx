import React, { useState } from 'react';
import { AuthService } from '../services/authService';

export const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            if (isLogin) {
                await AuthService.login(email, password);
            } else {
                await AuthService.signup(email, password);
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await AuthService.loginWithGoogle();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
                <div className="flex flex-col sm:flex-row justify-center items-center mb-6 gap-2 sm:gap-0">
                    <img src="/images/strive-logo.png" alt="Strive Logo" className="h-12 w-12 sm:h-16 sm:w-16 sm:mr-3" />
                    <h1 className="text-xl sm:text-3xl font-bold text-blue-600 text-center">Welcome to Strive</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <h2 className="text-xl font-semibold dark:text-gray-100">{isLogin ? 'Login' : 'Sign Up'}</h2>

                    {error && (
                        <div className="p-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <input
                        type="email"
                        placeholder="Email"
                        className="w-full p-3 border dark:border-gray-600 rounded-lg bg-transparent dark:text-gray-200"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full p-3 border dark:border-gray-600 rounded-lg bg-transparent dark:text-gray-200"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition">
                        {isLogin ? 'Login' : 'Sign Up'}
                    </button>
                </form>

                <div className="my-4 flex items-center">
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                    <span className="flex-shrink mx-4 text-gray-500 dark:text-gray-400 text-sm">OR</span>
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="w-full bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-3 rounded-lg font-semibold border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-center transition"
                >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
                        <path fill="#4285F4" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                        <path fill="#34A853" d="M43.611,20.083H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l5.657,5.657C40.074,36.336,44,30.659,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                        <path fill="#FBBC05" d="M10.21,28.641c-0.581-1.77-0.903-3.655-0.903-5.641s0.322-3.871,0.903-5.641l-5.657-5.657C2.353,15.56,1,19.63,1,24s1.353,8.44,3.65,11.951L10.21,28.641z"></path>
                        <path fill="#EA4335" d="M24,48c5.268,0,9.946-1.753,13.291-4.664l-5.657-5.657c-1.716,1.154-3.915,1.823-6.634,1.823c-5.223,0-9.659-3.35-11.303-7.951l-5.657,5.657C7.953,42.44,15.325,48,24,48z"></path>
                    </svg>
                    Sign in with Google
                </button>

                <p className="text-center text-gray-600 mt-4 text-sm">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                    <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 font-semibold hover:underline">
                        {isLogin ? 'Sign up' : 'Login'}
                    </button>
                </p>
            </div>
        </div>
    );
};
