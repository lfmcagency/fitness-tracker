import mongoose from 'mongoose';

export interface IMealFood {
  foodId?: mongoose.Types.ObjectId;
  name: string;
  amount: number;
  unit: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface IMealTotals {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface IMealMethods {
  recalculateTotals(): IMealTotals;
}

export interface IMeal extends mongoose.Document {
  creationToken: IMealFood[];
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  name: string;
  time: string;
  foods: IMealFood[];
  totals: IMealTotals;
  notes?: string;
  createdAt: Date;
  creationtoken?: string;
  updatedAt: Date;
  
  // Methods
  recalculateTotals: () => IMealTotals;
}

export interface IMealModel extends mongoose.Model<IMeal, {}, IMealMethods> {}