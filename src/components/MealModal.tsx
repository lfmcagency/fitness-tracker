import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Timer } from 'lucide-react';

interface MealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meal: { name: string; time: string; foods: any[] }) => void;
}

const MealModal: React.FC<MealModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [time, setTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && time) {
      // Added empty foods array here
      onSave({ name, time, foods: [] });
      setName('');
      setTime('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Meal">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="meal-name" className="block text-sm font-medium text-gray-700">
            Meal Name
          </label>
          <input
            id="meal-name"
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            placeholder="Breakfast, Lunch, Dinner, Snack..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label htmlFor="meal-time" className="block text-sm font-medium text-gray-700">
            Time
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Timer className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="meal-time"
              type="time"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Meal
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default MealModal;