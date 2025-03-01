require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
async function diagnose() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Define the Exercise model temporarily
    const Exercise = mongoose.model('Exercise');
    
    // Get count by category
    const categoryCount = await Exercise.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('== Exercise count by category ==');
    console.table(categoryCount);
    
    // Get count by subcategory
    const subcategoryCount = await Exercise.aggregate([
      { $group: { _id: { category: '$category', subcategory: '$subcategory' }, count: { $sum: 1 } } },
      { $sort: { '_id.category': 1, '_id.subcategory': 1 } }
    ]);
    
    console.log('== Exercise count by subcategory ==');
    console.table(subcategoryCount.map(item => ({
      category: item._id.category,
      subcategory: item._id.subcategory || '(none)',
      count: item.count
    })));
    
    // Get exercises with progression links
    const linkedExercises = await Exercise.find({ 
      $or: [
        { previousExercise: { $ne: null } },
        { nextExercise: { $ne: null } }
      ]
    }).count();
    
    console.log(`\nExercises with progression links: ${linkedExercises}`);
    
    // Get sample exercises to check fields
    console.log('\n== Sample exercise data ==');
    const samples = await Exercise.find().limit(3).lean();
    samples.forEach((exercise, i) => {
      console.log(`\nSample ${i+1}:`);
      console.log(JSON.stringify(exercise, null, 2));
    });
    
    // Check if there are any ODS files in the data directory
    const dataDir = path.join(__dirname, '../public/data');
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.ods'));
      console.log(`\nFound ${files.length} ODS files in public/data directory`);
      
      if (files.length > 0) {
        // Analyze the first ODS file to see available columns
        const firstFile = files[0];
        console.log(`\nAnalyzing ${firstFile}...`);
        
        const workbook = XLSX.readFile(path.join(dataDir, firstFile), {
          cellStyles: true,
          cellFormulas: true,
          cellDates: true
        });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Get column headers
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        const headers = [];
        for(let C = range.s.c; C <= range.e.c; ++C) {
          const cell = worksheet[XLSX.utils.encode_cell({r:0, c:C})];
          if(cell && cell.v) headers[C] = cell.v;
        }
        
        console.log('Available columns:', headers.filter(Boolean));
        
        // Get first row as sample
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (data.length > 1) {
          console.log('First data row:', data[1]);
        }
      }
    } else {
      console.log('\nNo data directory found at public/data');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

diagnose();