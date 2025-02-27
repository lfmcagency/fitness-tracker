import mongoose from 'mongoose';

// Use environment variable for connection string
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

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
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10, // Connection pooling - limit concurrent connections
      minPoolSize: 5,   // Keep minimum connections open for performance
      socketTimeoutMS: 45000, // Longer timeout for operations
      family: 4         // Use IPv4, avoids IPv6 issues on some networks
    };

    console.log(`Connecting to MongoDB: ${MONGODB_URI?.substring(0, 20)}...`);
    
    // Set up mongoose connection events for better monitoring
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected successfully');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log(`Connected to MongoDB: ${mongoose.connection.name}`);
        return mongoose;
      })
      .catch((error) => {
        console.error('MongoDB connection error:', error);
        throw error; // Re-throw to handle properly at the caller level
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    console.error('Error establishing MongoDB connection:', error);
    
    // In development, we can continue without DB for UI work
    if (process.env.NODE_ENV === 'development') {
      console.warn('DEVELOPMENT MODE: Proceeding without database connection');
      return mongoose; // Return mongoose instance even without connection
    }
    
    // In production, we should propagate the error
    throw error;
  }
}

export default dbConnect;