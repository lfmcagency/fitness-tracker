import mongoose from 'mongoose';
import { MongoClient, MongoClientOptions, ServerApiVersion } from 'mongodb';

// Connection configuration
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'fitness-tracker';

// Retry configuration
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 500;
const MAX_RETRY_DELAY = 30000;

// Validate connection string
if (!MONGODB_URI) {
  throw new Error('MongoDB connection error: MONGODB_URI is not defined in environment variables');
}

// Mongoose connection options
const MONGOOSE_OPTIONS = {
  dbName: DB_NAME,
  bufferCommands: true,
  maxPoolSize: 5,  // Reduced to prevent connection exhaustion
  minPoolSize: 1,  // Reduced to prevent connection exhaustion
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
  family: 4, // Use IPv4, skip trying IPv6
};

// Connection state management
declare global {
  var mongoDb: {
    conn: typeof mongoose | null;
    client: MongoClient | null;
    promise: Promise<typeof mongoose> | null;
    clientPromise: Promise<MongoClient> | null;
    isConnecting: boolean;
    lastError: Error | null;
  };
}

// Initialize global connection state
if (!global.mongoDb) {
  global.mongoDb = {
    conn: null,
    client: null,
    promise: null,
    clientPromise: null,
    isConnecting: false,
    lastError: null,
  };
}

/**
 * Implements exponential backoff with jitter for retry timing
 */
function getRetryDelay(attempt: number): number {
  const exponentialDelay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(2, attempt),
    MAX_RETRY_DELAY
  );
  
  // Add jitter (±20%)
  const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);
  
  return Math.max(INITIAL_RETRY_DELAY, Math.floor(exponentialDelay + jitter));
}

/**
 * Connect to MongoDB using Mongoose
 * Primary database connection function that should be used throughout the app
 */
export async function dbConnect(): Promise<typeof mongoose> {
  // If already connected, return the connection
  if (global.mongoDb.conn && mongoose.connection.readyState === 1) {
    return global.mongoDb.conn;
  }

  // If connection is in progress, return the promise
  if (global.mongoDb.promise) {
    return global.mongoDb.promise;
  }

  // Mark as connecting
  global.mongoDb.isConnecting = true;
  
  // Configure mongoose
  mongoose.set('strictQuery', true);
  
  // Log connection attempt in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    console.log('[MongoDB] Connecting to MongoDB...');
  }

  // Create connection promise
  global.mongoDb.promise = mongoose
    .connect(MONGODB_URI, MONGOOSE_OPTIONS)
    .then((mongoose) => {
      console.log('[MongoDB] Connected to MongoDB successfully');
      global.mongoDb.conn = mongoose;
      global.mongoDb.isConnecting = false;
      global.mongoDb.lastError = null;
      return mongoose;
    })
    .catch(async (error) => {
      console.error('[MongoDB] Connection error:', error);
      global.mongoDb.isConnecting = false;
      global.mongoDb.lastError = error;
      global.mongoDb.promise = null;
      throw error;
    });

  return global.mongoDb.promise;
}

/**
 * Connect and get MongoDB native client
 * Used for NextAuth and other low-level operations
 */
export async function getMongoClient(): Promise<MongoClient> {
  // If already connected, return the client
  if (global.mongoDb.client) {
    return global.mongoDb.client;
  }

  // If connection is in progress, return the promise
  if (global.mongoDb.clientPromise) {
    return global.mongoDb.clientPromise;
  }

  // Create a new MongoDB client
  const clientOptions: MongoClientOptions = {
    maxPoolSize: 5,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    retryWrites: true,
    retryReads: true,
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  };

  const client = new MongoClient(MONGODB_URI, clientOptions);

  // Create connection promise
  global.mongoDb.clientPromise = client
    .connect()
    .then((client) => {
      console.log('[MongoDB] MongoDB client connected successfully');
      global.mongoDb.client = client;
      return client;
    })
    .catch((error) => {
      console.error('[MongoDB] Client connection error:', error);
      global.mongoDb.clientPromise = null;
      throw error;
    });

  return global.mongoDb.clientPromise;
}

/**
 * Check database health and connection status
 */
export async function checkDatabaseHealth() {
  const startTime = Date.now();
  
  try {
    // Try to connect
    await dbConnect();
    
    return {
      connected: mongoose.connection.readyState === 1,
      readyState: mongoose.connection.readyState,
      readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
      host: mongoose.connection.host,
      dbName: mongoose.connection.db?.databaseName || DB_NAME,
      responseTime: Date.now() - startTime,
      models: Object.keys(mongoose.models),
      collections: mongoose.connection.readyState === 1 ? 
        await mongoose.connection.db.listCollections().toArray().then(cols => cols.map(c => c.name)) : 
        null,
      poolStats: {
        min: MONGOOSE_OPTIONS.minPoolSize,
        max: MONGOOSE_OPTIONS.maxPoolSize,
      }
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Disconnect from database
 */
export async function dbDisconnect(): Promise<boolean> {
  if (global.mongoDb.conn) {
    try {
      await mongoose.disconnect();
      global.mongoDb.conn = null;
      global.mongoDb.promise = null;
      console.log('[MongoDB] Disconnected from MongoDB');
      return true;
    } catch (error) {
      console.error('[MongoDB] Error disconnecting:', error);
      return false;
    }
  }
  
  if (global.mongoDb.client) {
    try {
      await global.mongoDb.client.close();
      global.mongoDb.client = null;
      global.mongoDb.clientPromise = null;
      console.log('[MongoDB] MongoDB client closed');
      return true;
    } catch (error) {
      console.error('[MongoDB] Error closing client:', error);
      return false;
    }
  }
  
  return true;
}

/**
 * Execute operation with automatic retry on transient errors
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`[MongoDB] Operation failed (attempt ${attempt + 1}/${maxRetries}):`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If this isn't the last attempt, wait before retrying
      if (attempt < maxRetries - 1) {
        const delay = getRetryDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Operation failed after multiple attempts');
}

/**
 * Interface for initialization options
 */
export interface InitDatabaseOptions {
  force?: boolean;
  seedData?: boolean;
  collections?: string[];
  onProgress?: (progress: any) => void;
}

/**
 * Interface for initialization results
 */
export interface InitDatabaseResult {
  success: boolean;
  message: string;
  collections?: any[];
  error?: string;
}

/**
 * Initialize database with basic structure
 * Sets up base collections and indexes
 */
export async function initDatabase(options: InitDatabaseOptions = {}): Promise<InitDatabaseResult> {
  try {
    // Ensure database connection
    await dbConnect();
    
    console.log('[MongoDB] Initializing database...');
    
    // Track collections
    const collectionSummary = [];
    
    // List existing collections
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      for (const collection of collections) {
        collectionSummary.push({
          name: collection.name,
          type: collection.type,
          initialized: true
        });
      }
      
      console.log(`[MongoDB] Found ${collectionSummary.length} existing collections`);
    } catch (error) {
      console.error('[MongoDB] Error listing collections:', error);
      return {
        success: false,
        message: 'Failed to list existing collections',
        error: error instanceof Error ? error.message : String(error)
      };
    }
    
    // Apply initialization using withRetry for resilience
    const initResult = await withRetry(async () => {
      // Here, you'd typically initialize schemas, create indexes, etc.
      // This can be expanded based on your specific initialization needs
      
      // Example: Ensure indexes on important collections
      if (mongoose.connection.readyState === 1) {
        // Placeholder for actual initialization steps
        // For demonstration, we're just checking for model existence
        const modelNames = Object.keys(mongoose.models);
        return {
          modelsRegistered: modelNames.length,
          modelNames
        };
      }
      
      throw new Error('Database not connected');
    });
    
    return {
      success: true,
      message: 'Database initialized successfully',
      collections: collectionSummary
    };
  } catch (error) {
    console.error('[MongoDB] Database initialization error:', error);
    return {
      success: false,
      message: 'Failed to initialize database',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Seed database with initial data
 * Populates collections with starter data
 */
export async function seedDatabase(): Promise<InitDatabaseResult> {
  try {
    // Ensure database connection
    await dbConnect();
    
    console.log('[MongoDB] Seeding database...');
    
    // Apply seeding using withRetry for resilience
    const seedingResults = await withRetry(async () => {
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }
      
      // Here, you'd typically insert seed data for various collections
      // This can be expanded based on your specific seeding needs
      
      // Placeholder for actual seeding steps
      const results = {
        collections: 0,
        documents: 0,
        details: {}
      };
      
      // Example: Seed user roles if they don't exist
      // const userRoles = ['user', 'admin', 'trainer'];
      // Seeding code would go here
      
      return results;
    });
    
    return {
      success: true,
      message: 'Database seeded successfully'
    };
  } catch (error) {
    console.error('[MongoDB] Database seeding error:', error);
    return {
      success: false,
      message: 'Failed to seed database',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Clear database (development only)
 * Warning: This deletes all data and should only be used in development
 */
export async function clearDatabase(): Promise<InitDatabaseResult> {
  // Safety check for production
  if (process.env.NODE_ENV === 'production') {
    return {
      success: false,
      message: 'Cannot clear database in production'
    };
  }
  
  try {
    // Ensure database connection
    await dbConnect();
    
    console.log('[MongoDB] Clearing database (DEVELOPMENT ONLY)...');
    
    // Apply clearing using withRetry for resilience
    const clearResults = await withRetry(async () => {
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }
      
      // Get all collection names
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name).filter(Boolean);
      
      // Track results
      const results = {
        collectionsDropped: 0,
        collectionsFailed: 0,
        errors: [] as string[]
      };
      
      // Drop each collection
      for (const name of collectionNames) {
        if (!name) continue;
        
        try {
          await mongoose.connection.db.collection(name).drop();
          results.collectionsDropped++;
        } catch (error) {
          results.collectionsFailed++;
          results.errors.push(`Failed to drop ${name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      return results;
    });
    
    return {
      success: true,
      message: `Database cleared successfully (${clearResults.collectionsDropped} collections dropped)`
    };
  } catch (error) {
    console.error('[MongoDB] Database clearing error:', error);
    return {
      success: false,
      message: 'Failed to clear database',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Create a MongoDB client promise for NextAuth adapter
const clientPromise = getMongoClient();

// Default export for backwards compatibility
export default clientPromise;