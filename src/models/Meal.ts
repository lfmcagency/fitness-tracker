// src/models/Meal.ts

import mongoose, { Schema, Document } from 'mongoose';

interface Food {
  foodId?: mongoose.Types.ObjectId;
  name: string;
  amount: number;
  unit: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

interface Totals {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface IMeal extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  name: string;
  time: string;
  foods: Food[];
  totals: Totals;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FoodSchema = new Schema({
  foodId: { type: Schema.Types.ObjectId, ref: 'Food' },
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  unit: { type: String, default: 'g' },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
  calories: { type: Number, default: 0 },
});

const TotalsSchema = new Schema({
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
  calories: { type: Number, default: 0 },
});

const MealSchema = new Schema<IMeal>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'User ID is required'], 
    index: true 
  },
  date: { 
    type: Date, 
    default: Date.now, 
    index: true 
  },
  name: { 
    type: String, 
    required: [true, 'Meal name is required'], 
    trim: true 
  },
  time: { 
    type: String, 
    default: () => {
      const now = new Date();
      return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }
  },
  foods: [FoodSchema],
  totals: { 
    type: TotalsSchema, 
    default: () => ({
      protein: 0,
      carbs: 0,
      fat: 0,
      calories: 0
    })
  },
  notes: String
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create compound index for user-date queries
MealSchema.index({ userId: 1, date: 1 });

export default mongoose.models.Meal || mongoose.model<IMeal>('Meal', MealSchema);