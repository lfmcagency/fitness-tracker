// src/models/Exercise.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for Exercise document
export interface IExercise extends Document {
  name: string;
  category: string;
  subcategory?: string;
  progressionLevel: number;
  description?: string;
  primaryMuscleGroup?: string;
  secondaryMuscleGroups?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  
  // New fields for CSV import
  uniqueId?: string;
  relPrev?: string;
  relNext?: string;
  xpValue: number;
  unlockRequirements?: string;
  formCues?: string;
  
  // Relationship references
  previousExercise?: mongoose.Types.ObjectId;
  nextExercise?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

// Interface for Exercise model with static methods
interface IExerciseModel extends Model<IExercise> {
  findByDifficulty(difficulty: string): Promise<IExercise[]>;
  findNextProgressions(exerciseId: mongoose.Types.ObjectId | string): Promise<IExercise[] | null>;
}

const ExerciseSchema = new Schema<IExercise>({
  name: { 
    type: String, 
    required: [true, 'Exercise name is required'], 
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters'],
    index: true
  },
  category: { 
    type: String, 
    required: [true, 'Category is required'], 
    enum: {
      values: ['core', 'push', 'pull', 'legs'],
      message: '{VALUE} is not a valid category'
    },
    index: true
  },
  subcategory: { 
    type: String,
    trim: true,
    index: true
  },
  progressionLevel: { 
    type: Number, 
    default: 1,
    min: [0, 'Progression level cannot be negative'],
    index: true 
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // New fields for CSV import
  uniqueId: { 
    type: String, 
    unique: true, 
    sparse: true,  // Allows null values while maintaining uniqueness
    index: true
  },
  relPrev: { type: String },
  relNext: { type: String },
  xpValue: { 
    type: Number, 
    default: 10,
    min: [1, 'XP value must be at least 1']
  },
  unlockRequirements: String,
  formCues: String,
  primaryMuscleGroup: String,
  secondaryMuscleGroups: String,
  
  difficulty: { 
    type: String, 
    enum: {
      values: ['beginner', 'intermediate', 'advanced', 'elite'],
      message: '{VALUE} is not a valid difficulty level'
    },
    default: 'beginner'
  },
  
  // Relationship references as ObjectIds
  previousExercise: { type: Schema.Types.ObjectId, ref: 'Exercise' },
  nextExercise: { type: Schema.Types.ObjectId, ref: 'Exercise' }
}, { 
  timestamps: true
});

// Create text index for search functionality
ExerciseSchema.index(
  { name: 'text', description: 'text', formCues: 'text' },
  { 
    weights: { 
      name: 10,
      description: 5,
      formCues: 3
    },
    name: 'text_search_index'
  }
);

// Add static method to find exercises by difficulty
ExerciseSchema.statics.findByDifficulty = function(difficulty: string): Promise<IExercise[]> {
  return this.find({ difficulty });
};

// Add static method to find next progression exercises
ExerciseSchema.statics.findNextProgressions = function(exerciseId: mongoose.Types.ObjectId | string): Promise<IExercise[] | null> {
  return this.findById(exerciseId)
    .then((exercise: IExercise | null) => {
      if (!exercise) return null;
      
      if (exercise.nextExercise) {
        return this.find({ _id: exercise.nextExercise });
      }
      
      return this.find({
        category: exercise.category,
        subcategory: exercise.subcategory,
        progressionLevel: exercise.progressionLevel + 1
      });
    });
};

// Use this pattern to avoid model recompilation errors
const Exercise = mongoose.models.Exercise as IExerciseModel || 
  mongoose.model<IExercise, IExerciseModel>('Exercise', ExerciseSchema);

export default Exercise;