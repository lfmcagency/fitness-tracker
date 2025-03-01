// This script uses CommonJS syntax for better compatibility
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const XLSX = require('xlsx');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'fitness-tracker'; // Change this if your database has a different name
const COLLECTION_NAME = 'exercises';
const ODS_DIR = path.join(process.cwd(), 'public', 'data'); // Adjust path if needed

// MongoDB Connection with retry
async function connectToMongoDB(retries = 5, backoff = 1500) {
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Connecting to MongoDB (attempt ${attempt})...`);
      const client = new MongoClient(MONGODB_URI);
      await client.connect();
      console.log('Successfully connected to MongoDB');
      return client;
    } catch (error) {
      console.error(`Connection attempt ${attempt} failed:`, error.message);
      lastError = error;
      
      if (attempt < retries) {
        const delay = backoff * attempt;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed to connect after ${retries} attempts: ${lastError.message}`);
}

// Process ODS files
async function processODSFiles() {
  try {
    // First check if directory exists
    if (!fs.existsSync(ODS_DIR)) {
      console.error(`Directory not found: ${ODS_DIR}`);
      console.log('Make sure you have ODS files in the public/data directory.');
      return;
    }
    
    // Connect to MongoDB
    const client = await connectToMongoDB();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    // Get list of ODS files
    const files = fs.readdirSync(ODS_DIR)
      .filter(file => file.endsWith('.ods'))
      .map(file => path.join(ODS_DIR, file));
    
    console.log(`Found ${files.length} ODS files to process`);
    if (files.length === 0) {
      console.log('No ODS files found. Place your ODS files in the public/data directory.');
      await client.close();
      return;
    }
    
    // Process each file
    for (const file of files) {
      const filename = path.basename(file);
      console.log(`Processing ${filename}...`);
      
      // Extract category from filename
      let category = 'core'; // Default category
      let subcategory = '';
      
      // Determine category based on filename
      if (filename.includes('push')) {
        category = 'push';
      } else if (filename.includes('pull')) {
        category = 'pull';
      } else if (filename.includes('leg') || filename.includes('squat')) {
        category = 'legs';
      }
      
      // Determine subcategory based on filename
      if (filename.includes('hollow')) {
        subcategory = 'hollow body';
      } else if (filename.includes('legraises')) {
        subcategory = 'leg raises';
      } else if (filename.includes('lsit')) {
        subcategory = 'l-sit';
      } else if (filename.includes('plank')) {
        subcategory = 'plank';
      } else if (filename.includes('crunch')) {
        subcategory = 'crunch';
      } else if (filename.includes('rotation')) {
        subcategory = 'rotation';
      } else if (filename.includes('extension')) {
        subcategory = 'core extension';
      }
      
      // Read ODS file
      try {
        const workbook = XLSX.readFile(file, { 
          cellStyles: true,
          cellFormulas: true,
          cellDates: true
        });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        if (data.length === 0) {
          console.warn(`No data found in ${filename}`);
          continue;
        }
        
        console.log(`Found ${data.length} exercises in ${filename}`);
        
        // Get column names for debugging
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        const headers = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell = worksheet[XLSX.utils.encode_cell({r:0, c:C})];
          if (cell && cell.v) headers[C] = cell.v;
        }
        console.log('Available columns:', headers.filter(Boolean).join(', '));
        
        // Clean and transform data
        const exercises = data.map((row, index) => {
          // Determine progression level
          const level = row.ProgressionLevel || row.Level || row['Progression Level'] || index + 1;
          
          // Determine difficulty based on level
          let difficulty = 'beginner';
          if (level > 5) difficulty = 'intermediate';
          if (level > 10) difficulty = 'advanced';
          
          // Create a standardized exercise object
          const exercise = {
            name: row.Name || row.Exercise || row.Progression || `Exercise ${index + 1}`,
            category: category,
            subcategory: subcategory || category,
            progressionLevel: parseInt(level, 10),
            description: row.Description || row.Notes || '',
            primaryMuscleGroup: row.PrimaryMuscle || row['Primary Muscle'] || '',
            secondaryMuscleGroup: row.SecondaryMuscle || row['Secondary Muscle'] || '',
            difficulty: difficulty,
            instructions: row.Instructions || row.Notes || '',
            xpValue: parseInt(row.XP || '10', 10) || 10,
            importedFrom: filename,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // Clean up empty values
          Object.keys(exercise).forEach(key => {
            if (exercise[key] === '') {
              delete exercise[key];
            }
          });
          
          return exercise;
        });
        
        // Use bulk operations for better performance
        if (exercises.length > 0) {
          try {
            // Create a unique index for deduplication if it doesn't exist
            await collection.createIndex(
              { name: 1, category: 1 }, 
              { unique: true, background: true }
            ).catch(err => {
              // If index already exists, that's fine
              if (!err.message.includes('already exists')) {
                throw err;
              }
            });
            
            // Prepare bulk operations
            const operations = exercises.map(exercise => ({
              updateOne: {
                filter: { name: exercise.name, category: exercise.category },
                update: { $set: exercise },
                upsert: true
              }
            }));
            
            // Execute bulk operation
            const result = await collection.bulkWrite(operations);
            console.log(`Imported ${result.upsertedCount} new exercises, updated ${result.modifiedCount} existing exercises from ${filename}`);
          } catch (error) {
            console.error(`Error bulk writing exercises from ${filename}:`, error.message);
          }
        }
      } catch (error) {
        console.error(`Error processing ${filename}:`, error.message);
      }
    }
    
    console.log('All ODS files processed successfully');
    await client.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error processing ODS files:', error);
    process.exit(1);
  }
}

// Execute the script
processODSFiles();