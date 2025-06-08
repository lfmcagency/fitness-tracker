// src/components/domains/arete/weight/WeightEntryForm.tsx
'use client';

import { useState } from 'react';
import { useProgressStore } from '@/store/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function WeightEntryForm() {
  const { addWeightEntry, weight } = useProgressStore();
  const [formWeight, setFormWeight] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const unit = weight.data?.unit || 'kg';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    const weightNum = parseFloat(formWeight);
    if (!formWeight || isNaN(weightNum) || weightNum <= 0 || weightNum > 999) {
      setError('Please enter a valid weight between 1-999');
      return;
    }

    if (!formDate) {
      setError('Please select a date');
      return;
    }

    setIsSubmitting(true);

    try {
      await addWeightEntry(weightNum, new Date(formDate));
      // Reset form on success
      setFormWeight('');
      setFormDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      setError('Failed to add weight entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 max-w-md mx-auto">
      <h4 className="font-medium text-gray-900 mb-4">Add Weight Entry</h4>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Weight Input */}
        <div>
          <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
            Weight ({unit})
          </label>
          <Input
            id="weight"
            type="number"
            step="0.1"
            min="1"
            max="999"
            value={formWeight}
            onChange={(e) => setFormWeight(e.target.value)}
            placeholder={`Enter weight in ${unit}`}
            className="w-full"
            disabled={isSubmitting}
          />
        </div>

        {/* Date Input */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <Input
            id="date"
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full"
            disabled={isSubmitting}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || !formWeight || !formDate}
          className="w-full"
        >
          {isSubmitting ? 'Adding...' : 'Add Weight Entry'}
        </Button>
      </form>

      {/* Quick Add Buttons */}
      <div className="mt-6 pt-4 border-t">
        <p className="text-xs text-gray-500 mb-3">Quick add today's weight:</p>
        <div className="grid grid-cols-3 gap-2">
          {[70, 75, 80].map((quickWeight) => (
            <Button
              key={quickWeight}
              variant="outline"
              size="sm"
              onClick={() => {
                setFormWeight(quickWeight.toString());
                setFormDate(new Date().toISOString().split('T')[0]);
              }}
              disabled={isSubmitting}
              className="text-xs"
            >
              {quickWeight}{unit}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
}