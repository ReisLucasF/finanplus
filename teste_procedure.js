const { PrismaClient } = require('@prisma/client');

async function testarProcedure() {
    const prisma = new PrismaClient();

    try {
        console.log('Testando procedure sp_Dashboard_Por_Usuario...');

        const resultado = await prisma.$queryRaw`
            CALL sp_Dashboard_Por_Usuario('156be42d-b699-4124-b4c7-7fec565b4066')
        `;

        console.log('Resultado:', resultado);

    } catch (error) {
        console.error('Erro:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testarProcedure();