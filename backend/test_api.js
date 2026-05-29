const fetch = require('node-fetch');

async function check() {
  try {
    console.log("Checking Health...");
    const h = await fetch('http://localhost:3000/health');
    console.log("Health:", await h.text());

    console.log("\nChecking Products...");
    const p = await fetch('http://localhost:3000/api/products');
    console.log("Products:", await p.text());

    console.log("\nChecking Login...");
    const l = await fetch('http://localhost:3000/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dc813062@olist.com', password: 'password123' })
    });
    console.log("Login:", await l.text());

  } catch(e) {
    console.error(e);
  }
}
check();