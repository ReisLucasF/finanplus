-- =============================================================================
-- DADOS DE TESTE PARA ANÁLISE FINANCEIRA
-- Execute este script para popular o banco com dados realistas
-- =============================================================================

-- IMPORTANTE: Substitua 'SEU_USER_ID' pelo ID real do seu usuário
-- Você pode pegar o userId executando: SELECT id, email FROM User LIMIT 1;

SET @user_id = 'SEU_USER_ID';

-- =============================================================================
-- 1. CRIAR CONTA BANCÁRIA
-- =============================================================================
INSERT INTO BankAccount (id, userId, name, type, initialBalance, currentBalance, color, createdAt, updatedAt)
VALUES 
    (UUID(), @user_id, 'Conta Corrente Principal', 'CHECKING', 5000.00, 12500.00, '#3B82F6', NOW(), NOW()),
    (UUID(), @user_id, 'Conta Poupança', 'SAVINGS', 10000.00, 15000.00, '#10B981', NOW(), NOW());

SET @account_id = (SELECT id FROM BankAccount WHERE userId = @user_id LIMIT 1);

-- =============================================================================
-- 2. CRIAR CATEGORIAS PERSONALIZADAS
-- =============================================================================
INSERT INTO Category (id, userId, name, type, icon, createdAt, updatedAt)
VALUES 
    (UUID(), @user_id, 'Salário', 'INCOME', '💰', NOW(), NOW()),
    (UUID(), @user_id, 'Freelance', 'INCOME', '💼', NOW(), NOW()),
    (UUID(), @user_id, 'Dividendos', 'INCOME', '📈', NOW(), NOW()),
    (UUID(), @user_id, 'Aluguel', 'EXPENSE', '🏠', NOW(), NOW()),
    (UUID(), @user_id, 'Alimentação', 'EXPENSE', '🍔', NOW(), NOW()),
    (UUID(), @user_id, 'Transporte', 'EXPENSE', '🚗', NOW(), NOW()),
    (UUID(), @user_id, 'Lazer', 'EXPENSE', '🎮', NOW(), NOW()),
    (UUID(), @user_id, 'Saúde', 'EXPENSE', '⚕️', NOW(), NOW());

-- =============================================================================
-- 3. CRIAR TRANSAÇÕES DOS ÚLTIMOS 6 MESES
-- =============================================================================

-- Pegar IDs das categorias
SET @cat_salario = (SELECT id FROM Category WHERE name = 'Salário' AND userId = @user_id);
SET @cat_freelance = (SELECT id FROM Category WHERE name = 'Freelance' AND userId = @user_id);
SET @cat_dividendos = (SELECT id FROM Category WHERE name = 'Dividendos' AND userId = @user_id);
SET @cat_aluguel = (SELECT id FROM Category WHERE name = 'Aluguel' AND userId = @user_id);
SET @cat_alimentacao = (SELECT id FROM Category WHERE name = 'Alimentação' AND userId = @user_id);
SET @cat_transporte = (SELECT id FROM Category WHERE name = 'Transporte' AND userId = @user_id);
SET @cat_lazer = (SELECT id FROM Category WHERE name = 'Lazer' AND userId = @user_id);
SET @cat_saude = (SELECT id FROM Category WHERE name = 'Saúde' AND userId = @user_id);

-- Receitas - Salário mensal (últimos 6 meses)
INSERT INTO Transaction (id, userId, accountId, categoryId, type, description, amount, date, status, createdAt, updatedAt)
VALUES 
    (UUID(), @user_id, @account_id, @cat_salario, 'INCOME', 'Salário Janeiro', 8000.00, DATE_SUB(CURDATE(), INTERVAL 5 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_salario, 'INCOME', 'Salário Fevereiro', 8000.00, DATE_SUB(CURDATE(), INTERVAL 4 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_salario, 'INCOME', 'Salário Março', 8500.00, DATE_SUB(CURDATE(), INTERVAL 3 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_salario, 'INCOME', 'Salário Abril', 8500.00, DATE_SUB(CURDATE(), INTERVAL 2 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_salario, 'INCOME', 'Salário Maio', 8500.00, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_salario, 'INCOME', 'Salário Junho', 9000.00, CURDATE(), 'COMPLETED', NOW(), NOW());

-- Receitas - Freelance (esporádico)
INSERT INTO Transaction (id, userId, accountId, categoryId, type, description, amount, date, status, createdAt, updatedAt)
VALUES 
    (UUID(), @user_id, @account_id, @cat_freelance, 'INCOME', 'Projeto Freelance A', 2500.00, DATE_SUB(CURDATE(), INTERVAL 4 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_freelance, 'INCOME', 'Projeto Freelance B', 1800.00, DATE_SUB(CURDATE(), INTERVAL 2 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_freelance, 'INCOME', 'Projeto Freelance C', 3200.00, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 'COMPLETED', NOW(), NOW());

-- Receitas - Dividendos
INSERT INTO Transaction (id, userId, accountId, categoryId, type, description, amount, date, status, createdAt, updatedAt)
VALUES 
    (UUID(), @user_id, @account_id, @cat_dividendos, 'INCOME', 'Dividendos Ações', 450.00, DATE_SUB(CURDATE(), INTERVAL 3 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_dividendos, 'INCOME', 'Dividendos FIIs', 320.00, DATE_SUB(CURDATE(), INTERVAL 2 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_dividendos, 'INCOME', 'Dividendos Ações', 480.00, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 'COMPLETED', NOW(), NOW());

-- Despesas - Aluguel (fixo mensal)
INSERT INTO Transaction (id, userId, accountId, categoryId, type, description, amount, date, status, createdAt, updatedAt)
VALUES 
    (UUID(), @user_id, @account_id, @cat_aluguel, 'EXPENSE', 'Aluguel Janeiro', 2000.00, DATE_SUB(CURDATE(), INTERVAL 5 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_aluguel, 'EXPENSE', 'Aluguel Fevereiro', 2000.00, DATE_SUB(CURDATE(), INTERVAL 4 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_aluguel, 'EXPENSE', 'Aluguel Março', 2000.00, DATE_SUB(CURDATE(), INTERVAL 3 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_aluguel, 'EXPENSE', 'Aluguel Abril', 2000.00, DATE_SUB(CURDATE(), INTERVAL 2 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_aluguel, 'EXPENSE', 'Aluguel Maio', 2000.00, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_aluguel, 'EXPENSE', 'Aluguel Junho', 2000.00, CURDATE(), 'COMPLETED', NOW(), NOW());

-- Despesas - Alimentação (variável)
INSERT INTO Transaction (id, userId, accountId, categoryId, type, description, amount, date, status, createdAt, updatedAt)
VALUES 
    (UUID(), @user_id, @account_id, @cat_alimentacao, 'EXPENSE', 'Supermercado', 850.00, DATE_SUB(CURDATE(), INTERVAL 5 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_alimentacao, 'EXPENSE', 'Restaurante', 320.00, DATE_SUB(CURDATE(), INTERVAL 5 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_alimentacao, 'EXPENSE', 'Supermercado', 920.00, DATE_SUB(CURDATE(), INTERVAL 4 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_alimentacao, 'EXPENSE', 'Delivery', 280.00, DATE_SUB(CURDATE(), INTERVAL 4 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_alimentacao, 'EXPENSE', 'Supermercado', 890.00, DATE_SUB(CURDATE(), INTERVAL 3 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_alimentacao, 'EXPENSE', 'Supermercado', 950.00, DATE_SUB(CURDATE(), INTERVAL 2 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_alimentacao, 'EXPENSE', 'Restaurante', 420.00, DATE_SUB(CURDATE(), INTERVAL 2 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_alimentacao, 'EXPENSE', 'Supermercado', 1100.00, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_alimentacao, 'EXPENSE', 'Delivery', 350.00, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 'COMPLETED', NOW(), NOW());

-- Despesas - Transporte
INSERT INTO Transaction (id, userId, accountId, categoryId, type, description, amount, date, status, createdAt, updatedAt)
VALUES 
    (UUID(), @user_id, @account_id, @cat_transporte, 'EXPENSE', 'Combustível', 450.00, DATE_SUB(CURDATE(), INTERVAL 5 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_transporte, 'EXPENSE', 'Uber/Taxi', 180.00, DATE_SUB(CURDATE(), INTERVAL 5 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_transporte, 'EXPENSE', 'Combustível', 480.00, DATE_SUB(CURDATE(), INTERVAL 4 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_transporte, 'EXPENSE', 'Combustível', 420.00, DATE_SUB(CURDATE(), INTERVAL 3 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_transporte, 'EXPENSE', 'Combustível', 500.00, DATE_SUB(CURDATE(), INTERVAL 2 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_transporte, 'EXPENSE', 'Manutenção Carro', 1200.00, DATE_SUB(CURDATE(), INTERVAL 2 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_transporte, 'EXPENSE', 'Combustível', 520.00, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 'COMPLETED', NOW(), NOW());

-- Despesas - Lazer
INSERT INTO Transaction (id, userId, accountId, categoryId, type, description, amount, date, status, createdAt, updatedAt)
VALUES 
    (UUID(), @user_id, @account_id, @cat_lazer, 'EXPENSE', 'Cinema', 120.00, DATE_SUB(CURDATE(), INTERVAL 5 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_lazer, 'EXPENSE', 'Streaming', 85.00, DATE_SUB(CURDATE(), INTERVAL 4 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_lazer, 'EXPENSE', 'Show', 280.00, DATE_SUB(CURDATE(), INTERVAL 3 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_lazer, 'EXPENSE', 'Games', 350.00, DATE_SUB(CURDATE(), INTERVAL 2 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_lazer, 'EXPENSE', 'Cinema', 140.00, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 'COMPLETED', NOW(), NOW());

-- Despesas - Saúde
INSERT INTO Transaction (id, userId, accountId, categoryId, type, description, amount, date, status, createdAt, updatedAt)
VALUES 
    (UUID(), @user_id, @account_id, @cat_saude, 'EXPENSE', 'Plano de Saúde', 450.00, DATE_SUB(CURDATE(), INTERVAL 5 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_saude, 'EXPENSE', 'Farmácia', 120.00, DATE_SUB(CURDATE(), INTERVAL 5 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_saude, 'EXPENSE', 'Plano de Saúde', 450.00, DATE_SUB(CURDATE(), INTERVAL 4 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_saude, 'EXPENSE', 'Plano de Saúde', 450.00, DATE_SUB(CURDATE(), INTERVAL 3 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_saude, 'EXPENSE', 'Dentista', 380.00, DATE_SUB(CURDATE(), INTERVAL 3 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_saude, 'EXPENSE', 'Plano de Saúde', 450.00, DATE_SUB(CURDATE(), INTERVAL 2 MONTH), 'COMPLETED', NOW(), NOW()),
    (UUID(), @user_id, @account_id, @cat_saude, 'EXPENSE', 'Plano de Saúde', 450.00, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 'COMPLETED', NOW(), NOW());

-- =============================================================================
-- 4. CRIAR CARTÃO DE CRÉDITO
-- =============================================================================
INSERT INTO CreditCard (id, userId, name, cardLimit, dueDay, initialDebt, color, createdAt, updatedAt)
VALUES 
    (UUID(), @user_id, 'Cartão Visa Platinum', 15000.00, 10, 4500.00, '#8B5CF6', NOW(), NOW()),
    (UUID(), @user_id, 'Cartão Mastercard Gold', 10000.00, 15, 1200.00, '#F59E0B', NOW(), NOW());

SET @card_id = (SELECT id FROM CreditCard WHERE userId = @user_id LIMIT 1);

-- Compras no cartão
INSERT INTO CreditCardPurchase (id, userId, creditCardId, categoryId, description, amount, date, createdAt, updatedAt)
VALUES 
    (UUID(), @user_id, @card_id, @cat_alimentacao, 'Mercado no Cartão', 650.00, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), NOW(), NOW()),
    (UUID(), @user_id, @card_id, @cat_lazer, 'Netflix/Spotify', 75.00, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), NOW(), NOW()),
    (UUID(), @user_id, @card_id, @cat_transporte, 'Uber', 230.00, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), NOW(), NOW()),
    (UUID(), @user_id, @card_id, @cat_alimentacao, 'Restaurante', 380.00, DATE_SUB(CURDATE(), INTERVAL 15 DAY), NOW(), NOW());

-- =============================================================================
-- 5. CRIAR INVESTIMENTOS
-- =============================================================================
INSERT INTO Investment (id, userId, name, type, ticker, institution, color, createdAt, updatedAt)
VALUES 
    (UUID(), @user_id, 'Tesouro Selic', 'TREASURY', NULL, 'Banco XYZ', '#10B981', NOW(), NOW()),
    (UUID(), @user_id, 'CDB 110% CDI', 'CDB', NULL, 'Banco ABC', '#3B82F6', NOW(), NOW()),
    (UUID(), @user_id, 'Ações PETR4', 'STOCKS', 'PETR4', 'Corretora XP', '#EF4444', NOW(), NOW()),
    (UUID(), @user_id, 'FII HGLG11', 'REAL_ESTATE', 'HGLG11', 'Corretora XP', '#F59E0B', NOW(), NOW());

-- Transações de investimento
SET @inv_tesouro = (SELECT id FROM Investment WHERE name = 'Tesouro Selic' AND userId = @user_id);
SET @inv_cdb = (SELECT id FROM Investment WHERE name = 'CDB 110% CDI' AND userId = @user_id);
SET @inv_petr = (SELECT id FROM Investment WHERE name = 'Ações PETR4' AND userId = @user_id);
SET @inv_fii = (SELECT id FROM Investment WHERE name = 'FII HGLG11' AND userId = @user_id);

INSERT INTO InvestmentTransaction (id, userId, investmentId, type, amount, quantity, price, date, createdAt)
VALUES 
    -- Tesouro Selic
    (UUID(), @user_id, @inv_tesouro, 'BUY', 5000.00, 4.85, 1030.50, DATE_SUB(CURDATE(), INTERVAL 6 MONTH), NOW()),
    (UUID(), @user_id, @inv_tesouro, 'BUY', 3000.00, 2.90, 1034.20, DATE_SUB(CURDATE(), INTERVAL 3 MONTH), NOW()),
    (UUID(), @user_id, @inv_tesouro, 'BUY', 2000.00, 1.92, 1041.80, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), NOW()),
    
    -- CDB
    (UUID(), @user_id, @inv_cdb, 'BUY', 10000.00, 10000.00, 1.00, DATE_SUB(CURDATE(), INTERVAL 5 MONTH), NOW()),
    (UUID(), @user_id, @inv_cdb, 'BUY', 5000.00, 5000.00, 1.00, DATE_SUB(CURDATE(), INTERVAL 2 MONTH), NOW()),
    
    -- Ações PETR4
    (UUID(), @user_id, @inv_petr, 'BUY', 3500.00, 100, 35.00, DATE_SUB(CURDATE(), INTERVAL 4 MONTH), NOW()),
    (UUID(), @user_id, @inv_petr, 'BUY', 2800.00, 80, 35.00, DATE_SUB(CURDATE(), INTERVAL 2 MONTH), NOW()),
    
    -- FII HGLG11
    (UUID(), @user_id, @inv_fii, 'BUY', 16000.00, 100, 160.00, DATE_SUB(CURDATE(), INTERVAL 6 MONTH), NOW()),
    (UUID(), @user_id, @inv_fii, 'BUY', 8500.00, 50, 170.00, DATE_SUB(CURDATE(), INTERVAL 3 MONTH), NOW());

-- =============================================================================
-- 6. CRIAR METAS
-- =============================================================================
INSERT INTO Goal (id, userId, name, targetAmount, currentAmount, targetDate, includeInvestments, createdAt, updatedAt)
VALUES 
    (UUID(), @user_id, 'Viagem Europa', 25000.00, 12000.00, DATE_ADD(CURDATE(), INTERVAL 12 MONTH), FALSE, NOW(), NOW()),
    (UUID(), @user_id, 'Fundo de Emergência', 30000.00, 27500.00, DATE_ADD(CURDATE(), INTERVAL 3 MONTH), TRUE, NOW(), NOW()),
    (UUID(), @user_id, 'Trocar de Carro', 80000.00, 35000.00, DATE_ADD(CURDATE(), INTERVAL 24 MONTH), FALSE, NOW(), NOW()),
    (UUID(), @user_id, 'Curso de Inglês', 5000.00, 3200.00, DATE_ADD(CURDATE(), INTERVAL 6 MONTH), FALSE, NOW(), NOW());

-- =============================================================================
-- RESULTADO
-- =============================================================================
SELECT 
    '✅ DADOS DE TESTE INSERIDOS COM SUCESSO!' as status,
    CONCAT('Execute agora: mysql -u usuario -p banco < test-views.sql') as proximo_passo;

-- Estatísticas inseridas
SELECT 
    'Transações Criadas' as tipo,
    COUNT(*) as quantidade
FROM Transaction 
WHERE userId = @user_id

UNION ALL

SELECT 
    'Contas Bancárias' as tipo,
    COUNT(*) as quantidade
FROM BankAccount 
WHERE userId = @user_id

UNION ALL

SELECT 
    'Cartões de Crédito' as tipo,
    COUNT(*) as quantidade
FROM CreditCard 
WHERE userId = @user_id

UNION ALL

SELECT 
    'Investimentos' as tipo,
    COUNT(*) as quantidade
FROM Investment 
WHERE userId = @user_id

UNION ALL

SELECT 
    'Metas' as tipo,
    COUNT(*) as quantidade
FROM Goal 
WHERE userId = @user_id;
