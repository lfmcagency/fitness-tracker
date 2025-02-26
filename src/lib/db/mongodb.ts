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
      serverSelectionTimeoutMS: 5000,
    };

    // Add proper error handling
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then(mongoose => {
        console.log('Connected to MongoDB');
        return mongoose;
      })
      .catch(error => {
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
    console.error('Failed to connect to MongoDB, using mock data');
  }
  
  return cached.conn;
}

export default dbConnect;