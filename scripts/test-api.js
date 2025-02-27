const http = require('http');

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: jsonData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: data,
            error: 'Failed to parse JSON'
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

async function testApis() {
  console.log('Testing APIs...');
  
  try {
    console.log('\n--- Testing /api/debug/db ---');
    const dbResult = await makeRequest('/api/debug/db');
    console.log(`Status: ${dbResult.statusCode}`);
    console.log(JSON.stringify(dbResult.data, null, 2));
    
    console.log('\n--- Testing /api/exercises ---');
    const exercisesResult = await makeRequest('/api/exercises');
    console.log(`Status: ${exercisesResult.statusCode}`);
    if (exercisesResult.data.success) {
      console.log(`Found ${exercisesResult.data.data.length} exercises`);
      if (exercisesResult.data.data.length > 0) {
        console.log('First exercise:');
        console.log(JSON.stringify(exercisesResult.data.data[0], null, 2));
      }
    } else {
      console.log(JSON.stringify(exercisesResult.data, null, 2));
    }
    
  } catch (error) {
    console.error('Error testing APIs:', error);
  }
}

testApis();