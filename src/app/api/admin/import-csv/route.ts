// src/app/api/admin/import-csv/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withRoleProtection } from "@/lib/auth-utils";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';
import Papa from 'papaparse';
import mongoose, { isValidObjectId } from "mongoose";
import Exercise from "@/models/Exercise";
import { IExercise, ExerciseCategory, ExerciseDifficulty } from '@/types/models/exercise';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface for CSV import options
 */
interface ImportOptions {
  overwrite: boolean;
  upsert: boolean;
  batch: boolean;
  batchSize: number;
  modelSpecific?: boolean;
}

/**
 * Interface for CSV import request body
 */
interface ImportRequest {
  collection: string;
  data?: string;
  fileName?: string;
  options?: Partial<ImportOptions>;
}

/**
 * Interface for import results
 */
interface ImportResults {
  total: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  errorCount?: number;
}

/**
 * Interface for batch processing results
 */
interface BatchResults {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * POST /api/admin/import-csv
 * Generic CSV import endpoint for database collections (admin only)
 */
export const POST = withRoleProtection(['admin'])(async (req: NextRequest) => {
  try {
    await dbConnect();
      
      // Parse request body with defensive error handling
      let body: ImportRequest;
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Validate body
      if (!body || typeof body !== 'object') {
        return apiError('Invalid import data', 400, 'ERR_INVALID_DATA');
      }
      
      const { collection, data, fileName, options } = body;
      
      // Validate collection name
      if (!collection || typeof collection !== 'string' || collection.trim() === '') {
        return apiError('Missing or invalid collection name', 400, 'ERR_VALIDATION');
      }
      
      // Validate collection name for security (prevent injection)
      if (!/^[a-zA-Z0-9_]+$/.test(collection)) {
        return apiError('Invalid collection name format', 400, 'ERR_VALIDATION');
      }
      
      // Blacklist critical collections
      const blacklistedCollections = ['users', 'sessions', 'accounts', 'verificationtokens'];
      if (blacklistedCollections.includes(collection.toLowerCase())) {
        return apiError(
          `Cannot import directly to ${collection} collection for security reasons`, 
          403, 
          'ERR_FORBIDDEN_COLLECTION'
        );
      }
      
      // Get CSV content (either from request body or file)
      let csvContent: string | null = null;
      
      // If data is provided directly, use it
      if (data && typeof data === 'string' && data.trim() !== '') {
        csvContent = data;
      } 
      // Otherwise try to read from file
      else if (fileName && typeof fileName === 'string' && fileName.trim() !== '') {
        // Validate that it's a CSV file
        if (!fileName.toLowerCase().endsWith('.csv')) {
          return apiError('File must be a CSV', 400, 'ERR_VALIDATION');
        }

        try {
          // In production, check if file exists in the public data directory
          const filePath = path.join(process.cwd(), 'public', 'data', fileName);
          
          // Check if file exists before trying to read it
          if (!fs.existsSync(filePath)) {
            return apiError(`File not found: ${fileName}`, 404, 'ERR_FILE_NOT_FOUND');
          }
          
          csvContent = fs.readFileSync(filePath, 'utf8');
        } catch (error) {
          console.error('Error reading CSV file from disk:', error);
          return apiError(
            'Error reading CSV file from disk', 
            500, 
            'ERR_FILE_READ',
            process.env.NODE_ENV === 'development' ? error : undefined
          );
        }
      }
      
      if (!csvContent || typeof csvContent !== 'string' || csvContent.trim() === '') {
        return apiError('Missing or invalid CSV content', 400, 'ERR_VALIDATION');
      }
      
      // Default options with defensive initialization
      const importOptions: ImportOptions = {
        overwrite: false,
        upsert: true,
        batch: true,
        batchSize: 100,
        modelSpecific: collection.toLowerCase() === 'exercises', // Enable model-specific handling for exercises
        ...(options && typeof options === 'object' ? options : {})
      };
      
      // Validate and sanitize options
      if (typeof importOptions.batchSize !== 'number' || importOptions.batchSize <= 0) {
        importOptions.batchSize = 100; // Default to 100 if invalid
      }
      
      // Limit batch size to prevent abuse
      importOptions.batchSize = Math.min(importOptions.batchSize, 500);
      
      // Parse CSV data with defensive error handling
      let parsedData: Papa.ParseResult<Record<string, any>>;
      try {
        parsedData = Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
          transform: (value) => typeof value === 'string' ? value.trim() : value
        });
      } catch (error) {
        console.error('Error parsing CSV:', error);
        return apiError(
          'Error parsing CSV data', 
          400, 
          'ERR_PARSE_ERROR',
          process.env.NODE_ENV === 'development' ? error : undefined
        );
      }
      
      if (!parsedData.data || !Array.isArray(parsedData.data) || parsedData.data.length === 0) {
        return apiError('No valid data found in CSV', 400, 'ERR_EMPTY_DATA');
      }
      
      // Perform model-specific validation if needed
      if (importOptions.modelSpecific && collection.toLowerCase() === 'exercises') {
        // Validate required columns for exercises
        const requiredColumns = ['name', 'category', 'progressionLevel'];
        const missingColumns = requiredColumns.filter(col => 
          !parsedData.meta.fields?.includes(col)
        );
        
        if (missingColumns.length > 0) {
          return apiError(
            `CSV is missing required columns for exercises: ${missingColumns.join(', ')}`, 
            400, 
            'ERR_MISSING_COLUMNS'
          );
        }
      }
      
      // Check if model exists for this collection, if not, we'll use the generic model
      let Model: mongoose.Model<any>;
      try {
        // Try to get the model if it exists
        if (collection.toLowerCase() === 'exercises') {
          Model = Exercise;
        } else {
          Model = mongoose.models[collection] || 
                  mongoose.model(collection, new mongoose.Schema({}, { strict: false }));
        }
      } catch (modelError) {
        console.error('Error getting/creating model:', modelError);
        return handleApiError(modelError, `Error creating model for ${collection}`);
      }
      
      // Process data
      const results: ImportResults = {
        total: parsedData.data.length,
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: []
      };
      
      // Process in batches for large datasets
      if (importOptions.batch) {
        const batchSize = importOptions.batchSize;
        const batches = Math.ceil(parsedData.data.length / batchSize);
        
        for (let i = 0; i < batches; i++) {
          const start = i * batchSize;
          const end = Math.min(start + batchSize, parsedData.data.length);
          const batchData = parsedData.data.slice(start, end);
          
          try {
            // Process batch
            const batchResults = await processBatch(
              Model, 
              batchData, 
              importOptions, 
              collection.toLowerCase()
            );
            
            // Update results
            results.processed += batchResults.processed;
            results.created += batchResults.created;
            results.updated += batchResults.updated;
            results.skipped += batchResults.skipped;
            
            // Collect errors (limit to avoid huge response)
            if (batchResults.errors && batchResults.errors.length > 0) {
              results.errors = [
                ...results.errors,
                ...batchResults.errors.slice(0, 10)
              ].slice(0, 50);
            }
          } catch (batchError) {
            console.error(`Error processing batch ${i+1}/${batches}:`, batchError);
            // Safely handle unknown error type
            const errorMessage = batchError instanceof Error 
              ? batchError.message 
              : 'Unknown batch processing error';
            results.errors.push(`Batch ${i+1}/${batches} error: ${errorMessage}`);
          }
        }
      } else {
        // Process individual documents
        for (const item of parsedData.data) {
          try {
            results.processed++;
            
            // Apply model-specific transformations
            let processedItem = item;
            if (importOptions.modelSpecific && collection.toLowerCase() === 'exercises') {
              processedItem = transformExerciseData(item);
            }
            
            // Find unique identifier if provided
            const idField = processedItem._id || processedItem.id || processedItem.unique_id || null;
            
            // Try to find existing document
            let existing = null;
            if (idField) {
              if (isValidObjectId(idField)) {
                existing = await Model.findById(idField);
              } else {
                existing = await Model.findOne({ 
                  $or: [
                    { _id: idField }, 
                    { id: idField },
                    { unique_id: idField }
                  ] 
                });
              }
            } else if (collection.toLowerCase() === 'exercises') {
              // For exercises, try to find by name and category
              existing = await Model.findOne({ 
                name: processedItem.name, 
                category: processedItem.category 
              });
            }
            
            if (existing && !importOptions.overwrite) {
              results.skipped++;
              continue;
            }
            
            if (existing && importOptions.overwrite) {
              // Update existing document
              await Model.updateOne({ _id: existing._id }, processedItem);
              results.updated++;
            } else {
              // Create new document
              await Model.create(processedItem);
              results.created++;
            }
          } catch (itemError) {
            console.error('Error processing item:', itemError);
            results.skipped++;
            
            // Collect error (limit to avoid huge response)
            if (results.errors.length < 50) {
              // Safely handle unknown error type
              const errorMessage = itemError instanceof Error 
                ? itemError.message 
                : 'Unknown item processing error';
              results.errors.push(
                `Error processing item ${results.processed}: ${errorMessage}`
              );
            }
          }
        }
      }
      
      // Add error count to results
      results.errorCount = results.errors.length;
      
      // Process relationships for exercises after import
      if (collection.toLowerCase() === 'exercises') {
        try {
          const relationshipResults = await processExerciseRelationships();
          
          // Add relationship processing results to response
          return apiResponse({
            collection,
            fileName: fileName || 'direct-data',
            results: {
              ...results,
              errors: results.errors.slice(0, 20), // Limit number of errors returned
              relationships: relationshipResults
            }
          }, true, `Import completed: ${results.created} created, ${results.updated} updated`);
        } catch (relError) {
          console.error('Error processing exercise relationships:', relError);
          
          return apiResponse({
            collection,
            fileName: fileName || 'direct-data',
            results: {
              ...results,
              errors: results.errors.slice(0, 20), // Limit number of errors returned
              relationshipError: relError instanceof Error ? relError.message : String(relError)
            }
          }, true, `Import completed with relationship errors: ${results.created} created, ${results.updated} updated`);
        }
      }
      
      // Standard response for other collections
      return apiResponse({
        collection,
        fileName: fileName || 'direct-data',
        results: {
          ...results,
          errors: results.errors.slice(0, 20) // Limit number of errors returned
        }
      }, true, `Import completed: ${results.created} created, ${results.updated} updated`);
    } catch (error) {
      return handleApiError(error, "Error importing CSV data");
    }
  });

/**
 * GET /api/admin/import-csv
 * List available CSV files for import (admin only)
 */
export const GET = withRoleProtection(['admin'])(async (req: NextRequest) => {
  try {
    const dataDir = path.join(process.cwd(), 'public', 'data');
    let files: { name: string; path: string; size: number; type: string }[] = [];
      
      try {
        // Check if directory exists
        if (!fs.existsSync(dataDir)) {
          return apiResponse({ files: [] }, true, 'Data directory not found');
        }
        
        // Read directory
        const allFiles = fs.readdirSync(dataDir);
        
        // Filter CSV files and get stats
        files = allFiles
          .filter(file => file.toLowerCase().endsWith('.csv'))
          .map(file => {
            const stats = fs.statSync(path.join(dataDir, file));
            
            // Get file type based on naming pattern
            let type = 'general';
            const fileName = file.toLowerCase();
            
            // Determine file type by naming pattern
            if (fileName.includes('exercise') || 
                fileName.includes('core') || 
                fileName.includes('push') || 
                fileName.includes('pull') || 
                fileName.includes('legs')) {
              type = 'exercise';
            } else if (fileName.includes('food') || fileName.includes('nutrition')) {
              type = 'food';
            } else if (fileName.includes('task') || fileName.includes('routine')) {
              type = 'task';
            }
            
            return {
              name: file,
              path: `/data/${file}`,
              size: stats.size,
              type: type
            };
          });
      } catch (fsError) {
        console.error('Error reading data directory:', fsError);
        return apiError(
          'Error accessing CSV files', 
          500, 
          'ERR_FILE_ACCESS',
          process.env.NODE_ENV === 'development' ? fsError : undefined
        );
      }
      
      // Get available collection models to help with mapping
      const availableModels = Object.keys(mongoose.models);
      
      return apiResponse({
        files,
        availableModels,
        dataPath: '/data/'
      }, true, `Found ${files.length} CSV files`);
    } catch (error) {
    return handleApiError(error, "Error listing CSV files");
  }
});

/**
 * Helper function to process a batch of documents
 */
async function processBatch(
  Model: mongoose.Model<any>, 
  batchData: Record<string, any>[], 
  options: ImportOptions,
  collectionName: string
): Promise<BatchResults> {
  const results: BatchResults = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };
  
  // Apply model-specific transformations if needed
  let processedData = batchData;
  if (options.modelSpecific && collectionName === 'exercises') {
    processedData = batchData.map(item => transformExerciseData(item));
  }
  
  // Extract IDs for bulk operations
  const bulkOps: mongoose.mongo.AnyBulkWriteOperation[] = [];
  
  for (const item of processedData) {
    results.processed++;
    
    try {
      // Find unique identifier based on collection
      let idField = item._id || item.id || null;
      
      // For exercises, also check unique_id
      if (collectionName === 'exercises' && !idField) {
        idField = item.unique_id;
      }
      
      // For exercises without ID, try to find by name + category
      if (!idField && collectionName === 'exercises' && item.name && item.category) {
        const existing = await Model.findOne({ name: item.name, category: item.category });
        if (existing) {
          idField = existing._id;
        }
      }
      
      if (idField && isValidObjectId(idField) && options.upsert) {
        // Upsert operation
        bulkOps.push({
          updateOne: {
            filter: { _id: idField },
            update: { $set: item },
            upsert: true
          }
        });
      } else if (idField && collectionName === 'exercises' && options.upsert) {
        // For exercises, use unique_id field if available
        bulkOps.push({
          updateOne: {
            filter: { unique_id: idField },
            update: { $set: item },
            upsert: true
          }
        });
      } else if (options.overwrite) {
        // Use insertMany for pure inserts or when no valid ID
        bulkOps.push({
          insertOne: {
            document: item
          }
        });
      } else {
        results.skipped++;
      }
    } catch (error) {
      results.skipped++;
      // Safely handle unknown error type
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error during batch preparation';
      results.errors.push(`Error processing item ${results.processed}: ${errorMessage}`);
    }
  }
  
  // Execute bulk operation if we have operations to perform
  if (bulkOps.length > 0) {
    try {
      const bulkResult = await Model.bulkWrite(bulkOps);
      
      // Update statistics
      if (bulkResult) {
        results.updated = bulkResult.modifiedCount || 0;
        results.created = bulkResult.insertedCount || 0;
        if (bulkResult.upsertedCount) {
          results.created += bulkResult.upsertedCount;
        }
      }
    } catch (bulkError) {
      console.error('Bulk operation error:', bulkError);
      // Safely handle unknown error type
      const errorMessage = bulkError instanceof Error 
        ? bulkError.message 
        : 'Unknown bulk operation error';
      results.errors.push(`Bulk operation error: ${errorMessage}`);
      
      // Fall back to individual processing if bulk fails
      for (const item of processedData) {
        try {
          const idField = item._id || item.id || item.unique_id || null;
          
          // Try to find existing document
          let existing = null;
          if (idField) {
            if (isValidObjectId(idField)) {
              existing = await Model.findById(idField);
            } else {
              existing = await Model.findOne({ 
                $or: [
                  { _id: idField },
                  { id: idField },
                  { unique_id: idField }
                ] 
              });
            }
          } else if (collectionName === 'exercises' && item.name && item.category) {
            existing = await Model.findOne({ name: item.name, category: item.category });
          }
          
          if (existing && !options.overwrite) {
            results.skipped++;
            continue;
          }
          
          if (existing && options.overwrite) {
            // Update existing document
            await Model.updateOne({ _id: existing._id }, item);
            results.updated++;
          } else {
            // Create new document
            await Model.create(item);
            results.created++;
          }
        } catch (itemError) {
          results.skipped++;
          // Safely handle unknown error type
          const errorMessage = itemError instanceof Error 
            ? itemError.message 
            : 'Unknown fallback processing error';
          results.errors.push(`Fallback processing error: ${errorMessage}`);
        }
      }
    }
  }
  
  return results;
}

/**
 * Helper function to parse string arrays from CSV
 */
function parseArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value.filter(item => item && typeof item === 'string');
  }
  
  if (typeof value === 'string') {
    if (value.trim() === '') return [];
    
    // Try to parse as JSON if it looks like an array
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => item && typeof item === 'string');
        }
      } catch (error) {
        // Fall back to comma splitting if JSON parse fails
      }
    }
    
    // Split by comma
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }
  
  return [];
}

/**
 * Exercise-specific data transformation
 */
function transformExerciseData(row: Record<string, any>): Partial<IExercise> {
  // Skip rows without required fields
  if (!row.name || !row.category) {
    return row;
  }
  
  // Validate progression level
  let progressionLevel = 1; // Default
  if (row.progressionLevel) {
    // Handle different types
    const level = typeof row.progressionLevel === 'number' 
      ? row.progressionLevel 
      : parseInt(row.progressionLevel, 10);
      
    if (!isNaN(level) && level > 0) {
      progressionLevel = level;
    }
  }
  
  // Process difficulty
  let difficulty: ExerciseDifficulty = 'beginner';
  if (row.difficulty && typeof row.difficulty === 'string') {
    const normalized = row.difficulty.trim().toLowerCase();
    if (['beginner', 'intermediate', 'advanced', 'elite'].includes(normalized)) {
      difficulty = normalized as ExerciseDifficulty;
    }
  }
  
  // Process XP value
  let xpValue = progressionLevel * 10; // Default based on progression level
  if (row.xp_value !== undefined || row.xpValue !== undefined) {
    const xpValueRaw = row.xp_value !== undefined ? row.xp_value : row.xpValue;
    const parsed = typeof xpValueRaw === 'number' 
      ? xpValueRaw 
      : parseInt(xpValueRaw, 10);
      
    if (!isNaN(parsed) && parsed >= 0) {
      xpValue = parsed;
    }
  }
  
  // Generate or use unique ID
  const uniqueId = row.unique_id || `${row.category}-${row.name}-${progressionLevel}`.toLowerCase()
    .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric chars with dashes
    .replace(/-+/g, '-')        // Replace multiple dashes with a single dash
    .replace(/^-|-$/g, '');     // Remove leading/trailing dashes
  
  // Create exercise data
  const exerciseData: Partial<IExercise> = {
    name: row.name,
    category: row.category as ExerciseCategory,
    subcategory: row.subcategory || '',
    progressionLevel,
    description: row.description || '',
    difficulty: difficulty,
    primaryMuscleGroup: row.primary_muscle_group || row.primaryMuscleGroup || '',
    secondaryMuscleGroups: parseArray(row.secondary_muscle_groups || row.secondaryMuscleGroups),
    formCues: parseArray(row.form_cues || row.formCues),
    uniqueId: uniqueId,
    xpValue: xpValue,
    unlockRequirements: row.unlock_requirements || row.unlockRequirements || '',
  };
  
  // Process relationships if present
  if (row.rel_prev && typeof row.rel_prev === 'string' && row.rel_prev.trim() !== '') {
    exerciseData.relPrev = row.rel_prev.trim();
  }
  
  if (row.rel_next && typeof row.rel_next === 'string' && row.rel_next.trim() !== '') {
    exerciseData.relNext = row.rel_next.trim();
  }
  
  return exerciseData;
}

/**
 * Process exercise relationships after import
 */
async function processExerciseRelationships(): Promise<{
  processed: number;
  updated: number;
  failed: number;
}> {
  const results = {
    processed: 0,
    updated: 0,
    failed: 0
  };
  
  try {
    // Find exercises with rel_prev or rel_next fields
    const exercises = await Exercise.find({
      $or: [
        { relPrev: { $exists: true, $ne: '' } },
        { relNext: { $exists: true, $ne: '' } }
      ]
    });
    
    // Process each exercise
    for (const exercise of exercises) {
      results.processed++;
      
      try {
        let updated = false;
        
        // Process previous relationship
        if (exercise.relPrev && !exercise.previousExercise) {
          const prev = await Exercise.findOne({ uniqueId: exercise.relPrev });
          if (prev) {
            exercise.previousExercise = prev._id;
            updated = true;
          }
        }
        
        // Process next relationship
        if (exercise.relNext && !exercise.nextExercise) {
          const next = await Exercise.findOne({ uniqueId: exercise.relNext });
          if (next) {
            exercise.nextExercise = next._id;
            updated = true;
          }
        }
        
        // Save if updated
        if (updated) {
          await exercise.save();
          results.updated++;
        }
      } catch (error) {
        console.error(`Error processing relationships for exercise ${exercise.name}:`, error);
        results.failed++;
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error processing exercise relationships:', error);
    throw error;
  }
}