import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { IUser } from '@/types/models/user';

const UserSchema = new mongoose.Schema<IUser>({
  name: String,
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: false // Optional for OAuth accounts
  },
  role: {
    type: String, 
    enum: ['user', 'admin', 'trainer'],
    default: 'user'
  },
  image: String,
  bodyweight: [{
    weight: Number,
    date: { type: Date, default: Date.now }
  }],
  stats: {
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 }
  },
  settings: {
    weightUnit: { type: String, enum: ['kg', 'lbs'], default: 'kg' }
  },
  accounts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account'
    }
  ],
  sessions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session'
    }
  ]
}, { timestamps: true });

// Disable pre-save hook for password hashing to avoid conflicts
// We're using direct bcrypt hashing in the registerUser function instead
UserSchema.pre('save', async function(next) {
  console.log('🔍 PRE-SAVE HOOK: Triggered for user', this.email);
  console.log('🔍 PRE-SAVE HOOK: Password hashing is now handled directly in the registerUser function');
  // Pass through without hashing - we're assuming password is already hashed
  next();
});

// Method to compare password for login
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  console.log('🔍 COMPARE PASSWORD: Method called for user', this.email);
  
  if (!this.password) {
    console.log('🔍 COMPARE PASSWORD: No password stored for this user');
    return false;
  }
  
  console.log('🔍 COMPARE PASSWORD: Hash stored in DB (preview):', this.password.substring(0, 20) + '...');
  console.log('🔍 COMPARE PASSWORD: Using bcrypt.compare with imported bcrypt');
  
  try {
    // Create a fresh bcrypt import to ensure we're using the most reliable version
    const freshBcrypt = require('bcrypt');
    const isMatch = await freshBcrypt.compare(candidatePassword, this.password);
    console.log('🔍 COMPARE PASSWORD: Password match result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('🔍 COMPARE PASSWORD ERROR:', error);
    // Don't throw the error, just return false and let the auth flow handle it
    return false;
  }
};

// Use this pattern to avoid model recompilation errors
const User = mongoose.models.User as mongoose.Model<IUser> || 
  mongoose.model<IUser>('User', UserSchema);

export default User;