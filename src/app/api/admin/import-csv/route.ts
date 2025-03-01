export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Exercise from '@/models/Exercise';
import { getAuth } from '@/lib/auth';
import path from 'path';
import fs from 'fs';
import Papa from 'papaparse';

// Simple interface for parsed rows
interface CsvRow {
  [key: string]: any;
}

// Function to import from CSV data
async function importFromCsv() {
  // Get list of CSV files
  const csvDir = path.join(process.cwd(), 'public', 'data');
  
  if (!fs.existsSync(csvDir)) {
    return {
      success: false,
      message: 'CSV directory not found. Create a public/data directory and add your CSV files.'
    };
  }
  
  const files = fs.readdirSync(csvDir)
    .filter(file => file.endsWith('.csv'))
    .map(file => path.join(csvDir, file));
  
  if (files.length === 0) {
    return {
      success: false,
      message: 'No CSV files found in public/data directory'
    };
  }
  
  // Stats for tracking import progress
  const stats: {
    total: number;
    updated: number;
    new: number;
    relationshipsUpdated: number;
    categories: Record<string, number>;
  } = {
    total: 0,
    updated: 0,
    new: 0,
    relationshipsUpdated: 0,
    categories: {}
  };
  
  // FIRST PASS: Import all exercises
  const exerciseMap = new Map();
  
  for (const file of files) {
    console.log(`Processing ${path.basename(file)}`);
    
    // Read and parse CSV
    const content = fs.readFileSync(file, 'utf8');
    const parseResult = Papa.parse<CsvRow>(content, { 
      header: true, 
      skipEmptyLines: true,
      dynamicTyping: true
    });
    
    if (parseResult.errors.length > 0) {
      console.warn('Parse errors:', parseResult.errors);
    }
    
    const rows = parseResult.data;
    
    // Import exercises
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip rows without a unique_id or name
      if (!row || typeof row !== 'object' || !row.unique_id || !row.name) {
        continue;
      }
      
      // Get category safely
      let categoryValue = 'uncategorized';
      if (row.category && typeof row.category === 'string') {
        categoryValue = row.category.toLowerCase();
      }
      
      // Update category stats
      stats.categories[categoryValue] = (stats.categories[categoryValue] || 0) + 1;
      
      // Create exercise object with type safety
      const exercise = {
        uniqueId: String(row.unique_id),
        name: String(row.name),
        category: categoryValue,
        subcategory: row.subcategory && typeof row.subcategory === 'string' ? row.subcategory.toLowerCase() : '',
        progressionLevel: typeof row.progressionLevel === 'number' ? row.progressionLevel : 0,
        description: row.description && typeof row.description === 'string' ? row.description : '',
        relPrev: row.rel_prev && typeof row.rel_prev === 'string' ? row.rel_prev : null,
        relNext: row.rel_next && typeof row.rel_next === 'string' ? row.rel_next : null,
        xpValue: typeof row.xp_value === 'number' ? row.xp_value : 10,
        unlockRequirements: row.unlock_requirements && typeof row.unlock_requirements === 'string' ? row.unlock_requirements : '',
        formCues: row.form_cues && typeof row.form_cues === 'string' ? row.form_cues : '',
        primaryMuscleGroup: row.primary_muscle_group && typeof row.primary_muscle_group === 'string' ? row.primary_muscle_group : '',
        secondaryMuscleGroups: row.secondary_muscle_groups && typeof row.secondary_muscle_groups === 'string' ? row.secondary_muscle_groups : '',
        difficulty: row.difficulty && typeof row.difficulty === 'string' ? row.difficulty : 'beginner'
      };
      
      try {
        // Check if it exists already
        const existingExercise = await Exercise.findOne({ uniqueId: exercise.uniqueId });
        
        // Upsert the exercise
        const result = await Exercise.findOneAndUpdate(
          { uniqueId: exercise.uniqueId },
          exercise,
          { upsert: true, new: true }
        );
        
        // Update stats
        stats.total++;
        if (existingExercise) {
          stats.updated++;
        } else {
          stats.new++;
        }
        
        // Store mapping between uniqueId and MongoDB _id
        exerciseMap.set(exercise.uniqueId, result._id);
      } catch (error) {
        console.error(`Error importing exercise ${exercise.name}:`, error);
      }
    }
  }
  
  // SECOND PASS: Establish relationships between exercises
  const exercises = await Exercise.find({ uniqueId: { $exists: true, $ne: null } });
  
  for (const exercise of exercises) {
    const updates: any = {};
    
    // Set previous exercise reference if it exists
    if (exercise.relPrev && exerciseMap.has(exercise.relPrev)) {
      updates.previousExercise = exerciseMap.get(exercise.relPrev);
    }
    
    // Set next exercise reference if it exists
    if (exercise.relNext && exerciseMap.has(exercise.relNext)) {
      updates.nextExercise = exerciseMap.get(exercise.relNext);
    }
    
    // Apply updates if we have any
    if (Object.keys(updates).length > 0) {
      await Exercise.findByIdAndUpdate(exercise._id, updates);
      stats.relationshipsUpdated++;
    }
  }
  
  return {
    success: true,
    message: `CSV import completed successfully`,
    stats
  };
}

export async function POST(req: NextRequest) {
  try {
    // Optional authentication check for production
    const session = await getAuth();
    
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    await dbConnect();
    const result = await importFromCsv();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error importing from CSV:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}