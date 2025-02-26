import mongoose from 'mongoose';

// Check for MongoDB URI and provide fallback for development
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-tracker';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    // Add proper error handling
    cached.promise = (async () => {
      try {
        console.log('Connecting to MongoDB...');
        return await mongoose.connect(MONGODB_URI, opts);
      } catch (error) {
        console.error('MongoDB connection error:', error);
        
        if (process.env.NODE_ENV === 'development') {
          console.warn('Continuing with limited functionality in development mode');
          return mongoose; // Return mongoose instance even without connection
        } else {
          throw error; // In production, fail if DB can't connect
        }
      }
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Already logged in the promise
    if (process.env.NODE_ENV !== 'development') {
      throw error;
    }
  }
  
  return cached.conn;
}

export default dbConnect;