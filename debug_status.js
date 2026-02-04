const { PrismaClient } = require('@prisma/client');

async function verificarStatus() {
    const prisma = new PrismaClient();
    
    try {
        console.log('Verificando status das transações...');
        
        const statusCount = await prisma.$queryRaw`
            SELECT status, COUNT(*) as quantidade
            FROM Transaction 
            WHERE userId = '156be42d-b699-4124-b4c7-7fec565b4066'
            GROUP BY status
        `;
        
        console.log('Status encontrados:', statusCount);
        
        console.log('\nVerificando tipos das transações...');
        const typeCount = await prisma.$queryRaw`
            SELECT type, COUNT(*) as quantidade
            FROM Transaction 
            WHERE userId = '156be42d-b699-4124-b4c7-7fec565b4066'
            GROUP BY type
        `;
        
        console.log('Tipos encontrados:', typeCount);
        
        console.log('\nÚltimas 5 transações:');
        const ultimasTransacoes = await prisma.$queryRaw`
            SELECT id, type, status, amount, date, description
            FROM Transaction 
            WHERE userId = '156be42d-b699-4124-b4c7-7fec565b4066'
            ORDER BY date DESC
            LIMIT 5
        `;
        
        console.log('Últimas transações:', ultimasTransacoes);
        
    } catch (error) {
        console.error('Erro:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

verificarStatus();