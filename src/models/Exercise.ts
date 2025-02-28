import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for Exercise document
export interface IExercise extends Document {
  name: string;
  category: string;
  subcategory?: string;
  progressionLevel: number;
  description?: string;
  primaryMuscleGroup?: string;
  secondaryMuscleGroup?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  instructions?: string;
  prerequisites?: mongoose.Types.ObjectId[];
  nextProgressions?: mongoose.Types.ObjectId[];
  xpValue: number;
  importedFrom?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual methods
  fullDescription: string;
  formattedName: string;
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
    minlength: [2, 'Name must be at least 2 characters'],
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
    default: 0,
    min: [0, 'Progression level cannot be negative'],
    max: [20, 'Progression level cannot exceed 20'],
    index: true 
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  primaryMuscleGroup: String,
  secondaryMuscleGroup: [String],
  difficulty: { 
    type: String, 
    enum: {
      values: ['beginner', 'intermediate', 'advanced', 'elite'],
      message: '{VALUE} is not a valid difficulty level'
    },
    default: 'beginner'
  },
  instructions: {
    type: String,
    maxlength: [2000, 'Instructions cannot exceed 2000 characters']
  },
  prerequisites: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'Exercise' 
  }],
  nextProgressions: [{ 
    type: Schema.Types.ObjectId,
    ref: 'Exercise' 
  }],
  xpValue: { 
    type: Number, 
    default: 10,
    min: [1, 'XP value must be at least 1'],
    max: [100, 'XP value cannot exceed 100']
  },
  importedFrom: String
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create compound index for uniqueness with error message
ExerciseSchema.index(
  { name: 1, category: 1 }, 
  { 
    unique: true,
    name: 'name_category_unique',
    background: true,
    // Custom error message
    collation: { locale: 'en', strength: 2 } // Case-insensitive
  }
);

// Create text index for search functionality
ExerciseSchema.index(
  { name: 'text', description: 'text', instructions: 'text' },
  { 
    weights: { 
      name: 10,
      description: 5,
      instructions: 3
    },
    name: 'text_search_index'
  }
);

// Add virtual for full description
ExerciseSchema.virtual('fullDescription').get(function(this: IExercise) {
  return `${this.name} - Level ${this.progressionLevel} ${this.category} exercise`;
});

// Add virtual for formatted name (category-specific formatting)
ExerciseSchema.virtual('formattedName').get(function(this: IExercise) {
  let prefix = '';
  
  switch(this.category) {
    case 'core':
      prefix = '💪 ';
      break;
    case 'push':
      prefix = '👐 ';
      break;
    case 'pull':
      prefix = '💫 ';
      break;
    case 'legs':
      prefix = '🦵 ';
      break;
    default:
      prefix = '';
  }
  
  return `${prefix}${this.name} (L${this.progressionLevel})`;
});

// Add pre-save middleware to ensure proper formatting
ExerciseSchema.pre('save', function(next) {
  // Ensure name is properly capitalized
  if (this.name) {
    this.name = this.name.trim();
    this.name = this.name.charAt(0).toUpperCase() + this.name.slice(1);
  }
  
  // Ensure subcategory is properly formatted
  if (this.subcategory) {
    this.subcategory = this.subcategory.trim().toLowerCase();
  }
  
  next();
});

// Add static method to find exercises by difficulty
ExerciseSchema.statics.findByDifficulty = function(difficulty: string): Promise<IExercise[]> {
  return this.find({ difficulty });
};

// Add static method to find next progression exercises
ExerciseSchema.statics.findNextProgressions = function(exerciseId: mongoose.Types.ObjectId | string): Promise<IExercise[] | null> {
  return this.findById(exerciseId)
    .then((exercise: IExercise | null) => {
      if (!exercise) return null;
      
      return this.find({
        category: exercise.category,
        progressionLevel: exercise.progressionLevel + 1
      });
    });
};

// Register the model if it doesn't exist already
const Exercise = mongoose.models.Exercise as IExerciseModel || 
  mongoose.model<IExercise, IExerciseModel>('Exercise', ExerciseSchema);

export default Exercise;