-- =============================================================================
-- STORED PROCEDURES PARA ANÁLISE FINANCEIRA PESSOAL POR USUÁRIO
-- Substitui as views para permitir filtro dinâmico por usuário
-- =============================================================================

-- =============================================================================
-- 1. PROCEDURE PARA DASHBOARD PRINCIPAL
-- =============================================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_Dashboard_Por_Usuario$$

CREATE PROCEDURE sp_Dashboard_Por_Usuario(
    IN p_user_id VARCHAR(255)
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
                WHERE t.userId = p_user_id 
                  AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                  AND t.status = 'COMPLETED'
                GROUP BY DATE_FORMAT(t.date, '%Y-%m')
            ) AS ultimos_meses
        ), 0) as receita_media_mensal,
        
        COALESCE((
            SELECT AVG(despesa_mes) FROM (
                SELECT 
                    SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) as despesa_mes
                FROM Transaction t
                WHERE t.userId = p_user_id 
                  AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                  AND t.status = 'COMPLETED'
                GROUP BY DATE_FORMAT(t.date, '%Y-%m')
            ) AS ultimos_meses
        ), 0) as despesa_media_mensal,
        
        -- Patrimônio atual
        COALESCE((SELECT SUM(currentBalance) FROM BankAccount WHERE userId = p_user_id), 0) as saldo_bancos,
        COALESCE((SELECT SUM(initialDebt) FROM CreditCard WHERE userId = p_user_id), 0) as divida_cartoes,
        COALESCE((
            SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END)
            FROM InvestmentTransaction it
            JOIN Investment i ON it.investmentId = i.id
            WHERE i.userId = p_user_id
        ), 0) as valor_investimentos,
        
        -- Metas
        COALESCE((SELECT COUNT(*) FROM Goal WHERE userId = p_user_id AND targetDate >= CURDATE()), 0) as total_metas,
        COALESCE((
            SELECT AVG((currentAmount / targetAmount) * 100) 
            FROM Goal 
            WHERE userId = p_user_id AND targetDate >= CURDATE() AND targetAmount > 0
        ), 0) as progresso_metas_percentual;
END$$

DELIMITER ;

-- =============================================================================
-- 2. PROCEDURE PARA GASTOS POR CATEGORIA
-- =============================================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_Gastos_Por_Categoria$$

CREATE PROCEDURE sp_Gastos_Por_Categoria(
    IN p_user_id VARCHAR(255)
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
        
        -- Classificação de prioridade
        CASE 
            WHEN c.name IN ('Aluguel', 'Luz', 'Água', 'Alimentação', 'Internet') THEN 'ESSENCIAL'
            WHEN c.name IN ('Plano de saúde', 'Assinaturas', 'Seguro') THEN 'IMPORTANTE'
            WHEN c.name IN ('Lazer', 'Outras Despesas', 'Entretenimento') THEN 'OPCIONAL'
            ELSE 'OUTROS'
        END as prioridade,
        
        COUNT(t.id) as quantidade_transacoes,
        COUNT(cp.id) as quantidade_compras_cartao

    FROM Category c
    LEFT JOIN Transaction t ON c.id = t.categoryId 
        AND t.type = 'EXPENSE' 
        AND t.status = 'COMPLETED' 
        AND t.userId = p_user_id
    LEFT JOIN CreditCardPurchase cp ON c.id = cp.categoryId 
        AND cp.userId = p_user_id
    WHERE c.type = 'EXPENSE' 
      AND (c.userId = p_user_id OR c.userId IS NULL) -- Incluir categorias do sistema
    GROUP BY c.id, c.name, c.type
    HAVING total_ultimos_3_meses > 0
    ORDER BY total_ultimos_3_meses DESC
    LIMIT 20;
END$$

DELIMITER ;

-- =============================================================================
-- 3. PROCEDURE PARA ANÁLISE DE RECEITAS
-- =============================================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_Analise_Receitas$$

CREATE PROCEDURE sp_Analise_Receitas(
    IN p_user_id VARCHAR(255)
)
BEGIN
    SELECT 
        c.name as fonte_receita,
        
        -- Receitas por período
        COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN t.amount END), 0) as receita_ultimo_mes,
        COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN t.amount END), 0) as receita_ultimos_3_meses,
        COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) THEN t.amount END), 0) as receita_ultimo_ano,
        
        -- Classificação do tipo de renda
        CASE 
            WHEN c.name = 'Salário' THEN 'ATIVA_PRINCIPAL'
            WHEN c.name IN ('Dividendos', 'Investimentos', 'Aluguel') THEN 'PASSIVA'
            WHEN c.name IN ('Vendas', 'Outras Receitas', 'Freelance') THEN 'EXTRA_VARIÁVEL'
            WHEN c.name = 'Empréstimo' THEN 'CAPITAL_TERCEIROS'
            ELSE 'OUTRAS'
        END as tipo_renda,
        
        -- Regularidade baseada na frequência
        CASE 
            WHEN COUNT(t.id) >= 10 THEN 'MUITO_REGULAR'
            WHEN COUNT(t.id) >= 3 THEN 'REGULAR'
            WHEN COUNT(t.id) >= 1 THEN 'OCASIONAL'
            ELSE 'RARA'
        END as regularidade,
        
        COUNT(t.id) as quantidade_transacoes,
        AVG(t.amount) as valor_medio_transacao

    FROM Category c
    LEFT JOIN Transaction t ON c.id = t.categoryId 
        AND t.type = 'INCOME' 
        AND t.status = 'COMPLETED' 
        AND t.userId = p_user_id
    WHERE c.type = 'INCOME' 
      AND (c.userId = p_user_id OR c.userId IS NULL) -- Incluir categorias do sistema
    GROUP BY c.id, c.name
    HAVING receita_ultimos_3_meses > 0
    ORDER BY receita_ultimos_3_meses DESC
    LIMIT 15;
END$$

DELIMITER ;

-- =============================================================================
-- 4. PROCEDURE PARA PORTFOLIO DE INVESTIMENTOS
-- =============================================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_Portfolio_Investimentos$$

CREATE PROCEDURE sp_Portfolio_Investimentos(
    IN p_user_id VARCHAR(255)
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
        
        MAX(it.date) as ultima_movimentacao,
        
        -- Classificação por risco
        CASE 
            WHEN i.type = 'CDB' THEN 'BAIXO'
            WHEN i.type = 'TREASURY' THEN 'BAIXO'
            WHEN i.type = 'STOCKS' AND i.ticker LIKE '%11' THEN 'MEDIO' -- FIIs
            WHEN i.type = 'STOCKS' THEN 'ALTO'
            WHEN i.type = 'CRYPTO' THEN 'MUITO_ALTO'
            ELSE 'INDEFINIDO'
        END as nivel_risco

    FROM Investment i
    LEFT JOIN InvestmentTransaction it ON i.id = it.investmentId
    WHERE i.userId = p_user_id
    GROUP BY i.id, i.name, i.type, i.ticker, i.institution
    HAVING quantidade_atual > 0 OR valor_investido_liquido > 0
    ORDER BY valor_investido_liquido DESC;
END$$

DELIMITER ;

-- =============================================================================
-- 5. PROCEDURE PARA ALERTAS FINANCEIROS
-- =============================================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_Alertas_Financeiros$$

CREATE PROCEDURE sp_Alertas_Financeiros(
    IN p_user_id VARCHAR(255)
)
BEGIN
    DECLARE saldo_total DECIMAL(12,2) DEFAULT 0;
    DECLARE gasto_medio_mensal DECIMAL(12,2) DEFAULT 0;
    DECLARE divida_cartoes DECIMAL(12,2) DEFAULT 0;
    DECLARE receita_media DECIMAL(12,2) DEFAULT 0;
    DECLARE metas_vencidas INT DEFAULT 0;
    
    -- Converter parâmetro para evitar problemas de collation
    -- SET p_user_id = CONVERT(p_user_id USING utf8mb4) COLLATE utf8mb4_unicode_ci;
    
    -- Calcular indicadores
    SELECT COALESCE(SUM(currentBalance), 0) INTO saldo_total
    FROM BankAccount WHERE userId = p_user_id;
    
    SELECT COALESCE(AVG(despesa_mes), 0) INTO gasto_medio_mensal
    FROM (
        SELECT SUM(amount) as despesa_mes
        FROM Transaction 
        WHERE userId = p_user_id 
          AND type = 'EXPENSE' 
          AND status = 'COMPLETED'
          AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
        GROUP BY DATE_FORMAT(date, '%Y-%m')
    ) as gastos_mensais;
    
    SELECT COALESCE(SUM(initialDebt), 0) INTO divida_cartoes
    FROM CreditCard WHERE userId = p_user_id;
    
    SELECT COALESCE(AVG(receita_mes), 0) INTO receita_media
    FROM (
        SELECT SUM(amount) as receita_mes
        FROM Transaction 
        WHERE userId = p_user_id 
          AND type = 'INCOME' 
          AND status = 'COMPLETED'
          AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
        GROUP BY DATE_FORMAT(date, '%Y-%m')
    ) as receitas_mensais;
    
    SELECT COUNT(*) INTO metas_vencidas
    FROM Goal 
    WHERE userId = p_user_id 
      AND targetDate < CURDATE() 
      AND currentAmount < targetAmount;
    
    -- Retornar alertas (removendo WHERE desnecessário)
    SELECT 
        'LIQUIDEZ' as tipo_alerta,
        CASE 
            WHEN saldo_total < (gasto_medio_mensal * 3) THEN 'CRÍTICO'
            WHEN saldo_total < (gasto_medio_mensal * 6) THEN 'ATENÇÃO'
            ELSE 'OK'
        END as nivel,
        CONCAT('Reserva para ', 
               CASE 
                 WHEN gasto_medio_mensal > 0 THEN FORMAT(saldo_total / gasto_medio_mensal, 1)
                 ELSE '999+'
               END, 
               ' meses de gastos') as mensagem,
        saldo_total as valor_atual,
        (gasto_medio_mensal * 6) as valor_recomendado
    
    UNION ALL
    
    SELECT 
        'ENDIVIDAMENTO' as tipo_alerta,
        CASE 
            WHEN divida_cartoes > receita_media THEN 'CRÍTICO'
            WHEN divida_cartoes > 0 THEN 'ATENÇÃO'
            ELSE 'OK'
        END as nivel,
        CONCAT('Dívida cartões: R$ ', FORMAT(divida_cartoes, 2)) as mensagem,
        divida_cartoes as valor_atual,
        0 as valor_recomendado
    
    UNION ALL
    
    SELECT 
        'METAS' as tipo_alerta,
        CASE 
            WHEN metas_vencidas > 0 THEN 'ATENÇÃO'
            ELSE 'OK'
        END as nivel,
        CONCAT(metas_vencidas, ' meta(s) vencida(s)') as mensagem,
        metas_vencidas as valor_atual,
        0 as valor_recomendado
    
    ORDER BY 
        CASE 
            WHEN nivel = 'CRÍTICO' THEN 1
            WHEN nivel = 'ATENÇÃO' THEN 2
            ELSE 3
        END;
END$$

DELIMITER ;

-- =============================================================================
-- 6. PROCEDURE PARA EVOLUÇÃO PATRIMONIAL MENSAL
-- =============================================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_Evolucao_Patrimonial$$

CREATE PROCEDURE sp_Evolucao_Patrimonial(
    IN p_user_id VARCHAR(255),
    IN p_meses INT
)
BEGIN
    -- Usar p_meses = 12 se NULL ou 0
    SET p_meses = IFNULL(NULLIF(p_meses, 0), 12);
    
    -- Consulta direta sem tabela temporária para máxima compatibilidade
    SELECT 
        mes_ano,
        saldo_liquido_mes,
        @patrimonio_acumulado := @patrimonio_acumulado + saldo_liquido_mes as patrimonio_acumulado,
        @patrimonio_anterior as patrimonio_mes_anterior,
        CASE 
            WHEN @patrimonio_anterior > 0 THEN
                ((@patrimonio_acumulado - @patrimonio_anterior) / @patrimonio_anterior * 100)
            ELSE 0
        END as crescimento_percentual,
        
        -- Classificação do desempenho
        CASE 
            WHEN saldo_liquido_mes > 0 THEN 'POSITIVO'
            WHEN saldo_liquido_mes = 0 THEN 'NEUTRO'
            ELSE 'NEGATIVO'
        END as desempenho_mes,
        
        @patrimonio_anterior := @patrimonio_acumulado
        
    FROM (
        SELECT 
            DATE_FORMAT(date, '%Y-%m') as mes_ano,
            SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END) as saldo_liquido_mes
        FROM Transaction
        WHERE userId = p_user_id 
          AND status = 'COMPLETED'
          AND date >= DATE_SUB(CURDATE(), INTERVAL p_meses MONTH)
        GROUP BY DATE_FORMAT(date, '%Y-%m')
        ORDER BY mes_ano ASC
    ) as movimentacao_mensal
    CROSS JOIN (SELECT @patrimonio_acumulado := 0, @patrimonio_anterior := 0) as vars
    ORDER BY mes_ano DESC;
END$$

DELIMITER ;

-- =============================================================================
-- 7. PROCEDURE PARA RELATÓRIO PERÍODO PERSONALIZADO
-- =============================================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_Relatorio_Periodo_Usuario$$

CREATE PROCEDURE sp_Relatorio_Periodo_Usuario(
    IN p_user_id VARCHAR(255),
    IN p_ano_inicio INT,
    IN p_ano_fim INT
)
BEGIN
    DECLARE v_data_inicio DATE;
    DECLARE v_data_fim DATE;
    
    -- Tratar ano_fim NULL (usar mesmo ano se não informado)
    SET p_ano_fim = IFNULL(p_ano_fim, p_ano_inicio);
    
    SET v_data_inicio = STR_TO_DATE(CONCAT(p_ano_inicio, '-01-01'), '%Y-%m-%d');
    SET v_data_fim = STR_TO_DATE(CONCAT(p_ano_fim, '-12-31'), '%Y-%m-%d');
    
    SELECT 
        CONCAT(p_ano_inicio, IF(p_ano_inicio = p_ano_fim, '', CONCAT(' a ', p_ano_fim))) as periodo_analisado,
        
        -- Receitas do período
        COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount END), 0) as total_receitas,
        
        -- Despesas do período (transações + cartão)
        COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount END), 0) +
        COALESCE((
            SELECT SUM(cp.amount) 
            FROM CreditCardPurchase cp 
            WHERE cp.userId = p_user_id 
              AND cp.date BETWEEN v_data_inicio AND v_data_fim
        ), 0) as total_despesas,
        
        -- Resultado líquido
        COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount END), 0) - 
        (COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount END), 0) +
         COALESCE((
             SELECT SUM(cp.amount) 
             FROM CreditCardPurchase cp 
             WHERE cp.userId = p_user_id 
               AND cp.date BETWEEN v_data_inicio AND v_data_fim
         ), 0)) as saldo_liquido,
        
        -- Investimentos no período
        COALESCE((
            SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END)
            FROM InvestmentTransaction it
            JOIN Investment i ON it.investmentId = i.id
            WHERE i.userId = p_user_id
              AND it.date BETWEEN v_data_inicio AND v_data_fim
        ), 0) as movimentacao_investimentos
        
    FROM Transaction t
    WHERE t.userId = p_user_id
      AND t.status = 'COMPLETED'
      AND t.date BETWEEN v_data_inicio AND v_data_fim;
END$$

DELIMITER ;