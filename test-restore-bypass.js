const http = require('http');

// Test restore premium with direct service call
async function testDirectService() {
  console.log('Testing direct service call...');
  const { findPremiumByEmail } = require('./services/premiumAccessService');
  
  try {
    const record = await findPremiumByEmail('ajittm742@gmail.com');
    console.log('Direct service result:', record);
    
    // Test the condition directly
    const chartFingerprint = 'any_fingerprint';
    const condition = record.chart_fingerprint !== null && record.chart_fingerprint !== chartFingerprint;
    console.log('Condition test:', {
      'record.chart_fingerprint': record.chart_fingerprint,
      'chartFingerprint': chartFingerprint,
      'condition': condition
    });
    
    return record;
  } catch (error) {
    console.log('Direct service error:', error);
    return null;
  }
}

testDirectService();
