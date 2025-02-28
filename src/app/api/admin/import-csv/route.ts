// src/app/api/admin/import-csv/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Exercise from '@/models/Exercise';
import { getAuth } from '@/lib/auth';
import path from 'path';
import fs from 'fs';
import Papa from 'papaparse';

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
  
  // FIRST PASS: Import all exercises
  const exerciseMap = new Map();  // Store unique_id -> MongoDB _id mapping
  const importStats = {
    total: 0,
    updated: 0,
    new: 0,
    categories: {}
  };
  
  for (const file of files) {
    console.log(`Processing ${path.basename(file)}`);
    
    // Read and parse CSV
    const content = fs.readFileSync(file, 'utf8');
    const { data, errors } = Papa.parse(content, { 
      header: true, 
      skipEmptyLines: true,
      dynamicTyping: true
    });
    
    if (errors.length > 0) {
      console.warn('Parse errors:', errors);
    }
    
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
        // Check if exercise exists
        const existingExercise = await Exercise.findOne({ uniqueId: exercise.uniqueId });
        
        // Upsert the exercise
        const result = await Exercise.findOneAndUpdate(
          { uniqueId: exercise.uniqueId },
          exercise,
          { upsert: true, new: true }
        );
        
        // Update stats
        if (existingExercise) {
          importStats.updated++;
        } else {
          importStats.new++;
        }
        
        importStats.total++;
        importStats.categories[categoryValue] = (importStats.categories[categoryValue] || 0) + 1;
        
        // Store the mapping
        exerciseMap.set(exercise.uniqueId, result._id);
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
  
  return {
    success: true,
    message: `CSV import completed successfully`,
    stats: {
      total: importStats.total,
      new: importStats.new,
      updated: importStats.updated,
      relationshipsUpdated,
      categories: importStats.categories
    }
  };
}

export async function POST(req: NextRequest) {
  try {
    // Optional authentication check (remove in development if needed)
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