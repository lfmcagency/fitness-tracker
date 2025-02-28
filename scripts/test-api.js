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
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    console.log(`${colors.blue}Making ${method} request to ${API_HOST}:${API_PORT}${path}${colors.reset}`);
    
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path,
      method,
      headers: {
        // Add headers here if needed
      }
    };

    // Choose http or https based on configuration
    const client = USE_HTTPS ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // Try to parse as JSON, but handle non-JSON responses too
          let parsedData;
          try {
            parsedData = JSON.parse(data);
          } catch (e) {
            parsedData = data;
          }
          
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: data,
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
    
    req.end();
  });
}

async function testApis() {
  console.log(`${colors.cyan}=== API Testing Tool ===${colors.reset}`);
  console.log(`Testing API at ${USE_HTTPS ? 'https' : 'http'}://${API_HOST}:${API_PORT}`);
  console.log('Make sure your Next.js server is running!');
  console.log('-----------------------------------');
  
  try {
    // First check if the server is running at all
    try {
      console.log(`\n${colors.yellow}Testing server availability...${colors.reset}`);
      await makeRequest('/');
      console.log(`${colors.green}✓ Server is running${colors.reset}`);
    } catch (e) {
      console.error(`${colors.red}✗ Server is not available at ${API_HOST}:${API_PORT}${colors.reset}`);
      console.log('\nPossible solutions:');
      console.log('1. Make sure your Next.js server is running (npm run dev)');
      console.log('2. Check that you\'re using the correct host and port');
      console.log('3. If using an external server, check that the URL is correct');
      process.exit(1);
    }
    
    console.log(`\n${colors.yellow}Testing /api/debug/db...${colors.reset}`);
    try {
      const dbResult = await makeRequest('/api/debug/db');
      console.log(`Status: ${dbResult.statusCode}`);
      const successPrefix = dbResult.data?.success ? 
        `${colors.green}✓ Success:${colors.reset}` : 
        `${colors.red}✗ Failure:${colors.reset}`;
      
      console.log(`${successPrefix} ${JSON.stringify(dbResult.data, null, 2)}`);
    } catch (e) {
      console.error(`${colors.red}✗ Request failed:${colors.reset}`, e.message);
    }
    
    console.log(`\n${colors.yellow}Testing /api/exercises...${colors.reset}`);
    try {
      const exercisesResult = await makeRequest('/api/exercises');
      console.log(`Status: ${exercisesResult.statusCode}`);
      
      if (exercisesResult.data?.success) {
        console.log(`${colors.green}✓ Success${colors.reset}`);
        const exercises = exercisesResult.data?.data || [];
        console.log(`Found ${exercises.length} exercises`);
        
        if (exercises.length > 0) {
          console.log('First exercise:');
          console.log(JSON.stringify(exercises[0], null, 2));
        }
      } else {
        console.log(`${colors.red}✗ API returned failure:${colors.reset}`);
        console.log(JSON.stringify(exercisesResult.data, null, 2));
      }
    } catch (e) {
      console.error(`${colors.red}✗ Request failed:${colors.reset}`, e.message);
    }
    
  } catch (error) {
    console.error(`${colors.red}Error testing APIs:${colors.reset}`, error.message);
  }
}

testApis();