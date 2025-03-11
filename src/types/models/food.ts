import mongoose from 'mongoose';

export interface IFood extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  servingSize: number;
  servingUnit: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  category?: string;
  isSystemFood: boolean;
  userId?: mongoose.Types.ObjectId;
  brand?: string;
  barcode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFoodModel extends mongoose.Model<IFood> {}