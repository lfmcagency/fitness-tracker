// Export all shared components
export { default as ProgressBar } from './ProgressBar';
export { ProgressRing } from './ProgressRing';
export { default as StatCard } from './StatCard';
export { default as StatusBadge } from './StatusBadge';
export { default as DateNavigator } from './DateNavigator';
export { default as FilterBar } from './FilterBar';
export { default as StreakIndicator } from './StreakIndicator';
export { default as SearchInput } from './SearchInput';
export { default as TimeBlockContainer } from './TimeBlockContainer';
export { default as CategoryPills } from './CategoryPills';
export { default as DetailExpander } from './metrics/DetailExpander';
export { default as MetricChart } from './metrics/MetricChart';

// Export types
export type { ProgressBarProps } from './ProgressBar';
export type { ProgressRingProps } from './ProgressRing';
export type { StatCardProps } from './StatCard';
export type { StatusBadgeProps, StatusType } from './StatusBadge';
export type { DateNavigatorProps } from './DateNavigator';
export type { FilterBarProps, FilterOption } from './FilterBar';
export type { StreakIndicatorProps } from './StreakIndicator';
export type { SearchInputProps, SearchOption, SearchCategory } from './SearchInput';
export type { TimeBlockContainerProps } from './TimeBlockContainer';
export type { CategoryPillsProps, CategoryOption } from './CategoryPills';
export type { DetailExpanderProps } from './metrics/DetailExpander';
export type { MetricChartProps, MetricChartPoint, ChartType } from './metrics/MetricChart';

export const fontClasses = {
    heading: 'font-heading',
    body: 'font-body',
  };