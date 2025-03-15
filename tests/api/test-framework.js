// test-framework.js
const fetch = require('node-fetch');
const colors = require('colors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Base URL for API
const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';

// Test user credentials
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'password123'
};

// Global authentication token
let authToken = null;

/**
 * Adds color to console logs for better readability
 */
function setupColors() {
  colors.setTheme({
    info: 'blue',
    success: 'green',
    warn: 'yellow',
    error: 'red',
    header: ['cyan', 'bold'],
    title: ['magenta', 'bold'],
    highlight: ['yellow', 'bold']
  });
}

/**
 * Helper to log test results
 * @param {string} name Test name
 * @param {boolean} success Whether test passed
 * @param {object} details Optional details (error, message, etc.)
 */
function logResult(name, success, details = {}) {
  if (success) {
    console.log(`Test: ${name} - ${'✅ PASS'.success}`);
    if (details.message) {
      console.log(`  Message: ${details.message}`);
    }
  } else {
    console.log(`Test: ${name} - ${'❌ FAIL'.error}`);
    if (details.error) {
      console.error(`  ${'Error:'.error} ${details.error}`);
    }
    if (details.message) {
      console.log(`  Message: ${details.message}`);
    }
    if (details.expected) {
      console.log(`  ${'Expected:'.highlight} `, details.expected);
    }
    if (details.received) {
      console.log(`  ${'Received:'.highlight} `, details.received);
    }
  }
}

/**
 * Helper to authenticate and get token
 * @returns {Promise<string|null>} Authentication token or null
 */
async function authenticate() {
  try {
    console.log('Authenticating test user...'.info);
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Authentication successful'.success);
      return data.data.token;
    } else {
      console.error('Authentication failed:'.error, data.error);
      return null;
    }
  } catch (error) {
    console.error('Authentication error:'.error, error.message);
    return null;
  }
}

/**
 * Makes an authenticated API request
 * @param {string} endpoint The API endpoint
 * @param {object} options Request options
 * @returns {Promise<object>} API response
 */
async function apiRequest(endpoint, options = {}) {
  // Ensure we have a token
  if (!authToken && options.requireAuth !== false) {
    authToken = await authenticate();
    if (!authToken && options.requireAuth !== false) {
      throw new Error('Authentication required but failed to obtain token');
    }
  }
  
  // Default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // Add auth token if available
  if (authToken && options.requireAuth !== false) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  // Prepare request
  const url = `${API_BASE}${endpoint}`;
  const method = options.method || 'GET';
  const body = options.body ? JSON.stringify(options.body) : undefined;
  
  try {
    const response = await fetch(url, {
      method,
      headers,
      body
    });
    
    const data = await response.json();
    return { response, data };
  } catch (error) {
    console.error(`API Request Error (${endpoint}):`.error, error.message);
    throw error;
  }
}

/**
 * Run a test function with setup and teardown
 * @param {string} name Test name
 * @param {Function} testFn The test function to run
 * @returns {Promise<boolean>} Whether the test passed
 */
async function runTest(name, testFn) {
  try {
    console.log(`\n${'Running:'.title} ${name}`);
    
    // Run the actual test
    await testFn();
    
    logResult(name, true);
    return true;
  } catch (error) {
    logResult(name, false, { error: error.message });
    return false;
  }
}

/**
 * Run a test suite
 * @param {string} name Suite name
 * @param {Function[]} tests Array of test functions
 */
async function runTestSuite(name, tests) {
  console.log(`\n${'TEST SUITE:'.header} ${name}\n`);
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const success = await test();
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log(`\n${'SUITE RESULTS:'.header} ${name}`);
  console.log(`  ${'Tests:'.highlight} ${passed + failed}`);
  console.log(`  ${'Passed:'.success} ${passed}`);
  console.log(`  ${'Failed:'.error} ${failed}`);
  console.log('\n-----------------------------------\n');
  
  return { passed, failed, total: passed + failed };
}

/**
 * Assert that a condition is true
 * @param {boolean} condition The condition to test
 * @param {string} message Error message if condition is false
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * Assert that two values are equal
 * @param {any} actual The actual value
 * @param {any} expected The expected value
 * @param {string} message Error message if values are not equal
 */
function assertEqual(actual, expected, message) {
  // Handle objects and arrays
  if (typeof actual === 'object' && actual !== null && 
      typeof expected === 'object' && expected !== null) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    
    if (actualStr !== expectedStr) {
      throw new Error(message || `Expected ${expectedStr} but got ${actualStr}`);
    }
  } else if (actual !== expected) {
    throw new Error(message || `Expected ${expected} but got ${actual}`);
  }
}

/**
 * Setup function to run before tests
 */
async function setup() {
  setupColors();
  console.log(`\n${'FITNESS APP API TESTS'.header}\n`);
  console.log(`${'API Base:'.info} ${API_BASE}`);
  console.log(`${'Test User:'.info} ${TEST_USER.email}\n`);
  
  // Authenticate once at the beginning
  authToken = await authenticate();
  if (!authToken) {
    console.warn('Warning: Failed to authenticate test user. Some tests may fail.'.warn);
  }
}

/**
 * Teardown function to run after tests
 */
async function teardown() {
  console.log(`\n${'TEST RUN COMPLETE'.header}\n`);
}

module.exports = {
  API_BASE,
  TEST_USER,
  authenticate,
  apiRequest,
  runTest,
  runTestSuite,
  assert,
  assertEqual,
  setup,
  teardown,
  logResult
};