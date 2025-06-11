// src/app/api/foods/import/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withRoleProtection } from "@/lib/auth-utils";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';
import Papa from 'papaparse';
import Food from "@/models/Food";
import { ImportResult } from '@/types/api/importResponses';

export const POST = withRoleProtection(['admin'])(async (req: NextRequest) => {
  try {
    await dbConnect();

    // Get file from FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return apiError('No file provided', 400, 'ERR_NO_FILE');
    }

    if (!file.name.endsWith('.csv')) {
      return apiError('File must be a CSV', 400, 'ERR_INVALID_FILE_TYPE');
    }

    // Read file content
    const csvContent = await file.text();
    
    // Parse CSV
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => typeof value === 'string' ? value.trim() : value
    });

    if (!parsed.data || parsed.data.length === 0) {
      return apiError('No valid data found in CSV', 400, 'ERR_EMPTY_DATA');
    }

    const startTime = Date.now();
    const result: ImportResult = {
      total: parsed.data.length,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Process each row
    for (const row of parsed.data as any[]) {
      result.processed++;
      
      try {
        // Skip rows without required fields
        if (!row.name) {
          result.skipped++;
          continue;
        }

        // Transform the data
        const foodData = {
  name: row.name,
  brand: row.brand || undefined,
  description: row.description || undefined,
  category: row.category || 'Other',
  servingSize: parseFloat(row.servingSize || row.serving_size) || 100,
  servingUnit: row.servingUnit || 'g',
  protein: parseFloat(row.protein) || 0,
  carbs: parseFloat(row.carbs) || 0,
  fat: parseFloat(row.fat) || 0,
  calories: parseFloat(row.calories) || 0,
  barcode: row.barcode || undefined,
  isSystemFood: false  // Mark as custom food
};

        // Check if food already exists
        const existing = await Food.findOne({ name: foodData.name });

        if (existing) {
          // Update existing
          await Food.updateOne({ _id: existing._id }, foodData);
          result.updated++;
        } else {
          // Create new
          await Food.create(foodData);
          result.created++;
        }

      } catch (itemError) {
        result.errors.push(`Row ${result.processed}: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`);
        result.skipped++;
      }
    }

    result.duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;

    return apiResponse<ImportResult>(
      result,
      true,
      `Import completed: ${result.created} created, ${result.updated} updated`
    );

  } catch (error) {
    return handleApiError(error, "Error importing foods");
  }
});