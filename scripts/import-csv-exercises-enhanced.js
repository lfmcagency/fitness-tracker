#!/usr/bin/env node
/**
 * Enhanced Exercise CSV Import Script
 * 
 * A robust, two-pass CSV import utility for fitness exercises
 * - First pass: Import all exercise data from CSV files
 * - Second pass: Establish relationships between exercises
 * 
 * Features:
 * - Comprehensive field validation
 * - Detailed error reporting
 * - Import statistics
 * - Command-line options for flexibility
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Papa = require('papaparse');
require('dotenv').config({ path: '.env.local' });

// Get command-line arguments
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('--verbose') || args.includes('-v'),
  dryRun: args.includes('--dry-run'),
  force: args.includes('--force') || args.includes('-f'),
  specificFiles: [],
  skipRelationships: args.includes('--skip-relationships'),
  help: args.includes('--help') || args.includes('-h')
};

// Process file arguments
args.forEach(arg => {
  if (!arg.startsWith('-') && arg.endsWith('.csv')) {
    options.specificFiles.push(arg);
  }
});

// Show help message
if (options.help) {
  console.log(`
  Exercise CSV Import Utility
  
  Usage: node import-csv-exercises-enhanced.js [options] [file1.csv file2.csv ...]
  
  Options:
    -h, --help                Show this help message
    -v, --verbose             Show detailed logs during import
    --dry-run                 Validate CSV files without importing to database
    -f, --force               Force import even if validation errors are found
    --skip-relationships      Skip second pass (relationship establishment)
  
  Examples:
    node import-csv-exercises-enhanced.js                   # Import all CSV files
    node import-csv-exercises-enhanced.js -v                # Verbose import of all files
    node import-csv-exercises-enhanced.js file1.csv file2.csv  # Import specific files
    node import-csv-exercises-enhanced.js --dry-run         # Validate without importing
  `);
  process.exit(0);
}

// Print startup banner
console.log('\n=================================================');
console.log('🏋️ FITNESS TRACKER EXERCISE IMPORT UTILITY');
console.log('=================================================\n');

if (options.dryRun) {
  console.log('🔍 DRY RUN MODE: Files will be validated but not imported');
}

// Import statistics tracking
const stats = {
  files: {
    total: 0,
    processed: 0,
    errors: 0
  },
  exercises: {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  },
  relationships: {
    established: 0,
    failed: 0,
    total: 0
  },
  categories: {},
  difficulties: {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
    elite: 0
  },
  validation: {
    warnings: 0,
    errors: 0
  },
  startTime: Date.now()
};

// Define valid validation rules from schema
const validationRules = {
  required: ['name', 'category', 'unique_id'],
  category: ['core', 'push', 'pull', 'legs'],
  difficulty: ['beginner', 'intermediate', 'advanced', 'elite'],
  numeric: ['progressionLevel', 'xp_value']
};

// Define the Exercise schema inline to avoid import issues
const ExerciseSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Exercise name is required'], 
    trim: true 
  },
  category: { 
    type: String, 
    required: [true, 'Category is required'],
    enum: validationRules.category
  },
  subcategory: { type: String, trim: true },
  progressionLevel: { type: Number, default: 1 },
  description: { type: String, trim: true },
  
  // CSV import fields
  uniqueId: { type: String, unique: true, sparse: true },
  relPrev: { type: String },
  relNext: { type: String },
  xpValue: { type: Number, default: 10 },
  unlockRequirements: { type: String },
  formCues: { type: String },
  primaryMuscleGroup: { type: String },
  secondaryMuscleGroups: { type: String },
  
  difficulty: { 
    type: String, 
    enum: validationRules.difficulty,
    default: 'beginner'
  },
  
  // Relationship references
  previousExercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
  nextExercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' }
}, { timestamps: true });

// Create or retrieve the model
const Exercise = mongoose.models.Exercise || mongoose.model('Exercise', ExerciseSchema);

/**
 * Connect to MongoDB
 */
async function connectToMongoDB() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    // Set mongoose options
    mongoose.set('strictQuery', true);
    
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      family: 4
    });
    
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    if (options.verbose) {
      console.error(error);
    }
    return false;
  }
}

/**
 * Validate a CSV row against schema rules
 */
function validateRow(row, index, filename) {
  const errors = [];
  const warnings = [];
  
  // Check required fields
  validationRules.required.forEach(field => {
    const normalizedField = field === 'xp_value' ? 'xp_value' : field;
    if (!row[normalizedField] && row[normalizedField] !== 0) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Check category values
  if (row.category && !validationRules.category.includes(row.category.toLowerCase())) {
    errors.push(`Invalid category "${row.category}". Must be one of: ${validationRules.category.join(', ')}`);
  }
  
  // Check difficulty values
  if (row.difficulty && !validationRules.difficulty.includes(row.difficulty.toLowerCase())) {
    errors.push(`Invalid difficulty "${row.difficulty}". Must be one of: ${validationRules.difficulty.join(', ')}`);
  }
  
  // Check numeric fields
  validationRules.numeric.forEach(field => {
    const normalizedField = field === 'progressionLevel' ? 'progressionLevel' : field;
    if (row[normalizedField] && isNaN(Number(row[normalizedField]))) {
      errors.push(`Field "${field}" must be a number, got: ${row[normalizedField]}`);
    }
  });
  
  // Check relationship fields
  if (row.rel_prev && typeof row.rel_prev === 'string' && row.rel_prev.trim() === '') {
    warnings.push('Empty rel_prev field, should be null or valid ID');
  }
  
  if (row.rel_next && typeof row.rel_next === 'string' && row.rel_next.trim() === '') {
    warnings.push('Empty rel_next field, should be null or valid ID');
  }
  
  // Return validation results
  return { 
    valid: errors.length === 0, 
    errors, 
    warnings,
    location: `${path.basename(filename)}:${index + 2}` // +2 for header row and 0-indexing
  };
}

/**
 * Transform CSV row into Exercise document
 */
function transformRow(row) {
  // Handle edge cases with empty strings vs null
  const nullIfEmpty = (val) => (val === '' ? null : val);
  
  return {
    uniqueId: String(row.unique_id).trim(),
    name: String(row.name).trim(),
    category: String(row.category).toLowerCase().trim(),
    subcategory: nullIfEmpty(row.subcategory ? String(row.subcategory).toLowerCase().trim() : ''),
    progressionLevel: Number(row.progressionLevel || 1),
    description: nullIfEmpty(row.description ? String(row.description).trim() : ''),
    relPrev: nullIfEmpty(row.rel_prev ? String(row.rel_prev).trim() : null),
    relNext: nullIfEmpty(row.rel_next ? String(row.rel_next).trim() : null),
    xpValue: Number(row.xp_value || 10),
    unlockRequirements: nullIfEmpty(row.unlock_requirements ? String(row.unlock_requirements).trim() : ''),
    formCues: nullIfEmpty(row.form_cues ? String(row.form_cues).trim() : ''),
    primaryMuscleGroup: nullIfEmpty(row.primary_muscle_group ? String(row.primary_muscle_group).trim() : ''),
    secondaryMuscleGroups: nullIfEmpty(row.secondary_muscle_groups ? String(row.secondary_muscle_groups).trim() : ''),
    difficulty: row.difficulty ? String(row.difficulty).toLowerCase().trim() : 'beginner'
  };
}

/**
 * Process a single CSV file
 */
async function processFile(filePath, exerciseMap) {
  const filename = path.basename(filePath);
  console.log(`\n📄 Processing ${filename}`);
  
  try {
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Parse CSV
    const { data, errors: parseErrors } = Papa.parse(content, { 
      header: true, 
      skipEmptyLines: true,
      dynamicTyping: true
    });
    
    if (parseErrors.length > 0) {
      console.error(`❌ Parse errors in ${filename}:`, parseErrors);
      stats.validation.errors += parseErrors.length;
      stats.files.errors++;
      
      if (!options.force) {
        console.error(`   Skipping ${filename} due to parse errors. Use --force to import anyway.`);
        return { success: false, count: 0 };
      }
    }
    
    console.log(`   Found ${data.length} exercises`);
    let validCount = 0;
    let invalidCount = 0;
    
    // Validate each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Basic null check
      if (!row || typeof row !== 'object') {
        console.warn(`   ⚠️ Skipping invalid row at index ${i}`);
        stats.exercises.skipped++;
        continue;
      }
      
      // Validate the row
      const validation = validateRow(row, i, filePath);
      
      if (validation.warnings.length > 0) {
        stats.validation.warnings += validation.warnings.length;
        if (options.verbose) {
          console.warn(`   ⚠️ Warnings for ${row.name || `row ${i}`} (${validation.location}):`);
          validation.warnings.forEach(w => console.warn(`      - ${w}`));
        }
      }
      
      if (!validation.valid) {
        invalidCount++;
        stats.validation.errors += validation.errors.length;
        stats.exercises.errors++;
        
        if (options.verbose || options.force) {
          console.error(`   ❌ Validation errors for ${row.name || `row ${i}`} (${validation.location}):`);
          validation.errors.forEach(e => console.error(`      - ${e}`));
        }
        
        if (!options.force) {
          console.log(`      Skipping this record. Use --force to import invalid records.`);
          stats.exercises.skipped++;
          continue;
        }
      }
      
      validCount++;
      
      // Transform the row into a document
      const exercise = transformRow(row);
      
      // Only perform database operations if not in dry run mode
      if (!options.dryRun) {
        try {
          // Check if exercise already exists
          const existingExercise = await Exercise.findOne({ uniqueId: exercise.uniqueId });
          
          if (existingExercise) {
            // Update existing exercise
            const result = await Exercise.findOneAndUpdate(
              { uniqueId: exercise.uniqueId },
              exercise,
              { new: true }
            );
            exerciseMap.set(exercise.uniqueId, result._id);
            stats.exercises.updated++;
          } else {
            // Create new exercise
            const newExercise = new Exercise(exercise);
            const result = await newExercise.save();
            exerciseMap.set(exercise.uniqueId, result._id);
            stats.exercises.created++;
          }
          
          // Update category and difficulty statistics
          stats.categories[exercise.category] = (stats.categories[exercise.category] || 0) + 1;
          stats.difficulties[exercise.difficulty] = (stats.difficulties[exercise.difficulty] || 0) + 1;
          
        } catch (error) {
          console.error(`   ❌ Database error for ${exercise.name}:`, error.message);
          if (options.verbose) {
            console.error(error);
          }
          stats.exercises.errors++;
        }
      }
    }
    
    console.log(`   ✅ Valid: ${validCount}, Invalid: ${invalidCount}`);
    stats.exercises.total += data.length;
    stats.files.processed++;
    
    return { 
      success: true, 
      count: data.length 
    };
    
  } catch (error) {
    console.error(`   ❌ Error processing ${filename}:`, error.message);
    if (options.verbose) {
      console.error(error);
    }
    stats.files.errors++;
    return { 
      success: false, 
      count: 0 
    };
  }
}

/**
 * Establish relationships between exercises
 */
async function establishRelationships(exerciseMap) {
  console.log('\n🔄 Establishing exercise relationships...');
  
  try {
    // Get all exercises with relationship fields
    const exercises = await Exercise.find({
      $or: [
        { relPrev: { $exists: true, $ne: null } },
        { relNext: { $exists: true, $ne: null } }
      ]
    });
    
    console.log(`   Found ${exercises.length} exercises with relationship fields`);
    stats.relationships.total = exercises.length;
    
    // Process each exercise
    for (const exercise of exercises) {
      const updates = {};
      let updateNeeded = false;
      
      // Set previous exercise reference
      if (exercise.relPrev && exerciseMap.has(exercise.relPrev)) {
        updates.previousExercise = exerciseMap.get(exercise.relPrev);
        updateNeeded = true;
      } else if (exercise.relPrev) {
        if (options.verbose) {
          console.warn(`   ⚠️ Could not find previous exercise with ID ${exercise.relPrev} for ${exercise.name}`);
        }
        stats.relationships.failed++;
      }
      
      // Set next exercise reference
      if (exercise.relNext && exerciseMap.has(exercise.relNext)) {
        updates.nextExercise = exerciseMap.get(exercise.relNext);
        updateNeeded = true;
      } else if (exercise.relNext) {
        if (options.verbose) {
          console.warn(`   ⚠️ Could not find next exercise with ID ${exercise.relNext} for ${exercise.name}`);
        }
        stats.relationships.failed++;
      }
      
      // Apply updates if needed and not in dry run mode
      if (updateNeeded && !options.dryRun) {
        await Exercise.findByIdAndUpdate(exercise._id, updates);
        stats.relationships.established++;
        
        if (options.verbose) {
          console.log(`   ✅ Updated relationships for ${exercise.name}`);
        }
      }
    }
    
    console.log(`   ✅ Established ${stats.relationships.established} relationships`);
    if (stats.relationships.failed > 0) {
      console.warn(`   ⚠️ Failed to establish ${stats.relationships.failed} relationships`);
    }
    
  } catch (error) {
    console.error('   ❌ Error establishing relationships:', error.message);
    if (options.verbose) {
      console.error(error);
    }
  }
}

/**
 * Print import statistics
 */
function printStatistics() {
  const duration = (Date.now() - stats.startTime) / 1000;
  
  console.log('\n=================================================');
  console.log('📊 IMPORT STATISTICS');
  console.log('=================================================');
  console.log(`
📂 Files:
  - Total processed: ${stats.files.processed}/${stats.files.total}
  - With errors: ${stats.files.errors}

🏋️ Exercises:
  - Total found: ${stats.exercises.total}
  - Created: ${stats.exercises.created}
  - Updated: ${stats.exercises.updated}
  - Skipped: ${stats.exercises.skipped}
  - Errors: ${stats.exercises.errors}

🔄 Relationships:
  - Established: ${stats.relationships.established}/${stats.relationships.total}
  - Failed: ${stats.relationships.failed}

🏷️ Categories:`);

  Object.keys(stats.categories).forEach(category => {
    console.log(`  - ${category}: ${stats.categories[category]}`);
  });

  console.log(`
📏 Difficulties:
  - beginner: ${stats.difficulties.beginner || 0}
  - intermediate: ${stats.difficulties.intermediate || 0}
  - advanced: ${stats.difficulties.advanced || 0}
  - elite: ${stats.difficulties.elite || 0}

⚠️ Validation:
  - Warnings: ${stats.validation.warnings}
  - Errors: ${stats.validation.errors}

⏱️ Duration: ${duration.toFixed(2)} seconds
  `);
  
  if (options.dryRun) {
    console.log('NOTE: This was a dry run. No data was actually imported.');
  }
}

/**
 * Main import function
 */
async function importExercises() {
  try {
    // Only connect to MongoDB if not in dry run mode
    if (!options.dryRun) {
      const connected = await connectToMongoDB();
      if (!connected) {
        throw new Error('Failed to connect to MongoDB');
      }
    } else {
      console.log('🔍 Dry run mode: Skipping MongoDB connection');
    }
    
    // Get list of CSV files to process
    const csvDir = path.join(process.cwd(), 'public', 'data');
    if (!fs.existsSync(csvDir)) {
      throw new Error(`Directory not found: ${csvDir}`);
    }
    
    // Get files to process
    let files;
    if (options.specificFiles.length > 0) {
      // Process specific files
      files = options.specificFiles.map(file => {
        // Handle both absolute paths and filenames
        return file.includes('/') ? file : path.join(csvDir, file);
      }).filter(file => fs.existsSync(file));
      
      console.log(`🔍 Processing ${files.length} specified CSV files`);
    } else {
      // Process all CSV files in directory
      files = fs.readdirSync(csvDir)
        .filter(file => file.endsWith('.csv'))
        .map(file => path.join(csvDir, file));
      
      console.log(`🔍 Found ${files.length} CSV files in ${csvDir}`);
    }
    
    if (files.length === 0) {
      throw new Error('No CSV files found to process');
    }
    
    stats.files.total = files.length;
    
    // FIRST PASS: Import all exercises
    console.log('\n🔄 FIRST PASS: Importing exercises');
    const exerciseMap = new Map();  // Store unique_id -> MongoDB _id mapping
    
    for (const file of files) {
      await processFile(file, exerciseMap);
    }
    
    // SECOND PASS: Establish relationships
    if (!options.skipRelationships && !options.dryRun) {
      console.log('\n🔄 SECOND PASS: Establishing relationships');
      await establishRelationships(exerciseMap);
    } else if (options.skipRelationships) {
      console.log('\n⏩ Skipping relationship establishment (--skip-relationships)');
    }
    
    // Print statistics
    printStatistics();
    
  } catch (error) {
    console.error('\n❌ Error during import process:', error.message);
    if (options.verbose) {
      console.error(error);
    }
  } finally {
    // Disconnect from MongoDB if connected
    if (mongoose.connection.readyState !== 0 && !options.dryRun) {
      await mongoose.disconnect();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

// Run the import
importExercises();