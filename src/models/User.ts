// src/models/User.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcrypt';
import { IUser } from '@/types/models/user';

const UserSchema = new Schema<IUser>({
  name: { type: String, trim: true },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.'],
    index: true // Add index for faster lookups
  },
  password: {
    type: String,
    required: function(this: IUser) {
        // Password is required only if it's a credentials-based account (not OAuth)
        // Assuming OAuth accounts won't have a password set initially.
        // Adjust logic if needed based on how you handle OAuth integration.
        return !this.provider; // Example: Check for a 'provider' field added by adapter/OAuth
    },
    minlength: [8, 'Password must be at least 8 characters long'],
    // select: false // Optional: Uncomment to hide password by default in queries
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'trainer'], // Define allowed roles
    default: 'user'
  },
  image: String, // URL to profile image
  bodyweight: [{ // Array to track bodyweight history
    weight: { type: Number, required: true },
    date: { type: Date, default: Date.now, required: true }
  }],
  stats: { // User stats managed by the app
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 }
  },
  settings: { // User-specific settings
    weightUnit: { type: String, enum: ['kg', 'lbs'], default: 'kg' }
    // Add other settings as needed (e.g., theme, notifications)
  },
  // Fields for NextAuth MongoDB Adapter (managed automatically, no need to define here usually)
  // emailVerified: Date,
  // provider: String, // Example field if needed for password requirement logic

  // Removed manual 'accounts' and 'sessions' references - handled by adapter
  // accounts: [{ type: Schema.Types.ObjectId, ref: 'Account' }],
  // sessions: [{ type: Schema.Types.ObjectId, ref: 'Session' }],

}, { timestamps: true }); // Add createdAt and updatedAt timestamps

// --- Password Hashing Middleware ---
UserSchema.pre<IUser>('save', async function(next) {
  // Only hash the password if it has been modified (or is new) and is not empty
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  // Hash the password
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    console.error('Error hashing password:', error);
    next(error); // Pass error to Mongoose
  }
});

// --- Password Comparison Method ---
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  // Check if stored password exists
  if (!this.password) {
      console.warn(`User ${this.email} has no password stored for comparison.`);
      return false;
  }

  try {
    // Use bcrypt to compare the candidate password with the stored hash
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    return isMatch;
  } catch (error) {
    console.error('Error comparing password:', error);
    return false; // Return false on comparison error
  }
};

// --- Prevent Model Recompilation ---
// Use existing model if it exists, otherwise create it
const User = (mongoose.models.User as Model<IUser>) ||
             mongoose.model<IUser>('User', UserSchema);

export default User;