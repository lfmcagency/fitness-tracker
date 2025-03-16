// src/lib/importUtils.ts

import Papa from 'papaparse';

/**
 * Reads a CSV file and preprocesses it before import to fix formCues format
 * This function can be used to fix the formCues format without modifying the backend
 */
export async function preprocessExerciseCSV(filePath: string, fixFormCues: boolean = true): Promise<string> {
  try {
    // Fetch the CSV file
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV file: ${filePath}`);
    }
    
    const csvText = await response.text();
    
    // If we don't need to fix formCues, return the raw CSV
    if (!fixFormCues) {
      return csvText;
    }
    
    // Parse the CSV
    const parsedData = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    });
    
    // Check if formCues exists in the data and fix it
    const fixedData = parsedData.data.map((row: any) => {
      // If the row has formCues or form_cues, ensure it's a string
      if (row.formCues) {
        row.formCues = convertToString(row.formCues);
      }
      if (row.form_cues) {
        row.form_cues = convertToString(row.form_cues);
      }
      return row;
    });
    
    // Convert back to CSV
    const fixedCSV = Papa.unparse(fixedData);
    return fixedCSV;
  } catch (error) {
    console.error('Error preprocessing CSV:', error);
    throw error;
  }
}

/**
 * Converts a value to a comma-separated string
 */
function convertToString(value: any): string {
  if (Array.isArray(value)) {
    return value.filter(item => item && typeof item === 'string').join(', ');
  }
  
  if (typeof value === 'string') {
    // If it looks like a JSON array, parse and convert
    if (value.trim().startsWith('[') && value.trim().endsWith(']')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => item && typeof item === 'string').join(', ');
        }
      } catch (error) {
        // If parsing fails, return as-is
        return value;
      }
    }
    return value;
  }
  
  return value?.toString() || '';
}

/**
 * Import a CSV file with preprocessing for specific schema needs
 * @param fileName Name of the file in the /data directory
 * @param collection Collection to import to
 * @param options Import options
 */
export async function importCSVWithFixes(
  fileName: string,
  collection: string = 'exercises',
  options: {
    overwrite: boolean;
    fixFormCues: boolean;
    [key: string]: any;
  }
): Promise<any> {
  try {
    if (collection === 'exercises' && options.fixFormCues) {
      // For exercises with formCues fix:
      // 1. Fetch and preprocess the CSV
      const filePath = `/data/${fileName}`;
      const processedCSV = await preprocessExerciseCSV(filePath, true);
      
      // 2. Send the preprocessed data to the import endpoint
      const importData = {
        collection,
        data: processedCSV, // Send the data directly instead of filename
        options: {
          ...options,
          modelSpecific: true
        }
      };
      
      const response = await fetch('/api/admin/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Import failed');
      }
      
      return await response.json();
    } else {
      // For other imports, just use the normal flow
      const importData = {
        collection,
        fileName,
        options: {
          ...options,
          modelSpecific: collection === 'exercises'
        }
      };
      
      const response = await fetch('/api/admin/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Import failed');
      }
      
      return await response.json();
    }
  } catch (error) {
    console.error('Import error:', error);
    throw error;
  }
}