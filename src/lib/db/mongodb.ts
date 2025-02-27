import mongoose from 'mongoose';

// Check for MongoDB URI
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
      serverSelectionTimeoutMS: 10000, // Increased timeout for Atlas connections
    };

    console.log('Creating new mongoose connection');
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('Connected to MongoDB successfully');
        return mongoose;
      })
      .catch((error) => {
        console.error('MongoDB connection error:', error);
        
        // Still provide access to mongoose in dev mode for mock data
        if (process.env.NODE_ENV === 'development') {
          console.warn('Using mock data in development mode');
          return mongoose; 
        }
        
        // For production, we'll handle the error but still return mongoose
        // This allows the app to function with mock data even if DB is down
        console.warn('Continuing with mock data due to DB connection failure');
        return mongoose;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    console.error('Error establishing MongoDB connection:', error);
    // We'll continue with mock data regardless of environment
    console.warn('Using mock data due to connection failure');
  }
  
  return cached.conn;
}

export default dbConnect;