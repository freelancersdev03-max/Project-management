import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

const WebsiteAccess = ({ onSuccess }) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!password) return;

        // Simulate loading and error state purely for UI demonstration
        setIsLoading(true);
        setError('');

        setTimeout(() => {
            setIsLoading(false);
            // Hardcoded password logic for now (no backend required)
            if (password === 'Kayaara@2026' || password === 'admin123') {
                if (onSuccess) onSuccess();
            } else {
                setError('Incorrect password. Please try again.');
            }
        }, 1200);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Decorative background gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-slate-50 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    duration: 0.5,
                    ease: [0.23, 1, 0.32, 1] // Custom ease-out cubic
                }}
                className="w-full max-w-[440px] bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 sm:p-10 relative z-10"
            >
                {/* Logo Placeholder */}
                <div className="flex justify-center mb-8">
                    <div className="h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                        <Lock className="text-white h-7 w-7" />
                    </div>
                </div>

                {/* Text Content */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 tracking-tight">
                        Website Protected
                    </h1>
                    <p className="text-slate-500 text-sm sm:text-base leading-relaxed px-2">
                        This website is currently restricted. Please enter the access password to continue.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-3">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                <Lock className="h-5 w-5" />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (error) setError('');
                                }}
                                className={`block w-full pl-11 pr-12 py-3.5 bg-slate-50/50 border ${error
                                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                                    : 'border-slate-200 hover:border-slate-300 focus:ring-indigo-600/20 focus:border-indigo-600'
                                    } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 text-base`}
                                placeholder="Enter access password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none focus:text-indigo-600 transition-colors"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        </div>

                        {/* Error Message Area */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: '0.75rem' }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-start gap-2 text-red-600 text-sm px-1 overflow-hidden"
                                >
                                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <button
                        type="submit"
                        disabled={!password || isLoading}
                        className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm sm:text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/20 disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin h-5 w-5 text-white/90" />
                        ) : (
                            "Continue"
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default WebsiteAccess;