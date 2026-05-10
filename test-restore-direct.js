const http = require('http');

async function testRestorePremium() {
  return new Promise((resolve, reject) => {
    const testData = {
      email: 'ajittm742@gmail.com',
      chartFingerprint: 'any_fingerprint'
    };

    const postData = JSON.stringify(testData);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/premium/restore',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('Status:', res.statusCode);
          console.log('Response:', response);
          resolve({ status: res.statusCode, response });
        } catch (e) {
          console.log('Parse Error:', e.message);
          resolve({ status: res.statusCode, response: data });
        }
      });
    });

    req.on('error', (err) => {
      console.log('Error:', err.message);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

testRestorePremium().then(result => {
  console.log('Test completed:', result);
}).catch(err => {
  console.log('Test failed:', err);
});
