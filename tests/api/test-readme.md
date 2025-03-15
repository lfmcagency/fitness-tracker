# Fitness App Test Framework

This test framework provides a structured approach to testing the Fitness App's API endpoints. It uses simple Node.js scripts to send HTTP requests to the API and verify the responses.

## Setup

1. Install Node.js (v14 or higher)
2. Navigate to the test directory
3. Install dependencies:
   ```
   npm install
   ```
4. Copy `.env.sample` to `.env` and configure:
   ```
   cp .env.sample .env
   ```
5. Edit `.env` with your local server settings and test user credentials

## Running Tests

### Run All Tests
```
npm test
```

### Run Specific Test Suites
```
npm run test:auth      # Authentication tests
npm run test:tasks     # Task management tests
npm run test:progress  # Progress tracking tests
npm run test:exercises # Exercise tests
npm run test:nutrition # Food and meal tests
npm run test:integration # Integration workflow tests
```

### Run Individual Test Files Directly
```
node test-auth.js
```

## Test Structure

The test suite is organized into the following components:

### Core Framework

- `test-framework.js` - Core testing utilities including request handling, assertions, and test runners
- `run-tests.js` - Main script to run all test files in sequence

### Domain-Specific Test Files

- `test-auth.js` - Authentication and user profile tests
- `test-tasks.js` - Task management tests
- `test-progress.js` - Progress tracking and XP system tests
- `test-exercises.js` - Exercise database and progression tests
- `test-nutrition.js` - Food and meal tracking tests
- `test-integration.js` - Cross-domain workflow tests

## Adding New Tests

To add a new test:

1. Choose the appropriate domain file or create a new one
2. Create a test function that uses the framework utilities:
   ```javascript
   async function testNewFeature() {
     const { data } = await apiRequest('/endpoint');
     assert(data.success, 'Operation should succeed');
     // More assertions...
   }
   ```
3. Add your test to the test suite runner:
   ```javascript
   async function runSuiteTests() {
     return await runTestSuite('Suite Name', [
       // Existing tests...
       () => runTest('New Feature', testNewFeature)
     ]);
   }
   ```

## Conventions

- Each test should focus on a single API endpoint or workflow
- Tests should be independent and not rely on other tests' state when possible
- When tests need to reference IDs from previous tests, handle the case when the ID is not available
- Use descriptive test names that indicate what is being tested
- Include cleanup steps to delete any created resources

## Test User

The test framework uses a dedicated test user account to run the tests. This user should:

- Be created specifically for testing purposes
- Have appropriate permissions to access all API endpoints
- Not be used for any other purpose

Configure the test user credentials in the `.env` file.
