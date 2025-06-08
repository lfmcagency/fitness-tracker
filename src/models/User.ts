// src/models/User.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcrypt';
import { IUser, IWeightEntry, IUserSettings } from '@/types/models/user';

// Weight Entry Schema
const WeightEntrySchema = new Schema<IWeightEntry>({
  weight: { type: Number, required: true, min: 1, max: 999 },
  date: { type: Date, default: Date.now, required: true, index: true },
  notes: { type: String, trim: true, maxlength: 500 }
}, { _id: true, timestamps: { createdAt: true, updatedAt: false } });

// User Settings Schema
const UserSettingsSchema = new Schema<IUserSettings>({
  weightUnit: { type: String, enum: ['kg', 'lbs'], default: 'kg' },
  lengthUnit: { type: String, enum: ['cm', 'in'], default: 'cm' },
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' }
}, { _id: false });

// Main User Schema
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
  image: { type: String, default: null },
  settings: { 
    type: UserSettingsSchema,
    default: () => ({ weightUnit: 'kg', lengthUnit: 'cm', theme: 'system' })
  },
  emailVerified: { type: Date, default: null },
  provider: { type: String, default: null },
}, { timestamps: true });

// Clean password hashing middleware
UserSchema.pre<IUser>('save', async function(next) {
  try {
    // Only hash password if it's modified and exists
    if (!this.isModified('password') || !this.password) {
      return next();
    }

    console.log('🔑 [USER_MODEL] Hashing password for user:', this.email);
    
    // Hash the password
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
    
    console.log('✅ [USER_MODEL] Password hashed successfully for:', this.email);
    next();
  } catch (error) {
    console.error('❌ [USER_MODEL] Password hashing failed:', error);
    next(error as Error);
  }
});

// Ensure settings default
UserSchema.pre<IUser>('validate', function(next) {
  if (!this.settings) {
    this.settings = { weightUnit: 'kg', lengthUnit: 'cm', theme: 'system' };
  }
  next();
});

// Password comparison method
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    if (!this.password) {
      console.log('🔑 [USER_MODEL] No password set for user:', this.email);
      return false;
    }
    
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('🔑 [USER_MODEL] Password comparison result for', this.email, ':', isMatch);
    return isMatch;
  } catch (error) {
    console.error('❌ [USER_MODEL] Password comparison error:', error);
    return false;
  }
};

// Create and export model
const User = (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);

export default User;