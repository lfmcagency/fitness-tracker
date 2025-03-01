require('dotenv').config({ path: '.env.local' });
const https = require('https');

// Configuration
const BASE_URL = process.env.VERCEL_URL || 'localhost:3000';
const USE_HTTPS = BASE_URL.includes('vercel.app');
const protocol = USE_HTTPS ? 'https://' : 'http://';
const fullBaseUrl = protocol + BASE_URL;

// Endpoints to test
const endpoints = [
  '/api/debug/db',
  '/api/debug/health',
  '/api/exercises',
  '/api/exercises?category=core',
  '/api/exercises/search?q=push',
]

// Function to make HTTP request
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const requestUrl = url.startsWith('http') ? url : `${fullBaseUrl}${url}`;
    console.log(`Testing: ${requestUrl}`);
    
    const client = USE_HTTPS ? https : require('http');
    
    client.get(requestUrl, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({
            url,
            status: res.statusCode,
            success: res.statusCode >= 200 && res.statusCode < 300,
            body: result
          });
        } catch (e) {
          resolve({
            url, 
            status: res.statusCode,
            success: false,
            error: 'Invalid JSON response'
          });
        }
      });
    }).on('error', (err) => {
      reject({
        url,
        success: false,
        error: err.message
      });
    });
  });
}

// Run tests
async function runTests() {
  console.log(`Testing API endpoints on ${fullBaseUrl}`);
  console.log('----------------------------------------');
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const result = await makeRequest(endpoint);
      results.push(result);
      
      const statusSymbol = result.success ? '✅' : '❌';
      console.log(`${statusSymbol} ${endpoint}: Status ${result.status}`);
    } catch (error) {
      console.error(`❌ ${endpoint}: Error - ${error.message}`);
      results.push({
        url: endpoint,
        success: false,
        error: error.message
      });
    }
  }
  
  console.log('----------------------------------------');
  console.log(`Results: ${results.filter(r => r.success).length}/${results.length} endpoints succeeded`);
  
  // Log failed endpoints
  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.log('\nFailed endpoints:');
    failed.forEach(f => {
      console.log(`- ${f.url}: ${f.error || `Status ${f.status}`}`);
    });
  }
}

runTests();