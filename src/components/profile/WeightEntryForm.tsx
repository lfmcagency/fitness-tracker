'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { DateNavigator } from '@/components/shared';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { colors } from '@/lib/colors';
import { useAuth } from '@/components/auth/AuthProvider';

interface WeightEntryFormProps {
  /** Callback when weight entry is successfully saved */
  onSuccess?: () => void;
  /** Default date for the entry */
  defaultDate?: Date;
  /** Show the form inside a card */
  withCard?: boolean;
  /** Unit for weight (comes from user settings) */
  weightUnit?: 'kg' | 'lbs';
}

/**
 * WeightEntryForm component - Form for logging new weight entries
 */
const WeightEntryForm: React.FC<WeightEntryFormProps> = ({
  onSuccess,
  defaultDate = new Date(),
  withCard = true,
  weightUnit = 'kg',
}) => {
  const { user } = useAuth();
  const [date, setDate] = useState<Date>(defaultDate);
  const [weight, setWeight] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // UI states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!weight) {
      setError('Please enter your weight');
      return;
    }
    
    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) {
      setError('Please enter a valid weight');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      // Call API to save weight entry
      const response = await fetch('/api/user/weight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weight: weightValue,
          date: date.toISOString(),
          notes: notes.trim() || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save weight entry');
      }
      
      // Update UI
      setSuccess('Weight entry saved successfully!');
      setWeight('');
      setNotes('');
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error saving weight entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to save weight entry');
    } finally {
      setIsLoading(false);
    }
  };
  
  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Notifications */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="mb-4 border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}
      
      {/* Date Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-kalos-text mb-1">Date</label>
        <DateNavigator 
          date={date}
          onDateChange={setDate}
          displayFormat="MMMM d, yyyy"
          showToday={true}
          className="border border-kalos-border rounded-md"
        />
      </div>
      
      {/* Weight Input */}
      <div>
        <label htmlFor="weight" className="block text-sm font-medium text-kalos-text mb-1">
          Weight ({weightUnit})
        </label>
        <div className="relative">
          <Input
            id="weight"
            type="number"
            step="0.1"
            min="0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="pr-12"
            placeholder={`Enter weight in ${weightUnit}`}
            disabled={isLoading}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <span className="text-kalos-muted">{weightUnit}</span>
          </div>
        </div>
      </div>
      
      {/* Notes Input */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-kalos-text mb-1">
          Notes (optional)
        </label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about this weight entry..."
          className="min-h-[80px]"
          disabled={isLoading}
        />
      </div>
      
      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
            isLoading ? "bg-kalos-muted cursor-not-allowed" : "bg-kalos-text hover:bg-kalos-darkText"
          }`}
        >
          {isLoading ? 'Saving...' : 'Save Weight Entry'}
        </button>
      </div>
    </form>
  );
  
  if (!withCard) {
    return formContent;
  }
  
  return (
    <div className="bg-white border border-kalos-border rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-medium text-kalos-text mb-4">Log Weight</h2>
      {formContent}
    </div>
  );
};

export default WeightEntryForm;