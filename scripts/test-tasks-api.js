require('dotenv').config({ path: '.env.local' });
const https = require('https');
const querystring = require('querystring');

// Configuration
const BASE_URL = process.env.VERCEL_URL || 'localhost:3000';
const USE_HTTPS = BASE_URL.includes('vercel.app');
const protocol = USE_HTTPS ? 'https://' : 'http://';
const fullBaseUrl = protocol + BASE_URL;

// Utility for making HTTP requests (GET, POST, PATCH, DELETE)
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const requestUrl = url.startsWith('http') ? url : `${fullBaseUrl}${url}`;
    console.log(`${method} ${requestUrl}`);
    
    const client = USE_HTTPS ? https : require('http');
    
    const options = {
      method: method,
      headers: {}
    };
    
    if (data) {
      const postData = JSON.stringify(data);
      options.headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      };
    }
    
    const req = client.request(requestUrl, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = responseData ? JSON.parse(responseData) : {};
          resolve({
            url,
            method,
            status: res.statusCode,
            success: res.statusCode >= 200 && res.statusCode < 300,
            body: result
          });
        } catch (e) {
          resolve({
            url,
            method,
            status: res.statusCode,
            success: false,
            error: 'Invalid JSON response',
            raw: responseData
          });
        }
      });
    });
    
    req.on('error', (err) => {
      reject({
        url,
        method,
        success: false,
        error: err.message
      });
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Simple GET request wrapper
function getRequest(url) {
  return makeRequest(url, 'GET');
}

// Simple POST request wrapper
function postRequest(url, data) {
  return makeRequest(url, 'POST', data);
}

// Simple PATCH request wrapper
function patchRequest(url, data) {
  return makeRequest(url, 'PATCH', data);
}

// Simple DELETE request wrapper
function deleteRequest(url) {
  return makeRequest(url, 'DELETE');
}

// Print test result
function printResult(result) {
  const statusSymbol = result.success ? '✅' : '❌';
  console.log(`${statusSymbol} ${result.method} ${result.url}: Status ${result.status}`);
  
  if (!result.success) {
    console.log('  Response:', result.body || result.error);
  }
}

// Test functions for different task API operations
async function testTasksList() {
  console.log('\n--- Testing GET /api/tasks (List Tasks) ---');
  
  // Test basic task list endpoint
  const tests = [
    { url: '/api/tasks', description: 'Get all tasks' },
    { url: '/api/tasks?completed=false', description: 'Get incomplete tasks' },
    { url: '/api/tasks?priority=high', description: 'Get high priority tasks' },
    { url: '/api/tasks?category=fitness', description: 'Get tasks by category' },
    { url: '/api/tasks?limit=5', description: 'Get tasks with pagination' }
  ];
  
  for (const test of tests) {
    console.log(`\nTesting: ${test.description}`);
    const result = await getRequest(test.url);
    printResult(result);
    
    if (result.success) {
      console.log(`  Found ${result.body.data?.length || 0} tasks`);
    }
  }
}

// Test task creation
async function testTaskCreation() {
  console.log('\n--- Testing POST /api/tasks (Create Task) ---');
  
  const newTasks = [
    {
      title: 'Test Task 1',
      description: 'This is a test task created by the API test script',
      priority: 'medium',
      category: 'testing',
      dueDate: new Date(Date.now() + 86400000).toISOString() // Tomorrow
    },
    {
      title: 'Recurring Test Task',
      description: 'This is a recurring test task',
      priority: 'high',
      category: 'testing',
      recurrence: {
        pattern: 'daily',
        daysOfWeek: []
      }
    }
  ];
  
  const createdTasks = [];
  
  for (const task of newTasks) {
    const result = await postRequest('/api/tasks', task);
    printResult(result);
    
    if (result.success && result.body.data) {
      console.log(`  Created task: ${result.body.data.title} (ID: ${result.body.data._id})`);
      createdTasks.push(result.body.data);
    }
  }
  
  return createdTasks;
}

// Test updating task completion status
async function testTaskCompletion(tasks) {
  if (!tasks || tasks.length === 0) {
    console.log('\n❌ No tasks available to test completion. Skipping...');
    return;
  }
  
  console.log('\n--- Testing PATCH /api/tasks/:id (Mark as Complete) ---');
  
  // Mark the first task as complete
  const taskToComplete = tasks[0];
  const completeResult = await patchRequest(`/api/tasks/${taskToComplete._id}`, {
    completed: true,
    completedAt: new Date().toISOString()
  });
  
  printResult(completeResult);
  
  if (completeResult.success) {
    console.log(`  Marked task "${taskToComplete.title}" as complete`);
    
    // Verify task was marked as complete
    const verifyResult = await getRequest(`/api/tasks/${taskToComplete._id}`);
    if (verifyResult.success && verifyResult.body.data.completed) {
      console.log('  ✅ Verification successful: Task is marked as complete');
    } else {
      console.log('  ❌ Verification failed: Task was not marked as complete');
    }
  }
}

// Test task statistics
async function testTaskStatistics() {
  console.log('\n--- Testing GET /api/tasks/statistics ---');
  
  const result = await getRequest('/api/tasks/statistics');
  printResult(result);
  
  if (result.success) {
    console.log('  Task statistics:');
    console.log(`    Total tasks: ${result.body.data.totalTasks || 'N/A'}`);
    console.log(`    Completed tasks: ${result.body.data.completedTasks || 'N/A'}`);
    console.log(`    Completion rate: ${result.body.data.completionRate || 'N/A'}`);
    
    if (result.body.data.categoryCounts) {
      console.log('    Categories:');
      Object.entries(result.body.data.categoryCounts).forEach(([category, count]) => {
        console.log(`      - ${category}: ${count}`);
      });
    }
  }
}

// Test task deletion
async function testTaskDeletion(tasks) {
  if (!tasks || tasks.length < 2) {
    console.log('\n❌ Not enough tasks available to test deletion. Skipping...');
    return;
  }
  
  console.log('\n--- Testing DELETE /api/tasks/:id (Delete Task) ---');
  
  // Delete the second task (we keep the first one that was marked complete)
  const taskToDelete = tasks[1];
  const deleteResult = await deleteRequest(`/api/tasks/${taskToDelete._id}`);
  
  printResult(deleteResult);
  
  if (deleteResult.success) {
    console.log(`  Deleted task "${taskToDelete.title}"`);
    
    // Verify task was deleted
    const verifyResult = await getRequest(`/api/tasks/${taskToDelete._id}`);
    if (!verifyResult.success && verifyResult.status === 404) {
      console.log('  ✅ Verification successful: Task is no longer available');
    } else {
      console.log('  ❌ Verification failed: Task was not properly deleted');
    }
  }
}

// Run all tests
async function runTests() {
  console.log(`\n🧪 TESTING TASK MANAGEMENT API ON ${fullBaseUrl}`);
  console.log('=======================================================');
  
  try {
    // 1. First test listing tasks
    await testTasksList();
    
    // 2. Then test creating new tasks
    const createdTasks = await testTaskCreation();
    
    // 3. Test marking a task as complete
    await testTaskCompletion(createdTasks);
    
    // 4. Test task statistics 
    await testTaskStatistics();
    
    // 5. Finally test deleting a task
    await testTaskDeletion(createdTasks);
    
    console.log('\n=======================================================');
    console.log('🎉 Task API Test Completed');
  } catch (error) {
    console.error('\n❌ Test run failed:', error);
  }
}

// Execute the tests
runTests();