-- =============================================================================
-- CORRIGIR VIEW: vw_Alertas_Financeiros - FIX COLLATION ERROR
-- =============================================================================

DROP VIEW IF EXISTS vw_Alertas_Financeiros;

CREATE OR REPLACE VIEW vw_Alertas_Financeiros AS
-- ALERTA: Reserva de Emergência
SELECT 
    dados.id as userId,
    CAST(dados.name AS CHAR(255)) COLLATE utf8mb4_unicode_ci as nome_usuario,
    CAST('RESERVA_EMERGENCIA' AS CHAR(50)) COLLATE utf8mb4_unicode_ci as tipo_alerta,
    
    CAST(CASE 
        WHEN dados.meses_cobertura < 3 THEN 'CRÍTICO'
        WHEN dados.meses_cobertura < 6 THEN 'ALTO'
        ELSE 'MÉDIO'
    END AS CHAR(20)) COLLATE utf8mb4_unicode_ci as nivel_prioridade,
    
    CAST('Reserva de Emergência Insuficiente' AS CHAR(255)) COLLATE utf8mb4_unicode_ci as titulo,
    
    CAST(CONCAT('Sua reserva atual cobre apenas ', FORMAT(dados.meses_cobertura, 1), ' meses de despesas. O recomendado são 6 meses.') AS CHAR(500)) COLLATE utf8mb4_unicode_ci as mensagem,
    
    dados.saldo_contas as valor_atual,
    dados.despesa_mensal_media * 6 as valor_recomendado,
    CAST('Aumente sua reserva de emergência para 6 meses de despesas' AS CHAR(255)) COLLATE utf8mb4_unicode_ci as acao_sugerida

FROM (
    SELECT 
        u.id,
        u.name,
        COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = u.id), 0) as saldo_contas,
        
        COALESCE((
            SELECT AVG(despesa_mes) 
            FROM (
                SELECT SUM(t.amount) as despesa_mes
                FROM Transaction t
                WHERE t.userId = u.id 
                  AND t.type = 'EXPENSE' 
                  AND t.status = 'COMPLETED'
                  AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                GROUP BY DATE_FORMAT(t.date, '%Y-%m')
            ) AS despesas
        ), 0) as despesa_mensal_media,
        
        CASE 
            WHEN COALESCE((
                SELECT AVG(despesa_mes) 
                FROM (
                    SELECT SUM(t.amount) as despesa_mes
                    FROM Transaction t
                    WHERE t.userId = u.id 
                      AND t.type = 'EXPENSE' 
                      AND t.status = 'COMPLETED'
                      AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                    GROUP BY DATE_FORMAT(t.date, '%Y-%m')
                ) AS despesas2
            ), 0) > 0 THEN
                COALESCE((SELECT SUM(ba2.currentBalance) FROM BankAccount ba2 WHERE ba2.userId = u.id), 0) /
                COALESCE((
                    SELECT AVG(despesa_mes) 
                    FROM (
                        SELECT SUM(t2.amount) as despesa_mes
                        FROM Transaction t2
                        WHERE t2.userId = u.id 
                          AND t2.type = 'EXPENSE' 
                          AND t2.status = 'COMPLETED'
                          AND t2.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                        GROUP BY DATE_FORMAT(t2.date, '%Y-%m')
                    ) AS despesas3
                ), 1)
            ELSE 999
        END as meses_cobertura
        
    FROM User u
    WHERE u.isActive = TRUE
) AS dados
WHERE dados.meses_cobertura < 6

UNION ALL

-- ALERTA: Cartões com uso alto
SELECT 
    cc.userId,
    CAST(u.name AS CHAR(255)) COLLATE utf8mb4_unicode_ci as nome_usuario,
    CAST('CARTAO_USO_ALTO' AS CHAR(50)) COLLATE utf8mb4_unicode_ci as tipo_alerta,
    
    CAST(CASE 
        WHEN (cc.initialDebt / NULLIF(cc.cardLimit, 0)) * 100 >= 80 THEN 'CRÍTICO'
        WHEN (cc.initialDebt / NULLIF(cc.cardLimit, 0)) * 100 >= 50 THEN 'ALTO'
        ELSE 'MÉDIO'
    END AS CHAR(20)) COLLATE utf8mb4_unicode_ci as nivel_prioridade,
    
    CAST(CONCAT('Cartão ', cc.name, ' com uso elevado') AS CHAR(255)) COLLATE utf8mb4_unicode_ci as titulo,
    
    CAST(CONCAT('O cartão ', cc.name, ' está utilizando ', 
           FORMAT((cc.initialDebt / NULLIF(cc.cardLimit, 0)) * 100, 1), 
           '% do limite. Recomenda-se manter abaixo de 30%.') AS CHAR(500)) COLLATE utf8mb4_unicode_ci as mensagem,
    
    cc.initialDebt as valor_atual,
    cc.cardLimit * 0.30 as valor_recomendado,
    CAST('Reduza o uso do cartão ou pague parte da fatura' AS CHAR(255)) COLLATE utf8mb4_unicode_ci as acao_sugerida

FROM CreditCard cc
JOIN User u ON cc.userId = u.id
WHERE u.isActive = TRUE
  AND (cc.initialDebt / NULLIF(cc.cardLimit, 0)) * 100 >= 50

UNION ALL

-- ALERTA: Metas próximas do prazo
SELECT 
    g.userId,
    CAST(u.name AS CHAR(255)) COLLATE utf8mb4_unicode_ci as nome_usuario,
    CAST('META_PROXIMO_PRAZO' AS CHAR(50)) COLLATE utf8mb4_unicode_ci as tipo_alerta,
    
    CAST(CASE 
        WHEN DATEDIFF(g.targetDate, CURDATE()) <= 30 THEN 'CRÍTICO'
        WHEN DATEDIFF(g.targetDate, CURDATE()) <= 90 THEN 'ALTO'
        ELSE 'MÉDIO'
    END AS CHAR(20)) COLLATE utf8mb4_unicode_ci as nivel_prioridade,
    
    CAST(CONCAT('Meta "', g.name, '" próxima do prazo') AS CHAR(255)) COLLATE utf8mb4_unicode_ci as titulo,
    
    CAST(CONCAT('Faltam ', DATEDIFF(g.targetDate, CURDATE()), ' dias para a meta "', g.name, 
           '". Progresso atual: ', FORMAT((g.currentAmount / NULLIF(g.targetAmount, 0)) * 100, 1), '%.') AS CHAR(500)) COLLATE utf8mb4_unicode_ci as mensagem,
    
    g.currentAmount as valor_atual,
    g.targetAmount as valor_recomendado,
    CAST(CONCAT('Economize R$ ', FORMAT((g.targetAmount - g.currentAmount) / GREATEST(DATEDIFF(g.targetDate, CURDATE()) / 30, 1), 2), ' por mês') AS CHAR(255)) COLLATE utf8mb4_unicode_ci as acao_sugerida

FROM Goal g
JOIN User u ON g.userId = u.id
WHERE u.isActive = TRUE
  AND g.targetDate >= CURDATE()
  AND DATEDIFF(g.targetDate, CURDATE()) <= 90
  AND g.currentAmount < g.targetAmount

ORDER BY 
    CASE 
        WHEN nivel_prioridade = 'CRÍTICO' THEN 1
        WHEN nivel_prioridade = 'ALTO' THEN 2
        WHEN nivel_prioridade = 'MÉDIO' THEN 3
        ELSE 4
    END,
    userId;

SELECT 'View vw_Alertas_Financeiros corrigida com sucesso!' as status;
