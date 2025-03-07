import { dbConnect } from '@/lib/db';;
import mongoose from 'mongoose';
import User from '@/models/User';
import Exercise from '@/models/Exercise';
import Workout from '@/models/Workout';
import Task from '@/models/Task';
import Meal from '@/models/Meal';

// Safely drop indexes (ignoring errors if they don't exist)
async function safelyDropIndexes(model: mongoose.Model<any>, indexNames: string[]) {
  try {
    for (const indexName of indexNames) {
      try {
        await model.collection.dropIndex(indexName);
        console.log(`Dropped index ${indexName} on ${model.collection.name}`);
      } catch (error) {
        // Ignore error if index doesn't exist
        if (error instanceof Error && 'code' in error && (error as any).code !== 27) {  // Index not found error code
          console.warn(`Warning dropping index ${indexName}:`, error instanceof Error ? error.message : String(error));
        }
      }
    }
    return true;
  } catch (error) {
    console.error('Error dropping indexes:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

export async function initDatabase() {
  try {
    await dbConnect();
    console.log('Connected to MongoDB, initializing database...');
    
    // First drop any conflicting indexes
    await safelyDropIndexes(Exercise, ['text_search_index', 'name_text_description_text']);
    
    // Create indexes for better query performance
    try {
      await User.collection.createIndex({ email: 1 }, { unique: true });
      console.log('Created User email index');
    } catch (e) {
      console.log('User email index already exists');
    }
    
    try {
      await Exercise.collection.createIndex({ category: 1 });
      console.log('Created Exercise category index');
    } catch (e) {
      console.log('Exercise category index already exists');
    }
    
    try {
      await Exercise.collection.createIndex({ progressionLevel: 1 });
      console.log('Created Exercise progressionLevel index');
    } catch (e) {
      console.log('Exercise progressionLevel index already exists');
    }
    
    try {
      // Create text index with specific weights
      await Exercise.collection.createIndex(
        { name: 'text', description: 'text', instructions: 'text' },
        { 
          weights: { name: 10, description: 5, instructions: 3 },
          name: 'text_search_index'
        }
      );
      console.log('Created Exercise text search index');
    } catch (e) {
      console.log('Exercise text search index error:', e instanceof Error ? e.message : String(e));
    }
    
    try {
      await Workout.collection.createIndex({ user: 1, date: -1 });
      console.log('Created Workout user/date index');
    } catch (e) {
      console.log('Workout user/date index already exists');
    }
    
    try {
      await Task.collection.createIndex({ user: 1, date: -1 });
      console.log('Created Task user/date index');
    } catch (e) {
      console.log('Task user/date index already exists');
    }
    
    try {
      await Meal.collection.createIndex({ user: 1, date: -1 });
      console.log('Created Meal user/date index');
    } catch (e) {
      console.log('Meal user/date index already exists');
    }
    
    // Get database information
    const collections = mongoose.connection.collections;
    const collectionNames = Object.keys(collections);
    
    console.log(`Database has ${collectionNames.length} collections: ${collectionNames.join(', ')}`);
    
    return {
      success: true,
      message: 'Database initialized successfully',
      collections: collectionNames
    };
  } catch (error) {
    console.error('Error initializing database:', error instanceof Error ? error.message : String(error));
    return {
      success: false,
      message: 'Failed to initialize database',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function clearDatabase() {
  try {
    await dbConnect();
    console.log('Connected to MongoDB, clearing database...');
    
    // Drop only data, keep collections
    await User.deleteMany({});
    await Exercise.deleteMany({});
    await Workout.deleteMany({});
    await Task.deleteMany({});
    await Meal.deleteMany({});
    
    return {
      success: true,
      message: 'Database cleared successfully'
    };
  } catch (error) {
    console.error('Error clearing database:', error instanceof Error ? error.message : String(error));
    return {
      success: false,
      message: 'Failed to clear database',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function seedDatabase() {
  try {
    await dbConnect();
    
    // Check if exercises exist
    const exerciseCount = await Exercise.countDocuments();
    if (exerciseCount > 0) {
      console.log(`Database already has ${exerciseCount} exercises`);
      return {
        success: true,
        message: `Database already seeded with ${exerciseCount} exercises`
      };
    }
    
    // If no exercises, seed basic exercise data
    const basicExercises = [
      {
        name: 'Push-ups',
        category: 'push',
        subcategory: 'horizontal push',
        description: 'Basic push-up exercise',
        progressionLevel: 1,
        difficulty: 'beginner'
      },
      {
        name: 'Pull-ups',
        category: 'pull',
        subcategory: 'vertical pull',
        description: 'Basic pull-up exercise',
        progressionLevel: 1,
        difficulty: 'beginner'
      },
      {
        name: 'Squats',
        category: 'legs',
        subcategory: 'squat',
        description: 'Basic squat exercise',
        progressionLevel: 1,
        difficulty: 'beginner'
      },
      {
        name: 'Plank',
        category: 'core',
        subcategory: 'plank',
        description: 'Basic plank exercise',
        progressionLevel: 1,
        difficulty: 'beginner'
      }
    ];
    
    await Exercise.insertMany(basicExercises);
    
    return {
      success: true,
      message: `Seeded database with ${basicExercises.length} basic exercises`
    };
  } catch (error) {
    console.error('Error seeding database:', error instanceof Error ? error.message : String(error));
    return {
      success: false,
      message: 'Failed to seed database',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}