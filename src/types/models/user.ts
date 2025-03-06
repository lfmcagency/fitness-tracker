// src/types/models/user.ts
import mongoose from 'mongoose';

export interface BodyweightEntry {
  weight: number;
  date: Date;
  notes?: string;
}

export interface UserSettings {
  weightUnit: 'kg' | 'lbs';
  lengthUnit?: 'cm' | 'in';
  theme?: string;
  notificationPreferences?: {
    email: boolean;
    push: boolean;
  };
}

export interface UserProfile {
  height?: number;
  birthdate?: Date;
  gender?: string;
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export interface IUser extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  image?: string;
  role: 'user' | 'admin' | 'trainer';
  
  // New fields that exist in your actual schema
  bodyweight?: Array<{
    weight: number;
    date: Date;
    notes?: string;
  }>;
  
  stats?: {
    level: number;
    xp: number;
  };
  
  settings?: {
    weightUnit: 'kg' | 'lbs';
    lengthUnit?: 'cm' | 'in';
    theme?: string;
  };
  
  // Account references for NextAuth
  accounts?: mongoose.Types.ObjectId[];
  sessions?: mongoose.Types.ObjectId[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods defined in the schema
  comparePassword(candidatePassword: string): Promise<boolean>;
  addWeightEntry(weight: number, date?: Date, notes?: string): Promise<IUser>;
  getLatestWeight(): { weight: number; date: Date; notes?: string } | null;
  getWeightTrend(days?: number): Array<{ weight: number; date: Date; notes?: string }>;
}