#!/usr/bin/env node

/**
 * Script to test the Progress API endpoints
 * 
 * This script tests:
 * 1. GET /api/progress - Retrieving user progress data
 * 2. POST /api/progress { action: 'add_xp', ... } - Adding XP to user progress
 * 3. POST /api/progress { action: 'award_achievement', ... } - Awarding an achievement
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

// Test GET /api/progress
async function testGetProgress() {
  try {
    log('Testing GET /api/progress...', colors.blue);
    
    const response = await fetch(`${baseUrl}/progress`);
    const data = await response.json();
    
    logResult('GET /api/progress', response.ok, data);
    return data;
  } catch (error) {
    logResult('GET /api/progress', false, null, error);
    return null;
  }
}

// Test POST /api/progress to add XP
async function testAddXp() {
  try {
    log('Testing POST /api/progress (add_xp)...', colors.blue);
    
    const payload = {
      action: 'add_xp',
      amount: 25,
      source: 'test_script',
      category: 'core',
      description: 'Testing XP addition via script'
    };
    
    const response = await fetch(`${baseUrl}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    logResult('POST /api/progress (add_xp)', response.ok, data);
    return data;
  } catch (error) {
    logResult('POST /api/progress (add_xp)', false, null, error);
    return null;
  }
}

// Test POST /api/progress to award an achievement (requires a valid achievement ID)
async function testAwardAchievement(achievementId) {
  if (!achievementId) {
    log('Skipping achievement test - no achievement ID provided', colors.yellow);
    return null;
  }
  
  try {
    log(`Testing POST /api/progress (award_achievement) with ID: ${achievementId}...`, colors.blue);
    
    const payload = {
      action: 'award_achievement',
      achievementId: achievementId
    };
    
    const response = await fetch(`${baseUrl}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    logResult('POST /api/progress (award_achievement)', response.ok, data);
    return data;
  } catch (error) {
    logResult('POST /api/progress (award_achievement)', false, null, error);
    return null;
  }
}

// Main function to run all tests
async function runTests() {
  log('=======================================', colors.cyan);
  log('   PROGRESS API ENDPOINT TESTS', colors.cyan);
  log('=======================================\n', colors.cyan);
  
  // Read the achievement ID from command line arguments if provided
  const achievementId = process.argv[2];
  
  // Run the tests
  const progressData = await testGetProgress();
  await testAddXp();
  
  if (achievementId) {
    await testAwardAchievement(achievementId);
  } else {
    log('\nTo test achievement awarding, run:', colors.yellow);
    log('node scripts/test-progress-api.js <achievement-id>', colors.yellow);
  }
  
  // Get updated progress data after tests
  log('\nFetching updated progress data after tests...', colors.blue);
  await testGetProgress();
  
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