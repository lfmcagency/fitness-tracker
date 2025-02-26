// src/models/Exercise.ts
import mongoose from 'mongoose';

const ExerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['core', 'push', 'pull', 'legs'],
    required: true,
  },
  subcategory: String,
  description: String,
  progressionLevel: {
    type: Number,
    default: 1
  },
  previousExercise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exercise'
  },
  nextExercise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exercise'
  },
  unlockRequirements: {
    reps: Number,
    sets: Number,
    holdTime: Number,
    description: String
  }
}, { timestamps: true });

export default mongoose.models.Exercise || mongoose.model('Exercise', ExerciseSchema);