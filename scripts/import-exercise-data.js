require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Use the same schema as in the application
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
    trim: true,
    default: ''
  },
  description: {
    type: String,
    trim: true,
    default: ''
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
  unlockRequirements: {
    reps: Number,
    sets: Number,
    holdTime: Number,
    description: String
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  video: String,
  image: String
}, { timestamps: true });

const Exercise = mongoose.model('Exercise', ExerciseSchema);

// More robust ODS file parsing
async function parseOdsFile(filePath, category, subcategory) {
  console.log(`Processing ${filePath}...`);
  
  try {
    const workbook = XLSX.readFile(filePath, {
      cellStyles: true,
      cellFormulas: true,
      cellDates: true
    });
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get all column headers to find available fields
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const headers = [];
    for(let C = range.s.c; C <= range.e.c; ++C) {
      const cell = worksheet[XLSX.utils.encode_cell({r:0, c:C})];
      if(cell && cell.v) headers[C] = cell.v;
    }
    
    console.log(`File columns: ${headers.filter(Boolean).join(', ')}`);
    
    // Convert sheet to JSON with all columns
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${data.length} exercises in ${path.basename(filePath)}`);
    
    // Map data to Exercise model format with more fields
    return data.map((row, index) => {
      // Determine difficulty based on progression level
      const level = row.ProgressionLevel || row.Level || index + 1;
      let difficulty = 'beginner';
      if (level > 5) difficulty = 'intermediate';
      if (level > 10) difficulty = 'advanced';
      
      // Extract unlock requirements if available
      const unlockRequirements = {};
      if (row.RequiredReps) unlockRequirements.reps = parseInt(row.RequiredReps);
      if (row.RequiredSets) unlockRequirements.sets = parseInt(row.RequiredSets);
      if (row.RequiredHoldTime) unlockRequirements.holdTime = parseInt(row.RequiredHoldTime);
      if (row.UnlockDescription) unlockRequirements.description = row.UnlockDescription;
      
      return {
        name: row.Name || row.name || `Unknown Exercise ${index + 1}`,
        category,
        subcategory,
        description: row.Description || row.description || '',
        progressionLevel: level,
        difficulty,
        unlockRequirements: Object.keys(unlockRequirements).length > 0 ? unlockRequirements : undefined,
        // Add any other fields that might be in the ODS files
        video: row.Video || row.video || '',
        image: row.Image || row.image || ''
      };
    });
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return [];
  }
}

// Main import function
async function importExerciseData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get list of ODS files
    const dataDir = path.join(__dirname, '../public/data');
    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.ods'));
    
    if (files.length === 0) {
      console.log('No ODS files found in public/data directory');
      return;
    }
    
    console.log(`Found ${files.length} ODS files to process`);
    
    // Process each file
    const exercisesByCategory = {
      core: [],
      push: [],
      pull: [],
      legs: []
    };
    
    // Map filenames to categories and subcategories
    for (const file of files) {
      let category = 'core';
      let subcategory = '';
      
      const filename = file.toLowerCase();
      
      if (filename.includes('push')) {
        category = 'push';
      } else if (filename.includes('pull')) {
        category = 'pull';
      } else if (filename.includes('leg') || filename.includes('squat')) {
        category = 'legs';
      }
      
      // Determine subcategory
      if (filename.includes('hollowbody')) {
        subcategory = 'hollow body';
      } else if (filename.includes('legraises')) {
        subcategory = 'leg raises';
      } else if (filename.includes('lsit')) {
        subcategory = 'l-sit';
      } else if (filename.includes('plank')) {
        subcategory = 'plank';
      } else if (filename.includes('core')) {
        subcategory = 'core extension';
      } else if (filename.includes('crunch')) {
        subcategory = 'crunch';
      } else if (filename.includes('rotation')) {
        subcategory = 'rotation';
      } else if (filename.includes('push')) {
        subcategory = 'push';
      } else if (filename.includes('pull')) {
        subcategory = 'pull';
      } else if (filename.includes('squat')) {
        subcategory = 'squat';
      }
      
      const exercises = await parseOdsFile(path.join(dataDir, file), category, subcategory);
      exercisesByCategory[category] = [...exercisesByCategory[category], ...exercises];
    }
    
    // Clear existing exercises
    console.log('Clearing existing exercise data...');
    await Exercise.deleteMany({});
    
    // Insert new exercises by category
    for (const [category, exercises] of Object.entries(exercisesByCategory)) {
      if (exercises.length > 0) {
        console.log(`Importing ${exercises.length} ${category} exercises...`);
        await Exercise.insertMany(exercises);
      }
    }
    
    // Link progression exercises
    console.log('Linking exercise progressions...');
    for (const category of Object.keys(exercisesByCategory)) {
      // First link within subcategories
      const subcategories = [...new Set(
        (await Exercise.find({ category })).map(e => e.subcategory)
      )];
      
      for (const subcategory of subcategories) {
        const exercises = await Exercise.find({ category, subcategory })
          .sort({ progressionLevel: 1 });
        
        for (let i = 0; i < exercises.length; i++) {
          const prev = i > 0 ? exercises[i-1]._id : null;
          const next = i < exercises.length - 1 ? exercises[i+1]._id : null;
          
          if (prev || next) {
            await Exercise.findByIdAndUpdate(exercises[i]._id, {
              previousExercise: prev,
              nextExercise: next
            });
          }
        }
      }
    }
    
    console.log('Exercise data import complete!');
    
    // Count exercises by category
    const stats = {};
    for (const category of Object.keys(exercisesByCategory)) {
      stats[category] = await Exercise.countDocuments({ category });
    }
    
    console.log('Import statistics:');
    console.log(stats);
    
    // Additional stats by subcategory
    console.log('Subcategories:');
    const subcategories = await Exercise.aggregate([
      { $group: { _id: { category: '$category', subcategory: '$subcategory' }, count: { $sum: 1 } } },
      { $sort: { '_id.category': 1, '_id.subcategory': 1 } }
    ]);
    
    subcategories.forEach(item => {
      console.log(`${item._id.category} / ${item._id.subcategory || 'uncategorized'}: ${item.count}`);
    });
    
  } catch (error) {
    console.error('Error importing exercise data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the import
importExerciseData();