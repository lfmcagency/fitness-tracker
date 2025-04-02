// src/components/profile/WeightEntryForm.tsx
// Previous rewrite seems largely correct based on cleaned types.
// Ensure imports and store interactions match the revised store.
'use client';

import React, { useState } from 'react';
// import { format } from 'date-fns'; // Not used here anymore
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useUserStore } from '@/store/user';
import { AddWeightEntryRequest } from '@/types/api/weightResponses';
import { DateNavigator } from '@/components/shared';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WeightEntryFormProps {
  onSuccess?: () => void;
  defaultDate?: Date;
}

const WeightEntryForm: React.FC<WeightEntryFormProps> = ({
  onSuccess,
  defaultDate = new Date(),
}) => {
  // Get state and actions from store
  const { weightUnit, addWeightEntry, isAddingWeight, storeError, clearError } = useUserStore(state => ({
      weightUnit: state.weightUnit,
      addWeightEntry: state.addWeightEntry,
      isAddingWeight: state.isAddingWeight,
      storeError: state.error,
      clearError: state.clearError
  }));

  // Local form state
  const [date, setDate] = useState<Date>(defaultDate);
  const [weight, setWeight] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccess(null);
    clearError();

    // Validation (keep existing)
    if (!weight) { setLocalError('Weight is required'); return; }
    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue < 1 || weightValue > 999) { setLocalError(`Invalid weight (1-999 ${weightUnit})`); return; }

    const entryData: AddWeightEntryRequest = {
        weight: weightValue, // Send number
        date: date.toISOString(),
        notes: notes.trim() || undefined,
    };

    const result = await addWeightEntry(entryData);

    if (result) {
      setSuccess('Weight entry saved!');
      setWeight(''); setNotes(''); setDate(new Date()); // Reset form
      if (onSuccess) onSuccess();
    } else {
      setLocalError(storeError || 'Failed to save entry.'); // Show store error or fallback
    }
  };

  const displayError = localError || storeError;

  return (
    <Card>
        <CardHeader><CardTitle className="text-lg">Log Weight</CardTitle></CardHeader>
        <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Notifications */}
              {displayError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{displayError}</AlertDescription></Alert>}
              {success && <Alert className="border-green-500 bg-green-50 text-green-700"><CheckCircle className="h-4 w-4" /><AlertDescription>{success}</AlertDescription></Alert>}

              {/* Date Selection */}
              <div>
                  <label className="block text-sm font-medium text-kalos-text mb-1">Date</label>
                  <DateNavigator date={date} onDateChange={setDate} displayFormat="MMMM d, yyyy" showToday={true} className="border border-kalos-border rounded-md p-2"/>
              </div>
              {/* Weight Input */}
              <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-kalos-text mb-1">Weight ({weightUnit})</label>
                  <div className="relative">
                      <Input id="weight" type="number" step="0.1" min="1" max="999" value={weight} onChange={(e) => setWeight(e.target.value)} className="pr-12" placeholder={`Enter weight in ${weightUnit}`} disabled={isAddingWeight} required />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-kalos-muted text-sm">{weightUnit}</span></div>
                  </div>
              </div>
              {/* Notes Input */}
              <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-kalos-text mb-1">Notes (optional)</label>
                  <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How are you feeling? Any factors?" className="min-h-[80px]" disabled={isAddingWeight} maxLength={500} />
                  <p className="text-xs text-kalos-muted text-right mt-1">{notes.length}/500</p>
              </div>
              {/* Submit Button */}
              <div className="flex justify-end">
                  <button type="submit" disabled={isAddingWeight} className={`px-4 py-2 rounded-md text-sm font-medium text-white min-w-[120px] ${isAddingWeight ? "bg-kalos-muted cursor-not-allowed" : "bg-kalos-text hover:bg-kalos-darkText"}`}>
                      {isAddingWeight ? 'Saving...' : 'Save Entry'}
                  </button>
              </div>
            </form>
        </CardContent>
    </Card>
  );
};

export default WeightEntryForm;