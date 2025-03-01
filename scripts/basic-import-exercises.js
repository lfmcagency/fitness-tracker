require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Define the exercise schema
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

// Register the model
const Exercise = mongoose.model('Exercise', ExerciseSchema);

// Sample exercise data for core category
const coreExercises = [
  {
    name: "Superman Hold",
    category: "core",
    subcategory: "core extension",
    description: "Lying prone on the floor with arms and legs extended lift limbs off the ground and hold",
    progressionLevel: 1,
    difficulty: "beginner"
  },
  {
    name: "Alternating Superman",
    category: "core",
    subcategory: "core extension",
    description: "From prone position alternately lift opposite arm and leg",
    progressionLevel: 2,
    difficulty: "beginner"
  },
  {
    name: "Dynamic Superman",
    category: "core",
    subcategory: "core extension",
    description: "From prone position raise and lower all limbs simultaneously",
    progressionLevel: 3,
    difficulty: "beginner"
  },
  {
    name: "Rocking Superman",
    category: "core",
    subcategory: "core extension",
    description: "Hold superman position and gently rock forward and backward",
    progressionLevel: 4,
    difficulty: "intermediate"
  },
  {
    name: "Arch Body Hold",
    category: "core",
    subcategory: "core extension",
    description: "Similar to superman but with more emphasis on arching through upper back",
    progressionLevel: 5,
    difficulty: "intermediate"
  }
];

// Sample push exercises
const pushExercises = [
  {
    name: "Wall Push-Up",
    category: "push",
    subcategory: "push",
    description: "Push-up performed standing against a wall",
    progressionLevel: 1,
    difficulty: "beginner"
  },
  {
    name: "Incline Push-Up",
    category: "push",
    subcategory: "push",
    description: "Push-up with hands elevated on a stable surface",
    progressionLevel: 2,
    difficulty: "beginner"
  },
  {
    name: "Knee Push-Up",
    category: "push",
    subcategory: "push",
    description: "Push-up performed with knees on ground",
    progressionLevel: 3,
    difficulty: "beginner"
  },
  {
    name: "Full Push-Up",
    category: "push",
    subcategory: "push",
    description: "Standard push-up with proper form",
    progressionLevel: 4,
    difficulty: "intermediate"
  },
  {
    name: "Diamond Push-Up",
    category: "push",
    subcategory: "push",
    description: "Push-up with hands close together forming a diamond shape",
    progressionLevel: 5,
    difficulty: "intermediate"
  }
];

// Sample pull exercises
const pullExercises = [
  {
    name: "Scapular Pulls",
    category: "pull",
    subcategory: "pull",
    description: "Hanging from bar, pull shoulder blades down without bending arms",
    progressionLevel: 1,
    difficulty: "beginner"
  },
  {
    name: "Arch Hangs",
    category: "pull",
    subcategory: "pull",
    description: "Hang from bar with shoulders active and body in slight arch",
    progressionLevel: 2,
    difficulty: "beginner"
  },
  {
    name: "Negative Pull-ups",
    category: "pull",
    subcategory: "pull",
    description: "Jump to top position and lower slowly",
    progressionLevel: 3,
    difficulty: "beginner"
  },
  {
    name: "Pull-up",
    category: "pull",
    subcategory: "pull",
    description: "Standard pull-up with proper form",
    progressionLevel: 4,
    difficulty: "intermediate"
  },
  {
    name: "L-sit Pull-up",
    category: "pull",
    subcategory: "pull",
    description: "Pull-up performed with legs extended straight out",
    progressionLevel: 5,
    difficulty: "advanced"
  }
];

// Sample leg exercises
const legExercises = [
  {
    name: "Assisted Squat",
    category: "legs",
    subcategory: "squat",
    description: "Squat holding onto support for balance",
    progressionLevel: 1,
    difficulty: "beginner"
  },
  {
    name: "Air Squat",
    category: "legs",
    subcategory: "squat",
    description: "Basic bodyweight squat with no support",
    progressionLevel: 2,
    difficulty: "beginner"
  },
  {
    name: "Split Squat",
    category: "legs",
    subcategory: "squat",
    description: "Stationary lunge focusing on depth",
    progressionLevel: 3,
    difficulty: "beginner"
  },
  {
    name: "Bulgarian Split Squat",
    category: "legs",
    subcategory: "squat",
    description: "Split squat with rear foot elevated",
    progressionLevel: 4,
    difficulty: "intermediate"
  },
  {
    name: "Shrimp Squat",
    category: "legs",
    subcategory: "squat",
    description: "Single leg squat with rear leg bent and held",
    progressionLevel: 5,
    difficulty: "advanced"
  }
];

// Combine all exercises
const allExercises = [
  ...coreExercises,
  ...pushExercises,
  ...pullExercises,
  ...legExercises
];

// Main import function
async function importExercises() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing exercises
    console.log('Clearing existing exercises...');
    await Exercise.deleteMany({});
    
    // Import exercises
    console.log(`Importing ${allExercises.length} exercises...`);
    await Exercise.insertMany(allExercises);
    
    // Link exercises within their categories and subcategories
    for (const category of ['core', 'push', 'pull', 'legs']) {
      // Get subcategories for this category
      const subcategories = [...new Set(
        allExercises
          .filter(e => e.category === category)
          .map(e => e.subcategory)
      )];
      
      for (const subcategory of subcategories) {
        const exercises = await Exercise.find({ 
          category, 
          subcategory 
        }).sort({ progressionLevel: 1 });
        
        console.log(`Linking ${exercises.length} exercises in ${category}/${subcategory}`);
        
        for (let i = 0; i < exercises.length; i++) {
          const prev = i > 0 ? exercises[i-1]._id : null;
          const next = i < exercises.length - 1 ? exercises[i+1]._id : null;
          
          await Exercise.findByIdAndUpdate(exercises[i]._id, {
            previousExercise: prev,
            nextExercise: next
          });
        }
      }
    }
    
    // Print summary
    const counts = await Exercise.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    console.log('\nImport complete!');
    console.log('Exercise count by category:');
    console.table(counts.map(c => ({ category: c._id, count: c.count })));
    
  } catch (error) {
    console.error('Error importing exercises:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the import
importExercises();