import dbConnect from './mongodb';
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
    await Workout.collection.createIndex({ user: 1, date: -1 });
    await Task.collection.createIndex({ user: 1, date: -1 });
    await Meal.collection.createIndex({ user: 1, date: -1 });
    
    console.log('Database initialization complete');
    
    return {
      success: true,
      message: 'Database initialized successfully'
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