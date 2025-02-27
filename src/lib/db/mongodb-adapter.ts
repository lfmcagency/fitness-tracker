import { MongoClient } from 'mongodb';
import dbConnect from './mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10,
  minPoolSize: 5,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 10000
};

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
    global._mongoClientPromise = client.connect().catch(err => {
      console.error('Error connecting to MongoDB:', err);
      throw err;
    });
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, create a new client
  client = new MongoClient(uri, options);
  console.log('Creating new MongoDB client in production mode');
  clientPromise = client.connect();
}

// Trigger the Mongoose connection as well to ensure it's initialized
dbConnect().catch(console.error);

export default clientPromise;