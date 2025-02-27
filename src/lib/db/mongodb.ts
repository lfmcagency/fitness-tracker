import mongoose from 'mongoose';

// Use the environment variable with your Atlas connection string as fallback
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://louisfaucher95:ZHEpXGfvuNF7ydoB@fitness-tracker.dsosg.mongodb.net/?retryWrites=true&w=majority';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    console.log('Using cached MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    console.log('Connecting to MongoDB with URI:', MONGODB_URI);
    
    // Add proper error handling
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then(mongoose => {
        console.log('Successfully connected to MongoDB');
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
    console.error('Failed to connect to MongoDB:', error);
    if (process.env.NODE_ENV === 'production') {
      throw error;
    } else {
      console.warn('Using mock data in development mode');
    }
  }
  
  return cached.conn;
}

export default dbConnect;