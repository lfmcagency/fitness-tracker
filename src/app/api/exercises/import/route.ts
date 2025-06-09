export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withRoleProtection } from "@/lib/auth-utils";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';
import Papa from 'papaparse';
import Exercise from "@/models/Exercise";
import { ExerciseImportResult } from '@/types/api/importResponses';

export const POST = withRoleProtection(['admin'])(async (req: NextRequest) => {
  try {
    await dbConnect();

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return apiError('No file provided', 400, 'ERR_NO_FILE');
    }

    if (!file.name.endsWith('.csv')) {
      return apiError('File must be a CSV', 400, 'ERR_INVALID_FILE_TYPE');
    }

    const csvContent = await file.text();
    
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';', 
      transformHeader: (header) => header.trim(),
      transform: (value) => typeof value === 'string' ? value.trim() : value
    });

    if (!parsed.data || parsed.data.length === 0) {
      return apiError('No valid data found in CSV', 400, 'ERR_EMPTY_DATA');
    }

    const startTime = Date.now();
    const result: ExerciseImportResult = {
      total: parsed.data.length,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    for (const row of parsed.data as any[]) {
      result.processed++;
      
      try {
        if (!row.name || !row.category) {
          result.skipped++;
          continue;
        }

        // Map CSV fields to Exercise schema exactly
        const exerciseData = {
          name: row.name,
          category: row.category,
          subcategory: row.subcategory || '',
          progressionLevel: parseInt(row.progressionLevel) || 1,
          description: row.description || '',
          difficulty: row.difficulty || 'beginner',
          primaryMuscleGroup: row.primary_muscle_group || '',
          secondaryMuscleGroups: parseStringArray(row.secondary_muscle_groups),
          formCues: parseStringArray(row.form_cues),
          uniqueId: row.unique_id || generateUniqueId(row),
          xpValue: parseInt(row.xp_value) || (parseInt(row.progressionLevel) || 1) * 10,
          unlockRequirements: row.unlock_requirements || ''
        };

        const existing = await Exercise.findOne({
          $or: [
            { uniqueId: exerciseData.uniqueId },
            { name: exerciseData.name, category: exerciseData.category }
          ]
        });

        if (existing) {
          await Exercise.updateOne({ _id: existing._id }, exerciseData);
          result.updated++;
        } else {
          await Exercise.create(exerciseData);
          result.created++;
        }

      } catch (itemError) {
        result.errors.push(`Row ${result.processed}: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`);
        result.skipped++;
      }
    }

    result.duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;

    return apiResponse<ExerciseImportResult>(
      result,
      true,
      `Import completed: ${result.created} created, ${result.updated} updated`
    );

  } catch (error) {
    return handleApiError(error, "Error importing exercises");
  }
});

// Helper functions
function parseStringArray(value: any): string[] {
  if (!value || value === '') return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    // Handle both comma and semicolon separated values
    const delimiter = value.includes(';') ? ';' : ',';
    return value.split(delimiter).map(item => item.trim()).filter(Boolean);
  }
  return [];
}

function generateUniqueId(row: any): string {
  return `${row.category}-${row.name}-${row.progressionLevel || 1}`.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}