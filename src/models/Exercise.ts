import mongoose, { Schema, Document } from 'mongoose';

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
}

const ExerciseSchema = new Schema<IExercise>({
  name: { 
    type: String, 
    required: [true, 'Exercise name is required'], 
    trim: true,
    index: true
  },
  category: { 
    type: String, 
    required: [true, 'Category is required'], 
    index: true
  },
  subcategory: { 
    type: String,
    index: true
  },
  progressionLevel: { 
    type: Number, 
    default: 0,
    index: true 
  },
  description: String,
  primaryMuscleGroup: String,
  secondaryMuscleGroup: [String],
  difficulty: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced', 'elite'],
    default: 'beginner'
  },
  instructions: String,
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
    default: 10 
  },
  importedFrom: String
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create compound index for uniqueness
ExerciseSchema.index({ name: 1, category: 1 }, { unique: true });

// Add virtual for full description
ExerciseSchema.virtual('fullDescription').get(function() {
  return `${this.name} - Level ${this.progressionLevel} ${this.category} exercise`;
});

export default mongoose.models.Exercise || mongoose.model<IExercise>('Exercise', ExerciseSchema);