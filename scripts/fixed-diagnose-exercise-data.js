require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Define the schema first
const ExerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['core', 'push', 'pull', 'legs'],
    required: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  progressionLevel: {
    type: Number,
    default: 1
  },
  previousExercise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exercise'
  },
  nextExercise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exercise'
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  }
});

// Register the model with the schema
const Exercise = mongoose.model('Exercise', ExerciseSchema);

// Connect to MongoDB
async function diagnose() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get count by category
    const categoryCount = await Exercise.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('== Exercise count by category ==');
    console.table(categoryCount);
    
    // Get count by subcategory
    const subcategoryCount = await Exercise.aggregate([
      { $group: { _id: { category: '$category', subcategory: '$subcategory' }, count: { $sum: 1 } } },
      { $sort: { '_id.category': 1, '_id.subcategory': 1 } }
    ]);
    
    console.log('== Exercise count by subcategory ==');
    console.table(subcategoryCount.map(item => ({
      category: item._id.category,
      subcategory: item._id.subcategory || '(none)',
      count: item.count
    })));
    
    // Get sample exercises to check fields
    console.log('\n== Sample exercise data ==');
    const samples = await Exercise.find().limit(3).lean();
    samples.forEach((exercise, i) => {
      console.log(`\nSample ${i+1}:`);
      console.log(JSON.stringify(exercise, null, 2));
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

diagnose();