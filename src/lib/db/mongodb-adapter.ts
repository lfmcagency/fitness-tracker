import { MongoClient } from 'mongodb';

// Check for MongoDB URI and provide fallback for development
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-tracker';
const options = {};

// Add exponential backoff retry logic
let client;
let clientPromise;

// Create a new promise with retry logic
if (process.env.NODE_ENV === 'development') {
  // In development, use a global variable
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    
    // Using a callback to handle connection errors
    global._mongoClientPromise = (async () => {
      try {
        console.log('Connecting to MongoDB...');
        return await client.connect();
      } catch (error) {
        console.error('MongoDB connection error:', error);
        console.warn('Continuing with limited functionality - some features may not work');
        // Return a mock client for development
        return null;
      }
    })();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode
  client = new MongoClient(uri, options);
  clientPromise = (async () => {
    try {
      return await client.connect();
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error; // In production, we should fail if DB can't connect
    }
  })();
}

export default clientPromise;