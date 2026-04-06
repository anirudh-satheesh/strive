import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export type CardColor = 
    | 'yellow' 
    | 'green' 
    | 'blue' 
    | 'gold' 
    | 'silver' 
    | 'bronze' 
    | 'indigo' 
    | 'cyan' 
    | 'purple' 
    | 'red'
    | 'emerald';

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    title: string;
    value: string | number;
    subtitle?: string;
    colorTheme?: CardColor;
    delay?: number;
    onClick?: () => void;
}

const colorStyles: Record<CardColor, { bg: string, text: string, border: string, accent: string, glow: string }> = {
    yellow: { bg: 'from-[#FACC15]/20 to-[#F59E0B]/5', text: 'text-[#FACC15]', border: 'border-[#FACC15]/20', accent: 'bg-[#FACC15]', glow: 'shadow-[#FACC15]/20' },
    green: { bg: 'from-[#22C55E]/20 to-[#4ADE80]/5', text: 'text-[#4ADE80]', border: 'border-[#22C55E]/20', accent: 'bg-[#22C55E]', glow: 'shadow-[#22C55E]/20' },
    emerald: { bg: 'from-[#22C55E]/20 to-[#4ADE80]/5', text: 'text-[#4ADE80]', border: 'border-[#22C55E]/20', accent: 'bg-[#22C55E]', glow: 'shadow-[#22C55E]/20' },
    blue: { bg: 'from-[#3B82F6]/20 to-[#60A5FA]/5', text: 'text-[#60A5FA]', border: 'border-[#3B82F6]/20', accent: 'bg-[#3B82F6]', glow: 'shadow-[#3B82F6]/20' },
    gold: { bg: 'from-[#FACC15]/20 to-[#F59E0B]/5', text: 'text-[#FACC15]', border: 'border-[#FACC15]/20', accent: 'bg-[#FACC15]', glow: 'shadow-[#FACC15]/20' },
    silver: { bg: 'from-[#9CA3AF]/20 to-[#D1D5DB]/5', text: 'text-[#D1D5DB]', border: 'border-[#9CA3AF]/20', accent: 'bg-[#9CA3AF]', glow: 'shadow-[#9CA3AF]/20' },
    bronze: { bg: 'from-[#F97316]/20 to-[#FB923C]/5', text: 'text-[#FB923C]', border: 'border-[#F97316]/20', accent: 'bg-[#F97316]', glow: 'shadow-[#F97316]/20' },
    indigo: { bg: 'from-[#22D3EE]/20 to-[#22D3EE]/5', text: 'text-[#22D3EE]', border: 'border-[#22D3EE]/20', accent: 'bg-[#22D3EE]', glow: 'shadow-[#22D3EE]/20' },
    cyan: { bg: 'from-[#22D3EE]/20 to-[#22D3EE]/5', text: 'text-[#22D3EE]', border: 'border-[#22D3EE]/20', accent: 'bg-[#22D3EE]', glow: 'shadow-[#22D3EE]/20' },
    purple: { bg: 'from-[#818cf8]/20 to-[#818cf8]/5', text: 'text-[#818cf8]', border: 'border-[#818cf8]/20', accent: 'bg-[#818cf8]', glow: 'shadow-[#818cf8]/20' },
    red: { bg: 'from-[#F97316]/20 to-[#F97316]/5', text: 'text-[#F97316]', border: 'border-[#F97316]/20', accent: 'bg-[#F97316]', glow: 'shadow-[#F97316]/20' }
};

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { 
            duration: 0.6
        } 
    }
};

export const StatCard: React.FC<StatCardProps> = ({
    icon,
    label,
    title,
    value,
    subtitle,
    colorTheme = 'indigo',
    delay = 0,
    onClick
}) => {
    const theme = colorStyles[colorTheme];

    // Number animation logic
    const [displayValue, setDisplayValue] = useState<number | string>(
        typeof value === 'number' ? 0 : value
    );

    useEffect(() => {
        if (typeof value === 'number') {
            let startTimestamp: number | null = null;
            const duration = 1500; // Slightly slower, more premium count
            const finalValue = value;

            const step = (timestamp: number) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                
                setDisplayValue(Math.round(ease * finalValue));
                
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    setDisplayValue(finalValue);
                }
            };
            window.requestAnimationFrame(step);
        } else {
            setDisplayValue(value);
        }
    }, [value]);

    return (
        <motion.div
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay }}
            whileHover={{ 
                y: -6,
                scale: 1.02, 
                transition: { duration: 0.3, ease: "easeOut" }
            }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`
                relative flex flex-row items-center gap-5 p-5 sm:p-6 rounded-[24px] 
                bg-[#1A2236] border border-white/5 overflow-hidden group
                shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]
                hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)]
                ${onClick ? 'cursor-pointer' : ''}
            `}
        >
            {/* Top-edge highlight (Glass Effect) */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            {/* Left Accent Strip */}
            <div className={`absolute left-0 top-6 bottom-6 w-[3px] rounded-r-full ${theme.accent} ${theme.glow} shadow-lg opacity-80 group-hover:opacity-100 transition-opacity`} />

            {/* Radial Highlight behind icon */}
            <div 
                className="absolute -left-10 -top-10 w-40 h-40 opacity-10 group-hover:opacity-20 transition-opacity blur-3xl pointer-events-none"
                style={{ background: `radial-gradient(circle, ${theme.accent.replace('bg-', '')} 0%, transparent 70%)` }}
            />

            {/* Left Icon: Larger, more presence */}
            <motion.div 
                className={`
                    relative flex-shrink-0 w-[56px] h-[56px] rounded-[18px] flex items-center justify-center 
                    bg-gradient-to-br ${theme.bg} border ${theme.border} 
                    shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]
                    group-hover:scale-110 transition-transform duration-500
                `}
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 200 }}
            >
                <div className={`${theme.text} drop-shadow-[0_0_8px_rgba(var(--theme-rgb),0.5)]`}>
                    {icon}
                </div>
                {/* Subtle glow behind icon */}
                <div className={`absolute inset-0 rounded-[18px] ${theme.glow} opacity-30 group-hover:opacity-50 blur-md transition-opacity`} />
            </motion.div>

            {/* Right Content */}
            <div className="flex flex-col min-w-0 z-10">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-0.5">{label}</p>
                <h4 className="text-xs sm:text-sm font-bold text-white/60 truncate tracking-wide mb-1 group-hover:text-white/80 transition-colors">{title}</h4>
                <div className="flex items-baseline gap-1.5">
                    <p className="text-3xl font-black text-white tracking-tight drop-shadow-md">
                        {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
                    </p>
                    {subtitle && (
                        <span className="text-xs font-black text-white/40 uppercase tracking-widest ml-0.5 self-end mb-1">
                            {subtitle}
                        </span>
                    )}
                </div>
            </div>

            {/* Subtle inner grid/divider pattern (micro detail) */}
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-gradient-to-tl from-white/5 to-transparent rounded-tl-[40px] pointer-events-none opacity-20" />
        </motion.div>
    );
};
