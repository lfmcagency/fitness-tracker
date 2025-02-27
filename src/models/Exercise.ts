import mongoose from 'mongoose';

const ExerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['core', 'push', 'pull', 'legs'],
    required: true,
    index: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  progressionLevel: {
    type: Number,
    default: 1,
    index: true
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
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  tags: [String],
  video: String,
  image: String
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual fields and methods
ExerciseSchema.virtual('calculatedDifficulty').get(function() {
  const level = this.progressionLevel || 1;
  if (level <= 5) return 'beginner';
  if (level <= 10) return 'intermediate';
  return 'advanced';
});

// Create indexes for better performance
ExerciseSchema.index({ category: 1, progressionLevel: 1 });
ExerciseSchema.index({ name: 'text', description: 'text' });

// Only create the model if it doesn't already exist
export default mongoose.models.Exercise || mongoose.model('Exercise', ExerciseSchema);