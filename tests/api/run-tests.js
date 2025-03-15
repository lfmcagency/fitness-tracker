// run-tests.js
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { setup, teardown } = require('./test-framework');

// Discover all test files
const TEST_FILE_PREFIX = 'test-';
const TEST_FILE_SUFFIX = '.js';
const EXCLUDED_FILES = ['test-framework.js', 'run-tests.js'];

/**
 * Get all test files in the directory
 * @returns {string[]} Array of test file paths
 */
function getTestFiles() {
  return fs.readdirSync(__dirname)
    .filter(file => 
      file.startsWith(TEST_FILE_PREFIX) && 
      file.endsWith(TEST_FILE_SUFFIX) && 
      !EXCLUDED_FILES.includes(file)
    )
    .map(file => path.join(__dirname, file));
}

/**
 * Run a single test file and return results
 * @param {string} filePath Path to test file
 * @returns {object} Test results
 */
function runTestFile(filePath) {
  console.log(`\n----- Running ${path.basename(filePath)} -----\n`);
  
  const result = spawnSync('node', [filePath], {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: true }
  });
  
  return {
    file: path.basename(filePath),
    exitCode: result.status,
    error: result.error
  };
}

/**
 * Main function to run all tests
 */
async function runAllTests() {
  try {
    // Global setup
    await setup();
    
    const testFiles = getTestFiles();
    console.log(`Found ${testFiles.length} test files\n`);
    
    const results = [];
    
    for (const file of testFiles) {
      const result = runTestFile(file);
      results.push(result);
    }
    
    // Print summary
    console.log('\n----- Test Summary -----');
    const successful = results.filter(r => r.exitCode === 0).length;
    const failed = results.length - successful;
    
    console.log(`Total test files: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\nFailed tests:');
      results
        .filter(r => r.exitCode !== 0)
        .forEach(r => console.log(`- ${r.file}`));
    }
    
    // Global teardown
    await teardown();
    
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Run the tests
runAllTests();