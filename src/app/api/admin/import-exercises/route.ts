// src/app/api/admin/import-exercises/route.ts (with defensive programming)
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withRoleProtection } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';;
import Exercise from "@/models/Exercise";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { isValidObjectId } from "mongoose";
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

/**
 * POST /api/admin/import-exercises
 * Import exercises from CSV data (admin only)
 */
export const POST = async (req: NextRequest) => {
  return withRoleProtection(['admin'])(req, async () => {
    try {
      await dbConnect();
      
      // Parse request body with defensive error handling
      let body;
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Validate body
      if (!body || typeof body !== 'object') {
        return apiError('Invalid import data', 400, 'ERR_INVALID_DATA');
      }
      
      const { fileName, fileContent, overwrite } = body;
      
      // Validate fileName
      if (!fileName || typeof fileName !== 'string' || fileName.trim() === '') {
        return apiError('Missing or invalid file name', 400, 'ERR_VALIDATION');
      }
      
      // Validate that it's a CSV file
      if (!fileName.toLowerCase().endsWith('.csv')) {
        return apiError('File must be a CSV', 400, 'ERR_VALIDATION');
      }
      
      // Validate fileContent or use file from disk
      let csvContent = fileContent;
      
      if (!csvContent && fileName) {
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
      
      // Parse CSV content with defensive error handling
      let parsedData;
      try {
        parsedData = Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
          transform: (value) => value.trim()
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
      
      // Validate required columns
      const requiredColumns = ['name', 'category', 'progressionLevel'];
      const missingColumns = requiredColumns.filter(col => 
        !parsedData.meta.fields?.includes(col)
      );
      
      if (missingColumns.length > 0) {
        return apiError(
          `CSV is missing required columns: ${missingColumns.join(', ')}`, 
          400, 
          'ERR_MISSING_COLUMNS'
        );
      }
      
      // Process exercises with proper error handling
      const results = {
        total: parsedData.data.length,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[]
      };
      
      // Process each exercise
      for (const row of parsedData.data) {
        try {
          // Skip rows without required fields
          if (!row.name || !row.category) {
            results.skipped++;
            results.errors.push(`Skipped row: Missing name or category`);
            continue;
          }
          
          // Validate progression level
          let progressionLevel = 1; // Default
          if (row.progressionLevel) {
            const level = parseInt(row.progressionLevel);
            if (!isNaN(level) && level > 0) {
              progressionLevel = level;
            }
          }
          
          // Check for existing exercise by unique ID or name+category
          const query = row.unique_id 
            ? { unique_id: row.unique_id } 
            : { name: row.name, category: row.category };
          
          const existingExercise = await Exercise.findOne(query);
          
          // Skip if exists and overwrite is false
          if (existingExercise && overwrite !== true) {
            results.skipped++;
            continue;
          }
          
          // Prepare exercise data with validation
          const exerciseData = {
            name: row.name,
            category: row.category,
            subcategory: row.subcategory || '',
            progressionLevel,
            description: row.description || '',
            difficulty: row.difficulty || 'beginner',
            primaryMuscleGroup: row.primary_muscle_group || row.primaryMuscleGroup || '',
            secondaryMuscleGroups: parseArray(row.secondary_muscle_groups || row.secondaryMuscleGroups),
            formCues: parseArray(row.form_cues || row.formCues),
            unique_id: row.unique_id || `${row.category}-${row.name}-${progressionLevel}`.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            xpValue: parseInt(row.xp_value || '0') || progressionLevel * 10,
            unlockRequirements: row.unlock_requirements || '',
          };
          
          // Process relationships if present
          if (row.rel_prev && typeof row.rel_prev === 'string' && row.rel_prev.trim() !== '') {
            exerciseData.previousExercise = row.rel_prev;
          }
          
          if (row.rel_next && typeof row.rel_next === 'string' && row.rel_next.trim() !== '') {
            exerciseData.nextExercise = row.rel_next;
          }
          
          // Update or create exercise
          if (existingExercise) {
            await Exercise.updateOne({ _id: existingExercise._id }, exerciseData);
            results.updated++;
          } else {
            await Exercise.create(exerciseData);
            results.created++;
          }
        } catch (rowError) {
          console.error('Error processing exercise row:', rowError);
          results.errors.push(`Error in row ${row.name || 'unknown'}: ${rowError.message}`);
          results.skipped++;
        }
      }
      
      // Return results summary
      return apiResponse({
        fileName,
        results: {
          total: results.total,
          created: results.created,
          updated: results.updated,
          skipped: results.skipped,
          errors: results.errors.slice(0, 10), // Limit number of errors returned
          errorCount: results.errors.length
        }
      }, true, `Import completed: ${results.created} created, ${results.updated} updated`);
    } catch (error) {
      return handleApiError(error, "Error importing exercises");
    }
  });
};

/**
 * GET /api/admin/import-exercises
 * List available exercise CSV files (admin only)
 */
export const GET = async (req: NextRequest) => {
  return withRoleProtection(['admin'])(req, async () => {
    try {
      const dataDir = path.join(process.cwd(), 'public', 'data');
      let files;
      
      try {
        // Check if directory exists
        if (!fs.existsSync(dataDir)) {
          return apiResponse({ files: [] }, true, 'Data directory not found');
        }
        
        // Read directory
        const allFiles = fs.readdirSync(dataDir);
        
        // Filter CSV files
        files = allFiles
          .filter(file => file.toLowerCase().endsWith('.csv'))
          .map(file => ({
            name: file,
            path: `/data/${file}`,
            size: fs.statSync(path.join(dataDir, file)).size,
          }));
      } catch (fsError) {
        console.error('Error reading data directory:', fsError);
        return apiError(
          'Error accessing exercise files', 
          500, 
          'ERR_FILE_ACCESS',
          process.env.NODE_ENV === 'development' ? fsError : undefined
        );
      }
      
      return apiResponse({ files }, true, `Found ${files.length} CSV files`);
    } catch (error) {
      return handleApiError(error, "Error listing exercise files");
    }
  });
};

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