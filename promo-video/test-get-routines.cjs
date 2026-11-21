(async () => {
  // Login as Coach
  const loginRes = await fetch('http://localhost:3001/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      correo: 'demo.entrenador@ritmo.app',
      password: 'RitmoDemo2026!'
    })
  });
  const loginData = await loginRes.json();
  
  // Call /rutinas
  const rRes = await fetch('http://localhost:3001/rutinas', {
    headers: { 'Authorization': `Bearer ${loginData.token}` }
  });
  const rData = await rRes.json();
  console.log('Rutinas count:', rData.length);
  for (const r of rData) {
    console.log(`- ID: ${r.id} (${typeof r.id}) | Nombre: ${r.nombre} | Activa: ${r.activa}`);
  }
})();
