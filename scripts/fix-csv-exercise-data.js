#!/usr/bin/env node
/**
 * Fix CSV Exercise Data Script
 * 
 * This script fixes issues with CSV exercise data files:
 * 1. Adds missing unique_id fields
 * 2. Ensures all required fields are present
 * 3. Validates category values
 * 
 * Usage: node fix-csv-exercise-data.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

// Command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Valid values from schema
const validValues = {
  category: ['core', 'push', 'pull', 'legs'],
  difficulty: ['beginner', 'intermediate', 'advanced', 'elite'],
};

// Print banner
console.log('\n=================================================');
console.log('🛠️  EXERCISE CSV DATA FIXER');
console.log('=================================================\n');

if (dryRun) {
  console.log('🔍 DRY RUN MODE: Issues will be detected but files won\'t be modified\n');
}

// Statistics for reporting
const stats = {
  files: {
    processed: 0,
    fixed: 0,
  },
  issues: {
    missingUniqueId: 0,
    invalidCategory: 0,
    missingRequired: 0,
    other: 0,
  }
};

/**
 * Generate a unique ID for an exercise row
 */
function generateUniqueId(row, index, filename) {
  // Get file prefix from filename (first 3 characters)
  let prefix = path.basename(filename, '.csv').substring(0, 3).toUpperCase();
  
  // Add category identifier if available
  if (row.category) {
    prefix = row.category.substring(0, 3).toUpperCase();
  }
  
  // Add subcategory if available
  let subPrefix = '';
  if (row.subcategory) {
    subPrefix = row.subcategory.substring(0, 3).toUpperCase();
  } else {
    // Extract from filename if possible
    const filenameParts = path.basename(filename, '.csv').split('-');
    if (filenameParts.length > 1) {
      subPrefix = filenameParts[1].substring(0, 3).toUpperCase();
    }
  }
  
  // Add numeric part based on progression or index
  const numeric = row.progressionLevel 
    ? String(row.progressionLevel).padStart(3, '0') 
    : String(index + 1).padStart(3, '0');
    
  return `${prefix}${subPrefix}${numeric}`;
}

/**
 * Fix a row of CSV data
 */
function fixRow(row, index, filename) {
  const issues = [];
  const fixed = { ...row };
  
  // Fix missing unique_id
  if (!fixed.unique_id) {
    fixed.unique_id = generateUniqueId(row, index, filename);
    issues.push(`Missing unique_id, generated: ${fixed.unique_id}`);
    stats.issues.missingUniqueId++;
  }
  
  // Ensure name exists
  if (!fixed.name) {
    fixed.name = `Exercise ${index + 1} from ${path.basename(filename, '.csv')}`;
    issues.push(`Missing name, generated: ${fixed.name}`);
    stats.issues.missingRequired++;
  }
  
  // Fix/validate category
  if (!fixed.category) {
    // Try to extract from filename
    const filenameParts = path.basename(filename, '.csv').split('-');
    if (filenameParts.length > 0 && validValues.category.includes(filenameParts[0])) {
      fixed.category = filenameParts[0];
      issues.push(`Missing category, extracted from filename: ${fixed.category}`);
    } else {
      fixed.category = 'core'; // Default value
      issues.push(`Missing category, set default: ${fixed.category}`);
    }
    stats.issues.missingRequired++;
  } else if (!validValues.category.includes(fixed.category)) {
    const oldCategory = fixed.category;
    // Try to make it valid
    const normalized = fixed.category.toLowerCase();
    if (validValues.category.some(c => normalized.includes(c))) {
      // Extract the valid part
      fixed.category = validValues.category.find(c => normalized.includes(c));
    } else {
      fixed.category = 'core'; // Default value
    }
    issues.push(`Invalid category '${oldCategory}', changed to: ${fixed.category}`);
    stats.issues.invalidCategory++;
  }
  
  // Fix subcategory if needed
  if (!fixed.subcategory) {
    // Try to extract from filename
    const filenameParts = path.basename(filename, '.csv').split('-');
    if (filenameParts.length > 1) {
      fixed.subcategory = filenameParts[1];
      issues.push(`Missing subcategory, extracted from filename: ${fixed.subcategory}`);
      stats.issues.other++;
    }
  }
  
  // Fix numeric fields
  if (fixed.progressionLevel && isNaN(Number(fixed.progressionLevel))) {
    const oldValue = fixed.progressionLevel;
    fixed.progressionLevel = index + 1;
    issues.push(`Invalid progressionLevel '${oldValue}', set to: ${fixed.progressionLevel}`);
    stats.issues.other++;
  }
  
  if (fixed.xp_value && isNaN(Number(fixed.xp_value))) {
    const oldValue = fixed.xp_value;
    fixed.xp_value = 10 + (Number(fixed.progressionLevel) || index) * 5;
    issues.push(`Invalid xp_value '${oldValue}', set to: ${fixed.xp_value}`);
    stats.issues.other++;
  }
  
  // Fix or add difficulty
  if (!fixed.difficulty) {
    // Determine based on progression level
    const level = Number(fixed.progressionLevel) || index + 1;
    if (level <= 3) fixed.difficulty = 'beginner';
    else if (level <= 7) fixed.difficulty = 'intermediate';
    else if (level <= 9) fixed.difficulty = 'advanced';
    else fixed.difficulty = 'elite';
    
    issues.push(`Missing difficulty, set based on progression: ${fixed.difficulty}`);
    stats.issues.other++;
  } else if (!validValues.difficulty.includes(fixed.difficulty)) {
    const oldValue = fixed.difficulty;
    
    // Try to normalize it
    const normalized = fixed.difficulty.toLowerCase();
    if (validValues.difficulty.some(d => normalized.includes(d))) {
      // Extract the valid part
      fixed.difficulty = validValues.difficulty.find(d => normalized.includes(d));
    } else {
      // Determine based on progression level
      const level = Number(fixed.progressionLevel) || index + 1;
      if (level <= 3) fixed.difficulty = 'beginner';
      else if (level <= 7) fixed.difficulty = 'intermediate';
      else if (level <= 9) fixed.difficulty = 'advanced';
      else fixed.difficulty = 'elite';
    }
    
    issues.push(`Invalid difficulty '${oldValue}', changed to: ${fixed.difficulty}`);
    stats.issues.other++;
  }
  
  return { fixed, issues };
}

/**
 * Process a single CSV file
 */
async function processFile(filePath) {
  const filename = path.basename(filePath);
  console.log(`\n📄 Processing ${filename}`);
  
  try {
    // Read and parse the CSV file
    const content = fs.readFileSync(filePath, 'utf8');
    const { data, errors } = Papa.parse(content, { 
      header: true, 
      skipEmptyLines: true 
    });
    
    if (errors.length > 0) {
      console.error(`❌ Parse errors in ${filename}:`, errors);
      return false;
    }
    
    console.log(`   Found ${data.length} exercises`);
    
    let rowsWithIssues = 0;
    let fixedData = [];
    
    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const { fixed, issues } = fixRow(row, i, filePath);
      
      fixedData.push(fixed);
      
      if (issues.length > 0) {
        rowsWithIssues++;
        console.log(`   ⚠️ Row ${i + 1} (${row.name || 'unnamed'}) has issues:`);
        issues.forEach(issue => console.log(`      - ${issue}`));
      }
    }
    
    // Only write changes if issues were found and not in dry run mode
    if (rowsWithIssues > 0 && !dryRun) {
      // Convert back to CSV
      const csv = Papa.unparse(fixedData);
      
      // Write the fixed CSV
      fs.writeFileSync(filePath, csv);
      console.log(`   ✅ Fixed ${rowsWithIssues} rows in ${filename}`);
      stats.files.fixed++;
    } else if (rowsWithIssues > 0) {
      console.log(`   🔍 Would fix ${rowsWithIssues} rows in ${filename} (dry run)`);
    } else {
      console.log(`   ✅ No issues found in ${filename}`);
    }
    
    stats.files.processed++;
    return true;
    
  } catch (error) {
    console.error(`   ❌ Error processing ${filename}:`, error.message);
    return false;
  }
}

/**
 * Main function to process all CSV files
 */
async function main() {
  try {
    // Get list of CSV files
    const csvDir = path.join(process.cwd(), 'public', 'data');
    if (!fs.existsSync(csvDir)) {
      throw new Error(`Directory not found: ${csvDir}`);
    }
    
    const files = fs.readdirSync(csvDir)
      .filter(file => file.endsWith('.csv'))
      .map(file => path.join(csvDir, file));
    
    console.log(`🔍 Found ${files.length} CSV files in ${csvDir}`);
    
    if (files.length === 0) {
      throw new Error('No CSV files found to process');
    }
    
    // Process each file
    for (const file of files) {
      await processFile(file);
    }
    
    // Print statistics
    console.log('\n=================================================');
    console.log('📊 PROCESSING STATISTICS');
    console.log('=================================================');
    console.log(`
📂 Files:
  - Total processed: ${stats.files.processed}
  - Files fixed: ${stats.files.fixed}

🛠️ Issues fixed:
  - Missing unique_id: ${stats.issues.missingUniqueId}
  - Invalid category: ${stats.issues.invalidCategory}
  - Missing required fields: ${stats.issues.missingRequired}
  - Other issues: ${stats.issues.other}
    `);
    
    if (dryRun) {
      console.log('NOTE: This was a dry run. No files were actually modified.');
      console.log('Run without --dry-run to apply the fixes.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();