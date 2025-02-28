import { dbConnect } from '@/lib/db/mongodb';
import mongoose from 'mongoose';
import User from '@/models/User';
import Exercise from '@/models/Exercise';
import Workout from '@/models/Workout';
import Task from '@/models/Task';
import Meal from '@/models/Meal';

export async function initDatabase() {
  try {
    await dbConnect();
    console.log('Connected to MongoDB, initializing database...');
    
    // Create indexes for better query performance
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await Exercise.collection.createIndex({ category: 1 });
    await Exercise.collection.createIndex({ progressionLevel: 1 });
    await Exercise.collection.createIndex({ 'name': 'text', 'description': 'text' });
    await Workout.collection.createIndex({ user: 1, date: -1 });
    await Task.collection.createIndex({ user: 1, date: -1 });
    await Meal.collection.createIndex({ user: 1, date: -1 });
    
    // Create a database initialization endpoint
    const collections = mongoose.connection.collections;
    const collectionNames = Object.keys(collections);
    
    console.log(`Database has ${collectionNames.length} collections: ${collectionNames.join(', ')}`);
    
    return {
      success: true,
      message: 'Database initialized successfully',
      collections: collectionNames
    };
  } catch (error) {
    console.error('Error initializing database:', error);
    return {
      success: false,
      message: 'Failed to initialize database',
      error: error instanceof Error ? error.message : 'Unknown error'
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
    console.error('Error seeding database:', error);
    return {
      success: false,
      message: 'Failed to seed database',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}