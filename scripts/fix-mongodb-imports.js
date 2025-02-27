const fs = require('fs');
const path = require('path');

function fixFiles(dir) {
  const files = fs.readdirSync(dir);
  let fixedCount = 0;
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.next')) {
      fixedCount += fixFiles(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for mongodb imports
      if (content.includes("from '@/lib/db/mongodb'") || content.includes('from "@/lib/db/mongodb"')) {
        let newContent = content;
        let fixed = false;
        
        // Replace default import with named import
        newContent = newContent.replace(
          /import\s+dbConnect\s+from\s+['"]@\/lib\/db\/mongodb['"]/g,
          "import { dbConnect } from '@/lib/db/mongodb'"
        );
        
        if (newContent !== content) {
          fs.writeFileSync(filePath, newContent, 'utf8');
          console.log(`Fixed: ${filePath}`);
          fixed = true;
          fixedCount++;
        }
      }
    }
  });
  
  return fixedCount;
}

const fixedCount = fixFiles('.');
console.log(`\nTotal files fixed: ${fixedCount}`);