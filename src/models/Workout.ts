// src/models/Workout.ts
import mongoose from 'mongoose';

const SetSchema = new mongoose.Schema({
  exercise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true
  },
  reps: Number,
  weight: Number,
  holdTime: Number,
  completed: {
    type: Boolean,
    default: false
  }
});

const WorkoutSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: String,
  date: {
    type: Date,
    default: Date.now
  },
  bodyweight: Number,
  duration: Number, // in minutes
  sets: [SetSchema],
  notes: String
}, { timestamps: true });

export default mongoose.models.Workout || mongoose.model('Workout', WorkoutSchema);