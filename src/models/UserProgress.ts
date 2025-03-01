import mongoose, { Schema, Document } from 'mongoose';

interface CategoryProgress {
  level: number;
  xp: number;
  unlockedExercises: mongoose.Types.ObjectId[];
}

export interface IUserProgress extends Document {
  userId: mongoose.Types.ObjectId;
  globalLevel: number;
  globalXp: number;
  categoryProgress: {
    core: CategoryProgress;
    push: CategoryProgress;
    pull: CategoryProgress;
    legs: CategoryProgress;
  };
  achievements: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const CategoryProgressSchema = new Schema({
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  unlockedExercises: [{ type: Schema.Types.ObjectId, ref: 'Exercise' }]
});

const UserProgressSchema = new Schema<IUserProgress>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    unique: true
  },
  globalLevel: { type: Number, default: 1 },
  globalXp: { type: Number, default: 0 },
  categoryProgress: {
    core: { type: CategoryProgressSchema, default: () => ({}) },
    push: { type: CategoryProgressSchema, default: () => ({}) },
    pull: { type: CategoryProgressSchema, default: () => ({}) },
    legs: { type: CategoryProgressSchema, default: () => ({}) }
  },
  achievements: [{ type: Schema.Types.ObjectId, ref: 'Achievement' }]
}, { 
  timestamps: true 
});

export default mongoose.models.UserProgress || mongoose.model<IUserProgress>('UserProgress', UserProgressSchema);