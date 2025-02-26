// src/models/Meal.ts
import mongoose from 'mongoose';

const FoodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  protein: Number,
  carbs: Number,
  fat: Number,
  calories: Number
});

const MealSchema = new mongoose.Schema({
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
  time: String,
  foods: [FoodSchema]
}, { timestamps: true });

export default mongoose.models.Meal || mongoose.model('Meal', MealSchema);