// test-exercises.js
const {
    apiRequest,
    runTest,
    runTestSuite,
    assert,
    assertEqual
  } = require('./test-framework');
  
  // Store an exercise ID for use in later tests
  let testExerciseId = null;
  
  /**
   * Test listing exercises
   */
  async function testListExercises() {
    const { data } = await apiRequest('/exercises');
  
    assert(data.success, 'Exercise list fetch should succeed');
    assert(Array.isArray(data.data?.exercises), 'Response should include exercises array');
    assert(data.data?.pagination, 'Response should include pagination info');
    
    // Store an exercise ID for later tests if available
    if (data.data.exercises.length > 0) {
      testExerciseId = data.data.exercises[0].id;
    }
  }
  
  /**
   * Test exercise filtering by category
   */
  async function testFilterExercisesByCategory() {
    const category = 'core';
    const { data } = await apiRequest(`/exercises?category=${category}`);
  
    assert(data.success, 'Exercise filtering should succeed');
    assert(Array.isArray(data.data?.exercises), 'Response should include exercises array');
    
    // All returned exercises should match the category
    if (data.data.exercises.length > 0) {
      const allMatchCategory = data.data.exercises.every(ex => ex.category === category);
      assert(allMatchCategory, 'All exercises should match the requested category');
    }
  }
  
  /**
   * Test getting a single exercise
   */
  async function testGetExercise() {
    // Skip if we don't have an exercise ID
    if (!testExerciseId) {
      const { data } = await apiRequest('/exercises');
      if (data.success && data.data?.exercises?.length > 0) {
        testExerciseId = data.data.exercises[0].id;
      } else {
        throw new Error('No exercises available to test');
      }
    }
  
    const { data } = await apiRequest(`/exercises/${testExerciseId}`);
  
    assert(data.success, 'Exercise fetch should succeed');
    assertEqual(data.data.id, testExerciseId, 'Exercise ID should match');
    assert(data.data?.name, 'Exercise should have a name');
    assert(data.data?.category, 'Exercise should have a category');
  }
  
  /**
   * Test exercise search
   */
  async function testSearchExercises() {
    // Use a common exercise term that should return results
    const searchTerm = 'push';
    const { data } = await apiRequest(`/exercises/search?q=${searchTerm}`);
  
    assert(data.success, 'Exercise search should succeed');
    assert(Array.isArray(data.data?.results), 'Response should include results array');
    assertEqual(data.data?.query, searchTerm, 'Search query should match');
  }
  
  /**
   * Test getting exercise progression
   */
  async function testExerciseProgression() {
    // Skip if we don't have an exercise ID
    if (!testExerciseId) {
      const { data } = await apiRequest('/exercises');
      if (data.success && data.data?.exercises?.length > 0) {
        testExerciseId = data.data.exercises[0].id;
      } else {
        throw new Error('No exercises available to test');
      }
    }
  
    const { data } = await apiRequest(`/exercises/progression?exerciseId=${testExerciseId}`);
  
    assert(data.success, 'Exercise progression fetch should succeed');
    assert(data.data?.current, 'Response should include current exercise');
    assertEqual(data.data.current.id, testExerciseId, 'Current exercise ID should match');
  }
  
  /**
   * Register all tests to run
   */
  async function runExerciseTests() {
    return await runTestSuite('Exercises', [
      () => runTest('List Exercises', testListExercises),
      () => runTest('Filter Exercises by Category', testFilterExercisesByCategory),
      () => runTest('Get Exercise', testGetExercise),
      () => runTest('Search Exercises', testSearchExercises),
      () => runTest('Exercise Progression', testExerciseProgression)
    ]);
  }
  
  // Self-executing function to run tests when this file is executed directly
  (async function() {
    if (require.main === module) {
      await runExerciseTests();
    }
  })();
  
  // Export for use in test runner
  module.exports = { runExerciseTests };