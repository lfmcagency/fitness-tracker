import mongoose, { Schema, Document, Model } from 'mongoose';
import { IMeal, IMealModel, IMealFood, IMealTotals, IMealMethods } from '@/types/models/meal';

// Non-negative number validator
const nonNegativeValidator = {
  validator: (value: number) => value >= 0,
  message: (props: any) => `${props.path} must be a non-negative number`
};

const FoodSchema = new Schema({
  foodId: { type: Schema.Types.ObjectId, ref: 'Food' },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  amount: { 
    type: Number, 
    required: true,
    validate: [
      { ...nonNegativeValidator },
      { validator: (value: number) => value <= 10000, message: 'Amount must be less than or equal to 10000' }
    ]
  },
  unit: { type: String, default: 'g', trim: true, maxlength: 20 },
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
});

const TotalsSchema = new Schema({
  protein: { 
    type: Number, 
    default: 0,
    validate: nonNegativeValidator,
    min: [0, 'Total protein cannot be negative'],
    max: [10000, 'Total protein value is too high']
  },
  carbs: { 
    type: Number, 
    default: 0,
    validate: nonNegativeValidator,
    min: [0, 'Total carbs cannot be negative'],
    max: [10000, 'Total carbs value is too high']
  },
  fat: { 
    type: Number, 
    default: 0,
    validate: nonNegativeValidator,
    min: [0, 'Total fat cannot be negative'],
    max: [10000, 'Total fat value is too high']
  },
  calories: { 
    type: Number, 
    default: 0,
    validate: nonNegativeValidator,
    min: [0, 'Total calories cannot be negative'],
    max: [50000, 'Total calories value is too high']
  },
});

const MealSchema = new Schema<IMeal, IMealModel, IMealMethods>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'User ID is required'], 
    index: true 
  },
  date: { 
    type: Date, 
    default: Date.now, 
    index: true 
  },
  name: { 
    type: String, 
    required: [true, 'Meal name is required'], 
    trim: true,
    maxlength: [100, 'Meal name cannot exceed 100 characters']
  },
  time: { 
    type: String, 
    default: () => {
      const now = new Date();
      return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    },
    validate: {
      validator: (value: string) => /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value),
      message: 'Time must be in HH:MM format'
    }
  },
  foods: [FoodSchema],
  totals: { 
    type: TotalsSchema, 
    default: () => ({
      protein: 0,
      carbs: 0,
      fat: 0,
      calories: 0
    })
  },
  notes: { 
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create compound index for user-date queries
MealSchema.index({ userId: 1, date: 1 });

// Method to recalculate totals
MealSchema.methods.recalculateTotals = function() {
  const totals = {
    protein: 0,
    carbs: 0,
    fat: 0,
    calories: 0
  };

  // Sum up all food items
  if (this.foods && this.foods.length > 0) {
    this.foods.forEach((food: { protein: any; carbs: any; fat: any; calories: any; }) => {
      totals.protein += Number(food.protein) || 0;
      totals.carbs += Number(food.carbs) || 0;
      totals.fat += Number(food.fat) || 0;
      totals.calories += Number(food.calories) || 0;
    });
  }

  // Round to 1 decimal place for macros, whole number for calories
  totals.protein = Math.round(totals.protein * 10) / 10;
  totals.carbs = Math.round(totals.carbs * 10) / 10;
  totals.fat = Math.round(totals.fat * 10) / 10;
  totals.calories = Math.round(totals.calories);

  this.totals = totals;
  return totals;
};

// Pre-save middleware to calculate totals
MealSchema.pre('save', function(next) {
  this.recalculateTotals();
  next();
});

// Pre-findOneAndUpdate middleware to ensure totals are calculated
MealSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate() as any;
  
  // If we're updating foods, we need to recalculate totals
  if (update && (update.foods || update.$set?.foods)) {
    try {
      const docToUpdate = await this.model.findOne(this.getQuery());
      if (docToUpdate) {
        // Apply the food updates to our document
        if (update.foods) {
          docToUpdate.foods = update.foods;
        } else if (update.$set?.foods) {
          docToUpdate.foods = update.$set.foods;
        }
        
        // Recalculate and set the new totals
        const newTotals = docToUpdate.recalculateTotals();
        
        // Update the totals in the update operation
        if (!update.$set) update.$set = {};
        update.$set.totals = newTotals;
      }
    } catch (error) {
      return next(error as Error);
    }
  }
  
  next();
});

export default mongoose.models.Meal || mongoose.model<IMeal, IMealModel>('Meal', MealSchema);