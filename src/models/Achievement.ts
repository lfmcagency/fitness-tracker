import mongoose, { Schema, Document } from 'mongoose';

export interface IAchievement extends Document {
  name: string;
  description: string;
  type: 'strength' | 'consistency' | 'nutrition' | 'milestone';
  xpValue: number;
  requirements: {
    exerciseId?: mongoose.Types.ObjectId;
    reps?: number;
    sets?: number;
    streak?: number;
    level?: number;
  };
  icon: string;
  createdAt: Date;
  updatedAt: Date;
}

const AchievementSchema = new Schema<IAchievement>({
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['strength', 'consistency', 'nutrition', 'milestone'],
    required: true 
  },
  xpValue: { 
    type: Number, 
    default: 10 
  },
  requirements: {
    exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise' },
    reps: Number,
    sets: Number,
    streak: Number,
    level: Number
  },
  icon: {
    type: String,
    default: 'trophy'
  }
}, { 
  timestamps: true 
});

export default mongoose.models.Achievement || mongoose.model<IAchievement>('Achievement', AchievementSchema);