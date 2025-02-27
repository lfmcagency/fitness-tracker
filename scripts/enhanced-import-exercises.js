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
  tags: [String],
  video: String,
  image: String
}, { timestamps: true });

// Create indexes for better performance
ExerciseSchema.index({ category: 1, progressionLevel: 1 });
ExerciseSchema.index({ name: 'text', description: 'text' });

const Exercise = mongoose.model('Exercise', ExerciseSchema);

// Configuration
const CONFIG = {
  dataDir: path.join(__dirname, '../public/data'),
  logLevel: 'info', // 'debug', 'info', 'warn', 'error'
  dryRun: false,     // Set to true to test without saving
  clearExisting: true // Remove existing exercises before import
};

// Logger utility
const logger = {
  debug: (...args) => CONFIG.logLevel === 'debug' && console.log('[DEBUG]', ...args),
  info: (...args) => ['debug', 'info'].includes(CONFIG.logLevel) && console.log('[INFO]', ...args),
  warn: (...args) => ['debug', 'info', 'warn'].includes(CONFIG.logLevel) && console.warn('[WARNING]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
};

// More robust ODS file parsing with validation
async function parseOdsFile(filePath, category, subcategory) {
  logger.info(`Processing ${path.basename(filePath)}...`);
  
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
    
    // Map header indexes for easy access
    const headerMap = headers.reduce((map, header, index) => {
      if (header) map[header.toLowerCase()] = index;
      return map;
    }, {});
    
    logger.debug(`File columns: ${headers.filter(Boolean).join(', ')}`);
    
    // Convert sheet to JSON with all columns
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    logger.info(`Found ${data.length} exercises in ${path.basename(filePath)}`);
    
    // Validate required fields
    const validatedData = data.filter((row, index) => {
      const name = row.Name || row.name;
      if (!name) {
        logger.warn(`Row ${index + 2} skipped: Missing name`);
        return false;
      }
      return true;
    });
    
    // Map data to Exercise model format with more fields
    return validatedData.map((row, index) => {
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
      
      // Build tags array
      const tags = [];
      if (category) tags.push(category);
      if (subcategory) tags.push(subcategory);
      
      // Map to model
      return {
        name: row.Name || row.name || `Unknown Exercise ${index + 1}`,
        category,
        subcategory,
        description: row.Description || row.description || '',
        progressionLevel: level,
        difficulty,
        unlockRequirements: Object.keys(unlockRequirements).length > 0 ? unlockRequirements : undefined,
        tags,
        video: row.Video || row.video || '',
        image: row.Image || row.image || ''
      };
    });
  } catch (error) {
    logger.error(`Error parsing ${filePath}:`, error);
    return [];
  }
}

// Main import function
async function importExerciseData() {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('Connected to MongoDB');
    
    // Check if data directory exists
    if (!fs.existsSync(CONFIG.dataDir)) {
      logger.error(`Data directory not found: ${CONFIG.dataDir}`);
      return;
    }
    
    // Get list of ODS files
    const files = fs.readdirSync(CONFIG.dataDir).filter(file => file.endsWith('.ods'));
    
    if (files.length === 0) {
      logger.error('No ODS files found in data directory');
      return;
    }
    
    logger.info(`Found ${files.length} ODS files to process`);
    
    // Clear existing exercises if configured
    if (CONFIG.clearExisting && !CONFIG.dryRun) {
      logger.info('Clearing existing exercise data...');
      await Exercise.deleteMany({});
    }
    
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
      
      // Determine category
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
      } else if (filename.includes('coreextension')) {
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
      
      logger.info(`Categorizing ${file} as ${category}/${subcategory || 'general'}`);
      
      const exercises = await parseOdsFile(path.join(CONFIG.dataDir, file), category, subcategory);
      
      if (exercises.length > 0) {
        exercisesByCategory[category] = [...exercisesByCategory[category], ...exercises];
      } else {
        logger.warn(`No valid exercises found in ${file}`);
      }
    }
    
    // Import exercises
    if (!CONFIG.dryRun) {
      // Insert new exercises by category
      for (const [category, exercises] of Object.entries(exercisesByCategory)) {
        if (exercises.length > 0) {
          logger.info(`Importing ${exercises.length} ${category} exercises...`);
          await Exercise.insertMany(exercises);
        }
      }
      
      // Link progression exercises
      logger.info('Linking exercise progressions...');
      for (const category of Object.keys(exercisesByCategory)) {
        // First link within subcategories
        const subcategories = [...new Set(
          (await Exercise.find({ category })).map(e => e.subcategory)
        )];
        
        for (const subcategory of subcategories) {
          const exercises = await Exercise.find({ category, subcategory })
            .sort({ progressionLevel: 1 });
          
          logger.debug(`Linking ${exercises.length} exercises in ${category}/${subcategory || 'general'}`);
          
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
    } else {
      logger.info('DRY RUN: No data was saved to the database');
      
      // Show exercise counts
      for (const [category, exercises] of Object.entries(exercisesByCategory)) {
        logger.info(`${category}: ${exercises.length} exercises`);
        
        // Group by subcategory for detailed reporting
        const subcategoryCounts = {};
        exercises.forEach(ex => {
          const sub = ex.subcategory || 'uncategorized';
          subcategoryCounts[sub] = (subcategoryCounts[sub] || 0) + 1;
        });
        
        Object.entries(subcategoryCounts).forEach(([sub, count]) => {
          logger.debug(`  ${sub}: ${count} exercises`);
        });
      }
    }
    
    logger.info('Exercise data import process completed!');
    
  } catch (error) {
    logger.error('Error importing exercise data:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

// Run the import
importExerciseData();