/**
 * Test script for the Progress History API endpoints
 * 
 * This script tests:
 * 1. Progress history retrieval with different time ranges and groupings
 * 2. History maintenance operations
 * 3. Daily summary generation
 * 
 * Usage:
 *   node scripts/test-progress-history-api.js [option]
 * 
 * Options:
 *   stats - Get history storage statistics
 *   daily - Test daily history retrieval
 *   weekly - Test weekly history retrieval
 *   monthly - Test monthly history retrieval
 *   summarize - Test summary generation
 *   purge - Test history purging (dry run)
 *   maintenance - Test automatic maintenance
 */

const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const AUTH_COOKIE = ''; // Add your auth cookie here if testing with authentication

// Optional command line argument for specific test
const option = process.argv[2] || 'all';

// Helper function to make API requests
async function callApi(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': AUTH_COOKIE
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    return {
      status: response.status,
      statusText: response.statusText,
      data
    };
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error);
    return {
      status: 500,
      statusText: 'Error',
      error: error.message
    };
  }
}

// Test history retrieval with different time ranges and groupings
async function testHistoryRetrieval() {
  console.log('\n===== Testing Progress History Retrieval =====');
  
  // Test different time ranges
  const timeRanges = ['day', 'week', 'month', 'year', 'all'];
  const groupings = ['day', 'week', 'month'];
  
  // Test the combination specified in the command line or a default one
  if (option === 'daily' || option === 'all') {
    console.log('\n--- Daily History (Last 7 days, grouped by day) ---');
    const response = await callApi('/progress/history?timeRange=week&groupBy=day');
    
    if (response.status === 200) {
      console.log(`Retrieved ${response.data.dataPoints} data points`);
      console.log(`Time Range: ${response.data.timeRange}, Grouped by: ${response.data.groupBy}`);
      console.log(`Data source: ${response.data.dataSource}`);
      
      if (response.data.data && response.data.data.length > 0) {
        console.log('\nSample data point:');
        console.log(JSON.stringify(response.data.data[0], null, 2));
        console.log(`\nTotal XP: ${response.data.totalXp || 0}`);
      } else {
        console.log('No data available for this time range');
      }
    } else {
      console.error(`Error: ${response.status} - ${response.statusText}`);
      console.error(response.data);
    }
  }
  
  if (option === 'weekly' || option === 'all') {
    console.log('\n--- Weekly History (Last month, grouped by week) ---');
    const response = await callApi('/progress/history?timeRange=month&groupBy=week');
    
    if (response.status === 200) {
      console.log(`Retrieved ${response.data.dataPoints} data points`);
      console.log(`Time Range: ${response.data.timeRange}, Grouped by: ${response.data.groupBy}`);
      
      if (response.data.data && response.data.data.length > 0) {
        const weeks = response.data.data.map(item => ({ 
          week: item.date.substring(0, 10), 
          xp: item.xp,
          cumulativeXp: item.cumulativeXp
        }));
        
        console.log('\nWeekly data:');
        console.table(weeks);
      } else {
        console.log('No data available for this time range');
      }
    } else {
      console.error(`Error: ${response.status} - ${response.statusText}`);
      console.error(response.data);
    }
  }
  
  if (option === 'monthly' || option === 'all') {
    console.log('\n--- Monthly History (All time, grouped by month) ---');
    const response = await callApi('/progress/history?timeRange=all&groupBy=month');
    
    if (response.status === 200) {
      console.log(`Retrieved ${response.data.dataPoints} data points`);
      console.log(`Time Range: ${response.data.timeRange}, Grouped by: ${response.data.groupBy}`);
      
      if (response.data.data && response.data.data.length > 0) {
        const months = response.data.data.map(item => ({ 
          month: item.date.substring(0, 7), 
          xp: item.xp,
          cumulativeXp: item.cumulativeXp
        }));
        
        console.log('\nMonthly data:');
        console.table(months);
      } else {
        console.log('No data available for this time range');
      }
    } else {
      console.error(`Error: ${response.status} - ${response.statusText}`);
      console.error(response.data);
    }
  }
  
  // Test category filtering if running all tests
  if (option === 'all') {
    console.log('\n--- Category Filtering (Core exercises only) ---');
    const response = await callApi('/progress/history?timeRange=month&category=core');
    
    if (response.status === 200) {
      console.log(`Retrieved ${response.data.dataPoints} data points for core category`);
      console.log(`Total Core XP: ${response.data.totalXp || 0}`);
    } else {
      console.error(`Error: ${response.status} - ${response.statusText}`);
      console.error(response.data);
    }
  }
}

// Test history maintenance operations
async function testHistoryMaintenance() {
  console.log('\n===== Testing Progress History Maintenance =====');
  
  // Get current storage statistics
  if (option === 'stats' || option === 'all') {
    console.log('\n--- Current Storage Statistics ---');
    const statsResponse = await callApi('/progress/history/maintenance');
    
    if (statsResponse.status === 200) {
      console.log('History entries:', statsResponse.data.history.totalEntries);
      console.log('Summary entries:', statsResponse.data.summaries.totalEntries);
      console.log('Estimated size:', statsResponse.data.total.estimatedSize);
      
      if (statsResponse.data.history.distributionByMonth.length > 0) {
        console.log('\nDistribution by month:');
        const distribution = statsResponse.data.history.distributionByMonth.map(item => ({
          month: item.month,
          entries: item.count
        }));
        console.table(distribution);
      }
      
      console.log('\nMaintenance recommendations:');
      console.log('- Summarize:', statsResponse.data.maintenance.summarizeRecommended ? 'Recommended' : 'Not needed');
      console.log('- Purge:', statsResponse.data.maintenance.purgeRecommended ? 'Recommended' : 'Not needed');
      console.log('- Recommended action:', statsResponse.data.maintenance.recommendedAction);
    } else {
      console.error(`Error: ${statsResponse.status} - ${statsResponse.statusText}`);
      console.error(statsResponse.data);
    }
  }
  
  // Test summary generation
  if (option === 'summarize' || option === 'all') {
    console.log('\n--- Generate Daily Summaries ---');
    const summarizeResponse = await callApi('/progress/history/maintenance', 'POST', {
      action: 'summarize'
    });
    
    if (summarizeResponse.status === 200) {
      console.log(summarizeResponse.data.message);
      console.log(`Created ${summarizeResponse.data.summariesCreated} summary records`);
    } else {
      console.error(`Error: ${summarizeResponse.status} - ${summarizeResponse.statusText}`);
      console.error(summarizeResponse.data);
    }
  }
  
  // Test history purging (with a safe retention period)
  if (option === 'purge' || option === 'all') {
    console.log('\n--- Purge Old History (Keeping 30 days) ---');
    const purgeResponse = await callApi('/progress/history/maintenance', 'POST', {
      action: 'purge',
      keepDays: 30 // Keep last 30 days
    });
    
    if (purgeResponse.status === 200) {
      console.log(purgeResponse.data.message);
      console.log(`Purge date: ${purgeResponse.data.purgeDate}`);
      console.log(`Entries purged: ${purgeResponse.data.entriesPurged}`);
    } else {
      console.error(`Error: ${purgeResponse.status} - ${purgeResponse.statusText}`);
      console.error(purgeResponse.data);
    }
  }
  
  // Test automatic maintenance
  if (option === 'maintenance' || option === 'all') {
    console.log('\n--- Automatic Maintenance ---');
    const maintenanceResponse = await callApi('/progress/history/maintenance', 'POST', {
      action: 'auto'
    });
    
    if (maintenanceResponse.status === 200) {
      console.log(maintenanceResponse.data.message);
      console.log(`Summaries created: ${maintenanceResponse.data.summariesCreated}`);
      console.log(`Entries purged: ${maintenanceResponse.data.entriesPurged}`);
    } else {
      console.error(`Error: ${maintenanceResponse.status} - ${maintenanceResponse.statusText}`);
      console.error(maintenanceResponse.data);
    }
  }
}

// Main execution
async function runTests() {
  console.log('==============================================');
  console.log('  Progress History API Tests');
  console.log('==============================================');
  
  // Run tests based on command line argument
  if (['all', 'daily', 'weekly', 'monthly'].includes(option)) {
    await testHistoryRetrieval();
  }
  
  if (['all', 'stats', 'summarize', 'purge', 'maintenance'].includes(option)) {
    await testHistoryMaintenance();
  }
  
  console.log('\n==============================================');
  console.log('  Tests completed');
  console.log('==============================================');
}

// Execute the tests
runTests().catch(error => {
  console.error('Test execution error:', error);
});