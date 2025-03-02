/**
 * Nutrition API Test Script
 * 
 * Tests the following endpoints:
 * - GET /api/meals - List meals with various filters
 * - POST /api/meals - Create a new meal
 * - PATCH /api/meals/[id] - Update a meal
 * - DELETE /api/meals/[id] - Delete a meal
 * - POST /api/meals/[id]/foods - Add food to a meal
 * - DELETE /api/meals/[id]/foods/[index] - Remove food from a meal
 * - GET /api/foods - List foods from the database
 * - GET /api/foods/[id] - Get a specific food
 * 
 * Run with: npm run test:nutrition
 */

const http = require('http');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

// Configuration - can be overridden with environment variables
const API_HOST = process.env.API_HOST || 'localhost';
const API_PORT = process.env.API_PORT || 3000;
const USE_HTTPS = process.env.USE_HTTPS === 'true';

// Colors for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Test data
const testMeal = {
  name: "Test Meal",
  time: "12:30",
  date: new Date().toISOString(),
  foods: [
    {
      name: "Test Food 1",
      amount: 100,
      unit: "g",
      protein: 20,
      carbs: 30,
      fat: 10,
      calories: 290
    }
  ],
  notes: "Created by test script"
};

const testFood = {
  name: "Test Food Item",
  amount: 150,
  unit: "g",
  protein: 25,
  carbs: 15,
  fat: 8,
  calories: 232
};

// Storage for created resources (to be used and cleaned up)
let createdMealId = null;
let createdFoodIndex = null;

// Function to make HTTP request
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    console.log(`${colors.blue}Making ${method} request to ${API_HOST}:${API_PORT}${path}${colors.reset}`);
    
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Choose http or https based on configuration
    const client = USE_HTTPS ? https : http;
    
    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          // Try to parse as JSON, but handle non-JSON responses too
          let parsedData;
          try {
            parsedData = JSON.parse(responseData);
          } catch (e) {
            parsedData = responseData;
          }
          
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: responseData,
            error: 'Failed to parse response'
          });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`${colors.red}Request error:${colors.reset}`, error.message);
      reject(error);
    });
    
    // Add timeout
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timed out after 5 seconds'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Helper function to print test results
function printTestResult(name, success, details = '') {
  const symbol = success ? '✅' : '❌';
  const color = success ? colors.green : colors.red;
  console.log(`${color}${symbol} ${name}${colors.reset} ${details}`);
}

// Test functions
async function testGetMeals() {
  console.log(`\n${colors.cyan}${colors.bold}Testing GET /api/meals${colors.reset}`);
  
  try {
    // Test basic meal listing
    const result = await makeRequest('/api/meals');
    
    if (result.statusCode === 200 && result.data.success) {
      printTestResult('Fetch meals', true, `Found ${result.data.data.meals.length} meals`);
      
      // Test date filtering
      const today = new Date().toISOString().split('T')[0];
      const dateResult = await makeRequest(`/api/meals?date=${today}`);
      
      if (dateResult.statusCode === 200 && dateResult.data.success) {
        printTestResult('Fetch meals with date filter', true);
      } else {
        printTestResult('Fetch meals with date filter', false);
      }
      
      // Test sorting
      const sortResult = await makeRequest('/api/meals?sortBy=time&sortOrder=desc');
      
      if (sortResult.statusCode === 200 && sortResult.data.success) {
        printTestResult('Fetch meals with sorting', true);
      } else {
        printTestResult('Fetch meals with sorting', false);
      }
      
      // Test pagination
      const paginationResult = await makeRequest('/api/meals?page=1&limit=5');
      
      if (paginationResult.statusCode === 200 && paginationResult.data.success) {
        printTestResult('Fetch meals with pagination', true);
      } else {
        printTestResult('Fetch meals with pagination', false);
      }
      
      return true;
    } else {
      printTestResult('Fetch meals', false, `Status: ${result.statusCode}`);
      return false;
    }
  } catch (error) {
    printTestResult('Fetch meals', false, error.message);
    return false;
  }
}

async function testCreateMeal() {
  console.log(`\n${colors.cyan}${colors.bold}Testing POST /api/meals${colors.reset}`);
  
  try {
    const result = await makeRequest('/api/meals', 'POST', testMeal);
    
    if (result.statusCode === 201 && result.data.success) {
      printTestResult('Create meal', true);
      
      // Store the created meal ID for later tests
      createdMealId = result.data.data._id;
      console.log(`Created meal with ID: ${createdMealId}`);
      
      // Verify the meal data
      const mealData = result.data.data;
      const verificationResults = [
        mealData.name === testMeal.name,
        mealData.time === testMeal.time,
        mealData.foods.length === testMeal.foods.length,
        mealData.notes === testMeal.notes
      ];
      
      if (verificationResults.every(Boolean)) {
        printTestResult('Verify meal data', true);
      } else {
        printTestResult('Verify meal data', false, 'Data mismatch');
      }
      
      // Verify totals calculation
      if (mealData.totals) {
        const hasCorrectTotals = 
          mealData.totals.protein === testMeal.foods[0].protein &&
          mealData.totals.carbs === testMeal.foods[0].carbs &&
          mealData.totals.fat === testMeal.foods[0].fat &&
          mealData.totals.calories === testMeal.foods[0].calories;
        
        printTestResult('Verify totals calculation', hasCorrectTotals);
      } else {
        printTestResult('Verify totals calculation', false, 'No totals returned');
      }
      
      return true;
    } else {
      printTestResult('Create meal', false, `Status: ${result.statusCode}`);
      console.log(JSON.stringify(result.data, null, 2));
      return false;
    }
  } catch (error) {
    printTestResult('Create meal', false, error.message);
    return false;
  }
}

async function testUpdateMeal() {
  if (!createdMealId) {
    printTestResult('Update meal', false, 'No meal to update (meal creation failed)');
    return false;
  }
  
  console.log(`\n${colors.cyan}${colors.bold}Testing PATCH /api/meals/${createdMealId}${colors.reset}`);
  
  const updateData = {
    name: "Updated Test Meal",
    notes: "Updated by test script"
  };
  
  try {
    const result = await makeRequest(`/api/meals/${createdMealId}`, 'PATCH', updateData);
    
    if (result.statusCode === 200 && result.data.success) {
      printTestResult('Update meal', true);
      
      // Verify the updated meal data
      const mealData = result.data.data;
      const verificationResults = [
        mealData.name === updateData.name,
        mealData.notes === updateData.notes
      ];
      
      if (verificationResults.every(Boolean)) {
        printTestResult('Verify updated data', true);
      } else {
        printTestResult('Verify updated data', false, 'Data mismatch');
      }
      
      return true;
    } else {
      printTestResult('Update meal', false, `Status: ${result.statusCode}`);
      console.log(JSON.stringify(result.data, null, 2));
      return false;
    }
  } catch (error) {
    printTestResult('Update meal', false, error.message);
    return false;
  }
}

async function testAddFoodToMeal() {
  if (!createdMealId) {
    printTestResult('Add food to meal', false, 'No meal to update (meal creation failed)');
    return false;
  }
  
  console.log(`\n${colors.cyan}${colors.bold}Testing POST /api/meals/${createdMealId}/foods${colors.reset}`);
  
  try {
    const result = await makeRequest(`/api/meals/${createdMealId}/foods`, 'POST', testFood);
    
    if (result.statusCode === 200 && result.data.success) {
      printTestResult('Add food to meal', true);
      
      // Store the food index for later removal test
      const mealData = result.data.data;
      createdFoodIndex = mealData.foods.length - 1;
      
      // Verify the food was added
      if (mealData.foods && mealData.foods.length > 1) {
        const addedFood = mealData.foods[createdFoodIndex];
        const verificationResults = [
          addedFood.name === testFood.name,
          addedFood.amount === testFood.amount,
          addedFood.unit === testFood.unit,
          addedFood.protein === testFood.protein,
          addedFood.carbs === testFood.carbs,
          addedFood.fat === testFood.fat,
          addedFood.calories === testFood.calories
        ];
        
        if (verificationResults.every(Boolean)) {
          printTestResult('Verify added food', true);
        } else {
          printTestResult('Verify added food', false, 'Data mismatch');
        }
      } else {
        printTestResult('Verify added food', false, 'Food not found in response');
      }
      
      // Verify totals were recalculated
      if (mealData.totals) {
        const expectedTotals = {
          protein: testMeal.foods[0].protein + testFood.protein,
          carbs: testMeal.foods[0].carbs + testFood.carbs,
          fat: testMeal.foods[0].fat + testFood.fat,
          calories: testMeal.foods[0].calories + testFood.calories
        };
        
        const hasCorrectTotals = 
          Math.abs(mealData.totals.protein - expectedTotals.protein) < 0.1 &&
          Math.abs(mealData.totals.carbs - expectedTotals.carbs) < 0.1 &&
          Math.abs(mealData.totals.fat - expectedTotals.fat) < 0.1 &&
          Math.abs(mealData.totals.calories - expectedTotals.calories) < 1;
        
        printTestResult('Verify totals recalculation', hasCorrectTotals);
      } else {
        printTestResult('Verify totals recalculation', false, 'No totals returned');
      }
      
      return true;
    } else {
      printTestResult('Add food to meal', false, `Status: ${result.statusCode}`);
      console.log(JSON.stringify(result.data, null, 2));
      return false;
    }
  } catch (error) {
    printTestResult('Add food to meal', false, error.message);
    return false;
  }
}

async function testRemoveFoodFromMeal() {
  if (!createdMealId || createdFoodIndex === null) {
    printTestResult('Remove food from meal', false, 'No meal or food to remove');
    return false;
  }
  
  console.log(`\n${colors.cyan}${colors.bold}Testing DELETE /api/meals/${createdMealId}/foods/${createdFoodIndex}${colors.reset}`);
  
  try {
    const result = await makeRequest(`/api/meals/${createdMealId}/foods/${createdFoodIndex}`, 'DELETE');
    
    if (result.statusCode === 200 && result.data.success) {
      printTestResult('Remove food from meal', true);
      
      // Verify the food was removed
      const mealData = result.data.data;
      if (mealData.foods.length === 1) {
        printTestResult('Verify food removal', true);
      } else {
        printTestResult('Verify food removal', false, `Expected 1 food, got ${mealData.foods.length}`);
      }
      
      // Verify totals were recalculated
      if (mealData.totals) {
        const expectedTotals = {
          protein: testMeal.foods[0].protein,
          carbs: testMeal.foods[0].carbs,
          fat: testMeal.foods[0].fat,
          calories: testMeal.foods[0].calories
        };
        
        const hasCorrectTotals = 
          Math.abs(mealData.totals.protein - expectedTotals.protein) < 0.1 &&
          Math.abs(mealData.totals.carbs - expectedTotals.carbs) < 0.1 &&
          Math.abs(mealData.totals.fat - expectedTotals.fat) < 0.1 &&
          Math.abs(mealData.totals.calories - expectedTotals.calories) < 1;
        
        printTestResult('Verify totals recalculation after removal', hasCorrectTotals);
      } else {
        printTestResult('Verify totals recalculation after removal', false, 'No totals returned');
      }
      
      return true;
    } else {
      printTestResult('Remove food from meal', false, `Status: ${result.statusCode}`);
      console.log(JSON.stringify(result.data, null, 2));
      return false;
    }
  } catch (error) {
    printTestResult('Remove food from meal', false, error.message);
    return false;
  }
}

async function testDeleteMeal() {
  if (!createdMealId) {
    printTestResult('Delete meal', false, 'No meal to delete (meal creation failed)');
    return false;
  }
  
  console.log(`\n${colors.cyan}${colors.bold}Testing DELETE /api/meals/${createdMealId}${colors.reset}`);
  
  try {
    const result = await makeRequest(`/api/meals/${createdMealId}`, 'DELETE');
    
    if (result.statusCode === 200 && result.data.success) {
      printTestResult('Delete meal', true);
      
      // Verify the meal is gone by trying to fetch it
      try {
        const checkResult = await makeRequest(`/api/meals/${createdMealId}`);
        if (checkResult.statusCode === 404) {
          printTestResult('Verify meal deletion', true);
        } else {
          printTestResult('Verify meal deletion', false, `Expected 404, got ${checkResult.statusCode}`);
        }
      } catch (error) {
        printTestResult('Verify meal deletion', false, error.message);
      }
      
      return true;
    } else {
      printTestResult('Delete meal', false, `Status: ${result.statusCode}`);
      console.log(JSON.stringify(result.data, null, 2));
      return false;
    }
  } catch (error) {
    printTestResult('Delete meal', false, error.message);
    return false;
  }
}

async function testFoodDatabase() {
  console.log(`\n${colors.cyan}${colors.bold}Testing GET /api/foods${colors.reset}`);
  
  try {
    // Test basic food listing
    const result = await makeRequest('/api/foods');
    
    if (result.statusCode === 200 && result.data.success) {
      const foodCount = result.data.data.foods.length;
      printTestResult('Fetch foods', true, `Found ${foodCount} foods`);
      
      if (foodCount > 0) {
        // Test category filtering
        const categories = result.data.data.categories || [];
        if (categories.length > 0) {
          const category = categories[0];
          const categoryResult = await makeRequest(`/api/foods?category=${encodeURIComponent(category)}`);
          
          if (categoryResult.statusCode === 200 && categoryResult.data.success) {
            printTestResult('Fetch foods with category filter', true);
          } else {
            printTestResult('Fetch foods with category filter', false);
          }
        }
        
        // Test search
        const searchResult = await makeRequest('/api/foods?search=protein');
        
        if (searchResult.statusCode === 200 && searchResult.data.success) {
          printTestResult('Fetch foods with search', true);
        } else {
          printTestResult('Fetch foods with search', false);
        }
        
        // Test pagination
        const paginationResult = await makeRequest('/api/foods?page=1&limit=10');
        
        if (paginationResult.statusCode === 200 && paginationResult.data.success) {
          printTestResult('Fetch foods with pagination', true);
        } else {
          printTestResult('Fetch foods with pagination', false);
        }
        
        // Test getting a single food
        if (result.data.data.foods.length > 0) {
          const foodId = result.data.data.foods[0]._id;
          const singleFoodResult = await makeRequest(`/api/foods/${foodId}`);
          
          if (singleFoodResult.statusCode === 200 && singleFoodResult.data.success) {
            printTestResult('Fetch single food by ID', true);
          } else {
            printTestResult('Fetch single food by ID', false);
          }
        }
      }
      
      return true;
    } else {
      printTestResult('Fetch foods', false, `Status: ${result.statusCode}`);
      return false;
    }
  } catch (error) {
    printTestResult('Fetch foods', false, error.message);
    return false;
  }
}

// Main test function
async function runAllTests() {
  console.log(`${colors.bold}${colors.magenta}=== Nutrition API Testing Tool ===${colors.reset}`);
  console.log(`Testing API at ${USE_HTTPS ? 'https' : 'http'}://${API_HOST}:${API_PORT}`);
  console.log('Make sure your Next.js server is running!');
  console.log('==============================================');
  
  try {
    // Test server availability
    try {
      console.log(`\n${colors.yellow}Testing server availability...${colors.reset}`);
      await makeRequest('/');
      console.log(`${colors.green}✅ Server is running${colors.reset}`);
    } catch (e) {
      console.error(`${colors.red}❌ Server is not available at ${API_HOST}:${API_PORT}${colors.reset}`);
      console.log('\nPossible solutions:');
      console.log('1. Make sure your Next.js server is running (npm run dev)');
      console.log('2. Check that you\'re using the correct host and port');
      process.exit(1);
    }

    // Run the meal API tests
    await testGetMeals();
    await testCreateMeal();
    await testUpdateMeal();
    await testAddFoodToMeal();
    await testRemoveFoodFromMeal();
    await testDeleteMeal();
    
    // Run the food database tests
    await testFoodDatabase();
    
    console.log(`\n${colors.bold}${colors.magenta}=== Test Suite Complete ===${colors.reset}`);
  } catch (error) {
    console.error(`\n${colors.red}Error running tests:${colors.reset}`, error.message);
  }
}

// Run the tests
runAllTests();