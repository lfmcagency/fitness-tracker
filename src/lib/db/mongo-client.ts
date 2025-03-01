import mongoose from 'mongoose';
import { MongoClient, MongoClientOptions, ServerApiVersion } from 'mongodb';

// Connection configuration
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'fitness-tracker';

// Max number of connection attempts
const MAX_RETRIES = 5;
// Initial delay in ms (500ms)
const INITIAL_RETRY_DELAY = 500;
// Maximum delay in ms (30 seconds)
const MAX_RETRY_DELAY = 30000;

// Validate connection string
if (!MONGODB_URI) {
  throw new Error(
    'MongoDB connection error: MONGODB_URI is not defined in environment variables'
  );
}

// Mongoose connection options
const MONGOOSE_OPTIONS = {
  dbName: DB_NAME,
  bufferCommands: true,
  maxPoolSize: 10,
  minPoolSize: 3,
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
  family: 4, // Use IPv4, skip trying IPv6
};

// MongoDB driver options
const MONGO_CLIENT_OPTIONS: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 3,
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

// Connection state types for mongoose
enum ConnectionState {
  Disconnected = 0,
  Connected = 1,
  Connecting = 2,
  Disconnecting = 3,
}

// Type definitions for global connection caches
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  isConnecting: boolean;
  failedAttempts: number;
  lastError: Error | null;
}

interface MongoDriverCache {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
  isConnecting: boolean;
  failedAttempts: number;
  lastError: Error | null;
}

// Define global caches for connection
declare global {
  var mongooseCache: MongooseCache;
  var mongoDriverCache: MongoDriverCache;
}

// Initialize connection caches
if (!global.mongooseCache) {
  global.mongooseCache = {
    conn: null,
    promise: null,
    isConnecting: false,
    failedAttempts: 0,
    lastError: null,
  };
}

if (!global.mongoDriverCache) {
  global.mongoDriverCache = {
    client: null,
    promise: null,
    isConnecting: false,
    failedAttempts: 0,
    lastError: null,
  };
}

/**
 * Implements exponential backoff with jitter for retry timing
 */
function getRetryDelay(attempt: number): number {
  // Exponential backoff: 2^attempt * initial delay
  const exponentialDelay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(2, attempt),
    MAX_RETRY_DELAY
  );
  
  // Add jitter to prevent thundering herd problem (±20%)
  const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);
  
  return Math.max(INITIAL_RETRY_DELAY, Math.floor(exponentialDelay + jitter));
}

/**
 * Checks if Mongoose connection is healthy and returns diagnostic information
 */
export async function checkMongooseConnection() {
  const state = mongoose.connection.readyState;
  
  return {
    connected: state === 1, // 1 represents Connected state in mongoose
    state,
    stateName: ConnectionState[state as number],
    db: mongoose.connection.db?.databaseName || null,
    host: mongoose.connection.host || null,
    models: Object.keys(mongoose.models),
    isConnecting: global.mongooseCache.isConnecting,
    failedAttempts: global.mongooseCache.failedAttempts,
    lastError: global.mongooseCache.lastError
      ? global.mongooseCache.lastError.message
      : null,
  };
}

/**
 * Connect to MongoDB using Mongoose with retry logic and exponential backoff
 */
export async function connectWithMongoose(
  attemptNumber = 0,
  forceNew = false
): Promise<typeof mongoose> {
  // If connected and not forcing a new connection, return the existing connection
  if (
    global.mongooseCache.conn &&
    mongoose.connection.readyState === 1 && // 1 represents Connected state in mongoose
    !forceNew
  ) {
    return global.mongooseCache.conn;
  }

  // If a connection attempt is in progress, return the promise
  if (global.mongooseCache.promise && !forceNew) {
    return global.mongooseCache.promise;
  }

  // If forcing a new connection, close any existing ones
  if (forceNew && global.mongooseCache.conn) {
    console.log('[MongoDB] Forcing new connection, closing existing connection');
    try {
      await mongoose.disconnect();
      global.mongooseCache.conn = null;
      global.mongooseCache.promise = null;
    } catch (error) {
      console.error('[MongoDB] Error disconnecting:', error);
      // Continue anyway to establish a new connection
    }
  }

  // For retries, add a delay with exponential backoff
  if (attemptNumber > 0) {
    const delay = getRetryDelay(attemptNumber - 1);
    console.log(`[MongoDB] Retrying connection (attempt ${attemptNumber}/${MAX_RETRIES}) after ${delay}ms delay`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Mark as connecting
  global.mongooseCache.isConnecting = true;
  
  // Configure mongoose
  mongoose.set('strictQuery', true);
  
  // Log connection attempt in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[MongoDB] Connecting to MongoDB (attempt ${attemptNumber + 1}/${MAX_RETRIES})...`);
  }

  // Create connection promise
  global.mongooseCache.promise = mongoose
    .connect(MONGODB_URI, MONGOOSE_OPTIONS)
    .then((mongoose) => {
      console.log('[MongoDB] Connected to MongoDB successfully');
      global.mongooseCache.conn = mongoose;
      global.mongooseCache.isConnecting = false;
      global.mongooseCache.failedAttempts = 0;
      global.mongooseCache.lastError = null;
      return mongoose;
    })
    .catch(async (error) => {
      console.error(`[MongoDB] Connection error (attempt ${attemptNumber + 1}/${MAX_RETRIES}):`, error);
      global.mongooseCache.isConnecting = false;
      global.mongooseCache.failedAttempts++;
      global.mongooseCache.lastError = error;
      global.mongooseCache.promise = null;

      // Retry if we haven't exceeded the maximum number of attempts
      if (attemptNumber < MAX_RETRIES - 1) {
        return connectWithMongoose(attemptNumber + 1);
      }

      // If we've exhausted all retries, throw the error
      console.error('[MongoDB] All connection attempts failed');
      throw error;
    });

  return global.mongooseCache.promise;
}

/**
 * Connect to MongoDB using the MongoDB driver with retry logic
 */
export async function connectWithMongoClient(
  attemptNumber = 0,
  forceNew = false
): Promise<MongoClient> {
  // If we already have a client and not forcing a new connection, return it
  if (global.mongoDriverCache.client && !forceNew) {
    return global.mongoDriverCache.client;
  }

  // If a connection attempt is already in progress, return the promise
  if (global.mongoDriverCache.promise && !forceNew) {
    return global.mongoDriverCache.promise;
  }

  // If forcing a new connection, close any existing ones
  if (forceNew && global.mongoDriverCache.client) {
    console.log('[MongoDB] Forcing new client connection, closing existing client');
    try {
      await global.mongoDriverCache.client.close();
      global.mongoDriverCache.client = null;
      global.mongoDriverCache.promise = null;
    } catch (error) {
      console.error('[MongoDB] Error closing client:', error);
      // Continue anyway to establish a new connection
    }
  }

  // For retries, add a delay with exponential backoff
  if (attemptNumber > 0) {
    const delay = getRetryDelay(attemptNumber - 1);
    console.log(`[MongoDB] Retrying client connection (attempt ${attemptNumber}/${MAX_RETRIES}) after ${delay}ms delay`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Mark as connecting
  global.mongoDriverCache.isConnecting = true;
  
  // Log connection attempt
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[MongoDB] Creating MongoDB client (attempt ${attemptNumber + 1}/${MAX_RETRIES})...`);
  }

  // Create a new MongoDB client
  const client = new MongoClient(MONGODB_URI, MONGO_CLIENT_OPTIONS);

  // Create connection promise
  global.mongoDriverCache.promise = client
    .connect()
    .then((client) => {
      console.log('[MongoDB] MongoDB client connected successfully');
      global.mongoDriverCache.client = client;
      global.mongoDriverCache.isConnecting = false;
      global.mongoDriverCache.failedAttempts = 0;
      global.mongoDriverCache.lastError = null;
      return client;
    })
    .catch(async (error) => {
      console.error(`[MongoDB] Client connection error (attempt ${attemptNumber + 1}/${MAX_RETRIES}):`, error);
      global.mongoDriverCache.isConnecting = false;
      global.mongoDriverCache.failedAttempts++;
      global.mongoDriverCache.lastError = error;
      global.mongoDriverCache.promise = null;

      // Retry if we haven't exceeded the maximum number of attempts
      if (attemptNumber < MAX_RETRIES - 1) {
        return connectWithMongoClient(attemptNumber + 1);
      }

      // If we've exhausted all retries, throw the error
      console.error('[MongoDB] All client connection attempts failed');
      throw error;
    });

  return global.mongoDriverCache.promise;
}

/**
 * Run a MongoDB operation with automatic connection and retry on transient errors
 */
export async function withDatabase<T>(
  operation: (client: MongoClient) => Promise<T>,
  options: { maxRetries?: number; retryOnErrors?: string[] } = {}
): Promise<T> {
  const maxRetries = options.maxRetries || 3;
  const retryOnErrors = options.retryOnErrors || [
    'MongoNetworkError',
    'MongoNetworkTimeoutError',
    'MongoServerSelectionError',
  ];
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Get client connection
      const client = await connectWithMongoClient();
      
      // Run the operation
      return await operation(client);
    } catch (error) {
      console.error(`[MongoDB] Operation failed (attempt ${attempt + 1}/${maxRetries}):`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if this is a retriable error
      const errorName = lastError.name || lastError.constructor.name;
      if (!retryOnErrors.includes(errorName)) {
        console.log(`[MongoDB] Non-retriable error ${errorName}, will not retry`);
        throw lastError;
      }
      
      // If this isn't the last attempt, wait before retrying
      if (attempt < maxRetries - 1) {
        const delay = getRetryDelay(attempt);
        console.log(`[MongoDB] Will retry operation after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we get here, we've exhausted all retries
  throw lastError || new Error('Operation failed after multiple attempts');
}

/**
 * Get detailed diagnostic information about MongoDB connections
 */
export async function getDiagnostics() {
  try {
    // Get mongoose connection status
    const mongooseStatus = await checkMongooseConnection();
    
    // Get mongo client status
    const clientConnected = !!global.mongoDriverCache.client;
    
    // Get collections if connected
    let collections: string[] = [];
    if (mongooseStatus.connected && mongoose.connection.db) {
      const collectionsList = await mongoose.connection.db.listCollections().toArray();
      collections = collectionsList.map(c => c.name);
    }
    
    return {
      mongooseConnection: mongooseStatus,
      mongoClientConnection: {
        connected: clientConnected,
        isConnecting: global.mongoDriverCache.isConnecting,
        failedAttempts: global.mongoDriverCache.failedAttempts,
        lastError: global.mongoDriverCache.lastError
          ? global.mongoDriverCache.lastError.message
          : null,
      },
      collections,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isEdgeRuntime: typeof process.env.EDGE_RUNTIME !== 'undefined',
        mongodbUri: MONGODB_URI ? `${MONGODB_URI.split('://')[0]}://${MONGODB_URI.split('@')[1] ? '***:***@' + MONGODB_URI.split('@')[1] : '[uri-without-auth]'}` : 'undefined',
      }
    };
  } catch (error) {
    return {
      error: true,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
  }
}

/**
 * Disconnect from MongoDB (both mongoose and mongo client)
 */
export async function disconnect() {
  const results = { mongoose: false, mongoClient: false };
  
  // Close mongoose connection
  if (global.mongooseCache.conn) {
    try {
      await mongoose.disconnect();
      global.mongooseCache.conn = null;
      global.mongooseCache.promise = null;
      results.mongoose = true;
      console.log('[MongoDB] Mongoose disconnected');
    } catch (error) {
      console.error('[MongoDB] Error disconnecting mongoose:', error);
    }
  }
  
  // Close mongo client
  if (global.mongoDriverCache.client) {
    try {
      await global.mongoDriverCache.client.close();
      global.mongoDriverCache.client = null;
      global.mongoDriverCache.promise = null;
      results.mongoClient = true;
      console.log('[MongoDB] MongoDB client closed');
    } catch (error) {
      console.error('[MongoDB] Error closing mongo client:', error);
    }
  }
  
  return results;
}

// For compatibility with existing code
export const dbConnect = connectWithMongoose;
export const getMongoClient = connectWithMongoClient;

/**
 * Default export for backwards compatibility
 * Always use named exports in new code for better clarity
 */
export default {
  connectWithMongoose,
  connectWithMongoClient,
  withDatabase,
  getDiagnostics,
  disconnect,
  dbConnect,
  getMongoClient,
};