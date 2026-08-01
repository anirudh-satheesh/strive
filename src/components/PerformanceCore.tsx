import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface PerformanceCoreProps {
    data: number[];
    labels: string[];
    selectedIndex: number;
    onSelect: (index: number) => void;
    overallScore: number;
}

export const PerformanceCore: React.FC<PerformanceCoreProps> = ({
    data,
    labels,
    selectedIndex,
    onSelect,
    overallScore,
}) => {
    const size = 320;
    const center = size / 2;
    const maxRadius = 110;
    const minRadius = 25; 

    // Ambient breathing animation state
    const [breathScale, setBreathScale] = useState(1);

    useEffect(() => {
        const interval = setInterval(() => {
            setBreathScale(prev => (prev === 1 ? 1.03 : 1));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const points = data.map((score, i) => {
        const angle = (i * 60 - 90) * (Math.PI / 180);
        const radius = minRadius + (score / 100) * (maxRadius - minRadius);
        return {
            x: center + radius * Math.cos(angle),
            y: center + radius * Math.sin(angle),
            score,
            label: labels[i],
            angle,
            radius,
            baseX: Math.cos(angle),
            baseY: Math.sin(angle)
        };
    });

    const createPath = (scale: number = 1, radiusMultiplier: number = 1) => {
        return points.map((p, i) => {
            const r = p.radius * radiusMultiplier * scale;
            const px = center + r * p.baseX;
            const py = center + r * p.baseY;
            return (i === 0 ? `M ${px} ${py}` : `L ${px} ${py}`);
        }).join(' ') + ' Z';
    };

    const mainPath = createPath(1, 1);
    const innerPath = createPath(1, 0.6);

    const glowOpacity = 0.15 + (overallScore / 100) * 0.5;
    const glowBlur = 15 + (overallScore / 100) * 25;

    return (
        <div className="relative w-full h-full flex items-center justify-center min-h-[300px]">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full max-w-[400px] overflow-visible">
                <defs>
                    <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation={glowBlur} result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <radialGradient id="core-gradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.05" />
                    </radialGradient>
                </defs>

                {/* Web/Grid */}
                {[0.33, 0.66, 1].map((scale, i) => (
                    <polygon
                        key={`grid-${i}`}
                        points={points.map(p => {
                            const r = minRadius + scale * (maxRadius - minRadius);
                            return `${center + r * p.baseX},${center + r * p.baseY}`;
                        }).join(' ')}
                        fill="none"
                        stroke="rgba(255,255,255,0.03)"
                        strokeWidth="1"
                    />
                ))}

                {/* Axes */}
                {points.map((p, i) => {
                    const isSelected = selectedIndex === i;
                    const mx = center + maxRadius * p.baseX;
                    const my = center + maxRadius * p.baseY;
                    return (
                        <line
                            key={`axis-${i}`}
                            x1={center}
                            y1={center}
                            x2={mx}
                            y2={my}
                            stroke={isSelected ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.06)'}
                            strokeWidth={isSelected ? 1.5 : 1}
                            strokeDasharray={isSelected ? "none" : "2 4"}
                            className="transition-colors duration-500"
                        />
                    );
                })}

                {/* Outer Glow Hexagon */}
                <motion.path
                    d={mainPath}
                    fill="none"
                    stroke="#22D3EE"
                    strokeWidth="8"
                    opacity={glowOpacity * 0.5}
                    filter="url(#neon-glow)"
                    animate={{ d: createPath(breathScale, 1) }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                />

                {/* Main Core Shape */}
                <motion.path
                    animate={{ d: mainPath }}
                    transition={{ type: "spring", stiffness: 45, damping: 15 }}
                    fill="url(#core-gradient)"
                    stroke="#22D3EE"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    className="drop-shadow-lg"
                />

                {/* Inner Core Pulse */}
                <motion.path
                    animate={{ d: innerPath }}
                    transition={{ type: "spring", stiffness: 45, damping: 15 }}
                    fill="rgba(255,255,255,0.1)"
                    stroke="rgba(34,211,238,0.4)"
                    strokeWidth="1"
                    strokeLinejoin="round"
                />

                {/* Center origin */}
                <circle cx={center} cy={center} r="2" fill="#22D3EE" opacity="0.8" />

                {/* Nodes & Labels */}
                {points.map((p, i) => {
                    const isSelected = selectedIndex === i;
                    const labelOffset = maxRadius + 32;
                    const lx = center + labelOffset * p.baseX;
                    const ly = center + labelOffset * p.baseY;

                    return (
                        <g
                            key={`node-${i}`}
                            className="cursor-pointer group"
                            onClick={() => onSelect(i)}
                            tabIndex={0}
                            role="button"
                            aria-label={`${p.label} pillar, score ${p.score}`}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onSelect(i);
                                }
                            }}
                        >
                            {/* Hit area */}
                            <circle cx={center + maxRadius * p.baseX} cy={center + maxRadius * p.baseY} r="35" fill="transparent" />

                            {/* Node Point */}
                            <motion.circle
                                animate={{ cx: p.x, cy: p.y, r: isSelected ? 5 : 3.5 }}
                                transition={{ type: "spring", stiffness: 60, damping: 10 }}
                                fill={isSelected ? "#fff" : "#0B1220"}
                                stroke="#22D3EE"
                                strokeWidth={isSelected ? 3 : 2}
                                className="drop-shadow-md"
                            />

                            {/* Label */}
                            <text
                                x={lx}
                                y={ly}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className={`text-[9px] sm:text-[10px] uppercase tracking-[0.2em] transition-all duration-300 font-bold ${
                                    isSelected ? 'fill-white' : 'fill-zinc-500 group-hover:fill-zinc-300'
                                }`}
                                style={{
                                    fontFamily: 'Outfit, sans-serif',
                                    textShadow: isSelected ? '0 0 10px rgba(34,211,238,0.5)' : 'none'
                                }}
                            >
                                {p.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};
