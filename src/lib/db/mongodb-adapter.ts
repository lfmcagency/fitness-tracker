import { MongoClient } from 'mongodb';

// Use environment variable or fallback to your Atlas connection string
const uri = process.env.MONGODB_URI || 'mongodb+srv://louisfaucher95:ZHEpXGfvuNF7ydoB@fitness-tracker.dsosg.mongodb.net/?retryWrites=true&w=majority';
const options = {};

// Add explicit type declaration for the global variable
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development, use a global variable to preserve the value across module reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    console.log('Creating new MongoDB client in development mode');
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, create a new client
  client = new MongoClient(uri, options);
  console.log('Creating new MongoDB client in production mode');
  clientPromise = client.connect();
}

export default clientPromise;