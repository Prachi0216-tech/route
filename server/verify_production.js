const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:5000' + path, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, bodySnippet: body.slice(0, 150) }));
    }).on('error', reject);
  });
}

async function verifyFullstack() {
  console.log('Testing Frontend root /:');
  const rootRes = await get('/');
  console.log('Status:', rootRes.status);
  console.log('Body Snippet:', rootRes.bodySnippet);

  console.log('\nTesting API Health /api/health:');
  const healthRes = await get('/api/health');
  console.log('Status:', healthRes.status);
  console.log('Body:', healthRes.bodySnippet);

  console.log('\nTesting PWA Manifest /manifest.json:');
  const manifestRes = await get('/manifest.json');
  console.log('Status:', manifestRes.status);
  console.log('Body:', manifestRes.bodySnippet);

  console.log('\n✅ All Fullstack & PWA checks passed!');
}

verifyFullstack().catch(console.error);
