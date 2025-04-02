'use client';

import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, File, MoreHorizontal, Trash } from 'lucide-react';
// --- Assuming these shared components exist and work ---
import { MetricChart, FilterBar, FilterOption, DetailExpander } from '@/components/shared';
// --- Assuming these UI components exist and work ---
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
// --- Import Store and Actions ---
import { useUserStore } from '@/store/user';
import { ApiWeightEntry } from '@/types/api/userResponses';

interface WeightHistoryPayload {
  trends: {
    totalChange: number;
    period: number;
    weeklyRate: number;
    direction: 'gain' | 'loss' | 'maintain';
  } | null;
}
// --- Import Form ---
import WeightEntryForm from './WeightEntryForm';

interface WeightHistoryDisplayProps {
  /** Maximum number of entries to display (passed to fetch) */
  limit?: number;
  /** Whether to show weight trends */
  showTrends?: boolean;
  // Removed onEntryDeleted as store handles updates
}

/**
 * WeightHistoryDisplay component - Displays user's weight history using Zustand store.
 * NOTE: This component is likely intended for the Arete page now, not the main profile page.
 */
const WeightHistoryDisplay: React.FC<WeightHistoryDisplayProps> = ({
  limit = 30, // Default limit to fetch
  showTrends = true,
}) => {
  // --- Select state from Zustand store ---
  const {
      weightHistory,
      weightUnit,
      isLoadingWeight,
      isDeletingWeight,
      error,
      fetchWeightHistory,
      deleteWeightEntry,
      clearError
  } = useUserStore(state => ({
      weightHistory: state.weightHistory,
      weightUnit: state.weightUnit,
      isLoadingWeight: state.isLoadingWeight,
      isDeletingWeight: state.isDeletingWeight,
      error: state.error,
      fetchWeightHistory: state.fetchWeightHistory,
      deleteWeightEntry: state.deleteWeightEntry,
      clearError: state.clearError
  }));

  // Local UI state
  const [showAddEntry, setShowAddEntry] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]); // Example: ['recent']
  const [entryToDelete, setEntryToDelete] = useState<ApiWeightEntry | null>(null); // Use ApiWeightEntry type
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  // Filter options for the filter bar
  const filterOptions: FilterOption[] = [
    { id: 'recent', label: 'Most Recent', group: 'time' },
    { id: 'oldest', label: 'Oldest First', group: 'time' },
    // Add period filters if API supports them
    // { id: 'week', label: 'Last Week', group: 'period' },
    // { id: 'month', label: 'Last Month', group: 'period' },
  ];

  // Fetch weight history data on mount and when filters change
  useEffect(() => {
    console.log("WeightHistoryDisplay: Fetching history with filters/limit:", activeFilters, limit);
    const sortParam = activeFilters.includes('oldest') ? 'asc' : 'desc';
    // Add period param if needed: const periodParam = activeFilters.find(...)
    fetchWeightHistory({ limit, sort: sortParam });

    // Clear errors on unmount
    return () => {
        clearError();
    };
  }, [fetchWeightHistory, activeFilters, limit, clearError]);

  // Handle filter changes - triggers useEffect
  const handleFilterChange = (filters: string[]) => {
    setActiveFilters(filters);
  };

  // Handle triggering the delete confirmation
  const confirmDelete = (entry: ApiWeightEntry) => {
    setEntryToDelete(entry);
    setShowConfirmDelete(true);
  };

  // Handle actual deletion via store action
  const handleDeleteEntry = async () => {
    if (!entryToDelete?._id) return; // Need _id to delete

    const success = await deleteWeightEntry(entryToDelete._id);

    if (success) {
      setShowConfirmDelete(false);
      setEntryToDelete(null);
      // No need to manually refetch, store handles optimistic update/refetch
    } else {
       // Error should be displayed globally via storeError
       console.error("Deletion failed (error should be in store)");
       // Optionally close dialog on failure too?
       // setShowConfirmDelete(false);
       // setEntryToDelete(null);
    }
  };

  // Prepare chart data if available
  const prepareChartData = () => {
    if (!weightHistory || !weightHistory.length) return [];
    // Ensure chronological order for the chart regardless of current sort filter
    const sortedData = [...weightHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sortedData.map(entry => ({
      label: format(parseISO(entry.date), 'MMM d'),
      value: entry.weight,
    }));
  };

  // Handle success from the weight entry form (closes form, store handles data)
  const handleWeightEntrySaved = () => {
    setShowAddEntry(false); // Close the form section
    // Optionally show a temporary success message here if needed
  };

  // --- Calculate Trends (Client-side based on fetched history) ---
  // This could alternatively be done by the API as before
  let calculatedTrends: WeightHistoryPayload['trends'] = null;
  if (showTrends && weightHistory && weightHistory.length >= 2) {
      try {
        const sortedForTrends = [...weightHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Chronological
        const oldestEntry = sortedForTrends[0];
        const newestEntry = sortedForTrends[sortedForTrends.length - 1];
        const oldestDate = parseISO(oldestEntry.date);
        const newestDate = parseISO(newestEntry.date);
        const daysDiff = Math.max(1, Math.round((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)));
        const weightDiff = newestEntry.weight - oldestEntry.weight;
        const weeklyRate = (weightDiff / daysDiff) * 7;
        calculatedTrends = {
            totalChange: parseFloat(weightDiff.toFixed(1)),
            period: daysDiff,
            weeklyRate: parseFloat(weeklyRate.toFixed(2)),
            direction: (weightDiff > 0 ? 'gain' : weightDiff < 0 ? 'loss' : 'maintain') as 'gain' | 'loss' | 'maintain'
        };
      } catch (error) { console.error('Error calculating weight trends client-side:', error); }
  }
  // --- End Trend Calculation ---


  return (
    <div className="space-y-6">
      {/* Global Error display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Controls: Filter and Add Button */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <FilterBar
          options={filterOptions}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          label="Sort" // Changed label slightly
          variant="outline"
          showSelectedPills={false} // Keep UI cleaner
        />
        <button
          onClick={() => setShowAddEntry(!showAddEntry)}
          className="px-4 py-2 rounded-md text-sm font-medium bg-kalos-text text-white hover:bg-kalos-darkText flex-shrink-0"
        >
          {showAddEntry ? 'Cancel Entry' : '+ Log Weight'}
        </button>
      </div>

      {/* Weight entry form (conditionally rendered) */}
      {showAddEntry && (
        <div className="mb-6">
          {/* --- FIX: Remove the weightUnit prop --- */}
          <WeightEntryForm
            onSuccess={handleWeightEntrySaved}
            // weightUnit={weightUnit || 'kg'} // REMOVED - Form gets unit from store
          />
        </div>
      )}

      {/* Loading state for initial fetch */}
      {isLoadingWeight && !weightHistory && (
        <div className="flex justify-center py-12">
          <div className="animate-pulse space-y-4 w-3/4">
            <div className="h-4 bg-kalos-border rounded w-full"></div>
            <div className="h-4 bg-kalos-border rounded w-1/2"></div>
            <div className="h-4 bg-kalos-border rounded w-5/6"></div>
          </div>
        </div>
      )}

      {/* Data Display (Chart, Trends, Table) */}
      {/* Render only if NOT initial loading AND history is available (even if empty) */}
      {!isLoadingWeight && weightHistory !== null && (
        <>
          {/* Weight chart */}
          {weightHistory.length > 1 ? (
            <Card>
              <CardHeader><CardTitle className="text-lg">Weight Chart</CardTitle></CardHeader>
              <CardContent>
                <MetricChart
                  // title="Weight Over Time" // Removed redundant title
                  // subtitle={`Showing last ${weightHistory.length} entries`}
                  data={prepareChartData()}
                  chartType="line"
                  height={250}
                  // xAxisLabel="Date" // Often clear from labels
                  yAxisLabel={`Weight (${weightUnit})`}
                  allowChartTypeChange={true}
                  colorPalette={['#1A1A1A']} // Use theme color later
                  title={''}                />
              </CardContent>
            </Card>
          ) : weightHistory.length === 1 ? (
             <p className="text-center text-kalos-muted">Log at least one more entry to see a chart.</p>
          ) : null }

          {/* Trend summary */}
          {showTrends && calculatedTrends && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Weight Trends</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Trend Items ... (keep previous JSX for trends) */}
                   <div className="p-4 border border-kalos-border rounded-md"> <div className="flex items-center justify-between mb-1"> <span className="text-sm text-kalos-muted">Total Change</span> {calculatedTrends.direction !== 'maintain' && ( calculatedTrends.direction === 'gain' ? <ArrowUp className="text-kalos-high w-4 h-4" /> : <ArrowDown className="text-kalos-low w-4 h-4" /> )} </div> <div className="text-xl font-medium flex items-center"> {calculatedTrends.totalChange > 0 && '+'} {calculatedTrends.totalChange} {weightUnit} </div> <div className="text-xs text-kalos-muted mt-1">Over {calculatedTrends.period} days</div> </div>
                   <div className="p-4 border border-kalos-border rounded-md"> <div className="flex items-center justify-between mb-1"> <span className="text-sm text-kalos-muted">Weekly Rate</span> {calculatedTrends.weeklyRate !== 0 && ( calculatedTrends.weeklyRate > 0 ? <ArrowUp className="text-kalos-high w-4 h-4" /> : <ArrowDown className="text-kalos-low w-4 h-4" /> )} </div> <div className="text-xl font-medium"> {calculatedTrends.weeklyRate > 0 && '+'} {calculatedTrends.weeklyRate} {weightUnit}/week </div> <div className="text-xs text-kalos-muted mt-1">Average change</div> </div>
                   <div className="p-4 border border-kalos-border rounded-md"> <div className="flex items-center justify-between mb-1"> <span className="text-sm text-kalos-muted">Direction</span> <ArrowUpDown className="w-4 h-4 text-kalos-muted" /> </div> <div className="text-xl font-medium capitalize">{calculatedTrends.direction}</div> <div className="text-xs text-kalos-muted mt-1">Overall trend</div> </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weight entries table/list */}
          <Card>
             <CardHeader><CardTitle className="text-lg">History</CardTitle></CardHeader>
             <CardContent>
                 {weightHistory.length === 0 ? (
                   <div className="text-center py-6">
                     <p className="text-kalos-muted">No weight entries yet.</p>
                     {!showAddEntry && (
                        <button onClick={() => setShowAddEntry(true)} className="mt-2 text-kalos-text text-sm hover:underline"> Add your first weight entry </button>
                     )}
                   </div>
                 ) : (
                   <div className="overflow-x-auto">
                     <table className="w-full text-sm">
                       <thead>
                         <tr className="text-left border-b border-kalos-border">
                           <th className="py-2 px-3 font-medium text-kalos-text">Date</th>
                           <th className="py-2 px-3 font-medium text-kalos-text">Weight</th>
                           <th className="py-2 px-3 font-medium text-kalos-text hidden md:table-cell">Notes</th>
                           <th className="py-2 px-1 font-medium text-kalos-text w-10 text-right"></th> {/* Actions */}
                         </tr>
                       </thead>
                       <tbody>
                         {weightHistory.map((entry) => (
                           <tr key={entry._id || entry.date} className="border-b border-kalos-border last:border-0 hover:bg-kalos-bg/50">
                             <td className="py-3 px-3 whitespace-nowrap">
                               {format(parseISO(entry.date), 'MMM d, yyyy')}
                             </td>
                             <td className="py-3 px-3">
                               {entry.weight} {weightUnit}
                             </td>
                             <td className="py-3 px-3 text-kalos-muted hidden md:table-cell truncate max-w-xs">
                               {entry.notes || '-'}
                             </td>
                             <td className="py-3 px-1 text-right">
                               {entry._id && ( // Only show actions if entry has an ID (needed for delete)
                                 <Popover>
                                   <PopoverTrigger asChild>
                                     <button className="p-1 hover:bg-kalos-highlight rounded-md text-kalos-muted hover:text-kalos-text"> <MoreHorizontal className="w-4 h-4" /> </button>
                                   </PopoverTrigger>
                                   <PopoverContent className="w-40 p-0">
                                     <div className="py-1">
                                       <button className="w-full text-left px-3 py-2 text-sm hover:bg-kalos-highlight rounded-sm flex items-center text-red-600" onClick={() => confirmDelete(entry)} >
                                         <Trash className="w-4 h-4 mr-2" /> Delete
                                       </button>
                                       {/* Add Edit/Export later */}
                                       {/* <button className="w-full text-left px-3 py-2 text-sm hover:bg-kalos-highlight rounded-sm flex items-center" > <File className="w-4 h-4 mr-2" /> Export </button> */}
                                     </div>
                                   </PopoverContent>
                                 </Popover>
                               )}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}
             </CardContent>
          </Card>
        </>
      )}

      {/* Empty state AFTER initial load if history is explicitly null (error case?) */}
      {!isLoadingWeight && weightHistory === null && !error && (
        <div className="text-center py-12 border border-dashed border-kalos-border rounded-lg">
          <p className="text-kalos-muted mb-2">Could not load weight data.</p>
        </div>
      )}


      {/* Delete confirmation dialog */}
      <Dialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Delete Weight Entry</DialogTitle></DialogHeader>
          <div className="py-4">
            <p>Delete entry from {entryToDelete && format(parseISO(entryToDelete.date), 'MMMM d, yyyy')}?</p>
            <p className="text-sm text-kalos-muted mt-1">Weight: {entryToDelete?.weight} {weightUnit}</p>
            <p className="text-sm text-kalos-muted mt-2">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setShowConfirmDelete(false)} className="px-4 py-2 text-kalos-muted text-sm font-medium" disabled={isDeletingWeight} > Cancel </button>
            <button type="button" onClick={handleDeleteEntry} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium min-w-[90px]" disabled={isDeletingWeight} >
              {isDeletingWeight ? 'Deleting...' : 'Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default WeightHistoryDisplay;