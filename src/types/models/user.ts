import mongoose from 'mongoose';

// Base User interface (matches MongoDB schema)
export interface IUser extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  image?: string;
  role: 'user' | 'admin' | 'trainer';
  settings?: {
    weightUnit: 'kg' | 'lbs';
    lengthUnit?: 'cm' | 'in';
    theme?: string;
    notificationPreferences?: {
      email: boolean;
      push: boolean;
    };
  };
  bodyweight?: Array<{
    weight: number;
    date: Date;
    notes?: string;
  }>;
  stats?: {
    level: number;
    xp: number;
  };
  accounts?: mongoose.Types.ObjectId[];
  sessions?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  
  // Methods defined in the schema
  comparePassword(candidatePassword: string): Promise<boolean>;
}