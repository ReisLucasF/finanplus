// Script simples para testar as APIs
console.log('🧪 Testando APIs do dashboard...')

async function testAPI() {
    try {
        // Primeiro, fazer login ou usar um token existente
        const response = await fetch('http://localhost:3000/api/reports/dashboard', {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                // Adicionar cookie de autenticação se necessário
            }
        })

        console.log('Status:', response.status)
        console.log('Headers:', response.headers)

        if (response.ok) {
            const data = await response.json()
            console.log('✅ Dashboard API Response:', JSON.stringify(data, null, 2))
        } else {
            const error = await response.text()
            console.log('❌ Error:', error)
        }

    } catch (error) {
        console.error('❌ Network Error:', error)
    }
}

// testAPI()
console.log('Execute testAPI() no console do navegador para testar')