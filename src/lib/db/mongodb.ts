import mongoose from 'mongoose';

// Get the MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

// Check if MONGODB_URI is defined
if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

// Store the validated URI in a properly typed variable
// This ensures TypeScript knows it's a string throughout the file
const connectionString: string = MONGODB_URI;

// Define type for the global cache
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Add the cache to the global object
declare global {
  var mongoose: MongooseCache;
}

// Initialize the cache
if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  // If we already have a connection, return it
  if (global.mongoose.conn) {
    return global.mongoose.conn;
  }

  // If a connection is in progress, wait for it
  if (!global.mongoose.promise) {
    const opts = {
      bufferCommands: true,
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 10000,  // Increased timeout
      socketTimeoutMS: 45000,
      family: 4  // Use IPv4, skip trying IPv6
    };

    mongoose.set('strictQuery', true);
    
    // Log connection attempt but avoid excessive logging in production
    if (process.env.NODE_ENV !== 'production') {
      console.log('Connecting to MongoDB...');
    }
    
    global.mongoose.promise = mongoose.connect(connectionString, opts)
      .then(mongoose => {
        console.log('Connected to MongoDB successfully');
        return mongoose;
      })
      .catch(error => {
        console.error('MongoDB connection error:', error);
        // Clear the promise so we can retry on next request
        global.mongoose.promise = null;
        throw error;
      });
  }

  try {
    // Wait for the connection
    global.mongoose.conn = await global.mongoose.promise;
  } catch (e) {
    // Clear the promise on error to allow retry on next request
    global.mongoose.promise = null;
    // Log the error with more context for debugging
    console.error('MongoDB connection failed, will retry on next request:', e);
    throw e;
  }

  return global.mongoose.conn;
}

// Add a function to explicitly handle connection errors in serverless environments
export async function ensureDbConnected() {
  try {
    return await dbConnect();
  } catch (error) {
    console.error('Error ensuring database connection:', error);
    
    // Try one more time with a clean connection
    global.mongoose = { conn: null, promise: null };
    try {
      return await dbConnect();
    } catch (retryError) {
      console.error('Retry failed, database connection is unavailable:', retryError);
      throw retryError;
    }
  }
}

export async function dbDisconnect() {
  if (global.mongoose?.conn) {
    await mongoose.disconnect();
    global.mongoose.conn = null;
    global.mongoose.promise = null;
    console.log('Disconnected from MongoDB');
  }
}

// Export a default function for backwards compatibility
export default dbConnect;