/**
 * Test script for the Category Progress API endpoints
 * 
 * This script tests:
 * 1. Category-specific progress data retrieval
 * 2. Categories comparison functionality
 * 3. Category milestone detection
 * 
 * Usage:
 *   node scripts/test-category-progress-api.js [option]
 * 
 * Options:
 *   category - Test specific category endpoint (core, push, pull, legs)
 *   categories - Test categories comparison endpoint
 *   milestones - Test category milestone detection via add-xp
 */

const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const AUTH_COOKIE = ''; // Add your auth cookie here if testing with authentication

// Optional command line argument for specific test
const option = process.argv[2] || 'all';
// Optional category parameter for testing specific category
const testCategory = process.argv[3] || 'core';

// Valid categories for validation
const VALID_CATEGORIES = ['core', 'push', 'pull', 'legs'];

// Helper function to make API requests
async function callApi(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': AUTH_COOKIE
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    return {
      status: response.status,
      statusText: response.statusText,
      data
    };
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error);
    return {
      status: 500,
      statusText: 'Error',
      error: error.message
    };
  }
}

// Test specific category progress endpoint
async function testCategoryProgressEndpoint(category = 'core') {
  if (!VALID_CATEGORIES.includes(category)) {
    console.error(`Invalid category: ${category}. Valid categories are: ${VALID_CATEGORIES.join(', ')}`);
    return;
  }
  
  console.log(`\n===== Testing Category Progress API for ${category} =====`);
  
  // Test with and without exercises
  const endpoints = [
    `/progress/category/${category}`,
    `/progress/category/${category}?includeExercises=true`
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\nFetching data from: ${endpoint}`);
    const response = await callApi(endpoint);
    
    if (response.status === 200) {
      const includesExercises = endpoint.includes('includeExercises=true');
      console.log(`Retrieved ${category} category data:`);
      
      // Print basic info
      console.log(`- XP: ${response.data.xp}`);
      console.log(`- Level: ${response.data.level}`);
      console.log(`- Rank: ${response.data.rank}`);
      console.log(`- Next Rank: ${response.data.nextRank || 'None (max rank)'}`);
      console.log(`- % of Total XP: ${response.data.percentOfTotal}%`);
      
      // Print achievements
      console.log(`- Achievements: ${response.data.achievements.unlocked}/${response.data.achievements.total}`);
      
      // Print recent activity
      if (response.data.recentActivity && response.data.recentActivity.length > 0) {
        console.log(`\nRecent Activity (${response.data.recentActivity.length} entries):`);
        response.data.recentActivity.forEach(activity => {
          console.log(`- ${activity.amount} XP from ${activity.source} (${new Date(activity.date).toLocaleDateString()})`);
        });
      } else {
        console.log(`\nNo recent activity for ${category} category.`);
      }
      
      // Print exercises if included
      if (includesExercises && response.data.exercises) {
        console.log(`\nUnlocked Exercises (${response.data.exercises.length}):`);
        response.data.exercises.slice(0, 5).forEach(exercise => {
          console.log(`- ${exercise.name} (Difficulty: ${exercise.difficulty})`);
        });
        
        if (response.data.exercises.length > 5) {
          console.log(`... and ${response.data.exercises.length - 5} more`);
        }
      }
    } else {
      console.error(`Error: ${response.status} - ${response.statusText}`);
      console.error(response.data);
    }
  }
}

// Test categories comparison endpoint
async function testCategoriesComparisonEndpoint() {
  console.log('\n===== Testing Categories Comparison API =====');
  
  const response = await callApi('/progress/categories');
  
  if (response.status === 200) {
    console.log('Categories overview:');
    
    // Print basic stats
    console.log(`- Total XP: ${response.data.overview.totalXp}`);
    console.log(`- Average Category Level: ${response.data.overview.averageCategoryLevel}`);
    console.log(`- Balance Score: ${response.data.balanceScore}/100`);
    console.log(`- Balance Message: "${response.data.balanceMessage}"`);
    
    // Print strongest/weakest
    if (response.data.strongest) {
      console.log(`\nStrongest Category: ${response.data.strongest.name} (${response.data.strongest.xp} XP, Level ${response.data.strongest.level})`);
    }
    
    if (response.data.weakest) {
      console.log(`Weakest Category: ${response.data.weakest.name} (${response.data.weakest.xp} XP, Level ${response.data.weakest.level})`);
    }
    
    // Print all categories data
    console.log('\nAll Categories:');
    const categories = response.data.categories.map(cat => ({
      name: cat.name,
      xp: cat.xp,
      level: cat.level,
      percentOfTotal: cat.percentOfTotal + '%'
    }));
    
    console.table(categories);
    
    // Print recommendations
    if (response.data.recommendations && response.data.recommendations.length > 0) {
      console.log('\nRecommendations:');
      response.data.recommendations.forEach(rec => {
        console.log(`- [${rec.priority}] ${rec.message}`);
      });
    }
  } else {
    console.error(`Error: ${response.status} - ${response.statusText}`);
    console.error(response.data);
  }
}

// Test milestone detection via add-xp endpoint
async function testMilestoneDetection() {
  console.log('\n===== Testing Category Milestone Detection =====');
  
  // Use a category with low XP to more easily hit milestones
  const testCategory = 'legs'; // You might want to change this based on your user's progress
  
  // First check current XP for the category
  const currentProgress = await callApi(`/progress/category/${testCategory}`);
  
  if (currentProgress.status !== 200) {
    console.error('Failed to get current progress. Cannot test milestones.');
    return;
  }
  
  const currentXp = currentProgress.data.xp;
  console.log(`Current XP for ${testCategory}: ${currentXp}`);
  
  // Determine the smallest milestone we haven't reached yet
  const milestones = [500, 1500, 3000, 6000, 10000];
  const nextMilestone = milestones.find(m => m > currentXp);
  
  if (!nextMilestone) {
    console.log('Already at max milestone. Cannot test milestone detection.');
    return;
  }
  
  console.log(`\nTesting milestone detection for ${testCategory} to reach ${nextMilestone} XP`);
  const xpNeeded = nextMilestone - currentXp;
  
  console.log(`Adding ${xpNeeded} XP to trigger milestone...`);
  
  // Add XP to reach the milestone
  const addXpResponse = await callApi('/progress/add-xp', 'POST', {
    xpAmount: xpNeeded,
    category: testCategory,
    source: 'milestone_test',
    details: 'Testing milestone detection'
  });
  
  if (addXpResponse.status === 200) {
    console.log('\nResponse:');
    console.log(`- Message: ${addXpResponse.data.message}`);
    
    if (addXpResponse.data.category && addXpResponse.data.category.milestone) {
      const milestone = addXpResponse.data.category.milestone;
      console.log('\nMilestone detected!');
      console.log(`- Milestone: ${milestone.milestone}`);
      console.log(`- Threshold: ${milestone.threshold} XP`);
      console.log(`- Message: ${milestone.message}`);
    } else {
      console.log('No milestone was detected. This could be due to:');
      console.log('- The milestone calculation logic might be incorrect');
      console.log('- The test may have awarded too much or too little XP');
      console.log('- The user might already have passed this milestone');
    }
    
    console.log('\nUpdated category stats:');
    console.log(`- Previous XP: ${addXpResponse.data.category.previousXp}`);
    console.log(`- Current XP: ${addXpResponse.data.category.currentXp}`);
    console.log(`- Level: ${addXpResponse.data.category.currentLevel}`);
  } else {
    console.error(`Error: ${addXpResponse.status} - ${addXpResponse.statusText}`);
    console.error(addXpResponse.data);
  }
}

// Main execution
async function runTests() {
  console.log('==============================================');
  console.log('  Category Progress API Tests');
  console.log('==============================================');
  
  try {
    // Start the development server in the background if not already running
    // This is just a suggestion - you may need to start it manually
    console.log('Ensure your development server is running...');
    
    // Run tests based on command line argument
    if (option === 'category' || option === 'all') {
      await testCategoryProgressEndpoint(testCategory);
    }
    
    if (option === 'categories' || option === 'all') {
      await testCategoriesComparisonEndpoint();
    }
    
    if (option === 'milestones' || option === 'all') {
      await testMilestoneDetection();
    }
    
    console.log('\n==============================================');
    console.log('  Tests completed');
    console.log('==============================================');
  } catch (error) {
    console.error('Test execution error:', error);
  }
}

// Execute the tests
runTests();