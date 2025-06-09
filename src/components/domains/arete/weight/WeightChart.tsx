// src/components/domains/arete/weight/WeightChart.tsx
'use client';

import { ApiWeightEntry } from '@/types/api/userResponses';

interface WeightChartProps {
  data: {
    history: import('@/types/api/userResponses').ApiWeightEntry[];
    trends?: any;
    unit: 'kg' | 'lbs';
  } | null;
}

export default function WeightChart({ data }: WeightChartProps) {
  if (!data || data.history.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No weight data to display</p>
      </div>
    );
  }

  // Sort by date and take recent entries for chart
  const sortedHistory = [...data.history]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-20); // Last 20 entries

  if (sortedHistory.length < 2) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Need at least 2 entries to show trends</p>
      </div>
    );
  }

  // Calculate chart dimensions and scaling
  const weights = sortedHistory.map(entry => entry.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const weightRange = maxWeight - minWeight;
  const padding = weightRange * 0.1; // 10% padding
  const chartMin = Math.max(0, minWeight - padding);
  const chartMax = maxWeight + padding;
  const chartRange = chartMax - chartMin;

  // Chart dimensions
  const chartWidth = 600;
  const chartHeight = 200;
  const marginLeft = 50;
  const marginRight = 20;
  const marginTop = 20;
  const marginBottom = 40;
  const plotWidth = chartWidth - marginLeft - marginRight;
  const plotHeight = chartHeight - marginTop - marginBottom;

  // Generate points for the line
  const points = sortedHistory.map((entry, index) => {
    const x = marginLeft + (index / (sortedHistory.length - 1)) * plotWidth;
    const y = marginTop + (1 - (entry.weight - chartMin) / chartRange) * plotHeight;
    return { x, y, weight: entry.weight, date: entry.date };
  });

  // Create the line path
  const linePath = points.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  // Y-axis ticks
  const yTicks = [];
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) {
    const value = chartMin + (chartRange * i / tickCount);
    const y = marginTop + plotHeight - (i / tickCount) * plotHeight;
    yTicks.push({ value: value.toFixed(1), y });
  }

  // Get latest weight and trend
  const latestWeight = weights[weights.length - 1];
  const trend = data.trends;

  return (
    <div className="space-y-4">
      {/* Current Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-900">{latestWeight}{data.unit}</p>
          <p className="text-sm text-gray-500">Current Weight</p>
        </div>
        {trend && (
          <>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className={`text-2xl font-bold ${
                trend.direction === 'loss' ? 'text-green-600' : 
                trend.direction === 'gain' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trend.direction === 'gain' ? '+' : trend.direction === 'loss' ? '-' : ''}
                {Math.abs(trend.totalChange)}{data.unit}
              </p>
              <p className="text-sm text-gray-500">Total Change</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className={`text-2xl font-bold ${
                trend.weeklyRate > 0 ? 'text-red-600' : trend.weeklyRate < 0 ? 'text-green-600' : 'text-gray-600'
              }`}>
                {trend.weeklyRate > 0 ? '+' : ''}{trend.weeklyRate}{data.unit}
              </p>
              <p className="text-sm text-gray-500">Per Week</p>
            </div>
          </>
        )}
      </div>

      {/* Chart */}
      <div className="bg-white border rounded-lg p-4">
        <svg width={chartWidth} height={chartHeight} className="w-full h-auto">
          {/* Y-axis grid lines and labels */}
          {yTicks.map((tick, index) => (
            <g key={index}>
              <line
                x1={marginLeft}
                y1={tick.y}
                x2={chartWidth - marginRight}
                y2={tick.y}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
              <text
                x={marginLeft - 10}
                y={tick.y + 4}
                textAnchor="end"
                className="text-xs fill-gray-500"
              >
                {tick.value}
              </text>
            </g>
          ))}
          
          {/* Weight line */}
          <path
            d={linePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            className="drop-shadow-sm"
          />
          
          {/* Data points */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#3b82f6"
              className="hover:r-6 transition-all cursor-pointer"
            >
              <title>{point.weight}{data.unit} on {new Date(point.date).toLocaleDateString()}</title>
            </circle>
          ))}
          
          {/* X-axis */}
          <line
            x1={marginLeft}
            y1={chartHeight - marginBottom}
            x2={chartWidth - marginRight}
            y2={chartHeight - marginBottom}
            stroke="#d1d5db"
            strokeWidth="1"
          />
          
          {/* Y-axis */}
          <line
            x1={marginLeft}
            y1={marginTop}
            x2={marginLeft}
            y2={chartHeight - marginBottom}
            stroke="#d1d5db"
            strokeWidth="1"
          />
        </svg>
      </div>
    </div>
  );
}