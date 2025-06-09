import React from 'react';
import { cn } from '@/lib/utils';
import { colors } from '@/lib/colors';

interface ProgressRingProps {
  progress: number;
  size: number;
  color: string;
  className?: string;
}

export function ProgressRing({ progress, size, color, className }: ProgressRingProps) {
  const radius = (size - 8) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${(progress / 100) * circumference} ${circumference}`;

  return (
    <div className={className}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          fill="transparent"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          className="text-blue-600 transition-all duration-300"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}