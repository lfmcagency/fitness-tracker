// src/types/models/user.ts
// Represents the structure stored in the MongoDB database via the Mongoose Model
import mongoose, { Document, Types } from 'mongoose';

export interface IWeightEntry {
  _id?: Types.ObjectId; // Automatically added by Mongoose for subdocuments
  weight: number;
  date: Date;
  notes?: string;
  createdAt?: Date; // Added by WeightEntrySchema timestamps
}

export interface IUserSettings {
  weightUnit: 'kg' | 'lbs';
  lengthUnit: 'cm' | 'in';
  theme: 'light' | 'dark' | 'system';
  // Add notificationPreferences if used
  // notificationPreferences?: {
  //   email?: boolean;
  //   push?: boolean;
  // };
}

// Separate optional profile details if needed later
// export interface IUserProfileDetails {
//   height?: number;
//   birthdate?: Date;
//   gender?: string;
//   fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
// }

export interface IUser extends Document {
  // Use Types.ObjectId for Mongoose compatibility in type definition
  _id: Types.ObjectId;
  name?: string | null; // Allow null or undefined based on usage
  email: string;
  password?: string; // Optional because of OAuth
  image?: string | null;
  role: 'user' | 'admin' | 'trainer';
  stats?: {
    level: number;
    xp: number;
    // Add other derivable/storable stats if needed
  };
  settings?: IUserSettings; // Embedded settings object

  // NextAuth fields (usually managed by adapter)
  emailVerified?: Date | null;
  provider?: string | null; // Can be null for credentials users

  // Timestamps added by Schema
  createdAt: Date;
  updatedAt: Date;

  // Methods (ensure these match methods added via schema.methods in User.ts)
  comparePassword(candidatePassword: string): Promise<boolean>;
}