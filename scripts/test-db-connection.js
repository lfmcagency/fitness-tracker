require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function testConnection() {
  console.log('Testing MongoDB connection...');
  console.log(`URI: ${process.env.MONGODB_URI?.substring(0, 20)}...`);
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ Connected successfully!');
    console.log(`Connection state: ${mongoose.connection.readyState}`);
    console.log(`Database: ${mongoose.connection.db.databaseName}`);
    
    // Test a query
    const collections = await mongoose.connection.db.collections();
    console.log(`Collections: ${collections.map(c => c.collectionName).join(', ') || 'none'}`);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
}

testConnection();