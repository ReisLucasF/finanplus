const testApis = async () => {
    console.log('🔍 Testando APIs...');

    try {
        // Testar API dashboard
        console.log('📊 Testando /api/reports/dashboard');
        const dashboardRes = await fetch('http://localhost:3000/api/reports/dashboard');
        const dashboardData = await dashboardRes.json();
        console.log('Dashboard Status:', dashboardRes.status);
        console.log('Dashboard Data:', JSON.stringify(dashboardData, null, 2));

        // Testar API período
        console.log('\n📅 Testando /api/reports/periodo');
        const periodoRes = await fetch('http://localhost:3000/api/reports/periodo?dataInicio=2026-01-01&dataFim=2026-02-04');
        const periodoData = await periodoRes.json();
        console.log('Período Status:', periodoRes.status);
        console.log('Período Data:', JSON.stringify(periodoData, null, 2));

        // Testar API completo
        console.log('\n📋 Testando /api/reports/completo');
        const completoRes = await fetch('http://localhost:3000/api/reports/completo');
        const completoData = await completoRes.json();
        console.log('Completo Status:', completoRes.status);
        console.log('Completo Data:', JSON.stringify(completoData, null, 2));

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
};

// Executar teste
testApis();