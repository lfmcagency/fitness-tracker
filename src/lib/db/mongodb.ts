import mongoose from 'mongoose';

// Check for MongoDB URI and provide fallback for development
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://louisfaucher95:ZHEpXGfvuNF7ydoB@fitness-tracker.dsosg.mongodb.net/?retryWrites=true&w=majority';

// Define proper types for our global mongoose cache
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Define the global mongoose interface
declare global {
  var mongoose: MongooseCache;
}

// Initialize the cached connection
if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

// Get the cached connection
let cached = global.mongoose;

async function dbConnect() {
  if (cached.conn) {
    console.log('Using cached mongoose connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    console.log('Creating new mongoose connection');
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('Connected to MongoDB successfully');
        return mongoose;
      })
      .catch((error) => {
        console.error('MongoDB connection error:', error);
        
        if (process.env.NODE_ENV === 'development') {
          console.warn('Using mock data in development mode');
          return mongoose; // Return mongoose instance even without connection
        }
        
        throw error; // In production, fail if DB can't connect
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    console.error('Error establishing MongoDB connection:', error);
    if (process.env.NODE_ENV === 'development') {
      console.warn('Continuing in development mode with mock data');
    } else {
      throw error; // In production, we want to fail fast if DB connection fails
    }
  }
  
  return cached.conn;
}

export default dbConnect;