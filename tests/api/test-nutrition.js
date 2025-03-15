// test-nutrition.js
const {
    apiRequest,
    runTest,
    runTestSuite,
    assert,
    assertEqual
  } = require('./test-framework');
  
  // Store IDs for use in tests
  let testFoodId = null;
  let testMealId = null;
  
  /**
   * Test creating a new food
   */
  async function testCreateFood() {
    const foodData = {
      name: `Test Food ${Date.now()}`,
      servingSize: 100,
      servingUnit: 'g',
      protein: 20,
      carbs: 10,
      fat: 5,
      calories: 165,
      category: 'protein'
    };
  
    const { data } = await apiRequest('/foods', {
      method: 'POST',
      body: foodData
    });
  
    assert(data.success, 'Food creation should succeed');
    assert(data.data?.id, 'Response should include food ID');
    assertEqual(data.data.name, foodData.name, 'Food name should match');
    assertEqual(data.data.servingSize, foodData.servingSize, 'Serving size should match');
    assertEqual(data.data.protein, foodData.protein, 'Protein should match');
    assertEqual(data.data.carbs, foodData.carbs, 'Carbs should match');
    assertEqual(data.data.fat, foodData.fat, 'Fat should match');
    assertEqual(data.data.calories, foodData.calories, 'Calories should match');
  
    // Store food ID for later tests
    testFoodId = data.data.id;
    return data.data;
  }
  
  /**
   * Test listing foods
   */
  async function testListFoods() {
    const { data } = await apiRequest('/foods');
  
    assert(data.success, 'Food list fetch should succeed');
    assert(Array.isArray(data.data?.foods), 'Response should include foods array');
    assert(data.data?.pagination, 'Response should include pagination info');
    
    // If we created a food earlier, it should be in the list
    if (testFoodId) {
      const foundFood = data.data.foods.find(food => food.id === testFoodId);
      assert(foundFood, 'Created food should be in the food list');
    }
  }
  
  /**
   * Test getting a single food
   */
  async function testGetFood() {
    // Skip if we don't have a food ID
    if (!testFoodId) {
      throw new Error('No test food ID available. Create food test must run first.');
    }
  
    const { data } = await apiRequest(`/foods/${testFoodId}`);
  
    assert(data.success, 'Food fetch should succeed');
    assertEqual(data.data.id, testFoodId, 'Food ID should match');
  }
  
  /**
   * Test updating a food
   */
  async function testUpdateFood() {
    // Skip if we don't have a food ID
    if (!testFoodId) {
      throw new Error('No test food ID available. Create food test must run first.');
    }
  
    const updateData = {
      name: `Updated Food ${Date.now()}`,
      servingSize: 50,
      protein: 25
    };
  
    const { data } = await apiRequest(`/foods/${testFoodId}`, {
      method: 'PUT',
      body: updateData
    });
  
    assert(data.success, 'Food update should succeed');
    assertEqual(data.data.id, testFoodId, 'Food ID should match');
    assertEqual(data.data.name, updateData.name, 'Food name should be updated');
    assertEqual(data.data.servingSize, updateData.servingSize, 'Serving size should be updated');
    assertEqual(data.data.protein, updateData.protein, 'Protein should be updated');
  }
  
  /**
   * Test creating a new meal
   */
  async function testCreateMeal() {
    // Skip if we don't have a food ID
    if (!testFoodId) {
      throw new Error('No test food ID available. Create food test must run first.');
    }
  
    const mealData = {
      name: `Test Meal ${Date.now()}`,
      time: '12:00',
      date: new Date().toISOString().split('T')[0], // Today's date
      foods: [
        {
          foodId: testFoodId,
          amount: 200 // 2 servings
        }
      ],
      notes: 'Test meal created by API test'
    };
  
    const { data } = await apiRequest('/meals', {
      method: 'POST',
      body: mealData
    });
  
    assert(data.success, 'Meal creation should succeed');
    assert(data.data?.id, 'Response should include meal ID');
    assertEqual(data.data.name, mealData.name, 'Meal name should match');
    assertEqual(data.data.time, mealData.time, 'Meal time should match');
    assert(Array.isArray(data.data.foods), 'Meal should include foods array');
    assert(data.data.foods.length > 0, 'Meal should have at least one food');
    
    // Verify the food in the meal
    const mealFood = data.data.foods[0];
    assertEqual(mealFood.foodId, testFoodId, 'Food ID in meal should match');
    assertEqual(mealFood.amount, mealData.foods[0].amount, 'Food amount should match');
  
    // Store meal ID for later tests
    testMealId = data.data.id;
    return data.data;
  }
  
  /**
   * Test listing meals
   */
  async function testListMeals() {
    const { data } = await apiRequest('/meals');
  
    assert(data.success, 'Meal list fetch should succeed');
    assert(Array.isArray(data.data?.meals), 'Response should include meals array');
    assert(data.data?.pagination, 'Response should include pagination info');
    
    // If we created a meal earlier, it should be in the list
    if (testMealId) {
      const foundMeal = data.data.meals.find(meal => meal.id === testMealId);
      assert(foundMeal, 'Created meal should be in the meal list');
    }
  }
  
  /**
   * Test getting a single meal
   */
  async function testGetMeal() {
    // Skip if we don't have a meal ID
    if (!testMealId) {
      throw new Error('No test meal ID available. Create meal test must run first.');
    }
  
    const { data } = await apiRequest(`/meals/${testMealId}`);
  
    assert(data.success, 'Meal fetch should succeed');
    assertEqual(data.data.id, testMealId, 'Meal ID should match');
  }
  
  /**
   * Test updating a meal
   */
  async function testUpdateMeal() {
    // Skip if we don't have a meal ID
    if (!testMealId) {
      throw new Error('No test meal ID available. Create meal test must run first.');
    }
  
    const updateData = {
      name: `Updated Meal ${Date.now()}`,
      time: '13:00',
      notes: 'Updated meal notes'
    };
  
    const { data } = await apiRequest(`/meals/${testMealId}`, {
      method: 'PUT',
      body: updateData
    });
  
    assert(data.success, 'Meal update should succeed');
    assertEqual(data.data.id, testMealId, 'Meal ID should match');
    assertEqual(data.data.name, updateData.name, 'Meal name should be updated');
    assertEqual(data.data.time, updateData.time, 'Meal time should be updated');
    assertEqual(data.data.notes, updateData.notes, 'Meal notes should be updated');
  }
  
  /**
   * Test adding a food to a meal
   */
  async function testAddFoodToMeal() {
    // Skip if we don't have IDs
    if (!testMealId || !testFoodId) {
      throw new Error('Test meal ID and food ID required. Previous tests must run first.');
    }
  
    const foodData = {
      foodId: testFoodId,
      amount: 50
    };
  
    const { data } = await apiRequest(`/meals/${testMealId}/foods`, {
      method: 'POST',
      body: foodData
    });
  
    assert(data.success, 'Adding food to meal should succeed');
    assert(Array.isArray(data.data), 'Response should include foods array');
    
    // Check if the food was added
    const addedFood = data.data.find(f => f.foodId === testFoodId && f.amount === foodData.amount);
    assert(addedFood, 'Food should be added to the meal');
  }
  
  /**
   * Test deleting a meal
   */
  async function testDeleteMeal() {
    // Skip if we don't have a meal ID
    if (!testMealId) {
      throw new Error('No test meal ID available. Create meal test must run first.');
    }
  
    const { data } = await apiRequest(`/meals/${testMealId}`, {
      method: 'DELETE'
    });
  
    assert(data.success, 'Meal deletion should succeed');
  
    // Verify meal is deleted by trying to fetch it
    try {
      const { data: mealData } = await apiRequest(`/meals/${testMealId}`);
      if (mealData.success) {
        throw new Error('Meal should be deleted but is still accessible');
      }
    } catch (error) {
      // Expected - meal shouldn't exist anymore
    }
  }
  
  /**
   * Test deleting a food
   */
  async function testDeleteFood() {
    // Skip if we don't have a food ID
    if (!testFoodId) {
      throw new Error('No test food ID available. Create food test must run first.');
    }
  
    const { data } = await apiRequest(`/foods/${testFoodId}`, {
      method: 'DELETE'
    });
  
    assert(data.success, 'Food deletion should succeed');
  
    // Verify food is deleted by trying to fetch it
    try {
      const { data: foodData } = await apiRequest(`/foods/${testFoodId}`);
      if (foodData.success) {
        throw new Error('Food should be deleted but is still accessible');
      }
    } catch (error) {
      // Expected - food shouldn't exist anymore
    }
  }
  
  /**
   * Register all tests to run
   */
  async function runNutritionTests() {
    return await runTestSuite('Nutrition', [
      () => runTest('Create Food', testCreateFood),
      () => runTest('List Foods', testListFoods),
      () => runTest('Get Food', testGetFood),
      () => runTest('Update Food', testUpdateFood),
      () => runTest('Create Meal', testCreateMeal),
      () => runTest('List Meals', testListMeals),
      () => runTest('Get Meal', testGetMeal),
      () => runTest('Update Meal', testUpdateMeal),
      () => runTest('Add Food to Meal', testAddFoodToMeal),
      () => runTest('Delete Meal', testDeleteMeal),
      () => runTest('Delete Food', testDeleteFood)
    ]);
  }
  
  // Self-executing function to run tests when this file is executed directly
  (async function() {
    if (require.main === module) {
      await runNutritionTests();
    }
  })();
  
  // Export for use in test runner
  module.exports = { runNutritionTests };