/**
 * Seed script for the food database
 * Run with: node scripts/seed-foods.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Connect to the database
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Import the Food model
const Food = require('../src/models/Food').default || mongoose.model('Food');

// Common food items categorized for seeding
const foods = [
  // Proteins
  {
    name: 'Chicken Breast',
    description: 'Boneless, skinless chicken breast, cooked',
    servingSize: 100,
    servingUnit: 'g',
    protein: 31,
    carbs: 0,
    fat: 3.6,
    calories: 165,
    category: 'Proteins',
    isSystemFood: true
  },
  {
    name: 'Beef, Ground (90% lean)',
    description: 'Lean ground beef, cooked',
    servingSize: 100,
    servingUnit: 'g',
    protein: 26,
    carbs: 0,
    fat: 10,
    calories: 196,
    category: 'Proteins',
    isSystemFood: true
  },
  {
    name: 'Salmon, Atlantic',
    description: 'Cooked Atlantic salmon fillet',
    servingSize: 100,
    servingUnit: 'g',
    protein: 25,
    carbs: 0,
    fat: 13,
    calories: 208,
    category: 'Proteins',
    isSystemFood: true
  },
  {
    name: 'Tuna, Canned in Water',
    description: 'Chunk light tuna, drained',
    servingSize: 100,
    servingUnit: 'g',
    protein: 26,
    carbs: 0,
    fat: 1,
    calories: 116,
    category: 'Proteins',
    isSystemFood: true
  },
  {
    name: 'Eggs',
    description: 'Whole egg, large',
    servingSize: 50,
    servingUnit: 'g',
    protein: 6,
    carbs: 0.6,
    fat: 5,
    calories: 72,
    category: 'Proteins',
    isSystemFood: true
  },
  {
    name: 'Tofu, Firm',
    description: 'Firm tofu block',
    servingSize: 100,
    servingUnit: 'g',
    protein: 15.5,
    carbs: 2.5,
    fat: 9,
    calories: 144,
    category: 'Proteins',
    isSystemFood: true
  },
  {
    name: 'Greek Yogurt, Plain',
    description: 'Plain, nonfat Greek yogurt',
    servingSize: 100,
    servingUnit: 'g',
    protein: 10,
    carbs: 3.6,
    fat: 0.4,
    calories: 59,
    category: 'Proteins',
    isSystemFood: true
  },
  {
    name: 'Cottage Cheese',
    description: 'Low-fat cottage cheese',
    servingSize: 100,
    servingUnit: 'g',
    protein: 12.5,
    carbs: 3.1,
    fat: 2.2,
    calories: 83,
    category: 'Proteins',
    isSystemFood: true
  },
  {
    name: 'Turkey Breast',
    description: 'Boneless, skinless turkey breast, cooked',
    servingSize: 100,
    servingUnit: 'g',
    protein: 29,
    carbs: 0,
    fat: 1.2,
    calories: 135,
    category: 'Proteins',
    isSystemFood: true
  },
  {
    name: 'Shrimp',
    description: 'Cooked shrimp',
    servingSize: 100,
    servingUnit: 'g',
    protein: 24,
    carbs: 0.2,
    fat: 1.7,
    calories: 119,
    category: 'Proteins',
    isSystemFood: true
  },
  
  // Grains
  {
    name: 'Brown Rice',
    description: 'Cooked brown rice',
    servingSize: 100,
    servingUnit: 'g',
    protein: 2.6,
    carbs: 23,
    fat: 0.9,
    calories: 112,
    category: 'Grains',
    isSystemFood: true
  },
  {
    name: 'Oatmeal',
    description: 'Cooked rolled oats',
    servingSize: 100,
    servingUnit: 'g',
    protein: 3.6,
    carbs: 12,
    fat: 1.4,
    calories: 71,
    category: 'Grains',
    isSystemFood: true
  },
  {
    name: 'Quinoa',
    description: 'Cooked quinoa',
    servingSize: 100,
    servingUnit: 'g',
    protein: 4.1,
    carbs: 21.3,
    fat: 1.9,
    calories: 120,
    category: 'Grains',
    isSystemFood: true
  },
  {
    name: 'Whole Wheat Bread',
    description: 'Whole wheat bread slice',
    servingSize: 40,
    servingUnit: 'g',
    protein: 4,
    carbs: 17,
    fat: 1.1,
    calories: 91,
    category: 'Grains',
    isSystemFood: true
  },
  {
    name: 'White Rice',
    description: 'Cooked white rice',
    servingSize: 100,
    servingUnit: 'g',
    protein: 2.4,
    carbs: 28.2,
    fat: 0.2,
    calories: 129,
    category: 'Grains',
    isSystemFood: true
  },
  {
    name: 'Pasta, Whole Wheat',
    description: 'Cooked whole wheat pasta',
    servingSize: 100,
    servingUnit: 'g',
    protein: 5.3,
    carbs: 23.5,
    fat: 0.8,
    calories: 124,
    category: 'Grains',
    isSystemFood: true
  },
  {
    name: 'Pasta, White',
    description: 'Cooked white pasta',
    servingSize: 100,
    servingUnit: 'g',
    protein: 5.2,
    carbs: 25.4,
    fat: 0.9,
    calories: 131,
    category: 'Grains',
    isSystemFood: true
  },
  {
    name: 'Corn Tortilla',
    description: 'Corn tortilla',
    servingSize: 30,
    servingUnit: 'g',
    protein: 1.5,
    carbs: 13.5,
    fat: 0.5,
    calories: 65,
    category: 'Grains',
    isSystemFood: true
  },
  
  // Vegetables
  {
    name: 'Broccoli',
    description: 'Raw broccoli',
    servingSize: 100,
    servingUnit: 'g',
    protein: 2.8,
    carbs: 6.6,
    fat: 0.4,
    calories: 34,
    category: 'Vegetables',
    isSystemFood: true
  },
  {
    name: 'Spinach',
    description: 'Raw spinach',
    servingSize: 100,
    servingUnit: 'g',
    protein: 2.9,
    carbs: 3.6,
    fat: 0.4,
    calories: 23,
    category: 'Vegetables',
    isSystemFood: true
  },
  {
    name: 'Kale',
    description: 'Raw kale',
    servingSize: 100,
    servingUnit: 'g',
    protein: 2.9,
    carbs: 9.0,
    fat: 0.6,
    calories: 50,
    category: 'Vegetables',
    isSystemFood: true
  },
  {
    name: 'Sweet Potato',
    description: 'Cooked sweet potato',
    servingSize: 100,
    servingUnit: 'g',
    protein: 1.6,
    carbs: 20.1,
    fat: 0.1,
    calories: 90,
    category: 'Vegetables',
    isSystemFood: true
  },
  {
    name: 'Carrots',
    description: 'Raw carrots',
    servingSize: 100,
    servingUnit: 'g',
    protein: 0.9,
    carbs: 9.6,
    fat: 0.2,
    calories: 41,
    category: 'Vegetables',
    isSystemFood: true
  },
  {
    name: 'Bell Pepper',
    description: 'Raw bell pepper',
    servingSize: 100,
    servingUnit: 'g',
    protein: 0.9,
    carbs: 4.6,
    fat: 0.2,
    calories: 20,
    category: 'Vegetables',
    isSystemFood: true
  },
  {
    name: 'Cauliflower',
    description: 'Raw cauliflower',
    servingSize: 100,
    servingUnit: 'g',
    protein: 1.9,
    carbs: 5.0,
    fat: 0.3,
    calories: 25,
    category: 'Vegetables',
    isSystemFood: true
  },
  {
    name: 'Tomato',
    description: 'Raw tomato',
    servingSize: 100,
    servingUnit: 'g',
    protein: 0.9,
    carbs: 3.9,
    fat: 0.2,
    calories: 18,
    category: 'Vegetables',
    isSystemFood: true
  },
  {
    name: 'Cucumber',
    description: 'Raw cucumber',
    servingSize: 100,
    servingUnit: 'g',
    protein: 0.7,
    carbs: 3.6,
    fat: 0.1,
    calories: 15,
    category: 'Vegetables',
    isSystemFood: true
  },
  {
    name: 'Zucchini',
    description: 'Raw zucchini',
    servingSize: 100,
    servingUnit: 'g',
    protein: 1.2,
    carbs: 3.1,
    fat: 0.3,
    calories: 17,
    category: 'Vegetables',
    isSystemFood: true
  },
  
  // Fruits
  {
    name: 'Apple',
    description: 'Medium raw apple with skin',
    servingSize: 100,
    servingUnit: 'g',
    protein: 0.3,
    carbs: 13.8,
    fat: 0.2,
    calories: 52,
    category: 'Fruits',
    isSystemFood: true
  },
  {
    name: 'Banana',
    description: 'Medium banana',
    servingSize: 100,
    servingUnit: 'g',
    protein: 1.1,
    carbs: 22.8,
    fat: 0.3,
    calories: 89,
    category: 'Fruits',
    isSystemFood: true
  },
  {
    name: 'Berries, Mixed',
    description: 'Mixed berries (strawberries, blueberries, raspberries)',
    servingSize: 100,
    servingUnit: 'g',
    protein: 0.7,
    carbs: 14.5,
    fat: 0.3,
    calories: 58,
    category: 'Fruits',
    isSystemFood: true
  },
  {
    name: 'Orange',
    description: 'Medium orange, peeled',
    servingSize: 100,
    servingUnit: 'g',
    protein: 0.9,
    carbs: 11.8,
    fat: 0.1,
    calories: 47,
    category: 'Fruits',
    isSystemFood: true
  },
  {
    name: 'Avocado',
    description: '1/2 medium avocado',
    servingSize: 100,
    servingUnit: 'g',
    protein: 2.0,
    carbs: 8.5,
    fat: 15.0,
    calories: 160,
    category: 'Fruits',
    isSystemFood: true
  },
  {
    name: 'Mango',
    description: 'Sliced raw mango',
    servingSize: 100,
    servingUnit: 'g',
    protein: 0.8,
    carbs: 15.0,
    fat: 0.4,
    calories: 60,
    category: 'Fruits',
    isSystemFood: true
  },
  {
    name: 'Pineapple',
    description: 'Raw pineapple chunks',
    servingSize: 100,
    servingUnit: 'g',
    protein: 0.5,
    carbs: 13.1,
    fat: 0.1,
    calories: 50,
    category: 'Fruits',
    isSystemFood: true
  },
  
  // Dairy
  {
    name: 'Milk, 2%',
    description: '2% fat milk',
    servingSize: 100,
    servingUnit: 'ml',
    protein: 3.3,
    carbs: 4.8,
    fat: 2.0,
    calories: 50,
    category: 'Dairy',
    isSystemFood: true
  },
  {
    name: 'Cheddar Cheese',
    description: 'Cheddar cheese',
    servingSize: 30,
    servingUnit: 'g',
    protein: 7.0,
    carbs: 0.4,
    fat: 9.0,
    calories: 110,
    category: 'Dairy',
    isSystemFood: true
  },
  {
    name: 'Yogurt, Plain',
    description: 'Plain whole milk yogurt',
    servingSize: 100,
    servingUnit: 'g',
    protein: 3.5,
    carbs: 4.7,
    fat: 3.3,
    calories: 61,
    category: 'Dairy',
    isSystemFood: true
  },
  
  // Nuts & Seeds
  {
    name: 'Almonds',
    description: 'Raw almonds',
    servingSize: 30,
    servingUnit: 'g',
    protein: 6.0,
    carbs: 6.1,
    fat: 14.0,
    calories: 170,
    category: 'Nuts & Seeds',
    isSystemFood: true
  },
  {
    name: 'Peanut Butter',
    description: 'Natural peanut butter',
    servingSize: 30,
    servingUnit: 'g',
    protein: 8.0,
    carbs: 6.0,
    fat: 16.0,
    calories: 190,
    category: 'Nuts & Seeds',
    isSystemFood: true
  },
  {
    name: 'Walnuts',
    description: 'Raw walnut halves',
    servingSize: 30,
    servingUnit: 'g',
    protein: 4.3,
    carbs: 3.9,
    fat: 18.5,
    calories: 196,
    category: 'Nuts & Seeds',
    isSystemFood: true
  },
  {
    name: 'Chia Seeds',
    description: 'Raw chia seeds',
    servingSize: 15,
    servingUnit: 'g',
    protein: 2.4,
    carbs: 7.7,
    fat: 4.3,
    calories: 74,
    category: 'Nuts & Seeds',
    isSystemFood: true
  },
  {
    name: 'Flax Seeds',
    description: 'Ground flax seeds',
    servingSize: 15,
    servingUnit: 'g',
    protein: 2.6,
    carbs: 4.0,
    fat: 6.0,
    calories: 82,
    category: 'Nuts & Seeds',
    isSystemFood: true
  },
  
  // Oils & Fats
  {
    name: 'Olive Oil',
    description: 'Extra virgin olive oil',
    servingSize: 15,
    servingUnit: 'ml',
    protein: 0,
    carbs: 0,
    fat: 14.0,
    calories: 126,
    category: 'Oils & Fats',
    isSystemFood: true
  },
  {
    name: 'Coconut Oil',
    description: 'Virgin coconut oil',
    servingSize: 15,
    servingUnit: 'ml',
    protein: 0,
    carbs: 0,
    fat: 14.0,
    calories: 126,
    category: 'Oils & Fats',
    isSystemFood: true
  },
  {
    name: 'Butter',
    description: 'Unsalted butter',
    servingSize: 15,
    servingUnit: 'g',
    protein: 0.1,
    carbs: 0.1,
    fat: 12.0,
    calories: 108,
    category: 'Oils & Fats',
    isSystemFood: true
  },
  
  // Supplements
  {
    name: 'Protein Powder, Whey',
    description: 'Whey protein isolate powder',
    servingSize: 30,
    servingUnit: 'g',
    protein: 24.0,
    carbs: 2.0,
    fat: 1.5,
    calories: 120,
    category: 'Supplements',
    isSystemFood: true
  },
  {
    name: 'Protein Powder, Plant-Based',
    description: 'Plant-based protein blend',
    servingSize: 30,
    servingUnit: 'g',
    protein: 20.0,
    carbs: 5.0,
    fat: 2.0,
    calories: 120,
    category: 'Supplements',
    isSystemFood: true
  },
  {
    name: 'Creatine Monohydrate',
    description: 'Creatine monohydrate powder',
    servingSize: 5,
    servingUnit: 'g',
    protein: 0,
    carbs: 0,
    fat: 0,
    calories: 0,
    category: 'Supplements',
    isSystemFood: true
  }
];

// Function to seed the database
async function seedFoods() {
  try {
    console.log('Connected to MongoDB');
    
    // Check if foods already exist
    const existingCount = await Food.countDocuments({ isSystemFood: true });
    
    if (existingCount > 0) {
      console.log(`${existingCount} system foods already exist in the database.`);
      const shouldReset = process.argv.includes('--reset');
      
      if (shouldReset) {
        console.log('Removing existing system foods...');
        await Food.deleteMany({ isSystemFood: true });
      } else {
        console.log('Use --reset flag to replace existing system foods.');
        return process.exit(0);
      }
    }
    
    // Insert foods
    await Food.insertMany(foods);
    console.log(`${foods.length} food items have been seeded successfully!`);
    
    // List food categories and counts
    const categories = await Food.aggregate([
      { $match: { isSystemFood: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\nFood categories:');
    categories.forEach(category => {
      console.log(`- ${category._id}: ${category.count} items`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding foods:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedFoods();