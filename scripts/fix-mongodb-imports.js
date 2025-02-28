const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

console.log(`${colors.cyan}=== MongoDB Import Fix Script ===${colors.reset}`);
console.log(`${colors.yellow}This script updates incorrect default imports of dbConnect to named imports${colors.reset}\n`);

function fixFiles(dir, dryRun = false) {
  const files = fs.readdirSync(dir);
  let fixedCount = 0;
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.next')) {
      fixedCount += fixFiles(filePath, dryRun);
    } else if ((file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) && !file.includes('.d.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for mongodb imports
      if (content.includes("from '@/lib/db/mongodb'") || content.includes('from "@/lib/db/mongodb"')) {
        let newContent = content;
        let fixed = false;
        
        // Replace default import with named import
        const defaultImportRegex = /import\s+dbConnect\s+from\s+['"]@\/lib\/db\/mongodb['"]/g;
        if (defaultImportRegex.test(content)) {
          newContent = content.replace(
            defaultImportRegex,
            "import { dbConnect } from '@/lib/db/mongodb'"
          );
          fixed = true;
          
          console.log(`${colors.yellow}Found incorrect import in:${colors.reset} ${filePath}`);
          
          if (!dryRun) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`${colors.green}✓ Fixed${colors.reset}`);
          } else {
            console.log(`${colors.blue}Would fix (dry run)${colors.reset}`);
          }
          
          fixedCount++;
        }
      }
    }
  });
  
  return fixedCount;
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (dryRun) {
  console.log(`${colors.yellow}Running in DRY RUN mode - no files will be modified${colors.reset}\n`);
}

const startTime = Date.now();
const fixedCount = fixFiles('.', dryRun);
const endTime = Date.now();

if (fixedCount > 0) {
  console.log(`\n${colors.green}Done!${colors.reset} ${fixedCount} files ${dryRun ? 'would be' : 'were'} fixed in ${(endTime - startTime) / 1000}s`);
  
  if (dryRun) {
    console.log(`\n${colors.cyan}To actually fix the files, run the script without --dry-run:${colors.reset}`);
    console.log(`node scripts/fix-mongodb-imports.js`);
  } else {
    console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
    console.log(`1. Run tests to verify database connections work`);
    console.log(`2. Test the API endpoints to ensure they can connect to MongoDB`);
  }
} else {
  console.log(`\n${colors.green}No files needed fixing!${colors.reset} All imports appear to be correct.`);
}