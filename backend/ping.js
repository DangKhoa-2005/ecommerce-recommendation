const http = require('http');

function ping(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: data.substring(0, 100) }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.setTimeout(2000, () => { req.destroy(); resolve({ error: 'timeout' }); });
  });
}

(async () => {
  console.log("Gateway:", await ping('http://localhost:3000/health'));
  console.log("UserSvc:", await ping('http://localhost:3001/health'));
  console.log("OrderSvc:", await ping('http://localhost:3002/health'));
  console.log("Proxy Product:", await ping('http://localhost:3000/api/products'));
})();