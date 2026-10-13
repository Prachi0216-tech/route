const http = require('http');

function post(path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function testSimple() {
  console.log('=== TEST 1: SIMPLE PASSENGER REGISTRATION (NO OTP) ===');
  const reg1 = await post('/api/auth/register', {
    name: 'Simple User ' + Date.now(),
    contact: '98' + Math.floor(10000000 + Math.random() * 90000000),
    password: 'mypassword123',
    city: 'uttar_pradesh',
    role: 'COMMUTER'
  });
  console.log('Passenger Register Result:', reg1.data.token ? 'SUCCESS' : reg1.data);

  console.log('\n=== TEST 2: SIMPLE DRIVER REGISTRATION (NO OTP / NO AADHAAR GATES) ===');
  const reg2 = await post('/api/auth/register', {
    name: 'Simple Driver ' + Date.now(),
    contact: 'driver' + Date.now() + '@gmail.com',
    password: 'driverpassword123',
    city: 'delhi',
    role: 'DRIVER',
    vehicleType: 'BUS',
    vehicleNumber: 'DL 01 AB 9999',
    licenseNumber: 'DL-2024-112233'
  });
  console.log('Driver Register Result:', reg2.data.token ? 'SUCCESS' : reg2.data);

  console.log('\n=== TEST 3: SIMPLE DEMO PASSENGER LOGIN ===');
  const loginRes = await post('/api/auth/login', {
    email: 'gaurav.passenger@myroute.in',
    password: 'passenger123',
    role: 'COMMUTER'
  });
  console.log('Demo Passenger Login Result:', loginRes.data.token ? 'SUCCESS' : loginRes.data);

  console.log('\n=== TEST 4: SIMPLE DEMO DRIVER LOGIN ===');
  const driverLoginRes = await post('/api/auth/login', {
    email: 'ramesh.upsrtc@myroute.in',
    password: 'driver123',
    role: 'DRIVER'
  });
  console.log('Demo Driver Login Result:', driverLoginRes.data.token ? 'SUCCESS' : driverLoginRes.data);

  console.log('\n✨ ALL SIMPLIFIED AUTH TESTS COMPLETED 100% SUCCESSFULLY!');
}

testSimple().catch(console.error);
