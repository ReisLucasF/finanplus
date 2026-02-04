-- =============================================================================
-- VIEWS AUXILIARES E DASHBOARD PARA FINANÇAS PESSOAIS
-- Queries complementares para análises específicas e KPIs do dashboard
-- =============================================================================

-- =============================================================================
-- 1. FUNÇÃO PARA DASHBOARD PRINCIPAL POR USUÁRIO
-- =============================================================================
DELIMITER $$

CREATE FUNCTION fn_Dashboard_Financeiro_Pessoal(p_user_id VARCHAR(255))
RETURNS JSON
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE resultado JSON;
    
    SELECT JSON_OBJECT(
        'receita_media_mensal', COALESCE((
            SELECT AVG(receita_mes) FROM (
                SELECT 
                    SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END) as receita_mes
                FROM Transaction t
                WHERE t.userId = p_user_id 
                  AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                  AND t.status = 'COMPLETED'
                GROUP BY DATE_FORMAT(t.date, '%Y-%m')
            ) AS ultimos_meses
        ), 0),
        'despesa_media_mensal', COALESCE((
            SELECT AVG(despesa_mes) FROM (
                SELECT 
                    SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) as despesa_mes
                FROM Transaction t
                WHERE t.userId = p_user_id 
                  AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                  AND t.status = 'COMPLETED'
                GROUP BY DATE_FORMAT(t.date, '%Y-%m')
            ) AS ultimos_meses
        ), 0),
        'saldo_bancos', COALESCE((SELECT SUM(currentBalance) FROM BankAccount WHERE userId = p_user_id), 0),
        'divida_cartoes', COALESCE((SELECT SUM(initialDebt) FROM CreditCard WHERE userId = p_user_id), 0),
        'valor_investimentos', COALESCE((
            SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END)
            FROM InvestmentTransaction it
            JOIN Investment i ON it.investmentId = i.id
            WHERE i.userId = p_user_id
        ), 0)
    ) INTO resultado;
    
    RETURN resultado;
END $$

DELIMITER ;

-- =============================================================================
-- 2. FUNÇÃO PARA ANÁLISE DE GASTOS POR CATEGORIA POR USUÁRIO
-- =============================================================================
DELIMITER $$

CREATE FUNCTION fn_Gastos_Por_Categoria(p_user_id VARCHAR(255))
RETURNS JSON
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE resultado JSON;
    
    -- Note: Esta função seria complexa demais para retornar JSON.
    -- É melhor fazer queries diretas nas APIs.
    RETURN JSON_OBJECT('status', 'use_direct_query');
END $$

DELIMITER ;

-- Mantendo a view original mas com comentário de que precisa de filtro na query
SELECT 
    c.name as categoria,
    c.type as tipo_categoria,
    
    -- GASTOS EM TRANSAÇÕES NORMAIS
    COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN t.amount END), 0) as gasto_ultimo_mes,
    COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN t.amount END), 0) as gasto_ultimos_3_meses,
    COALESCE(SUM(t.amount), 0) as gasto_total_historico,
    
    -- GASTOS NO CARTÃO DE CRÉDITO
    COALESCE(SUM(CASE WHEN cp.date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN cp.amount END), 0) as gasto_cartao_ultimo_mes,
    COALESCE(SUM(CASE WHEN cp.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN cp.amount END), 0) as gasto_cartao_ultimos_3_meses,
    COALESCE(SUM(cp.amount), 0) as gasto_cartao_total_historico,
    
    -- TOTAIS COMBINADOS
    (COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN t.amount END), 0) +
     COALESCE(SUM(CASE WHEN cp.date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN cp.amount END), 0)) as total_ultimo_mes,
    
    (COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN t.amount END), 0) +
     COALESCE(SUM(CASE WHEN cp.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN cp.amount END), 0)) as total_ultimos_3_meses,
    
    -- MÉDIA MENSAL
    (COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN t.amount END), 0) +
     COALESCE(SUM(CASE WHEN cp.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN cp.amount END), 0)) / 3 as media_mensal_3_meses,
    
    -- CLASSIFICAÇÃO DE PRIORIDADE
    CASE 
        WHEN c.name IN ('Aluguel', 'Luz', 'Água', 'Alimentação', 'Internet') THEN 'ESSENCIAL'
        WHEN c.name IN ('Plano de saúde', 'Assinaturas') THEN 'IMPORTANTE'
        WHEN c.name IN ('Lazer', 'Outras Despesas') THEN 'OPCIONAL'
        ELSE 'OUTROS'
    END as prioridade,
    
    COUNT(t.id) as quantidade_transacoes,
    COUNT(cp.id) as quantidade_compras_cartao

FROM Category c
LEFT JOIN Transaction t ON c.id = t.categoryId AND t.type = 'EXPENSE' AND t.status = 'COMPLETED'
LEFT JOIN CreditCardPurchase cp ON c.id = cp.categoryId
WHERE c.type = 'EXPENSE'
GROUP BY c.id, c.name, c.type
ORDER BY total_ultimos_3_meses DESC;

-- =============================================================================
-- 3. VIEW PARA ANÁLISE DE RECEITAS E FONTES DE RENDA
-- =============================================================================
CREATE OR REPLACE VIEW vw_Analise_Receitas AS
SELECT 
    c.name as fonte_receita,
    
    -- HISTÓRICO POR PERÍODO
    COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN t.amount END), 0) as receita_ultimo_mes,
    COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN t.amount END), 0) as receita_ultimos_3_meses,
    COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) THEN t.amount END), 0) as receita_ultimo_ano,
    COALESCE(SUM(t.amount), 0) as receita_total_historica,
    
    -- MÉDIAS
    COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN t.amount END), 0) / 3 as media_mensal_3_meses,
    COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) THEN t.amount END), 0) / 12 as media_mensal_12_meses,
    
    -- CLASSIFICAÇÃO DO TIPO DE RENDA
    CASE 
        WHEN c.name = 'Salário' THEN 'ATIVA_PRINCIPAL'
        WHEN c.name IN ('Dividendos', 'Investimentos') THEN 'PASSIVA'
        WHEN c.name IN ('Vendas', 'Outras Receitas') THEN 'EXTRA_VARIÁVEL'
        WHEN c.name = 'Empréstimo' THEN 'CAPITAL_TERCEIROS'
        ELSE 'OUTRAS'
    END as tipo_renda,
    
    -- REGULARIDADE
    CASE 
        WHEN COUNT(t.id) >= 3 THEN 'REGULAR'
        WHEN COUNT(t.id) >= 1 THEN 'OCASIONAL'
        ELSE 'RARA'
    END as regularidade,
    
    COUNT(t.id) as quantidade_transacoes,
    AVG(t.amount) as valor_medio_transacao,
    MIN(t.amount) as menor_valor,
    MAX(t.amount) as maior_valor

FROM Category c
LEFT JOIN Transaction t ON c.id = t.categoryId AND t.type = 'INCOME' AND t.status = 'COMPLETED'
WHERE c.type = 'INCOME'
GROUP BY c.id, c.name
ORDER BY receita_ultimos_3_meses DESC;

-- =============================================================================
-- 4. VIEW PARA MONITORAMENTO DE INVESTIMENTOS
-- =============================================================================
CREATE OR REPLACE VIEW vw_Portfolio_Investimentos AS
SELECT 
    i.name as nome_investimento,
    i.type as tipo_investimento,
    i.ticker,
    i.institution as corretora,
    
    -- POSIÇÃO ATUAL
    SUM(CASE WHEN it.type = 'BUY' THEN it.quantity ELSE -it.quantity END) as quantidade_atual,
    SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END) as valor_investido_liquido,
    AVG(CASE WHEN it.type = 'BUY' THEN it.price END) as preco_medio_compra,
    
    -- ÚLTIMAS MOVIMENTAÇÕES
    COUNT(CASE WHEN it.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN 1 END) as movimentacoes_3_meses,
    SUM(CASE WHEN it.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) AND it.type = 'BUY' THEN it.amount ELSE 0 END) as aportes_3_meses,
    
    -- DATA DA ÚLTIMA MOVIMENTAÇÃO
    MAX(it.date) as ultima_movimentacao,
    
    -- CLASSIFICAÇÃO POR RISCO
    CASE 
        WHEN i.type = 'CDB' THEN 'BAIXO'
        WHEN i.type = 'STOCKS' AND i.ticker LIKE '%11' THEN 'MEDIO' -- FIIs
        WHEN i.type = 'STOCKS' THEN 'ALTO'
        ELSE 'INDEFINIDO'
    END as nivel_risco,
    
    -- PERCENTUAL DO PORTFOLIO
    (SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END) / 
     (SELECT SUM(CASE WHEN it2.type = 'BUY' THEN it2.amount ELSE -it2.amount END) FROM InvestmentTransaction it2) * 100) as percentual_portfolio

FROM Investment i
LEFT JOIN InvestmentTransaction it ON i.id = it.investmentId
GROUP BY i.id, i.name, i.type, i.ticker, i.institution
HAVING quantidade_atual > 0  -- Só mostra investimentos com posição atual
ORDER BY valor_investido_liquido DESC;

-- =============================================================================
-- 5. QUERY PARA EVOLUÇÃO MENSAL DO PATRIMÔNIO (DASHBOARD GRÁFICO)
-- =============================================================================
CREATE OR REPLACE VIEW vw_Evolucao_Patrimonial_Mensal AS
WITH MovimentacaoMensal AS (
    SELECT 
        DATE_FORMAT(date, '%Y-%m') as mes_ano,
        SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END) as saldo_liquido_mes
    FROM Transaction
    WHERE status = 'COMPLETED'
    GROUP BY DATE_FORMAT(date, '%Y-%m')
),
PatrimonioAcumulado AS (
    SELECT 
        mes_ano,
        saldo_liquido_mes,
        SUM(saldo_liquido_mes) OVER (ORDER BY mes_ano) as patrimonio_acumulado
    FROM MovimentacaoMensal
)
SELECT 
    mes_ano,
    saldo_liquido_mes,
    patrimonio_acumulado,
    LAG(patrimonio_acumulado) OVER (ORDER BY mes_ano) as patrimonio_mes_anterior,
    ((patrimonio_acumulado - LAG(patrimonio_acumulado) OVER (ORDER BY mes_ano)) / 
     NULLIF(LAG(patrimonio_acumulado) OVER (ORDER BY mes_ano), 0) * 100) as crescimento_percentual,
    
    -- CLASSIFICAÇÃO DO DESEMPENHO
    CASE 
        WHEN saldo_liquido_mes > 0 THEN 'POSITIVO'
        WHEN saldo_liquido_mes = 0 THEN 'NEUTRO'
        ELSE 'NEGATIVO'
    END as desempenho_mes,
    
    -- TENDÊNCIA (MÉDIA MÓVEL DE 3 MESES)
    AVG(saldo_liquido_mes) OVER (ORDER BY mes_ano ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as media_movel_3_meses

FROM PatrimonioAcumulado
ORDER BY mes_ano DESC
LIMIT 24;  -- Últimos 24 meses

-- =============================================================================
-- 6. QUERY PARA ALERTAS E NOTIFICAÇÕES AUTOMÁTICAS
-- =============================================================================
CREATE OR REPLACE VIEW vw_Alertas_Financeiros AS
WITH IndicadoresAtual AS (
    SELECT 
        (SELECT SUM(currentBalance) FROM BankAccount) as saldo_total,
        (SELECT AVG(t.amount) FROM Transaction t WHERE t.type = 'EXPENSE' AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) AND t.status = 'COMPLETED') * 3 as gasto_medio_3_meses,
        (SELECT SUM(initialDebt) FROM CreditCard) as divida_cartoes,
        (SELECT COUNT(*) FROM Goal WHERE targetDate < CURDATE() AND currentAmount < targetAmount) as metas_vencidas
)
SELECT 
    'LIQUIDEZ' as tipo_alerta,
    CASE 
        WHEN ia.saldo_total < (ia.gasto_medio_3_meses * 3) THEN 'CRÍTICO'
        WHEN ia.saldo_total < (ia.gasto_medio_3_meses * 6) THEN 'ATENÇÃO'
        ELSE 'OK'
    END as nivel,
    CONCAT('Reserva para ', FORMAT(ia.saldo_total / (ia.gasto_medio_3_meses / 3), 1), ' meses de gastos') as mensagem,
    ia.saldo_total as valor_atual,
    (ia.gasto_medio_3_meses * 6) as valor_recomendado
FROM IndicadoresAtual ia

UNION ALL

SELECT 
    'ENDIVIDAMENTO' as tipo_alerta,
    CASE 
        WHEN ia.divida_cartoes > (SELECT AVG(amount) FROM Transaction WHERE type = 'INCOME' AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)) 
        THEN 'CRÍTICO'
        WHEN ia.divida_cartoes > 0 THEN 'ATENÇÃO'
        ELSE 'OK'
    END as nivel,
    CONCAT('Dívida cartões: R$ ', FORMAT(ia.divida_cartoes, 2)) as mensagem,
    ia.divida_cartoes as valor_atual,
    0 as valor_recomendado
FROM IndicadoresAtual ia

UNION ALL

SELECT 
    'METAS' as tipo_alerta,
    CASE 
        WHEN ia.metas_vencidas > 0 THEN 'ATENÇÃO'
        ELSE 'OK'
    END as nivel,
    CONCAT(ia.metas_vencidas, ' meta(s) vencida(s)') as mensagem,
    ia.metas_vencidas as valor_atual,
    0 as valor_recomendado
FROM IndicadoresAtual ia;

-- =============================================================================
-- 7. EXEMPLO DE COMO USAR AS PROCEDURES E VIEWS
-- =============================================================================
/*
-- Para executar o relatório do ano atual:
CALL sp_Relatorio_Financeiro_Pessoal_Periodo(2026, 2026);

-- Para comparar 2025 com 2026:
CALL sp_Relatorio_Financeiro_Pessoal_Periodo(2025, 2026);

-- Para ver o dashboard principal:
SELECT * FROM vw_Dashboard_Financeiro_Pessoal;

-- Para ver gastos por categoria:
SELECT * FROM vw_Gastos_Por_Categoria;

-- Para ver evolução patrimonial:
SELECT * FROM vw_Evolucao_Patrimonial_Mensal;

-- Para ver alertas:
SELECT * FROM vw_Alertas_Financeiros WHERE nivel IN ('CRÍTICO', 'ATENÇÃO');
*/