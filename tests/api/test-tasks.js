// test-tasks.js
const {
    apiRequest,
    runTest,
    runTestSuite,
    assert,
    assertEqual
  } = require('./test-framework');
  
  // Store task ID for use across tests
  let testTaskId = null;
  
  /**
   * Test creating a new task
   */
  async function testCreateTask() {
    const taskData = {
      name: `Test Task ${Date.now()}`,
      scheduledTime: '08:00',
      recurrencePattern: 'daily',
      category: 'health',
      priority: 'medium'
    };
  
    const { data } = await apiRequest('/tasks', {
      method: 'POST',
      body: taskData
    });
  
    assert(data.success, 'Task creation should succeed');
    assert(data.data?.id, 'Response should include task ID');
    assertEqual(data.data.name, taskData.name, 'Task name should match');
    assertEqual(data.data.scheduledTime, taskData.scheduledTime, 'Scheduled time should match');
    assertEqual(data.data.recurrencePattern, taskData.recurrencePattern, 'Recurrence pattern should match');
    assertEqual(data.data.category, taskData.category, 'Category should match');
    assertEqual(data.data.priority, taskData.priority, 'Priority should match');
    assertEqual(data.data.completed, false, 'New task should not be completed');
  
    // Store task ID for later tests
    testTaskId = data.data.id;
    return data.data;
  }
  
  /**
   * Test listing tasks
   */
  async function testListTasks() {
    const { data } = await apiRequest('/tasks');
  
    assert(data.success, 'Task list fetch should succeed');
    assert(Array.isArray(data.data?.data), 'Response should include task array');
    assert(data.data?.pagination, 'Response should include pagination info');
    
    // If we created a task earlier, it should be in the list
    if (testTaskId) {
      const foundTask = data.data.data.find(task => task.id === testTaskId);
      assert(foundTask, 'Created task should be in the task list');
    }
  }
  
  /**
   * Test fetching a single task
   */
  async function testGetTask() {
    // Skip if we don't have a task ID
    if (!testTaskId) {
      throw new Error('No test task ID available. Create task test must run first.');
    }
  
    const { data } = await apiRequest(`/tasks/${testTaskId}`);
  
    assert(data.success, 'Task fetch should succeed');
    assertEqual(data.data.id, testTaskId, 'Task ID should match');
  }
  
  /**
   * Test updating a task
   */
  async function testUpdateTask() {
    // Skip if we don't have a task ID
    if (!testTaskId) {
      throw new Error('No test task ID available. Create task test must run first.');
    }
  
    const updateData = {
      name: `Updated Task ${Date.now()}`,
      scheduledTime: '09:00',
      priority: 'high'
    };
  
    const { data } = await apiRequest(`/tasks/${testTaskId}`, {
      method: 'PUT',
      body: updateData
    });
  
    assert(data.success, 'Task update should succeed');
    assertEqual(data.data.id, testTaskId, 'Task ID should match');
    assertEqual(data.data.name, updateData.name, 'Task name should be updated');
    assertEqual(data.data.scheduledTime, updateData.scheduledTime, 'Scheduled time should be updated');
    assertEqual(data.data.priority, updateData.priority, 'Priority should be updated');
  }
  
  /**
   * Test completing a task
   */
  async function testCompleteTask() {
    // Skip if we don't have a task ID
    if (!testTaskId) {
      throw new Error('No test task ID available. Create task test must run first.');
    }
  
    const { data } = await apiRequest(`/tasks/${testTaskId}`, {
      method: 'PUT',
      body: { completed: true }
    });
  
    assert(data.success, 'Task completion should succeed');
    assertEqual(data.data.id, testTaskId, 'Task ID should match');
    assertEqual(data.data.completed, true, 'Task should be marked as completed');
  }
  
  /**
   * Test getting task statistics
   */
  async function testTaskStatistics() {
    const { data } = await apiRequest('/tasks/statistics');
  
    assert(data.success, 'Task statistics fetch should succeed');
    assert(data.data?.completionRate, 'Response should include completion rate');
    assert(data.data?.streaks, 'Response should include streaks');
    assert(data.data?.totalTasks >= 0, 'Total tasks should be a non-negative number');
  }
  
  /**
   * Test getting due tasks
   */
  async function testDueTasks() {
    const { data } = await apiRequest('/tasks/due');
  
    assert(data.success, 'Due tasks fetch should succeed');
    assert(Array.isArray(data.data?.data), 'Response should include task array');
    assert(data.data?.date, 'Response should include date');
    assert(data.data?.count >= 0, 'Task count should be a non-negative number');
  }
  
  /**
   * Test deleting a task
   */
  async function testDeleteTask() {
    // Skip if we don't have a task ID
    if (!testTaskId) {
      throw new Error('No test task ID available. Create task test must run first.');
    }
  
    const { data } = await apiRequest(`/tasks/${testTaskId}`, {
      method: 'DELETE'
    });
  
    assert(data.success, 'Task deletion should succeed');
  
    // Verify task is deleted by trying to fetch it
    try {
      const { data: taskData } = await apiRequest(`/tasks/${testTaskId}`);
      if (taskData.success) {
        throw new Error('Task should be deleted but is still accessible');
      }
    } catch (error) {
      // Expected - task shouldn't exist anymore
    }
  }
  
  /**
   * Register all tests to run
   */
  async function runTaskTests() {
    return await runTestSuite('Task Management', [
      () => runTest('Create Task', testCreateTask),
      () => runTest('List Tasks', testListTasks),
      () => runTest('Get Task', testGetTask),
      () => runTest('Update Task', testUpdateTask),
      () => runTest('Complete Task', testCompleteTask),
      () => runTest('Task Statistics', testTaskStatistics),
      () => runTest('Due Tasks', testDueTasks),
      () => runTest('Delete Task', testDeleteTask)
    ]);
  }
  
  // Self-executing function to run tests when this file is executed directly
  (async function() {
    if (require.main === module) {
      await runTaskTests();
    }
  })();
  
  // Export for use in test runner
  module.exports = { runTaskTests };