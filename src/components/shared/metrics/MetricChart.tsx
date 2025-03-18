import React from 'react';
import { 
  BarChart as BarChartIcon, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon, 
  Maximize, 
  Minimize, 
  Info 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { colors } from '@/lib/colors';

export type ChartType = 'line' | 'bar' | 'pie';

export interface MetricChartPoint {
  /** Label for the data point */
  label: string;
  /** Value for the data point */
  value: number;
  /** Optional color override */
  color?: string;
}

export interface MetricChartProps {
  /** Chart title */
  title: string;
  /** Subtitle or description */
  subtitle?: string;
  /** Chart type */
  chartType?: ChartType;
  /** Data points */
  data: MetricChartPoint[];
  /** X-axis label */
  xAxisLabel?: string;
  /** Y-axis label */
  yAxisLabel?: string;
  /** Allow chart type switching */
  allowChartTypeChange?: boolean;
  /** Allow expanded view */
  allowExpand?: boolean;
  /** Height of the chart in pixels */
  height?: number;
  /** Chart color palette */
  colorPalette?: string[];
  /** Additional CSS classes */
  className?: string;
  /** Whether the component is in a loading state */
  loading?: boolean;
  /** Whether to show a placeholder when no data is present */
  showEmptyState?: boolean;
  /** Custom empty state content */
  emptyStateContent?: React.ReactNode;
}

/**
 * MetricChart component for visualizing metric data
 */
export function MetricChart({
  title,
  subtitle,
  chartType = 'line',
  data,
  xAxisLabel,
  yAxisLabel,
  allowChartTypeChange = true,
  allowExpand = true,
  height = 200,
  colorPalette = colors.chartColors,
  className,
  loading = false,
  showEmptyState = true,
  emptyStateContent,
}: MetricChartProps) {
  const [currentChartType, setCurrentChartType] = React.useState<ChartType>(chartType);
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  // Find the max value for scaling
  const maxValue = Math.max(...data.map(d => d.value), 0);
  
  // Check if there's data to display
  const hasData = data.length > 0 && maxValue > 0;
  
  // Toggle expanded state
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  // Change chart type
  const handleChartTypeChange = (type: ChartType) => {
    setCurrentChartType(type);
  };
  
  // Get icon for current chart type
  const ChartIcon = {
    line: LineChartIcon,
    bar: BarChartIcon,
    pie: PieChartIcon,
  }[currentChartType];
  
  return (
    <div className={cn(
      `border border-${colors.kalosBorder} rounded-lg overflow-hidden bg-white`,
      isExpanded && 'fixed inset-4 z-50 flex flex-col',
      className
    )}>
      {/* Chart header */}
      <div className={`border-b border-${colors.kalosBorder} p-3 bg-${colors.kalosBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChartIcon className={`w-4 h-4 text-${colors.kalosMuted}`} />
            <h3 className={`font-medium text-${colors.kalosText}`}>{title}</h3>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Chart type selection */}
            {allowChartTypeChange && (
              <div className={`flex items-center border border-${colors.kalosBorder} rounded-md overflow-hidden`}>
                <button
                  type="button"
                  className={cn(
                    "p-1",
                    currentChartType === 'line' ? `bg-${colors.kalosBorder}` : 'bg-white'
                  )}
                  onClick={() => handleChartTypeChange('line')}
                >
                  <LineChartIcon className={`w-3.5 h-3.5 text-${colors.kalosText}`} />
                </button>
                <button
                  type="button"
                  className={cn(
                    "p-1",
                    currentChartType === 'bar' ? `bg-${colors.kalosBorder}` : 'bg-white'
                  )}
                  onClick={() => handleChartTypeChange('bar')}
                >
                  <BarChartIcon className={`w-3.5 h-3.5 text-${colors.kalosText}`} />
                </button>
                <button
                  type="button"
                  className={cn(
                    "p-1",
                    currentChartType === 'pie' ? `bg-${colors.kalosBorder}` : 'bg-white'
                  )}
                  onClick={() => handleChartTypeChange('pie')}
                >
                  <PieChartIcon className={`w-3.5 h-3.5 text-${colors.kalosText}`} />
                </button>
              </div>
            )}
            
            {/* Expand/collapse button */}
            {allowExpand && (
              <button
                type="button"
                className={`p-1 hover:bg-${colors.kalosBorder} rounded-md`}
                onClick={toggleExpand}
              >
                {isExpanded 
                  ? <Minimize className={`w-4 h-4 text-${colors.kalosText}`} /> 
                  : <Maximize className={`w-4 h-4 text-${colors.kalosText}`} />
                }
              </button>
            )}
          </div>
        </div>
        
        {/* Subtitle */}
        {subtitle && (
          <p className={`text-xs text-${colors.kalosMuted} mt-1`}>{subtitle}</p>
        )}
      </div>
      
      {/* Chart content */}
      <div 
        className={cn(
          'p-4 relative',
          isExpanded ? 'flex-1 overflow-auto' : `h-[${height}px]`
        )}
        style={{ height: isExpanded ? 'auto' : `${height}px` }}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/75">
            <div className={`w-8 h-8 border-4 border-${colors.kalosBorder} border-t-${colors.kalosText} rounded-full animate-spin`}></div>
          </div>
        ) : !hasData && showEmptyState ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {emptyStateContent || (
              <div className={`text-center text-${colors.kalosMuted}`}>
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No data available</p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full">
            {/* Charts - Simplified visualization */}
            {currentChartType === 'line' && (
              <SimplifiedLineChart data={data} maxValue={maxValue} colorPalette={colorPalette} />
            )}
            
            {currentChartType === 'bar' && (
              <SimplifiedBarChart data={data} maxValue={maxValue} colorPalette={colorPalette} />
            )}
            
            {currentChartType === 'pie' && (
              <SimplifiedPieChart data={data} colorPalette={colorPalette} />
            )}
            
            {/* Axis labels */}
            {(xAxisLabel || yAxisLabel) && (
              <div className={`text-xs text-${colors.kalosMuted} flex justify-between mt-2`}>
                {xAxisLabel && <span>{xAxisLabel}</span>}
                {yAxisLabel && <span>{yAxisLabel}</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Simplified chart components
// In a real implementation, these would be replaced with actual charting components

const SimplifiedLineChart: React.FC<{ 
  data: MetricChartPoint[]; 
  maxValue: number; 
  colorPalette: string[];
}> = ({ data, maxValue, colorPalette }) => {
  const primaryColor = colorPalette[0];
  
  return (
    <div className="w-full h-full relative">
      {/* Y-axis */}
      <div className={`absolute left-0 top-0 bottom-0 w-6 border-r border-${colors.kalosBorder} flex flex-col justify-between text-xs text-${colors.kalosMuted}`}>
        <div>{maxValue}</div>
        <div>0</div>
      </div>
      
      {/* Chart area */}
      <div className="absolute left-6 right-0 top-0 bottom-6">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            points={data.map((point, index) => {
              const x = (index / (data.length - 1)) * 100;
              const y = 100 - ((point.value / maxValue) * 100);
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke={primaryColor}
            strokeWidth="2"
          />
          
          {/* Data points */}
          {data.map((point, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 100 - ((point.value / maxValue) * 100);
            
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                fill="white"
                stroke={point.color || primaryColor}
                strokeWidth="1.5"
              />
            );
          })}
        </svg>
      </div>
      
      {/* X-axis labels */}
      <div className={`absolute left-6 right-0 bottom-0 h-6 flex justify-between text-xs text-${colors.kalosMuted}`}>
        {data.slice(0, 7).map((point, index) => (
          <div key={index} className="truncate max-w-[50px]">
            {point.label}
          </div>
        ))}
      </div>
    </div>
  );
};

const SimplifiedBarChart: React.FC<{ 
  data: MetricChartPoint[]; 
  maxValue: number; 
  colorPalette: string[];
}> = ({ data, maxValue, colorPalette }) => {
  return (
    <div className="w-full h-full relative">
      {/* Y-axis */}
      <div className={`absolute left-0 top-0 bottom-0 w-6 border-r border-${colors.kalosBorder} flex flex-col justify-between text-xs text-${colors.kalosMuted}`}>
        <div>{maxValue}</div>
        <div>0</div>
      </div>
      
      {/* Chart area */}
      <div className="absolute left-6 right-0 top-0 bottom-6 flex items-end justify-around">
        {data.slice(0, 10).map((point, index) => {
          const height = `${(point.value / maxValue) * 100}%`;
          const color = point.color || colorPalette[index % colorPalette.length];
          
          return (
            <div key={index} className="flex flex-col items-center">
              <div 
                className="w-8 rounded-t-sm"
                style={{ height, backgroundColor: color }}
              ></div>
            </div>
          );
        })}
      </div>
      
      {/* X-axis labels */}
      <div className={`absolute left-6 right-0 bottom-0 h-6 flex justify-around text-xs text-${colors.kalosMuted}`}>
        {data.slice(0, 10).map((point, index) => (
          <div key={index} className="truncate w-8 text-center">
            {point.label}
          </div>
        ))}
      </div>
    </div>
  );
};

const SimplifiedPieChart: React.FC<{ 
  data: MetricChartPoint[]; 
  colorPalette: string[]; 
}> = ({ data, colorPalette }) => {
  const total = data.reduce((sum, point) => sum + point.value, 0);
  
  // Calculate slices
  let cumulativePercent = 0;
  const slices = data.map((point, index) => {
    const percent = (point.value / total) * 100;
    const startPercent = cumulativePercent;
    cumulativePercent += percent;
    
    return {
      ...point,
      percent,
      startPercent,
      endPercent: cumulativePercent,
      color: point.color || colorPalette[index % colorPalette.length],
    };
  });
  
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="relative" style={{ width: '80%', height: '80%' }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          {slices.map((slice, index) => {
            // Calculate slice path
            const startAngle = (slice.startPercent / 100) * 360;
            const endAngle = (slice.endPercent / 100) * 360;
            
            const startRad = ((startAngle - 90) * Math.PI) / 180;
            const endRad = ((endAngle - 90) * Math.PI) / 180;
            
            const x1 = 50 + 50 * Math.cos(startRad);
            const y1 = 50 + 50 * Math.sin(startRad);
            const x2 = 50 + 50 * Math.cos(endRad);
            const y2 = 50 + 50 * Math.sin(endRad);
            
            const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
            
            const pathData = [
              `M 50 50`,
              `L ${x1} ${y1}`,
              `A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              `Z`
            ].join(' ');
            
            return (
              <path
                key={index}
                d={pathData}
                fill={slice.color}
                stroke="#fff"
                strokeWidth="1"
              />
            );
          })}
        </svg>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-medium">{total}</div>
            <div className={`text-xs text-${colors.kalosMuted}`}>Total</div>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className={`text-xs text-${colors.kalosMuted} ml-4`}>
        {slices.map((slice, index) => (
          <div key={index} className="flex items-center mb-1">
            <div 
              className="w-3 h-3 mr-2 rounded-sm" 
              style={{ backgroundColor: slice.color }}
            ></div>
            <span>{slice.label} ({slice.percent.toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MetricChart;