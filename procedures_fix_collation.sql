-- =============================================================================
-- FIX PARA PROBLEMA DE COLLATION - STORED PROCEDURES COM BINARY
-- =============================================================================

-- Remover procedures existentes
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_Dashboard_Por_Usuario$$
DROP PROCEDURE IF EXISTS sp_Gastos_Por_Categoria$$
DROP PROCEDURE IF EXISTS sp_Analise_Receitas$$
DROP PROCEDURE IF EXISTS sp_Portfolio_Investimentos$$
DROP PROCEDURE IF EXISTS sp_Alertas_Financeiros$$
DROP PROCEDURE IF EXISTS sp_Evolucao_Patrimonial$$
DROP PROCEDURE IF EXISTS sp_Relatorio_Periodo_Usuario$$

-- =============================================================================
-- 1. PROCEDURE PARA DASHBOARD PRINCIPAL - CORRIGIDA
-- =============================================================================

CREATE PROCEDURE sp_Dashboard_Por_Usuario(
    IN p_user_id VARCHAR(191)
)
BEGIN
    -- Dashboard com dados dos últimos 3 meses
    SELECT 
        -- KPIs principais
        COALESCE((
            SELECT AVG(receita_mes) FROM (
                SELECT 
                    SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END) as receita_mes
                FROM Transaction t
                WHERE BINARY t.userId = BINARY p_user_id 
                  AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                  AND t.status = 'PAID'
                GROUP BY DATE_FORMAT(t.date, '%Y-%m')
            ) AS ultimos_meses
        ), 0) as receita_media_mensal,
        
        COALESCE((
            SELECT AVG(despesa_mes) FROM (
                SELECT 
                    SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) as despesa_mes
                FROM Transaction t
                WHERE BINARY t.userId = BINARY p_user_id 
                  AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                  AND t.status = 'PAID'
                GROUP BY DATE_FORMAT(t.date, '%Y-%m')
            ) AS ultimos_meses
        ), 0) as despesa_media_mensal,
        
        -- Patrimônio atual
        COALESCE((SELECT SUM(currentBalance) FROM BankAccount WHERE BINARY userId = BINARY p_user_id), 0) as saldo_bancos,
        COALESCE((SELECT SUM(initialDebt) FROM CreditCard WHERE BINARY userId = BINARY p_user_id), 0) as divida_cartoes,
        COALESCE((
            SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END)
            FROM InvestmentTransaction it
            JOIN Investment i ON it.investmentId = i.id
            WHERE BINARY i.userId = BINARY p_user_id
        ), 0) as valor_investimentos,
        
        -- Metas
        COALESCE((SELECT COUNT(*) FROM Goal WHERE BINARY userId = BINARY p_user_id AND targetDate >= CURDATE()), 0) as total_metas,
        COALESCE((
            SELECT AVG((currentAmount / targetAmount) * 100) 
            FROM Goal 
            WHERE BINARY userId = BINARY p_user_id AND targetDate >= CURDATE() AND targetAmount > 0
        ), 0) as progresso_metas_percentual;
END$$

-- =============================================================================
-- 2. PROCEDURE PARA GASTOS POR CATEGORIA - CORRIGIDA
-- =============================================================================

CREATE PROCEDURE sp_Gastos_Por_Categoria(
    IN p_user_id VARCHAR(191)
)
BEGIN
    SELECT 
        c.name as categoria,
        c.type as tipo_categoria,
        
        -- Gastos último mês
        COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN t.amount END), 0) +
        COALESCE(SUM(CASE WHEN cp.date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN cp.amount END), 0) as total_ultimo_mes,
        
        -- Gastos últimos 3 meses
        COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN t.amount END), 0) +
        COALESCE(SUM(CASE WHEN cp.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN cp.amount END), 0) as total_ultimos_3_meses,
        
        -- Média mensal (3 meses)
        (COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN t.amount END), 0) +
         COALESCE(SUM(CASE WHEN cp.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN cp.amount END), 0)) / 3 as media_mensal_3_meses,
        
        COUNT(t.id) as quantidade_transacoes,
        COUNT(cp.id) as quantidade_compras_cartao

    FROM Category c
    LEFT JOIN Transaction t ON c.id = t.categoryId 
        AND t.type = 'EXPENSE' 
        AND t.status = 'PAID'
        AND BINARY t.userId = BINARY p_user_id
    LEFT JOIN CreditCardPurchase cp ON c.id = cp.categoryId 
        AND BINARY cp.userId = BINARY p_user_id
    WHERE c.type = 'EXPENSE' 
      AND (BINARY c.userId = BINARY p_user_id OR c.userId IS NULL) -- Incluir categorias do sistema
    GROUP BY c.id, c.name, c.type
    HAVING total_ultimos_3_meses > 0
    ORDER BY total_ultimos_3_meses DESC
    LIMIT 20;
END$$

-- =============================================================================
-- 3. PROCEDURE PARA ANÁLISE DE RECEITAS - CORRIGIDA
-- =============================================================================

CREATE PROCEDURE sp_Analise_Receitas(
    IN p_user_id VARCHAR(191)
)
BEGIN
    SELECT 
        c.name as fonte_receita,
        
        -- Receitas por período
        COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN t.amount END), 0) as receita_ultimo_mes,
        COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN t.amount END), 0) as receita_ultimos_3_meses,
        
        COUNT(t.id) as quantidade_transacoes,
        AVG(t.amount) as valor_medio_transacao

    FROM Category c
    LEFT JOIN Transaction t ON c.id = t.categoryId 
        AND t.type = 'INCOME' 
        AND t.status = 'PAID'
        AND BINARY t.userId = BINARY p_user_id
    WHERE c.type = 'INCOME' 
      AND (BINARY c.userId = BINARY p_user_id OR c.userId IS NULL) -- Incluir categorias do sistema
    GROUP BY c.id, c.name
    HAVING receita_ultimos_3_meses > 0
    ORDER BY receita_ultimos_3_meses DESC
    LIMIT 15;
END$$

-- =============================================================================
-- 4. PROCEDURE PARA PORTFOLIO DE INVESTIMENTOS - CORRIGIDA
-- =============================================================================

CREATE PROCEDURE sp_Portfolio_Investimentos(
    IN p_user_id VARCHAR(191)
)
BEGIN
    SELECT 
        i.name as nome_investimento,
        i.type as tipo_investimento,
        i.ticker,
        i.institution as corretora,
        
        -- Posição atual
        SUM(CASE WHEN it.type = 'BUY' THEN it.quantity ELSE -it.quantity END) as quantidade_atual,
        SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END) as valor_investido_liquido,
        AVG(CASE WHEN it.type = 'BUY' THEN it.price END) as preco_medio_compra,
        
        -- Movimentações recentes
        COUNT(CASE WHEN it.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN 1 END) as movimentacoes_3_meses,
        SUM(CASE WHEN it.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) AND it.type = 'BUY' THEN it.amount ELSE 0 END) as aportes_3_meses,
        
        MAX(it.date) as ultima_movimentacao

    FROM Investment i
    LEFT JOIN InvestmentTransaction it ON i.id = it.investmentId
        AND BINARY it.userId = BINARY p_user_id
    WHERE BINARY i.userId = BINARY p_user_id
    GROUP BY i.id, i.name, i.type, i.ticker, i.institution
    ORDER BY valor_investido_liquido DESC
    LIMIT 15;
END$$

-- =============================================================================
-- 5. PROCEDURE PARA ALERTAS FINANCEIROS - CORRIGIDA
-- =============================================================================

CREATE PROCEDURE sp_Alertas_Financeiros(
    IN p_user_id VARCHAR(191)
)
BEGIN
    -- União de vários alertas
    SELECT 'GASTO_ALTO_CATEGORIA' as tipo_alerta, 
           CONCAT('Alto gasto em ', c.name, ': R$ ', FORMAT(total_gasto, 2)) as mensagem,
           'MEDIO' as prioridade,
           NOW() as data_alerta
    FROM (
        SELECT c.id, c.name, 
               COALESCE(SUM(t.amount), 0) + COALESCE(SUM(cp.amount), 0) as total_gasto
        FROM Category c
        LEFT JOIN Transaction t ON c.id = t.categoryId 
            AND t.type = 'EXPENSE' 
            AND t.status = 'PAID'
            AND BINARY t.userId = BINARY p_user_id
            AND t.date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
        LEFT JOIN CreditCardPurchase cp ON c.id = cp.categoryId 
            AND BINARY cp.userId = BINARY p_user_id
            AND cp.date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
        WHERE c.type = 'EXPENSE'
        GROUP BY c.id, c.name
        HAVING total_gasto > 1000
        ORDER BY total_gasto DESC
        LIMIT 3
    ) c
    
    UNION ALL
    
    -- Alertas de cartão próximo do limite
    SELECT 'LIMITE_CARTAO' as tipo_alerta,
           CONCAT('Cartão ', cc.name, ' próximo do limite: ', 
                  FORMAT((cc.initialDebt / cc.cardLimit) * 100, 1), '%') as mensagem,
           'ALTO' as prioridade,
           NOW() as data_alerta
    FROM CreditCard cc
    WHERE BINARY cc.userId = BINARY p_user_id
      AND (cc.initialDebt / cc.cardLimit) >= 0.8
      
    UNION ALL
    
    -- Meta atrasada
    SELECT 'META_ATRASADA' as tipo_alerta,
           CONCAT('Meta atrasada: ', g.name) as mensagem,
           'MEDIO' as prioridade,
           NOW() as data_alerta
    FROM Goal g
    WHERE BINARY g.userId = BINARY p_user_id
      AND g.targetDate < CURDATE()
      AND g.currentAmount < g.targetAmount
      
    ORDER BY prioridade DESC, data_alerta DESC
    LIMIT 10;
END$$

-- =============================================================================
-- 6. PROCEDURE PARA EVOLUÇÃO PATRIMONIAL - CORRIGIDA
-- =============================================================================

CREATE PROCEDURE sp_Evolucao_Patrimonial(
    IN p_user_id VARCHAR(191)
)
BEGIN
    SELECT 
        DATE_FORMAT(t.date, '%Y-%m') as periodo,
        
        -- Receitas e despesas do período
        SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END) as receitas_periodo,
        SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) as despesas_periodo,
        SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE -t.amount END) as saldo_periodo,
        
        -- Patrimônio estimado (simplificado)
        @patrimonio := @patrimonio + SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE -t.amount END) as patrimonio_acumulado
        
    FROM Transaction t
    CROSS JOIN (SELECT @patrimonio := 0) r
    WHERE BINARY t.userId = BINARY p_user_id
      AND t.status = 'PAID'
      AND t.date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY DATE_FORMAT(t.date, '%Y-%m')
    ORDER BY periodo ASC;
END$$

-- =============================================================================
-- 7. PROCEDURE PARA RELATÓRIO POR PERÍODO - CORRIGIDA
-- =============================================================================

CREATE PROCEDURE sp_Relatorio_Periodo_Usuario(
    IN p_user_id VARCHAR(191),
    IN p_data_inicio DATE,
    IN p_data_fim DATE
)
BEGIN
    -- Relatório consolidado para um período específico
    SELECT 
        'RESUMO_PERIODO' as tipo,
        DATE_FORMAT(p_data_inicio, '%d/%m/%Y') as data_inicio,
        DATE_FORMAT(p_data_fim, '%d/%m/%Y') as data_fim,
        
        -- Totais do período
        SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END) as total_receitas,
        SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) as total_despesas,
        SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE -t.amount END) as saldo_periodo,
        
        -- Quantidade de transações
        COUNT(CASE WHEN t.type = 'INCOME' THEN 1 END) as qtd_receitas,
        COUNT(CASE WHEN t.type = 'EXPENSE' THEN 1 END) as qtd_despesas,
        
        -- Valores médios
        AVG(CASE WHEN t.type = 'INCOME' THEN t.amount END) as media_receitas,
        AVG(CASE WHEN t.type = 'EXPENSE' THEN t.amount END) as media_despesas
        
    FROM Transaction t
    WHERE BINARY t.userId = BINARY p_user_id
      AND t.status = 'PAID'
      AND t.date BETWEEN p_data_inicio AND p_data_fim;
      
END$$

DELIMITER ;