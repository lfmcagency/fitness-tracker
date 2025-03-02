#!/usr/bin/env node

/**
 * Script to test the XP Award System API endpoint
 * 
 * This script tests:
 * 1. POST /api/progress/add-xp - Adding XP to user progress
 * 2. Various combinations of parameters (with/without category, different sources)
 * 3. Error handling for invalid parameters
 */

const fetch = require('node-fetch');
const baseUrl = 'http://localhost:3000/api';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper function to log colored messages
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Helper function to display test results
function logResult(testName, success, response, error = null) {
  const color = success ? colors.green : colors.red;
  const status = success ? 'PASSED' : 'FAILED';
  
  log(`\n${testName}: ${status}`, color);
  
  if (response) {
    log('Response:', colors.cyan);
    console.log(JSON.stringify(response, null, 2));
  }
  
  if (error) {
    log('Error:', colors.red);
    console.error(error);
  }
  
  log('------------------------');
}

// Test adding XP without a category
async function testAddXpNoCategory() {
  try {
    log('Testing POST /api/progress/add-xp (no category)...', colors.blue);
    
    const payload = {
      xpAmount: 25,
      source: 'workout_completion',
      details: 'Completed daily workout routine'
    };
    
    const response = await fetch(`${baseUrl}/progress/add-xp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    logResult('Add XP without category', response.ok, data);
    return data;
  } catch (error) {
    logResult('Add XP without category', false, null, error);
    return null;
  }
}

// Test adding XP with a category
async function testAddXpWithCategory() {
  try {
    log('Testing POST /api/progress/add-xp (with category)...', colors.blue);
    
    const payload = {
      xpAmount: 30,
      category: 'push',
      source: 'exercise_mastery',
      details: 'Completed 3 sets of advanced push-ups'
    };
    
    const response = await fetch(`${baseUrl}/progress/add-xp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    logResult('Add XP with category', response.ok, data);
    return data;
  } catch (error) {
    logResult('Add XP with category', false, null, error);
    return null;
  }
}

// Test adding a larger amount of XP (likely to cause level-up)
async function testAddLargeXp() {
  try {
    log('Testing POST /api/progress/add-xp (large amount)...', colors.blue);
    
    const payload = {
      xpAmount: 200,
      source: 'weekly_challenge',
      details: 'Completed full-body workout challenge'
    };
    
    const response = await fetch(`${baseUrl}/progress/add-xp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    logResult('Add large amount of XP', response.ok, data);
    return data;
  } catch (error) {
    logResult('Add large amount of XP', false, null, error);
    return null;
  }
}

// Test error handling with invalid parameters
async function testInvalidParams() {
  // Test cases for invalid parameters
  const testCases = [
    {
      name: 'Missing XP amount',
      payload: { source: 'test', details: 'Missing XP amount' }
    },
    {
      name: 'Negative XP amount',
      payload: { xpAmount: -10, source: 'test', details: 'Negative XP' }
    },
    {
      name: 'Missing source',
      payload: { xpAmount: 10, details: 'Missing source' }
    },
    {
      name: 'Invalid category',
      payload: { xpAmount: 10, source: 'test', category: 'invalid_category' }
    }
  ];
  
  for (const testCase of testCases) {
    try {
      log(`Testing invalid params: ${testCase.name}...`, colors.magenta);
      
      const response = await fetch(`${baseUrl}/progress/add-xp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testCase.payload)
      });
      
      const data = await response.json();
      
      // For invalid params, we expect a 400 status code, so !response.ok is actually good
      const expectedBehavior = !response.ok && response.status === 400;
      logResult(`Invalid params: ${testCase.name}`, expectedBehavior, data);
    } catch (error) {
      logResult(`Invalid params: ${testCase.name}`, false, null, error);
    }
  }
}

// Get current progress for comparison
async function getCurrentProgress() {
  try {
    log('Fetching current progress data for comparison...', colors.blue);
    
    const response = await fetch(`${baseUrl}/progress`);
    const data = await response.json();
    
    if (response.ok) {
      log('Current progress data:', colors.cyan);
      console.log(JSON.stringify({
        level: data.data.level.current,
        totalXp: data.data.level.xp,
        core: data.data.categories.core.xp,
        push: data.data.categories.push.xp,
        pull: data.data.categories.pull.xp,
        legs: data.data.categories.legs.xp
      }, null, 2));
    }
    
    return response.ok ? data : null;
  } catch (error) {
    log('Error fetching current progress:', colors.red);
    console.error(error);
    return null;
  }
}

// Main function to run all tests
async function runTests() {
  log('=======================================', colors.cyan);
  log('   XP AWARD SYSTEM API ENDPOINT TESTS', colors.cyan);
  log('=======================================\n', colors.cyan);
  
  // Get initial progress for comparison
  await getCurrentProgress();
  
  // Run the tests
  await testAddXpNoCategory();
  await testAddXpWithCategory();
  await testAddLargeXp();
  await testInvalidParams();
  
  // Get updated progress after tests
  log('\nFetching updated progress data after all tests...', colors.blue);
  await getCurrentProgress();
  
  log('\nAll tests completed!', colors.green);
}

// Check if server is running before tests
async function checkServerRunning() {
  try {
    const response = await fetch(`${baseUrl}/health`);
    if (response.ok) {
      runTests();
    } else {
      log('Server is running but health check failed. Please check server status.', colors.red);
    }
  } catch (error) {
    log('Server does not appear to be running. Please start the development server with:', colors.red);
    log('npm run dev', colors.yellow);
  }
}

// Run the tests
checkServerRunning();