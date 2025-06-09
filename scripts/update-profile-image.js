const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function updateProfileImage() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Replace with your actual email
    const result = await mongoose.connection.db.collection('users').updateOne(
      { email: 'louis_faucher@hotmail.com' }, 
      { $set: { image: '/profile/profile.jpg' } }
    );
    
    console.log('Updated:', result.modifiedCount, 'user(s)');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateProfileImage();