'use client';

import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronUp, File, MoreHorizontal, Trash } from 'lucide-react';
import { MetricChart, FilterBar, FilterOption } from '@/components/shared';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DetailExpander } from '@/components/shared';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { colors } from '@/lib/colors';
import { useAuth } from '@/components/auth/AuthProvider';
import WeightEntryForm from './WeightEntryForm';

interface WeightEntry {
  weight: number;
  date: string;
  notes?: string;
}

interface WeightHistoryResponse {
  history: WeightEntry[];
  count: number;
  unit: 'kg' | 'lbs';
  trends?: {
    totalChange: number;
    period: number;
    weeklyRate: number;
    direction: 'gain' | 'loss' | 'maintain';
  };
}

interface WeightHistoryDisplayProps {
  /** Maximum number of entries to display */
  limit?: number;
  /** Whether to show weight trends */
  showTrends?: boolean;
  /** Callback when an entry is deleted */
  onEntryDeleted?: () => void;
}

/**
 * WeightHistoryDisplay component - Displays user's weight history
 */
const WeightHistoryDisplay: React.FC<WeightHistoryDisplayProps> = ({
  limit = 10,
  showTrends = true,
  onEntryDeleted,
}) => {
  const { user } = useAuth();
  const [weightData, setWeightData] = useState<WeightHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddEntry, setShowAddEntry] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [entryToDelete, setEntryToDelete] = useState<WeightEntry | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);
  
  // Filter options for the filter bar
  const filterOptions: FilterOption[] = [
    { id: 'recent', label: 'Most Recent', group: 'time' },
    { id: 'oldest', label: 'Oldest First', group: 'time' },
    { id: 'week', label: 'Last Week', group: 'period' },
    { id: 'month', label: 'Last Month', group: 'period' },
    { id: 'year', label: 'Last Year', group: 'period' },
  ];
  
  // Fetch weight history data
  const fetchWeightHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      
      // Add period filter if present
      const periodFilter = activeFilters.find(f => ['week', 'month', 'year'].includes(f));
      if (periodFilter) {
        params.append('period', periodFilter);
      }
      
      // Add sort order
      if (activeFilters.includes('oldest')) {
        params.append('sort', 'asc');
      }
      
      // Call API to get weight history
      const response = await fetch(`/api/user/weight?${params.toString()}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch weight history');
      }
      
      // Update state with weight data
      setWeightData(data.data);
    } catch (err) {
      console.error('Error fetching weight history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch weight history');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch data on component mount and when filters change
  useEffect(() => {
    if (user) {
      fetchWeightHistory();
    }
  }, [user, activeFilters, limit]);
  
  // Handle filter changes
  const handleFilterChange = (filters: string[]) => {
    setActiveFilters(filters);
  };
  
  // Handle weight entry deletion
  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;
    
    try {
      setIsLoading(true);
      
      // In a real implementation, you would call the API to delete the entry
      // await fetch(`/api/user/weight/${entryDate}`, { method: 'DELETE' });
      
      // Mock deletion for now
      console.log('Would delete entry from:', entryToDelete.date);
      
      // Refresh the data
      await fetchWeightHistory();
      
      // Call the callback if provided
      if (onEntryDeleted) {
        onEntryDeleted();
      }
      
      // Close dialog and clear the entry to delete
      setShowConfirmDelete(false);
      setEntryToDelete(null);
    } catch (err) {
      console.error('Error deleting weight entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete weight entry');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Prepare chart data if available
  const prepareChartData = () => {
    if (!weightData || !weightData.history.length) return [];
    
    // Reverse if needed to ensure chronological order for the chart
    const sortedData = [...weightData.history].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    return sortedData.map(entry => ({
      label: format(parseISO(entry.date), 'MMM d'),
      value: entry.weight,
    }));
  };
  
  // Handle success from the weight entry form
  const handleWeightEntrySaved = () => {
    fetchWeightHistory();
    setShowAddEntry(false);
  };
  
  return (
    <div className="space-y-6">
      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Controls */}
      <div className="flex justify-between items-center">
        <FilterBar
          options={filterOptions}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          label="Filter"
          variant="outline"
          showSelectedPills={true}
        />
        
        <button
          onClick={() => setShowAddEntry(!showAddEntry)}
          className="px-4 py-2 rounded-md text-sm font-medium bg-kalos-text text-white hover:bg-kalos-darkText"
        >
          {showAddEntry ? 'Cancel' : 'Add Weight Entry'}
        </button>
      </div>
      
      {/* Weight entry form */}
      {showAddEntry && (
        <div className="mb-6">
          <WeightEntryForm 
            onSuccess={handleWeightEntrySaved}
            weightUnit={weightData?.unit || 'kg'}
          />
        </div>
      )}
      
      {/* Loading state */}
      {isLoading && !weightData && (
        <div className="flex justify-center py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-kalos-border rounded w-3/4"></div>
            <div className="h-4 bg-kalos-border rounded w-1/2"></div>
            <div className="h-4 bg-kalos-border rounded w-5/6"></div>
          </div>
        </div>
      )}
      
      {/* Weight data display */}
      {weightData && (
        <>
          {/* Weight chart */}
          {weightData.history.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weight History</CardTitle>
              </CardHeader>
              <CardContent>
                <MetricChart
                  title="Weight Over Time"
                  subtitle={`Showing last ${weightData.history.length} entries`}
                  data={prepareChartData()}
                  chartType="line"
                  height={250}
                  xAxisLabel="Date"
                  yAxisLabel={`Weight (${weightData.unit})`}
                  allowChartTypeChange={true}
                  colorPalette={['#1A1A1A']}
                />
              </CardContent>
            </Card>
          )}
          
          {/* Trend summary */}
          {showTrends && weightData.trends && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weight Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border border-kalos-border rounded-md">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-kalos-muted">Total Change</span>
                      {weightData.trends.direction !== 'maintain' && (
                        weightData.trends.direction === 'gain'
                          ? <ArrowUp className="text-kalos-high w-4 h-4" />
                          : <ArrowDown className="text-kalos-low w-4 h-4" />
                      )}
                    </div>
                    <div className="text-xl font-medium flex items-center">
                      {weightData.trends.totalChange > 0 && '+'}
                      {weightData.trends.totalChange} {weightData.unit}
                    </div>
                    <div className="text-xs text-kalos-muted mt-1">Over {weightData.trends.period} days</div>
                  </div>
                  
                  <div className="p-4 border border-kalos-border rounded-md">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-kalos-muted">Weekly Rate</span>
                      {weightData.trends.weeklyRate !== 0 && (
                        weightData.trends.weeklyRate > 0
                          ? <ArrowUp className="text-kalos-high w-4 h-4" />
                          : <ArrowDown className="text-kalos-low w-4 h-4" />
                      )}
                    </div>
                    <div className="text-xl font-medium">
                      {weightData.trends.weeklyRate > 0 && '+'}
                      {weightData.trends.weeklyRate} {weightData.unit}/week
                    </div>
                    <div className="text-xs text-kalos-muted mt-1">Average change per week</div>
                  </div>
                  
                  <div className="p-4 border border-kalos-border rounded-md">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-kalos-muted">Direction</span>
                      <ArrowUpDown className="w-4 h-4 text-kalos-muted" />
                    </div>
                    <div className="text-xl font-medium capitalize">{weightData.trends.direction}</div>
                    <div className="text-xs text-kalos-muted mt-1">Overall trend direction</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Weight entries table */}
          <DetailExpander
            title="Weight Entry History"
            description={`Showing ${weightData.history.length} ${weightData.history.length === 1 ? 'entry' : 'entries'}`}
            defaultExpanded={true}
            variant="outline"
          >
            {weightData.history.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-kalos-muted">No weight entries found.</p>
                <button
                  onClick={() => setShowAddEntry(true)}
                  className="mt-2 text-kalos-text text-sm hover:underline"
                >
                  Add your first weight entry
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-kalos-border">
                      <th className="pb-2 font-medium text-kalos-text text-sm">Date</th>
                      <th className="pb-2 font-medium text-kalos-text text-sm">Weight</th>
                      <th className="pb-2 font-medium text-kalos-text text-sm">Notes</th>
                      <th className="pb-2 font-medium text-kalos-text text-sm w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {weightData.history.map((entry, index) => (
                      <tr key={index} className="border-b border-kalos-border last:border-0">
                        <td className="py-3">
                          {format(parseISO(entry.date), 'MMMM d, yyyy')}
                        </td>
                        <td className="py-3">
                          {entry.weight} {weightData.unit}
                        </td>
                        <td className="py-3 text-kalos-muted">
                          {entry.notes || '-'}
                        </td>
                        <td className="py-3">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="p-1 hover:bg-kalos-highlight rounded-md">
                                <MoreHorizontal className="w-4 h-4 text-kalos-muted" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-0">
                              <div className="py-1">
                                <button
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-kalos-highlight rounded-sm transition-colors flex items-center text-red-600"
                                  onClick={() => {
                                    setEntryToDelete(entry);
                                    setShowConfirmDelete(true);
                                  }}
                                >
                                  <Trash className="w-4 h-4 mr-2" />
                                  Delete Entry
                                </button>
                                <button
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-kalos-highlight rounded-sm transition-colors flex items-center"
                                  onClick={() => {
                                    console.log('Export entry:', entry);
                                  }}
                                >
                                  <File className="w-4 h-4 mr-2" />
                                  Export Entry
                                </button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailExpander>
        </>
      )}
      
      {/* Empty state */}
      {!isLoading && !weightData && (
        <div className="text-center py-12 border border-kalos-border rounded-lg">
          <p className="text-kalos-muted mb-2">No weight data available.</p>
          <button
            onClick={() => setShowAddEntry(true)}
            className="px-4 py-2 rounded-md text-sm font-medium bg-kalos-text text-white hover:bg-kalos-darkText"
          >
            Add First Weight Entry
          </button>
        </div>
      )}
      
      {/* Delete confirmation dialog */}
      <Dialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Weight Entry</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this weight entry from {entryToDelete && format(parseISO(entryToDelete.date), 'MMMM d, yyyy')}?</p>
            <p className="text-sm text-kalos-muted mt-2">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowConfirmDelete(false)}
              className="px-4 py-2 text-kalos-muted text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteEntry}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete Entry'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WeightHistoryDisplay;