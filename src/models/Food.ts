import mongoose, { Schema, Document, Model } from 'mongoose';
import { IFood, IFoodModel } from '@/types/models/food';
// Non-negative number validator
const nonNegativeValidator = {
  validator: (value: number) => value >= 0,
  message: (props: any) => `${props.path} must be a non-negative number`
};

const FoodSchema = new Schema<IFood, IFoodModel>({
  name: { 
    type: String, 
    required: [true, 'Food name is required'], 
    trim: true, 
    maxlength: [100, 'Food name cannot exceed 100 characters'],
    index: true
  },
  description: { 
    type: String, 
    trim: true, 
    maxlength: [500, 'Description cannot exceed 500 characters'] 
  },
  servingSize: { 
    type: Number, 
    required: [true, 'Serving size is required'],
    validate: [
      { ...nonNegativeValidator },
      { validator: (value: number) => value <= 10000, message: 'Serving size must be less than or equal to 10000' }
    ]
  },
  servingUnit: { 
    type: String, 
    required: [true, 'Serving unit is required'],
    default: 'g', 
    trim: true, 
    maxlength: [20, 'Serving unit cannot exceed 20 characters'] 
  },
  protein: { 
    type: Number, 
    default: 0,
    validate: nonNegativeValidator,
    min: [0, 'Protein cannot be negative'],
    max: [1000, 'Protein value is too high']
  },
  carbs: { 
    type: Number, 
    default: 0,
    validate: nonNegativeValidator,
    min: [0, 'Carbs cannot be negative'],
    max: [1000, 'Carbs value is too high']
  },
  fat: { 
    type: Number, 
    default: 0,
    validate: nonNegativeValidator,
    min: [0, 'Fat cannot be negative'],
    max: [1000, 'Fat value is too high']
  },
  calories: { 
    type: Number, 
    default: 0,
    validate: nonNegativeValidator,
    min: [0, 'Calories cannot be negative'],
    max: [10000, 'Calories value is too high']
  },
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters'],
    index: true
  },
  isSystemFood: {
    type: Boolean,
    default: false,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      // userId is required only if this is not a system food
      return !this.isSystemFood;
    },
    index: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create compound indexes for efficient queries
FoodSchema.index({ name: 'text', description: 'text' });
FoodSchema.index({ isSystemFood: 1, userId: 1 });
FoodSchema.index({ category: 1, isSystemFood: 1 });

// Middleware to verify nutrition calculations (automatic calorie calculation could be added here)
FoodSchema.pre('save', function(next) {
  // Round to 1 decimal place for macros
  this.protein = Math.round(this.protein * 10) / 10;
  this.carbs = Math.round(this.carbs * 10) / 10;
  this.fat = Math.round(this.fat * 10) / 10;
  
  // Round calories to whole number
  this.calories = Math.round(this.calories);
  
  next();
});

export default mongoose.models.Food || mongoose.model<IFood, IFoodModel>('Food', FoodSchema);