import React from 'react';
import { motion } from 'framer-motion';

interface BrandedLoaderProps {
    text?: string;
}

/**
 * Strive premium Black & Gold branded loader.
 *
 * This loader is used ONLY by the authentication experience and the
 * app startup splash. It uses the dedicated brand tokens from index.css
 * and does NOT affect the cyan product loaders used across the rest of
 * the app.
 */
export const BrandedLoader: React.FC<BrandedLoaderProps> = ({
    text = 'Loading',
}) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#0A0A0A] relative overflow-hidden">
            {/* Subtle radial gold spotlight */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-[radial-gradient(circle,rgba(200,167,90,0.10),transparent_65%)] pointer-events-none" />

            <div className="relative">
                {/* Soft gold glow behind spinner */}
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(200,167,90,0.22),transparent_70%)] blur-md" />

                <motion.div
                    className="relative h-16 w-16 rounded-full"
                    style={{
                        border: '3px solid rgba(200,167,90,0.15)',
                        borderTopColor: '#D4AF37',
                        borderRightColor: '#C8A75A',
                        boxShadow: '0 0 24px rgba(200,167,90,0.18)',
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                />

                {/* Metallic gold core */}
                <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <div className="h-3 w-3 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#A8862E] shadow-[0_0_10px_rgba(212,175,55,0.6)]" />
                </motion.div>
            </div>

            <motion.p
                className="uppercase tracking-[0.3em] text-[11px] font-black text-zinc-400"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
                {text}…
            </motion.p>
        </div>
    );
};
