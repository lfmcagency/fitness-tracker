import { MongoClient } from 'mongodb';

// Use environment variable or fallback to your Atlas connection string
const uri = process.env.MONGODB_URI || 'mongodb+srv://louisfaucher95:ZHEpXGfvuNF7ydoB@fitness-tracker.dsosg.mongodb.net/?retryWrites=true&w=majority';
const options = {};

// Add information for debugging
console.log('MongoDB Adapter - Using connection string (masked):', uri.replace(/mongodb\+srv:\/\/.*?@/, 'mongodb+srv://[username:password]@'));

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  // In development, use a global variable
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    
    global._mongoClientPromise = (async () => {
      try {
        console.log('Connecting to MongoDB from mongodb-adapter...');
        return await client.connect();
      } catch (error) {
        console.error('MongoDB connection error in adapter:', error);
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
      console.log('Connecting to MongoDB in production mode...');
      return await client.connect();
    } catch (error) {
      console.error('MongoDB connection error in production:', error);
      throw error; // In production, we should fail if DB can't connect
    }
  })();
}

export default clientPromise;