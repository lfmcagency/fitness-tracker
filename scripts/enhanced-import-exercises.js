import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';
import { read, utils } from 'xlsx';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configuration
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'fitness-tracker';
const COLLECTION_NAME = 'exercises';
const ODS_DIR = path.join(process.cwd(), 'data', 'exercises');

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
    // Connect to MongoDB
    const client = await connectToMongoDB();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    // Get list of ODS files
    const files = fs.readdirSync(ODS_DIR)
      .filter(file => file.endsWith('.ods'))
      .map(file => path.join(ODS_DIR, file));
    
    console.log(`Found ${files.length} ODS files to process`);
    
    // Process each file
    for (const file of files) {
      const filename = path.basename(file);
      console.log(`Processing ${filename}...`);
      
      // Extract category from filename
      const category = filename.replace('progressions.ods', '').replace('exercises.ods', '');
      
      // Read ODS file
      const workbook = read(fs.readFileSync(file), { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const data = utils.sheet_to_json(worksheet);
      
      if (data.length === 0) {
        console.warn(`No data found in ${filename}`);
        continue;
      }
      
      console.log(`Found ${data.length} exercises in ${filename}`);
      
      // Clean and transform data
      const exercises = data.map(row => {
        // Create a standardized exercise object
        const exercise = {
          name: row.Name || row.Exercise || row.Progression || '',
          category: category || 'general',
          subcategory: row.Category || row.Type || category || '',
          progressionLevel: parseInt(row.Level || row.Progression || '0', 10) || 0,
          description: row.Description || '',
          primaryMuscleGroup: row.PrimaryMuscle || row['Primary Muscle'] || '',
          secondaryMuscleGroup: row.SecondaryMuscle || row['Secondary Muscle'] || '',
          difficulty: row.Difficulty || 'beginner',
          instructions: row.Instructions || row.Notes || '',
          prerequisites: row.Prerequisites || [],
          nextProgressions: row.NextProgressions || row['Next Progression'] || [],
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
        // Create a unique index for deduplication
        await collection.createIndex({ name: 1, category: 1 }, { unique: true, background: true });
        
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