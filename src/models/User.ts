import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    // Make password optional for now during development
    required: false
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
  }
}, { timestamps: true });

// Use this pattern to avoid model recompilation errors
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;