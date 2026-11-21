(async () => {
  // 1. Login as Coach
  const loginRes = await fetch('http://localhost:3001/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      correo: 'demo.entrenador@ritmo.app',
      password: 'RitmoDemo2026!'
    })
  });
  const loginData = await loginRes.json();
  console.log('Coach Login status:', loginRes.status, 'Token:', loginData.token ? 'YES' : loginData);

  // 2. Consume token
  const consumeRes = await fetch('http://localhost:3001/alumno-entrenador/token/consumir', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginData.token}`
    },
    body: JSON.stringify({
      codigo: '5665D390',
      secreto: 'b1d3d66cbb36fdd773fabf46bd7b896b271259ba335ed05a08a01c823baf75ef'
    })
  });
  const consumeData = await consumeRes.json();
  console.log('Consume status:', consumeRes.status, 'Data:', consumeData);
})();
