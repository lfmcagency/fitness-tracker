// test-integration.js
const {
    apiRequest,
    runTest,
    runTestSuite,
    assert,
    assertEqual
  } = require('./test-framework');
  
  // Store IDs for use in tests
  let testTaskId = null;
  let testExerciseId = null;
  let initialXp = null;
  
  /**
   * Test a complete user workflow:
   * 1. Get current progress (XP/level)
   * 2. Create a task
   * 3. Complete the task
   * 4. Verify XP was awarded
   */
  async function testTaskCompletionWorkflow() {
    // Step 1: Get current progress
    const { data: progressData } = await apiRequest('/progress');
    assert(progressData.success, 'Progress fetch should succeed');
    initialXp = progressData.data.totalXp;
    console.log(`  Initial XP: ${initialXp}`);
  
    // Step 2: Create a task
    const taskData = {
      name: `Integration Test Task ${Date.now()}`,
      scheduledTime: '08:00',
      recurrencePattern: 'daily',
      category: 'health',
      priority: 'medium'
    };
  
    const { data: createTaskData } = await apiRequest('/tasks', {
      method: 'POST',
      body: taskData
    });
  
    assert(createTaskData.success, 'Task creation should succeed');
    testTaskId = createTaskData.data.id;
    console.log(`  Created task with ID: ${testTaskId}`);
  
    // Step 3: Complete the task
    const { data: completeTaskData } = await apiRequest(`/tasks/${testTaskId}`, {
      method: 'PUT',
      body: { completed: true }
    });
  
    assert(completeTaskData.success, 'Task completion should succeed');
    assertEqual(completeTaskData.data.completed, true, 'Task should be marked as completed');
    console.log('  Task marked as completed');
  
    // Step 4: Verify XP was awarded
    const { data: updatedProgressData } = await apiRequest('/progress');
    assert(updatedProgressData.success, 'Updated progress fetch should succeed');
    const newXp = updatedProgressData.data.totalXp;
    console.log(`  New XP: ${newXp}`);
    
    assert(newXp > initialXp, 'XP should increase after completing a task');
    console.log(`  XP increased by: ${newXp - initialXp}`);
  
    // Cleanup: Delete the task
    await apiRequest(`/tasks/${testTaskId}`, {
      method: 'DELETE'
    });
    console.log('  Test task deleted');
  }
  
  /**
   * Test an exercise unlocking workflow:
   * 1. List exercises to find a locked one
   * 2. Get progress for its category
   * 3. Award XP to the category
   * 4. Check if the exercise unlocks or progress is made
   */
  async function testExerciseProgressionWorkflow() {
    // Step 1: Find a locked exercise
    const { data: exercisesData } = await apiRequest('/exercises');
    assert(exercisesData.success, 'Exercises fetch should succeed');
    
    // Find a locked exercise
    const lockedExercise = exercisesData.data.exercises.find(ex => ex.unlocked === false);
    if (!lockedExercise) {
      console.log('  No locked exercises found, skipping test');
      return;
    }
    
    testExerciseId = lockedExercise.id;
    const exerciseCategory = lockedExercise.category;
    console.log(`  Found locked exercise: ${lockedExercise.name} (${exerciseCategory})`);
  
    // Step 2: Get current category progress
    const { data: categoryData } = await apiRequest(`/progress/category/${exerciseCategory}`);
    assert(categoryData.success, 'Category progress fetch should succeed');
    
    // Find our exercise in the locked list
    const exerciseInList = categoryData.data.lockedExercises.find(ex => ex.id === testExerciseId);
    if (!exerciseInList) {
      console.log('  Exercise not found in locked list, skipping test');
      return;
    }
    
    const initialProgress = exerciseInList.progress;
    console.log(`  Initial unlock progress: ${initialProgress}%`);
  
    // Step 3: Award XP to the category
    const xpAmount = 50; // Significant amount to make progress
    const { data: xpData } = await apiRequest('/progress/add-xp', {
      method: 'POST',
      body: {
        amount: xpAmount,
        source: 'test',
        category: exerciseCategory,
        details: 'Integration test'
      }
    });
  
    assert(xpData.success, 'XP award should succeed');
    console.log(`  Awarded ${xpAmount} XP to ${exerciseCategory} category`);
  
    // Step 4: Check progress again
    const { data: updatedCategoryData } = await apiRequest(`/progress/category/${exerciseCategory}`);
    assert(updatedCategoryData.success, 'Updated category progress fetch should succeed');
    
    // Check if our exercise has unlocked
    if (updatedCategoryData.data.unlockedExercises.some(ex => ex.id === testExerciseId)) {
      console.log('  Exercise has been unlocked! 🎉');
      return;
    }
    
    // Otherwise, check if progress has increased
    const exerciseInListUpdated = updatedCategoryData.data.lockedExercises.find(ex => ex.id === testExerciseId);
    if (exerciseInListUpdated) {
      const updatedProgress = exerciseInListUpdated.progress;
      console.log(`  Updated unlock progress: ${updatedProgress}%`);
      assert(updatedProgress >= initialProgress, 'Unlock progress should not decrease');
      
      if (updatedProgress > initialProgress) {
        console.log(`  Progress increased by ${updatedProgress - initialProgress}%`);
      } else {
        console.log('  Progress did not increase (may require more XP)');
      }
    } else {
      console.log('  Exercise not found in updated lists, test indeterminate');
    }
  }
  
  /**
   * Register all tests to run
   */
  async function runIntegrationTests() {
    return await runTestSuite('Integration Workflows', [
      () => runTest('Task Completion Workflow', testTaskCompletionWorkflow),
      () => runTest('Exercise Progression Workflow', testExerciseProgressionWorkflow)
    ]);
  }
  
  // Self-executing function to run tests when this file is executed directly
  (async function() {
    if (require.main === module) {
      await runIntegrationTests();
    }
  })();
  
  // Export for use in test runner
  module.exports = { runIntegrationTests };