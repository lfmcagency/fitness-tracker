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
    trim: true,
    default: ''
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  progressionLevel: {
    type: Number,
    default: 1,
    index: true
  },
  previousExercise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exercise',
    default: null
  },
  nextExercise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exercise',
    default: null
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
  video: String,
  image: String
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add a virtual field for automatic difficulty calculation based on progression level
ExerciseSchema.virtual('calculatedDifficulty').get(function() {
  const level = this.progressionLevel || 1;
  if (level <= 5) return 'beginner';
  if (level <= 10) return 'intermediate';
  return 'advanced';
});

// Create indexes for better performance
ExerciseSchema.index({ category: 1, progressionLevel: 1 });
ExerciseSchema.index({ name: 'text', description: 'text' });

// Create a method to get next exercises in the progression
ExerciseSchema.methods.getProgression = async function() {
  const Exercise = mongoose.model('Exercise');
  const currentLevel = this.progressionLevel;
  const category = this.category;
  
  return await Exercise.find({
    category,
    progressionLevel: { $gt: currentLevel }
  }).sort({ progressionLevel: 1 }).limit(3);
};

export default mongoose.models.Exercise || mongoose.model('Exercise', ExerciseSchema);