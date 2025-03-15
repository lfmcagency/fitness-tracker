// test-auth.js
const {
    apiRequest,
    runTest,
    runTestSuite,
    assert,
    assertEqual,
    TEST_USER
  } = require('./test-framework');
  
  /**
   * Test user registration
   */
  async function testUserRegistration() {
    // Generate a unique email to avoid conflicts with existing users
    const uniqueEmail = `test-${Date.now()}@example.com`;
    const name = 'Test User';
    const password = 'password123';
  
    // Register a new user
    const { data } = await apiRequest('/auth/register', {
      method: 'POST',
      body: { name, email: uniqueEmail, password },
      requireAuth: false
    });
  
    // Verify response format
    assert(data.success, 'Registration should succeed');
    assert(data.data?.user, 'Response should include user data');
    assertEqual(data.data.user.name, name, 'User name should match');
    assertEqual(data.data.user.email, uniqueEmail, 'User email should match');
  }
  
  /**
   * Test user login with valid credentials
   */
  async function testUserLogin() {
    const { data } = await apiRequest('/auth/login', {
      method: 'POST',
      body: TEST_USER,
      requireAuth: false
    });
  
    assert(data.success, 'Login should succeed');
    assert(data.data?.user, 'Response should include user data');
    assert(data.data?.token || data.data?.user?.id, 'Response should include token or user ID');
    assertEqual(data.data.user.email, TEST_USER.email, 'Email should match test user');
  }
  
  /**
   * Test user login with invalid credentials
   */
  async function testInvalidLogin() {
    const { data } = await apiRequest('/auth/login', {
      method: 'POST',
      body: {
        email: TEST_USER.email,
        password: 'wrong-password'
      },
      requireAuth: false
    });
  
    assert(!data.success, 'Login should fail with invalid credentials');
    assert(data.error, 'Response should include error message');
  }
  
  /**
   * Test fetching user profile
   */
  async function testGetUserProfile() {
    const { data } = await apiRequest('/user/profile');
  
    assert(data.success, 'Profile fetch should succeed');
    assert(data.data?.email, 'Profile should include email');
    assertEqual(data.data.email, TEST_USER.email, 'Email should match test user');
  }
  
  /**
   * Register all tests to run
   */
  async function runAuthTests() {
    return await runTestSuite('Authentication', [
      () => runTest('User Login', testUserLogin),
      () => runTest('Invalid Login', testInvalidLogin),
      () => runTest('Get User Profile', testGetUserProfile),
      // Registration test is last to avoid email conflicts
      () => runTest('User Registration', testUserRegistration)
    ]);
  }
  
  // Self-executing function to run tests when this file is executed directly
  (async function() {
    if (require.main === module) {
      await runAuthTests();
    }
  })();
  
  // Export for use in test runner
  module.exports = { runAuthTests };