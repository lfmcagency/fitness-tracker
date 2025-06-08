// src/models/User.ts
import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import bcrypt from 'bcrypt';
import { IUser, IWeightEntry, IUserSettings } from '@/types/models/user'; // Use the cleaned types

// --- Subdocument Schemas ---

// Re-defined here for clarity, ensure matches type file
const UserSettingsSchema = new Schema<IUserSettings>({
  weightUnit: { type: String, enum: ['kg', 'lbs'], default: 'kg' },
  lengthUnit: { type: String, enum: ['cm', 'in'], default: 'cm' },
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' }
}, { _id: false });


// --- Main User Schema ---

const UserSchema = new Schema<IUser>({
  name: { type: String, trim: true },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.'],
    index: true
  },
  password: {
    type: String,
    required: function(this: IUser) { return !this.provider; },
    minlength: [8, 'Password must be at least 8 characters long'],
  },
  role: { type: String, enum: ['user', 'admin', 'trainer'], default: 'user' },
  image: { type: String, default: null }, // Default to null

  settings: { // Embedded object for settings using the sub-schema
    type: UserSettingsSchema,
    default: () => ({ weightUnit: 'kg', lengthUnit: 'cm', theme: 'system' }) // Use function default
  },
  // --- NextAuth Fields (Managed by Adapter) ---
  emailVerified: { type: Date, default: null },
  provider: { type: String, default: null },

}, { timestamps: true }); // Adds createdAt, updatedAt

// --- Middleware ---
// Password Hashing (keep existing)
UserSchema.pre<IUser>('save', async function(next) { /* ... */ });

// Ensure Settings Default (keep existing pre-validate)
UserSchema.pre('validate', function(next) { /* ... */ });

// --- Methods ---
// Password Comparison (keep existing)
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};


// --- Model Definition ---
const User = (mongoose.models.User as Model<IUser>) ||
             mongoose.model<IUser>('User', UserSchema);

export default User;