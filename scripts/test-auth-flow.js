/**
 * Test script to verify authentication flow with MongoDB integration
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-tracker';

// Connect to MongoDB
async function testAuthFlow() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');

    // Define User model schema
    const UserSchema = new mongoose.Schema({
      name: String,
      email: {
        type: String,
        required: true,
        unique: true
      },
      password: {
        type: String,
        required: false
      },
    });

    // Create temporary User model for testing
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // Test user data
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password'
    };

    // Clean up any existing test user
    console.log('Cleaning up existing test user...');
    await User.deleteOne({ email: testUser.email });

    // Test user registration
    console.log('Testing user registration...');
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    const newUser = await User.create({
      name: testUser.name,
      email: testUser.email,
      password: hashedPassword
    });
    console.log('User registered successfully', newUser._id);

    // Test user authentication
    console.log('Testing user authentication...');
    const user = await User.findOne({ email: testUser.email });
    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordValid = await bcrypt.compare(testUser.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Password validation failed');
    }
    console.log('User authenticated successfully');

    // Test NextAuth adapter-compatible collections
    console.log('Testing NextAuth adapter collections...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db();

    // Verify required collections exist or can be created
    const collections = await db.listCollections().toArray();
    const requiredCollections = ['users', 'accounts', 'sessions', 'verification_tokens'];
    
    for (const collName of requiredCollections) {
      if (!collections.some(coll => coll.name === collName)) {
        console.log(`Creating collection: ${collName}`);
        await db.createCollection(collName);
      } else {
        console.log(`Collection exists: ${collName}`);
      }
    }

    // Clean up
    console.log('Cleaning up test user...');
    await User.deleteOne({ email: testUser.email });
    await client.close();

    console.log('Authentication flow test completed successfully');
  } catch (error) {
    console.error('Error testing auth flow:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
    process.exit(0);
  }
}

testAuthFlow();