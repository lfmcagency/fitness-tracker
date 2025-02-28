// scripts/import-csv-exercises.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Papa = require('papaparse');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
}

// Define the Exercise schema inline to avoid import issues
// We'll reuse the same fields as in your Exercise model
const ExerciseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  subcategory: { type: String, trim: true },
  progressionLevel: { type: Number, default: 1 },
  description: { type: String, trim: true },
  difficulty: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced', 'elite'],
    default: 'beginner'
  },
  
  // Fields for the new CSV structure
  uniqueId: { type: String, unique: true, sparse: true },
  relPrev: { type: String },
  relNext: { type: String },
  xpValue: { type: Number, default: 10 },
  unlockRequirements: { type: String },
  formCues: { type: String },
  primaryMuscleGroup: { type: String },
  secondaryMuscleGroups: { type: String },
  
  // Relationship references as ObjectIds
  previousExercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
  nextExercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' }
}, { timestamps: true });

// Register the model or get it if already registered
const Exercise = mongoose.models.Exercise || mongoose.model('Exercise', ExerciseSchema);

async function importCsvExercises() {
  try {
    // Connect to MongoDB
    const connected = await connectToMongoDB();
    if (!connected) {
      throw new Error('Failed to connect to MongoDB');
    }
    
    // Get list of CSV files
    const csvDir = path.join(process.cwd(), 'public', 'data');
    if (!fs.existsSync(csvDir)) {
      console.error(`Directory not found: ${csvDir}`);
      console.log('Make sure you have CSV files in the public/data directory');
      return;
    }
    
    const files = fs.readdirSync(csvDir)
      .filter(file => file.endsWith('.csv'))
      .map(file => path.join(csvDir, file));
    
    console.log(`Found ${files.length} CSV files to process`);
    
    if (files.length === 0) {
      console.log('No CSV files found in public/data directory');
      await mongoose.disconnect();
      return;
    }
    
    // FIRST PASS: Import all exercises
    const exerciseMap = new Map();  // Store unique_id -> MongoDB _id mapping
    const importStats = {
      total: 0,
      categories: {}
    };
    
    for (const file of files) {
      console.log(`Processing ${path.basename(file)}`);
      
      // Read and parse CSV
      const content = fs.readFileSync(file, 'utf8');
      const { data, errors } = Papa.parse(content, { 
        header: true, 
        skipEmptyLines: true,
        dynamicTyping: true  // Convert strings to numbers where appropriate
      });
      
      if (errors.length > 0) {
        console.warn('Parse errors:', errors);
      }
      
      console.log(`Found ${data.length} exercises in ${path.basename(file)}`);
      
      // Import exercises
      for (const row of data) {
        // Skip rows without a unique_id or name
        if (
          typeof row !== 'object' || 
          row === null || 
          !('unique_id' in row) || 
          !('name' in row) || 
          !row.unique_id || 
          !row.name
        ) {
          console.warn('Skipping row without unique_id or name:', row);
          continue;
        }
        
        // Create category stat entry if it doesn't exist
        let categoryValue = 'uncategorized';
        if (typeof row === 'object' && row !== null && 'category' in row && row.category) {
          categoryValue = String(row.category).toLowerCase();
        }
        
        if (!importStats.categories[categoryValue]) {
          importStats.categories[categoryValue] = 0;
        }
        
        const exercise = {
          uniqueId: row.unique_id,
          name: row.name,
          category: categoryValue,
          subcategory: typeof row.subcategory === 'string' ? row.subcategory.toLowerCase() : '',
          progressionLevel: typeof row.progressionLevel === 'number' ? row.progressionLevel : 0,
          description: typeof row.description === 'string' ? row.description : '',
          relPrev: typeof row.rel_prev === 'string' ? row.rel_prev : null,
          relNext: typeof row.rel_next === 'string' ? row.rel_next : null,
          xpValue: typeof row.xp_value === 'number' ? row.xp_value : 10,
          unlockRequirements: typeof row.unlock_requirements === 'string' ? row.unlock_requirements : '',
          formCues: typeof row.form_cues === 'string' ? row.form_cues : '',
          primaryMuscleGroup: typeof row.primary_muscle_group === 'string' ? row.primary_muscle_group : '',
          secondaryMuscleGroups: typeof row.secondary_muscle_groups === 'string' ? row.secondary_muscle_groups : '',
          difficulty: typeof row.difficulty === 'string' ? row.difficulty : 'beginner'
        };
        
        try {
          // Upsert the exercise
          const result = await Exercise.findOneAndUpdate(
            { uniqueId: exercise.uniqueId },
            exercise,
            { upsert: true, new: true }
          );
          
          // Store the mapping
          exerciseMap.set(exercise.uniqueId, result._id);
          importStats.total++;
          importStats.categories[categoryValue]++;
        } catch (error) {
          console.error(`Error importing exercise ${exercise.name}:`, error);
        }
      }
    }
    
    // SECOND PASS: Establish relationships
    console.log('Starting second pass to establish relationships');
    
    const exercises = await Exercise.find({ uniqueId: { $exists: true, $ne: null } });
    let relationshipsUpdated = 0;
    
    for (const exercise of exercises) {
      const updates = {};
      
      // Set previous exercise reference
      if (exercise.relPrev && exerciseMap.has(exercise.relPrev)) {
        updates.previousExercise = exerciseMap.get(exercise.relPrev);
      }
      
      // Set next exercise reference
      if (exercise.relNext && exerciseMap.has(exercise.relNext)) {
        updates.nextExercise = exerciseMap.get(exercise.relNext);
      }
      
      // Apply updates if needed
      if (Object.keys(updates).length > 0) {
        await Exercise.findByIdAndUpdate(exercise._id, updates);
        relationshipsUpdated++;
      }
    }
    
    console.log('Import completed successfully');
    console.log(`Imported ${importStats.total} exercises`);
    console.log(`Updated ${relationshipsUpdated} relationships`);
    console.log('Import by category:');
    console.table(importStats.categories);
    
  } catch (error) {
    console.error('Error importing exercises:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the import
importCsvExercises();