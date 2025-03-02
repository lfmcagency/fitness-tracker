/**
 * Script to clear all users from the database
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function clearUsers() {
  // Get MongoDB URI from environment or use local default
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-tracker';
  console.log('Using MongoDB URI:', MONGODB_URI.replace(/mongodb\+srv:\/\/([^:]+):[^@]+@/, 'mongodb+srv://$1:***@'));
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Delete all records from users collection
    const usersResult = await db.collection('users').deleteMany({});
    console.log(`Deleted ${usersResult.deletedCount} users`);
    
    // Delete all records from related collections
    const sessionsResult = await db.collection('sessions').deleteMany({});
    console.log(`Deleted ${sessionsResult.deletedCount} sessions`);
    
    const accountsResult = await db.collection('accounts').deleteMany({});
    console.log(`Deleted ${accountsResult.deletedCount} accounts`);
    
    console.log('Database cleared successfully');
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
clearUsers();