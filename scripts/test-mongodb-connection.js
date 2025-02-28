require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

// Colors for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

// Check connection using the project's dbConnect function
async function testMongooseConnection() {
  console.log(`${colors.cyan}Testing Mongoose connection...${colors.reset}`);
  
  try {
    // Import dbConnect with dynamic import to handle both export types
    const mongodb = await import('../src/lib/db/mongodb.js');
    const dbConnect = mongodb.dbConnect || mongodb.default;
    
    if (!dbConnect) {
      throw new Error('dbConnect function not found in module');
    }
    
    console.log(`${colors.blue}Found dbConnect function.${colors.reset} Attempting to connect...`);
    await dbConnect();
    
    console.log(`${colors.green}✓ Connected successfully using project's dbConnect!${colors.reset}`);
    console.log(`Connection state: ${mongoose.connection.readyState}`);
    console.log(`Database: ${mongoose.connection.db.databaseName}`);
    
    // Test a query to fully verify the connection
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Collections found: ${collections.length > 0 ? collections.map(c => c.name).join(', ') : 'none'}`);
    
    if (mongodb.dbDisconnect) {
      await mongodb.dbDisconnect();
      console.log(`${colors.blue}Successfully disconnected using project's dbDisconnect method${colors.reset}`);
    } else {
      await mongoose.disconnect();
      console.log(`${colors.blue}Disconnected using mongoose.disconnect()${colors.reset}`);
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Connection failed with project's dbConnect:${colors.reset}`, error);
    return false;
  }
}

// Test direct MongoDB connection
async function testDirectConnection() {
  console.log(`\n${colors.cyan}Testing direct MongoDB connection...${colors.reset}`);
  
  if (!process.env.MONGODB_URI) {
    console.error(`${colors.red}✗ MONGODB_URI environment variable is not defined${colors.reset}`);
    return false;
  }
  
  try {
    console.log(`URI: ${process.env.MONGODB_URI.substring(0, 20)}...`);
    
    const client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });
    
    await client.connect();
    console.log(`${colors.green}✓ Connected successfully with direct MongoDB client!${colors.reset}`);
    
    // Get database name
    const dbName = client.db().databaseName;
    console.log(`Connected to database: ${dbName}`);
    
    // List collections
    const collections = await client.db().listCollections().toArray();
    console.log(`Collections found: ${collections.length > 0 ? collections.map(c => c.name).join(', ') : 'none'}`);
    
    await client.close();
    console.log(`${colors.blue}Connection closed${colors.reset}`);
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Direct connection failed:${colors.reset}`, error);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log(`${colors.cyan}=== MongoDB Connection Tests ===${colors.reset}`);
  console.log(`MongoDB URI: ${process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 15) + '...' : 'Not defined!'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);
  console.log('-----------------------------------\n');
  
  const projectConnectionSuccess = await testMongooseConnection();
  const directConnectionSuccess = await testDirectConnection();
  
  console.log('\n-----------------------------------');
  if (projectConnectionSuccess && directConnectionSuccess) {
    console.log(`${colors.green}All connection tests passed!${colors.reset} MongoDB is configured correctly.`);
  } else if (directConnectionSuccess && !projectConnectionSuccess) {
    console.log(`${colors.yellow}Mixed results:${colors.reset}`);
    console.log(`- Direct MongoDB connection: ${colors.green}Success${colors.reset}`);
    console.log(`- Project's dbConnect: ${colors.red}Failed${colors.reset}`);
    console.log(`\n${colors.yellow}This suggests there's an issue with the project's connection logic, not with MongoDB itself.${colors.reset}`);
    console.log(`Check the mongodb.ts file and ensure imports are being handled correctly.`);
  } else if (!directConnectionSuccess) {
    console.log(`${colors.red}Connection tests failed!${colors.reset} There appears to be an issue with the MongoDB connection string or network access.`);
    console.log(`\nPossible solutions:`);
    console.log(`1. Check that MONGODB_URI in .env.local is correct`);
    console.log(`2. Verify network connectivity to MongoDB Atlas`);
    console.log(`3. Check IP whitelist settings in MongoDB Atlas`);
    console.log(`4. Verify that the database user credentials are correct`);
  }
}

runTests().catch(console.error);