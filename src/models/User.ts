import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const UserSchema = new mongoose.Schema({
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

// Pre-save hook to hash password before saving
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password along with the new salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare password for login
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Use this pattern to avoid model recompilation errors
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;