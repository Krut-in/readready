"use client";

import { motion } from "framer-motion";

interface ProgressArcProps {
  /** Progress value 0–100 */
  percent: number;
  /** Overall SVG size in px (default 96) */
  size?: number;
  /** Ring stroke thickness in px (default 8) */
  strokeWidth?: number;
  /** Foreground arc colour — any valid CSS colour (default: currentColor) */
  color?: string;
  /** Background track colour (default: subtle muted) */
  trackColor?: string;
  /** Optional label rendered below the arc */
  label?: string;
  /** Show percentage number in the arc centre (default true) */
  showPercent?: boolean;
  /** Animate arc on mount (default true) */
  animate?: boolean;
}

/**
 * SVG circular progress arc.
 * Fills clockwise from 12 o'clock.
 * Uses Framer Motion for a smooth draw-in animation.
 */
export function ProgressArc({
  percent,
  size = 96,
  strokeWidth = 8,
  color = "currentColor",
  trackColor,
  label,
  showPercent = true,
  animate = true,
}: ProgressArcProps) {
  const clamped      = Math.min(100, Math.max(0, Math.round(percent)));
  const radius       = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset   = circumference - (clamped / 100) * circumference;
  const cx           = size / 2;
  const cy           = size / 2;
  const track        = trackColor ?? "currentColor";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        role="img"
        aria-label={`${clamped}% complete`}
      >
        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={track}
          strokeWidth={strokeWidth}
          strokeOpacity={0.15}
        />

        {/* Progress arc — origin at 12 o'clock, drawn clockwise */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          transform={`rotate(-90 ${cx} ${cy})`}
          initial={animate ? { strokeDashoffset: circumference } : false}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.05 }}
        />

        {/* Percentage label in the centre */}
        {showPercent && (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={Math.round(size * 0.18)}
            fontWeight={600}
            fill="currentColor"
            className="font-semibold"
          >
            {clamped}%
          </text>
        )}
      </svg>

      {label && (
        <p
          className="max-w-[84px] truncate text-center text-[10px] leading-tight text-muted-foreground"
          title={label}
        >
          {label}
        </p>
      )}
    </div>
  );
}
