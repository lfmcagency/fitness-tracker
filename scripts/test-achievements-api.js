#!/usr/bin/env node

/**
 * Script to test the Achievement System API endpoints
 * 
 * This script tests:
 * 1. GET /api/achievements - Getting all achievements with unlock status
 * 2. POST /api/achievements/:id/claim - Claiming an achievement
 * 3. POST /api/progress/add-xp - Testing achievement unlocks from XP awards
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

// Test getting all achievements
async function testGetAchievements() {
  try {
    log('Testing GET /api/achievements...', colors.blue);
    
    const response = await fetch(`${baseUrl}/achievements`);
    const data = await response.json();
    
    logResult('Get All Achievements', response.ok, data);
    return data;
  } catch (error) {
    logResult('Get All Achievements', false, null, error);
    return null;
  }
}

// Test getting achievements with filters
async function testFilteredAchievements() {
  try {
    log('Testing GET /api/achievements with filters...', colors.blue);
    
    // Test with unlocked filter
    const unlockedResponse = await fetch(`${baseUrl}/achievements?unlocked=true`);
    const unlockedData = await unlockedResponse.json();
    
    logResult('Get Unlocked Achievements', unlockedResponse.ok, {
      count: unlockedData.data.total,
      unlocked: unlockedData.data.unlocked
    });
    
    // Test with type filter
    const typeResponse = await fetch(`${baseUrl}/achievements?type=milestone`);
    const typeData = await typeResponse.json();
    
    logResult('Get Milestone Achievements', typeResponse.ok, {
      count: typeData.data.all.length,
      achievements: typeData.data.byType?.milestone || []
    });
    
    return { unlocked: unlockedData, byType: typeData };
  } catch (error) {
    logResult('Get Filtered Achievements', false, null, error);
    return null;
  }
}

// Test adding XP to trigger achievements
async function testAchievementViaXp() {
  try {
    log('Testing achievement unlocks via XP addition...', colors.blue);
    
    // Award a large amount of XP to trigger level-based achievements
    const payload = {
      xpAmount: 300,
      source: 'test_script',
      details: 'Testing achievement unlocks via XP award'
    };
    
    const response = await fetch(`${baseUrl}/progress/add-xp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    // Check if any achievements were unlocked
    if (data.data?.achievements?.unlocked?.length > 0) {
      logResult('Achievement Unlock via XP', response.ok, {
        xpAdded: data.data.xpAdded,
        achievements: data.data.achievements
      });
    } else {
      logResult('Achievement Unlock via XP', response.ok, {
        xpAdded: data.data.xpAdded,
        message: 'No achievements unlocked this time'
      });
    }
    
    return data;
  } catch (error) {
    logResult('Achievement Unlock via XP', false, null, error);
    return null;
  }
}

// Test claiming an achievement
async function testClaimAchievement(achievementId = 'global_level_5') {
  try {
    log(`Testing POST /api/achievements/:id/claim with ID: ${achievementId}...`, colors.blue);
    
    const response = await fetch(`${baseUrl}/achievements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ achievementId })
    });
    
    const data = await response.json();
    logResult('Claim Achievement', response.ok, data);
    return data;
  } catch (error) {
    logResult('Claim Achievement', false, null, error);
    return null;
  }
}

// Get current progress for user context
async function getCurrentProgress() {
  try {
    log('Fetching current progress data...', colors.blue);
    
    const response = await fetch(`${baseUrl}/progress`);
    const data = await response.json();
    
    if (response.ok) {
      log('Current user progress:', colors.cyan);
      console.log(JSON.stringify({
        level: data.data.level.current,
        totalXp: data.data.level.xp,
        achievements: data.data.achievements?.total || 0
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
  log('   ACHIEVEMENT SYSTEM API ENDPOINT TESTS', colors.cyan);
  log('=======================================\n', colors.cyan);
  
  // Get initial progress and achievements for context
  await getCurrentProgress();
  
  // Run the tests
  await testGetAchievements();
  await testFilteredAchievements();
  await testAchievementViaXp();
  
  // Try to claim an achievement
  const achievementIdToTest = process.argv[2] || 'global_level_5';
  await testClaimAchievement(achievementIdToTest);
  
  // Get updated state after tests
  log('\nFetching updated progress and achievements after tests...', colors.blue);
  await getCurrentProgress();
  await testGetAchievements();
  
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