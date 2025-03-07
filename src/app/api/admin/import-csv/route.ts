// src/app/api/admin/import-csv/route.ts (with defensive programming)
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withRoleProtection } from "@/lib/auth-utils";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';
import Papa from 'papaparse';
import mongoose from "mongoose";

/**
 * POST /api/admin/import-csv
 * Generic CSV import endpoint for database collections (admin only)
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
      
      const { collection, data, options } = body;
      
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
      
      // Validate data
      if (!data || typeof data !== 'string' || data.trim() === '') {
        return apiError('Missing or invalid CSV data', 400, 'ERR_VALIDATION');
      }
      
      // Default options with defensive initialization
      const importOptions = {
        overwrite: false,
        upsert: true,
        batch: true,
        batchSize: 100,
        ...(options && typeof options === 'object' ? options : {})
      };
      
      // Validate and sanitize options
      if (typeof importOptions.batchSize !== 'number' || importOptions.batchSize <= 0) {
        importOptions.batchSize = 100; // Default to 100 if invalid
      }
      
      // Limit batch size to prevent abuse
      importOptions.batchSize = Math.min(importOptions.batchSize, 500);
      
      // Parse CSV data with defensive error handling
      let parsedData;
      try {
        parsedData = Papa.parse(data, {
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
      
      // Check if model exists for this collection, if not, we'll use the generic model
      let Model;
      try {
        // Try to get the model if it exists
        Model = mongoose.models[collection] || 
                mongoose.model(collection, new mongoose.Schema({}, { strict: false }));
      } catch (modelError) {
        console.error('Error getting/creating model:', modelError);
        return handleApiError(modelError, `Error creating model for ${collection}`);
      }
      
      // Process data
      const results = {
        total: parsedData.data.length,
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[]
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
            const batchResults = await processBatch(Model, batchData, importOptions);
            
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
            
            // Find unique identifier if provided
            const idField = item._id || item.id || null;
            
            // Try to find existing document
            let existing = null;
            if (idField) {
              if (mongoose.Types.ObjectId.isValid(idField)) {
                existing = await Model.findById(idField);
              } else {
                existing = await Model.findOne({ $or: [{ _id: idField }, { id: idField }] });
              }
            }
            
            if (existing && !importOptions.overwrite) {
              results.skipped++;
              continue;
            }
            
            if (existing && importOptions.overwrite) {
              // Update existing document
              await Model.updateOne({ _id: existing._id }, item);
              results.updated++;
            } else {
              // Create new document
              await Model.create(item);
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
      
      return apiResponse({
        collection,
        results: {
          total: results.total,
          processed: results.processed,
          created: results.created,
          updated: results.updated,
          skipped: results.skipped,
          errors: results.errors.slice(0, 20), // Limit number of errors returned
          errorCount: results.errors.length
        }
      }, true, `Import completed: ${results.created} created, ${results.updated} updated`);
    } catch (error) {
      return handleApiError(error, "Error importing CSV data");
    }
  });
};

/**
 * Helper function to process a batch of documents
 */
async function processBatch(Model, batchData, options) {
  const results = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[]
  };
  
  // Extract IDs for bulk operations
  const bulkOps = [];
  
  for (const item of batchData) {
    results.processed++;
    
    try {
      // Find unique identifier if provided
      const idField = item._id || item.id || null;
      
      if (idField && mongoose.Types.ObjectId.isValid(idField) && options.upsert) {
        // Upsert operation
        bulkOps.push({
          updateOne: {
            filter: { _id: idField },
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
      for (const item of batchData) {
        try {
          const idField = item._id || item.id || null;
          
          // Try to find existing document
          let existing = null;
          if (idField) {
            if (mongoose.Types.ObjectId.isValid(idField)) {
              existing = await Model.findById(idField);
            } else {
              existing = await Model.findOne({ $or: [{ _id: idField }, { id: idField }] });
            }
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