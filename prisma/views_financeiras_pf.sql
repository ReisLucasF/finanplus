-- =============================================================================
-- VIEWS PARA ANÁLISE FINANCEIRA PESSOAL (PESSOA FÍSICA)
-- Sistema FinanPlus - Dashboard Completo
-- =============================================================================

-- =============================================================================
-- 1. VIEW: DASHBOARD PRINCIPAL - KPIs GERAIS DO USUÁRIO
-- =============================================================================
CREATE OR REPLACE VIEW vw_Dashboard_Principal AS
WITH cc_base AS (
    SELECT userId, SUM(cardLimit) AS total_limit, SUM(initialDebt) AS initial_debt
    FROM CreditCard
    GROUP BY userId
),
cc_purchases AS (
    SELECT userId, SUM(amount) AS total_purchases
    FROM CreditCardPurchase
    GROUP BY userId
),
cc_payments AS (
    SELECT userId, SUM(amount) AS total_payments
    FROM CreditCardPayment
    WHERE status = 'PAID'
    GROUP BY userId
),
card_stats AS (
    SELECT 
        cb.userId,
        cb.total_limit,
        cb.initial_debt,
        COALESCE(cb.initial_debt, 0) + COALESCE(cp.total_purchases, 0) - COALESCE(cpay.total_payments, 0) as current_card_debt
    FROM cc_base cb
    LEFT JOIN cc_purchases cp ON cp.userId = cb.userId
    LEFT JOIN cc_payments cpay ON cpay.userId = cb.userId
)
SELECT 
    u.id as userId,
    u.name as nome_usuario,
    u.email,
    
    -- ========== PATRIMÔNIO LÍQUIDO ==========
    COALESCE((SELECT SUM(currentBalance) FROM BankAccount WHERE userId = u.id), 0) as saldo_contas_correntes,
    
    COALESCE((
        SELECT SUM(
            CASE 
                WHEN it.type = 'BUY' THEN it.amount 
                ELSE -it.amount 
            END
        )
        FROM InvestmentTransaction it
        JOIN Investment i ON it.investmentId = i.id
        WHERE i.userId = u.id
    ), 0) as valor_investido_total,
    
    COALESCE(card.current_card_debt, 0) as divida_cartoes_atual,
    
    -- Patrimônio Líquido = Saldo + Investimentos - Dívidas
    (COALESCE((SELECT SUM(currentBalance) FROM BankAccount WHERE userId = u.id), 0) +
     COALESCE((
         SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END)
         FROM InvestmentTransaction it
         JOIN Investment i ON it.investmentId = i.id
         WHERE i.userId = u.id
     ), 0) -
     COALESCE(card.current_card_debt, 0)) as patrimonio_liquido_atual,
    
    -- ========== FLUXO DE CAIXA MENSAL ==========
    -- Receitas último mês
    COALESCE((
        SELECT SUM(amount)
        FROM Transaction
        WHERE userId = u.id 
          AND type = 'INCOME'
          AND status = 'COMPLETED'
          AND date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
    ), 0) as receita_ultimo_mes,
    
    -- Receitas média 3 meses
    COALESCE((
        SELECT AVG(receita_mes) FROM (
            SELECT SUM(amount) as receita_mes
            FROM Transaction
            WHERE userId = u.id 
              AND type = 'INCOME'
              AND status = 'COMPLETED'
              AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
            GROUP BY DATE_FORMAT(date, '%Y-%m')
        ) AS ultimos_3_meses
    ), 0) as receita_media_3_meses,
    
    -- Despesas último mês (transações + compras cartão)
    (COALESCE((
        SELECT SUM(amount)
        FROM Transaction
        WHERE userId = u.id 
          AND type = 'EXPENSE'
          AND status = 'COMPLETED'
          AND date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
    ), 0) +
    COALESCE((
        SELECT SUM(amount)
        FROM CreditCardPurchase
        WHERE userId = u.id
          AND date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
    ), 0)) as despesa_ultimo_mes,
    
    -- Despesas média 3 meses
    COALESCE((
        SELECT AVG(despesa_mes) FROM (
            SELECT SUM(amount) as despesa_mes
            FROM Transaction
            WHERE userId = u.id 
              AND type = 'EXPENSE'
              AND status = 'COMPLETED'
              AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
            GROUP BY DATE_FORMAT(date, '%Y-%m')
        ) AS ultimos_3_meses
    ), 0) +
    COALESCE((
        SELECT AVG(compras_mes) FROM (
            SELECT SUM(amount) as compras_mes
            FROM CreditCardPurchase
            WHERE userId = u.id
              AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
            GROUP BY DATE_FORMAT(date, '%Y-%m')
        ) AS ultimos_3_meses
    ), 0) as despesa_media_3_meses,
    
    -- ========== TAXA DE POUPANÇA (SAVINGS RATE) ==========
    -- Taxa de Poupança = ((Receita - Despesa) / Receita) * 100
    CASE 
        WHEN COALESCE((
            SELECT AVG(receita_mes) FROM (
                SELECT SUM(amount) as receita_mes
                FROM Transaction
                WHERE userId = u.id 
                  AND type = 'INCOME'
                  AND status = 'COMPLETED'
                  AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                GROUP BY DATE_FORMAT(date, '%Y-%m')
            ) AS ultimos_3_meses
        ), 0) > 0 THEN
            (((COALESCE((
                SELECT AVG(receita_mes) FROM (
                    SELECT SUM(amount) as receita_mes
                    FROM Transaction
                    WHERE userId = u.id AND type = 'INCOME' AND status = 'COMPLETED'
                      AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                    GROUP BY DATE_FORMAT(date, '%Y-%m')
                ) AS r
            ), 0)) - 
            (COALESCE((
                SELECT AVG(despesa_mes) FROM (
                    SELECT SUM(amount) as despesa_mes
                    FROM Transaction
                    WHERE userId = u.id AND type = 'EXPENSE' AND status = 'COMPLETED'
                      AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                    GROUP BY DATE_FORMAT(date, '%Y-%m')
                ) AS d
            ), 0) +
            COALESCE((
                SELECT AVG(compras_mes) FROM (
                    SELECT SUM(amount) as compras_mes
                    FROM CreditCardPurchase
                    WHERE userId = u.id AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                    GROUP BY DATE_FORMAT(date, '%Y-%m')
                ) AS c
            ), 0))) / 
            (COALESCE((
                SELECT AVG(receita_mes) FROM (
                    SELECT SUM(amount) as receita_mes
                    FROM Transaction
                    WHERE userId = u.id AND type = 'INCOME' AND status = 'COMPLETED'
                      AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                    GROUP BY DATE_FORMAT(date, '%Y-%m')
                ) AS r2
            ), 0))) * 100
        ELSE 0
    END as taxa_poupanca_percentual,
    
    -- ========== RESERVA DE EMERGÊNCIA ==========
    -- Quantos meses de despesas o patrimônio líquido cobre?
    CASE 
        WHEN (COALESCE((
            SELECT AVG(despesa_mes) FROM (
                SELECT SUM(amount) as despesa_mes
                FROM Transaction
                WHERE userId = u.id AND type = 'EXPENSE' AND status = 'COMPLETED'
                  AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                GROUP BY DATE_FORMAT(date, '%Y-%m')
            ) AS d
        ), 0) +
        COALESCE((
            SELECT AVG(compras_mes) FROM (
                SELECT SUM(amount) as compras_mes
                FROM CreditCardPurchase
                WHERE userId = u.id AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                GROUP BY DATE_FORMAT(date, '%Y-%m')
            ) AS c
        ), 0)) > 0 THEN
            -- Patrimônio líquido disponível = Contas + Investimentos - Dívidas
            (COALESCE((SELECT SUM(currentBalance) FROM BankAccount WHERE userId = u.id), 0) +
             COALESCE((
                 SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END)
                 FROM InvestmentTransaction it
                 JOIN Investment i ON it.investmentId = i.id
                 WHERE i.userId = u.id
             ), 0) -
             COALESCE(card.current_card_debt, 0)) /
            (COALESCE((
                SELECT AVG(despesa_mes) FROM (
                    SELECT SUM(amount) as despesa_mes
                    FROM Transaction
                    WHERE userId = u.id AND type = 'EXPENSE' AND status = 'COMPLETED'
                      AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                    GROUP BY DATE_FORMAT(date, '%Y-%m')
                ) AS d2
            ), 0) +
            COALESCE((
                SELECT AVG(compras_mes) FROM (
                    SELECT SUM(amount) as compras_mes
                    FROM CreditCardPurchase
                    WHERE userId = u.id AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                    GROUP BY DATE_FORMAT(date, '%Y-%m')
                ) AS c2
            ), 0))
        ELSE 999
    END as meses_reserva_emergencia,
    
    -- ========== METAS ==========
    COALESCE((SELECT COUNT(*) FROM Goal WHERE userId = u.id AND targetDate >= CURDATE()), 0) as total_metas_ativas,
    
    COALESCE((SELECT COUNT(*) FROM Goal WHERE userId = u.id AND targetDate < CURDATE() AND currentAmount < targetAmount), 0) as metas_atrasadas,
    
    -- Progresso médio das metas (usando cálculo dinâmico de valor atual)
    COALESCE((
        SELECT AVG(
            (CASE 
                WHEN g.includeInvestments = TRUE THEN
                    -- Soma todas as contas + investimentos
                    COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0) +
                    COALESCE((
                        SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount WHEN it.type = 'SELL' THEN -it.amount ELSE 0 END)
                        FROM InvestmentTransaction it
                        JOIN Investment i ON it.investmentId = i.id
                        WHERE i.userId = g.userId
                    ), 0)
                WHEN g.accountId IS NOT NULL THEN
                    -- Usa o saldo da conta vinculada
                    COALESCE((SELECT ba.currentBalance FROM BankAccount ba WHERE ba.id = g.accountId), 0)
                ELSE 
                    -- Soma todas as contas do usuário
                    COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0)
            END / NULLIF(g.targetAmount, 0)) * 100
        )
        FROM Goal g
        WHERE g.userId = u.id AND g.targetDate >= CURDATE() AND g.targetAmount > 0
    ), 0) as progresso_medio_metas_percentual,
    
    -- ========== CARTÕES DE CRÉDITO ==========
    COALESCE((SELECT COUNT(*) FROM CreditCard WHERE userId = u.id), 0) as total_cartoes,
    
    COALESCE(card.total_limit, 0) as limite_total_cartoes,
    
    -- Utilização do limite (%)
    CASE 
        WHEN COALESCE(card.total_limit, 0) > 0 THEN
            (COALESCE(card.current_card_debt, 0) /
             COALESCE(card.total_limit, 0)) * 100
        ELSE 0
    END as utilizacao_limite_percentual,
    
    -- ========== INVESTIMENTOS ==========
    COALESCE((SELECT COUNT(DISTINCT i.id) FROM Investment i WHERE i.userId = u.id), 0) as total_investimentos_ativos,
    
    -- Aportes nos últimos 3 meses
    COALESCE((
        SELECT SUM(amount)
        FROM InvestmentTransaction it
        JOIN Investment i ON it.investmentId = i.id
        WHERE i.userId = u.id
          AND it.type = 'BUY'
          AND it.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
    ), 0) as aportes_investimentos_3_meses,
    
    -- ========== CLASSIFICAÇÃO DE SAÚDE FINANCEIRA ==========
    -- Usa a coluna meses_reserva_emergencia já calculada acima (que considera patrimônio líquido completo)
    CASE 
        -- EXCELENTE: Reserva >= 6 meses + Taxa poupança >= 20% + Dívida < 30% da receita
        WHEN (
            (CASE 
                WHEN (COALESCE((
                    SELECT AVG(despesa_mes) FROM (
                        SELECT SUM(amount) as despesa_mes
                        FROM Transaction
                        WHERE userId = u.id AND type = 'EXPENSE' AND status = 'COMPLETED'
                          AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                        GROUP BY DATE_FORMAT(date, '%Y-%m')
                    ) AS d
                ), 0) +
                COALESCE((
                    SELECT AVG(compras_mes) FROM (
                        SELECT SUM(amount) as compras_mes
                        FROM CreditCardPurchase
                        WHERE userId = u.id AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                        GROUP BY DATE_FORMAT(date, '%Y-%m')
                    ) AS c
                ), 0)) > 0 THEN
                    (COALESCE((SELECT SUM(currentBalance) FROM BankAccount WHERE userId = u.id), 0) +
                     COALESCE((
                         SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END)
                         FROM InvestmentTransaction it
                         JOIN Investment i ON it.investmentId = i.id
                         WHERE i.userId = u.id
                     ), 0) -
                     COALESCE(card.current_card_debt, 0)) /
                    (COALESCE((
                        SELECT AVG(despesa_mes) FROM (
                            SELECT SUM(amount) as despesa_mes
                            FROM Transaction
                            WHERE userId = u.id AND type = 'EXPENSE' AND status = 'COMPLETED'
                              AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                            GROUP BY DATE_FORMAT(date, '%Y-%m')
                        ) AS d2
                    ), 0) +
                    COALESCE((
                        SELECT AVG(compras_mes) FROM (
                            SELECT SUM(amount) as compras_mes
                            FROM CreditCardPurchase
                            WHERE userId = u.id AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                            GROUP BY DATE_FORMAT(date, '%Y-%m')
                        ) AS c2
                    ), 0))
                ELSE 999
            END >= 6) AND
            (CASE 
                WHEN COALESCE((
                    SELECT AVG(receita_mes) FROM (
                        SELECT SUM(amount) as receita_mes
                        FROM Transaction
                        WHERE userId = u.id AND type = 'INCOME' AND status = 'COMPLETED'
                          AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                        GROUP BY DATE_FORMAT(date, '%Y-%m')
                    ) AS ultimos_3_meses
                ), 0) > 0 THEN
                    (((COALESCE((
                        SELECT AVG(receita_mes) FROM (
                            SELECT SUM(amount) as receita_mes
                            FROM Transaction
                            WHERE userId = u.id AND type = 'INCOME' AND status = 'COMPLETED'
                              AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                            GROUP BY DATE_FORMAT(date, '%Y-%m')
                        ) AS r
                    ), 0)) - 
                    (COALESCE((
                        SELECT AVG(despesa_mes) FROM (
                            SELECT SUM(amount) as despesa_mes
                            FROM Transaction
                            WHERE userId = u.id AND type = 'EXPENSE' AND status = 'COMPLETED'
                              AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                            GROUP BY DATE_FORMAT(date, '%Y-%m')
                        ) AS d
                    ), 0) +
                    COALESCE((
                        SELECT AVG(compras_mes) FROM (
                            SELECT SUM(amount) as compras_mes
                            FROM CreditCardPurchase
                            WHERE userId = u.id AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                            GROUP BY DATE_FORMAT(date, '%Y-%m')
                        ) AS c
                    ), 0))) / 
                    (COALESCE((
                        SELECT AVG(receita_mes) FROM (
                            SELECT SUM(amount) as receita_mes
                            FROM Transaction
                            WHERE userId = u.id AND type = 'INCOME' AND status = 'COMPLETED'
                              AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                            GROUP BY DATE_FORMAT(date, '%Y-%m')
                        ) AS r2
                    ), 0))) * 100 >= 20
                ELSE FALSE
            END) AND
            (COALESCE(card.current_card_debt, 0) < 
             COALESCE((
                SELECT AVG(receita_mes) FROM (
                    SELECT SUM(amount) as receita_mes
                    FROM Transaction
                    WHERE userId = u.id AND type = 'INCOME' AND status = 'COMPLETED'
                      AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                    GROUP BY DATE_FORMAT(date, '%Y-%m')
                ) AS r
            ), 0) * 0.3)
        ) THEN 'EXCELENTE'
        
        -- BOM: Reserva >= 6 meses OU (Reserva >= 3 meses + Taxa poupança >= 10%)
        WHEN (
            (CASE 
                WHEN (COALESCE((
                    SELECT AVG(despesa_mes) FROM (
                        SELECT SUM(amount) as despesa_mes
                        FROM Transaction
                        WHERE userId = u.id AND type = 'EXPENSE' AND status = 'COMPLETED'
                          AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                        GROUP BY DATE_FORMAT(date, '%Y-%m')
                    ) AS d
                ), 0) +
                COALESCE((
                    SELECT AVG(compras_mes) FROM (
                        SELECT SUM(amount) as compras_mes
                        FROM CreditCardPurchase
                        WHERE userId = u.id AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                        GROUP BY DATE_FORMAT(date, '%Y-%m')
                    ) AS c
                ), 0)) > 0 THEN
                        (COALESCE((SELECT SUM(currentBalance) FROM BankAccount WHERE userId = u.id), 0) +
                         COALESCE((
                             SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END)
                             FROM InvestmentTransaction it
                             JOIN Investment i ON it.investmentId = i.id
                             WHERE i.userId = u.id
                         ), 0) -
                         COALESCE(card.current_card_debt, 0)) /
                    (COALESCE((
                        SELECT AVG(despesa_mes) FROM (
                            SELECT SUM(amount) as despesa_mes
                            FROM Transaction
                            WHERE userId = u.id AND type = 'EXPENSE' AND status = 'COMPLETED'
                              AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                            GROUP BY DATE_FORMAT(date, '%Y-%m')
                        ) AS d2
                    ), 0) +
                    COALESCE((
                        SELECT AVG(compras_mes) FROM (
                            SELECT SUM(amount) as compras_mes
                            FROM CreditCardPurchase
                            WHERE userId = u.id AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                            GROUP BY DATE_FORMAT(date, '%Y-%m')
                        ) AS c2
                    ), 0))
                ELSE 999
            END >= 6) OR
            (
                (CASE 
                    WHEN (COALESCE((
                        SELECT AVG(despesa_mes) FROM (
                            SELECT SUM(amount) as despesa_mes
                            FROM Transaction
                            WHERE userId = u.id AND type = 'EXPENSE' AND status = 'COMPLETED'
                              AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                            GROUP BY DATE_FORMAT(date, '%Y-%m')
                        ) AS d
                    ), 0) +
                    COALESCE((
                        SELECT AVG(compras_mes) FROM (
                            SELECT SUM(amount) as compras_mes
                            FROM CreditCardPurchase
                            WHERE userId = u.id AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                            GROUP BY DATE_FORMAT(date, '%Y-%m')
                        ) AS c
                    ), 0)) > 0 THEN
                        (COALESCE((SELECT SUM(currentBalance) FROM BankAccount WHERE userId = u.id), 0) +
                         COALESCE((
                             SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END)
                             FROM InvestmentTransaction it
                             JOIN Investment i ON it.investmentId = i.id
                             WHERE i.userId = u.id
                         ), 0) -
                         COALESCE(card.current_card_debt, 0)) /
                        (COALESCE((
                            SELECT AVG(despesa_mes) FROM (
                                SELECT SUM(amount) as despesa_mes
                                FROM Transaction
                                WHERE userId = u.id AND type = 'EXPENSE' AND status = 'COMPLETED'
                                  AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                                GROUP BY DATE_FORMAT(date, '%Y-%m')
                            ) AS d2
                        ), 0) +
                        COALESCE((
                            SELECT AVG(compras_mes) FROM (
                                SELECT SUM(amount) as compras_mes
                                FROM CreditCardPurchase
                                WHERE userId = u.id AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                                GROUP BY DATE_FORMAT(date, '%Y-%m')
                            ) AS c2
                        ), 0))
                    ELSE 999
                END >= 3) AND
                (CASE 
                    WHEN COALESCE((
                        SELECT AVG(receita_mes) FROM (
                            SELECT SUM(amount) as receita_mes
                            FROM Transaction
                            WHERE userId = u.id AND type = 'INCOME' AND status = 'COMPLETED'
                              AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                            GROUP BY DATE_FORMAT(date, '%Y-%m')
                        ) AS ultimos_3_meses
                    ), 0) > 0 THEN
                        (((COALESCE((
                            SELECT AVG(receita_mes) FROM (
                                SELECT SUM(amount) as receita_mes
                                FROM Transaction
                                WHERE userId = u.id AND type = 'INCOME' AND status = 'COMPLETED'
                                  AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                                GROUP BY DATE_FORMAT(date, '%Y-%m')
                            ) AS r
                        ), 0)) - 
                        (COALESCE((
                            SELECT AVG(despesa_mes) FROM (
                                SELECT SUM(amount) as despesa_mes
                                FROM Transaction
                                WHERE userId = u.id AND type = 'EXPENSE' AND status = 'COMPLETED'
                                  AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                                GROUP BY DATE_FORMAT(date, '%Y-%m')
                            ) AS d
                        ), 0) +
                        COALESCE((
                            SELECT AVG(compras_mes) FROM (
                                SELECT SUM(amount) as compras_mes
                                FROM CreditCardPurchase
                                WHERE userId = u.id AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                                GROUP BY DATE_FORMAT(date, '%Y-%m')
                            ) AS c
                        ), 0))) / 
                        (COALESCE((
                            SELECT AVG(receita_mes) FROM (
                                SELECT SUM(amount) as receita_mes
                                FROM Transaction
                                WHERE userId = u.id AND type = 'INCOME' AND status = 'COMPLETED'
                                  AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                                GROUP BY DATE_FORMAT(date, '%Y-%m')
                            ) AS r2
                        ), 0))) * 100 >= 10
                    ELSE FALSE
                END)
            )
        ) THEN 'BOM'
        
        -- ATENÇÃO: Reserva < 3 meses OU dívida > 50% da receita OU utilização limite > 70%
        WHEN (
            (CASE 
                WHEN (COALESCE((
                    SELECT AVG(despesa_mes) FROM (
                        SELECT SUM(amount) as despesa_mes
                        FROM Transaction
                        WHERE userId = u.id AND type = 'EXPENSE' AND status = 'COMPLETED'
                          AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                        GROUP BY DATE_FORMAT(date, '%Y-%m')
                    ) AS d
                ), 0) +
                COALESCE((
                    SELECT AVG(compras_mes) FROM (
                        SELECT SUM(amount) as compras_mes
                        FROM CreditCardPurchase
                        WHERE userId = u.id AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                        GROUP BY DATE_FORMAT(date, '%Y-%m')
                    ) AS c
                ), 0)) > 0 THEN
                    (COALESCE((SELECT SUM(currentBalance) FROM BankAccount WHERE userId = u.id), 0) +
                             COALESCE((
                                 SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END)
                                 FROM InvestmentTransaction it
                                 JOIN Investment i ON it.investmentId = i.id
                                 WHERE i.userId = u.id
                             ), 0) -
                             COALESCE(card.current_card_debt, 0)) /
                    (COALESCE((
                        SELECT AVG(despesa_mes) FROM (
                            SELECT SUM(amount) as despesa_mes
                            FROM Transaction
                            WHERE userId = u.id AND type = 'EXPENSE' AND status = 'COMPLETED'
                              AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                            GROUP BY DATE_FORMAT(date, '%Y-%m')
                        ) AS d2
                    ), 0) +
                    COALESCE((
                        SELECT AVG(compras_mes) FROM (
                            SELECT SUM(amount) as compras_mes
                            FROM CreditCardPurchase
                            WHERE userId = u.id AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                            GROUP BY DATE_FORMAT(date, '%Y-%m')
                        ) AS c2
                    ), 0))
                ELSE 999
            END < 3) OR
            (COALESCE(card.current_card_debt, 0) > 
             COALESCE((
                SELECT AVG(receita_mes) FROM (
                    SELECT SUM(amount) as receita_mes
                    FROM Transaction
                    WHERE userId = u.id AND type = 'INCOME' AND status = 'COMPLETED'
                      AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                    GROUP BY DATE_FORMAT(date, '%Y-%m')
                ) AS r
            ), 0) * 0.5) OR
            (CASE 
                WHEN COALESCE(card.total_limit, 0) > 0 THEN
                    (COALESCE(card.current_card_debt, 0) /
                     COALESCE(card.total_limit, 0)) * 100 > 70
                ELSE FALSE
            END)
        ) THEN 'ATENÇÃO'
        
        -- CRÍTICO: Todos os outros casos
        ELSE 'CRÍTICO'
    END as status_saude_financeira,
    
    -- ========== DATAS ==========
    u.createdAt as data_cadastro,
    u.updatedAt as ultima_atualizacao

FROM User u
LEFT JOIN card_stats card ON card.userId = u.id
WHERE u.isActive = TRUE;


-- =============================================================================
-- 2. VIEW: GASTOS POR CATEGORIA - ANÁLISE DETALHADA
-- =============================================================================
CREATE OR REPLACE VIEW vw_Gastos_Por_Categoria AS
WITH tx AS (
    SELECT 
        userId,
        categoryId,
        SUM(amount) as total_sum,
        SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN amount END) as sum_1m,
        SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN amount END) as sum_3m,
        SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) THEN amount END) as sum_6m,
        SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) THEN amount END) as sum_12m,
        SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH) AND date < DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN amount END) as sum_prev_month,
        COUNT(*) as count_total,
        COUNT(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN 1 END) as count_3m
    FROM Transaction
    WHERE type = 'EXPENSE' AND status = 'COMPLETED'
    GROUP BY userId, categoryId
),
cc AS (
    SELECT 
        userId,
        categoryId,
        SUM(amount) as total_sum,
        SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN amount END) as sum_1m,
        SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN amount END) as sum_3m,
        SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) THEN amount END) as sum_6m,
        SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) THEN amount END) as sum_12m,
        SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH) AND date < DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN amount END) as sum_prev_month,
        COUNT(*) as count_total,
        COUNT(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN 1 END) as count_3m
    FROM CreditCardPurchase
    GROUP BY userId, categoryId
)
SELECT 
    u.id as userId,
    c.id as categoryId,
    c.name as categoria,
    c.icon as icone_categoria,
    
    -- ========== TOTAIS POR PERÍODO ==========
    COALESCE(tx.sum_1m, 0) + COALESCE(cc.sum_1m, 0) as total_ultimo_mes,
    COALESCE(tx.sum_3m, 0) + COALESCE(cc.sum_3m, 0) as total_ultimos_3_meses,
    COALESCE(tx.sum_6m, 0) + COALESCE(cc.sum_6m, 0) as total_ultimos_6_meses,
    COALESCE(tx.sum_12m, 0) + COALESCE(cc.sum_12m, 0) as total_ultimo_ano,
    
    -- ========== MÉDIAS ==========
    (COALESCE(tx.sum_3m, 0) + COALESCE(cc.sum_3m, 0)) / 3 as media_mensal_3_meses,
    (COALESCE(tx.sum_12m, 0) + COALESCE(cc.sum_12m, 0)) / 12 as media_mensal_12_meses,
    
    -- ========== FREQUÊNCIA E PADRÕES ==========
    COALESCE(tx.count_total, 0) + COALESCE(cc.count_total, 0) as quantidade_transacoes_total,
    COALESCE(tx.count_3m, 0) + COALESCE(cc.count_3m, 0) as transacoes_ultimos_3_meses,
    
    -- Ticket médio
    CASE 
        WHEN (COALESCE(tx.count_total, 0) + COALESCE(cc.count_total, 0)) > 0 THEN
            (COALESCE(tx.total_sum, 0) + COALESCE(cc.total_sum, 0)) /
            (COALESCE(tx.count_total, 0) + COALESCE(cc.count_total, 0))
        ELSE 0
    END as ticket_medio,
    
    -- ========== CLASSIFICAÇÃO DA CATEGORIA ==========
    CASE 
        -- Essenciais (50% do orçamento recomendado)
        WHEN c.name IN ('Aluguel', 'Financiamento Imóvel', 'Condomínio', 
                        'Alimentação', 'Supermercado', 'Mercado',
                        'Luz', 'Água', 'Gás', 'Internet', 'Telefone',
                        'Plano de Saúde', 'Medicamentos',
                        'Transporte', 'Combustível', 'Transporte Público') 
        THEN 'ESSENCIAL'
        
        -- Importantes mas não essenciais (30% do orçamento)p
        WHEN c.name IN ('Educação', 'Cursos', 'Livros',
                        'Seguros', 'Seguro Auto', 'Seguro Residencial',
                        'Academia', 'Esportes',
                        'Assinaturas', 'Streaming',
                        'Vestuário', 'Roupas') 
        THEN 'IMPORTANTE'
        
        -- Supérfluos/Lazer (20% do orçamento)
        WHEN c.name IN ('Lazer', 'Entretenimento', 'Cinema', 'Shows',
                        'Restaurantes', 'Delivery', 'Fast Food',
                        'Viagens', 'Turismo',
                        'Beleza', 'Estética', 'Salão',
                        'Eletrônicos', 'Games', 'Hobbies') 
        THEN 'SUPÉRFLUO'
        
        -- Investimentos e poupança
        WHEN c.name IN ('Investimentos', 'Aplicações', 'Poupança',
                        'Previdência Privada', 'FGTS') 
        THEN 'INVESTIMENTO'
        
        -- Dívidas
        WHEN c.name IN ('Empréstimo', 'Financiamento', 'Parcelamento',
                        'Juros', 'Multas', 'Taxas Bancárias') 
        THEN 'DÍVIDA'
        
        ELSE 'OUTROS'
    END as classificacao_categoria,
    
    -- ========== ANÁLISE DE VARIAÇÃO ==========
    CASE 
        WHEN (COALESCE(tx.sum_prev_month, 0) + COALESCE(cc.sum_prev_month, 0)) > 0 THEN
            (((COALESCE(tx.sum_1m, 0) + COALESCE(cc.sum_1m, 0)) -
              (COALESCE(tx.sum_prev_month, 0) + COALESCE(cc.sum_prev_month, 0))) /
             (COALESCE(tx.sum_prev_month, 0) + COALESCE(cc.sum_prev_month, 0))) * 100
        ELSE 0
    END as variacao_mes_anterior_percentual,
    
    -- ========== REGULARIDADE ==========
    CASE 
        WHEN (COALESCE(tx.count_3m, 0) + COALESCE(cc.count_3m, 0)) >= 15 THEN 'MUITO_FREQUENTE'
        WHEN (COALESCE(tx.count_3m, 0) + COALESCE(cc.count_3m, 0)) >= 6 THEN 'FREQUENTE'
        WHEN (COALESCE(tx.count_3m, 0) + COALESCE(cc.count_3m, 0)) >= 2 THEN 'OCASIONAL'
        ELSE 'RARO'
    END as frequencia_uso,
    
    -- ========== ALERTAS ==========
    CASE 
        WHEN (COALESCE(tx.sum_prev_month, 0) + COALESCE(cc.sum_prev_month, 0)) > 0 AND
             (((COALESCE(tx.sum_1m, 0) + COALESCE(cc.sum_1m, 0)) -
               (COALESCE(tx.sum_prev_month, 0) + COALESCE(cc.sum_prev_month, 0))) /
              (COALESCE(tx.sum_prev_month, 0) + COALESCE(cc.sum_prev_month, 0))) * 100 > 30 THEN
            'AUMENTO_SIGNIFICATIVO'
        ELSE 'NORMAL'
    END as alerta_variacao

FROM User u
CROSS JOIN Category c
LEFT JOIN tx ON tx.userId = u.id AND tx.categoryId = c.id
LEFT JOIN cc ON cc.userId = u.id AND cc.categoryId = c.id
WHERE c.type = 'EXPENSE' 
  AND u.isActive = TRUE
  AND (COALESCE(tx.sum_3m, 0) + COALESCE(cc.sum_3m, 0)) > 0
ORDER BY u.id, total_ultimos_3_meses DESC;


-- =============================================================================
-- 3. VIEW: ANÁLISE DE RECEITAS
-- =============================================================================
CREATE OR REPLACE VIEW vw_Analise_Receitas AS
SELECT 
    u.id as userId,
    c.id as categoryId,
    c.name as fonte_receita,
    
    -- ========== RECEITAS POR PERÍODO ==========
    COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN t.amount END), 0) 
    as receita_ultimo_mes,
    
    COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN t.amount END), 0) 
    as receita_ultimos_3_meses,
    
    COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) THEN t.amount END), 0) 
    as receita_ultimos_6_meses,
    
    COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) THEN t.amount END), 0) 
    as receita_ultimo_ano,
    
    COALESCE(SUM(t.amount), 0) as receita_total_historico,
    
    -- ========== MÉDIAS ==========
    COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN t.amount END), 0) / 3 
    as media_mensal_3_meses,
    
    COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) THEN t.amount END), 0) / 12 
    as media_mensal_12_meses,
    
    -- ========== ANÁLISE DE TRANSAÇÕES ==========
    COUNT(t.id) as quantidade_transacoes,
    
    COUNT(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN 1 END) 
    as transacoes_ultimos_3_meses,
    
    AVG(t.amount) as valor_medio_por_transacao,
    MIN(t.amount) as valor_minimo,
    MAX(t.amount) as valor_maximo,
    
    -- ========== CLASSIFICAÇÃO DO TIPO DE RENDA ==========
    CASE 
        -- Renda Ativa Principal (emprego, salário)
        WHEN c.name IN ('Salário', 'Salario', 'Trabalho', 'CLT', 'Emprego', '13º Salário', 'Férias') 
        THEN 'ATIVA_PRINCIPAL'
        
        -- Renda Passiva (investimentos, aluguéis)
        WHEN c.name IN ('Dividendos', 'Aluguel Recebido', 'Rendimentos', 'Juros', 
                        'Investimentos', 'Renda Fixa', 'Ações', 'FIIs',
                        'Royalties', 'Direitos Autorais') 
        THEN 'PASSIVA'
        
        -- Renda Extra Variável (freelance, vendas)
        WHEN c.name IN ('Freelance', 'Freela', 'Trabalho Extra', 'Bico',
                        'Vendas', 'Comissões', 'Bônus', 'Prêmios',
                        'MEI', 'Prestação de Serviço', 'Consultoria') 
        THEN 'EXTRA_VARIÁVEL'
        
        -- Empréstimos/Financiamentos Recebidos
        WHEN c.name IN ('Empréstimo Recebido', 'Financiamento', 'Crédito') 
        THEN 'CAPITAL_TERCEIROS'
        
        -- Reembolsos e Restituições
        WHEN c.name IN ('Reembolso', 'Restituição', 'Devolução', 'Cashback') 
        THEN 'REEMBOLSO'
        
        -- Outras fontes
        ELSE 'OUTRAS'
    END as tipo_renda,
    
    -- ========== REGULARIDADE ==========
    CASE 
        -- Muito regular: recebe quase todo mês
        WHEN COUNT(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN 1 END) >= 3 
        THEN 'MUITO_REGULAR'
        
        -- Regular: recebe frequentemente
        WHEN COUNT(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN 1 END) >= 2 
        THEN 'REGULAR'
        
        -- Ocasional: recebe às vezes
        WHEN COUNT(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN 1 END) >= 1 
        THEN 'OCASIONAL'
        
        -- Rara: recebeu há mais de 3 meses
        ELSE 'RARA'
    END as regularidade,
    
    -- ========== PERCENTUAL DA RENDA TOTAL ==========
    -- Quanto essa fonte representa do total de receitas do usuário
    CASE 
        WHEN (SELECT SUM(amount) 
              FROM Transaction 
              WHERE userId = u.id AND type = 'INCOME' AND status = 'COMPLETED'
                AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)) > 0 
        THEN
            (COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN t.amount END), 0) /
             (SELECT SUM(amount) 
              FROM Transaction 
              WHERE userId = u.id AND type = 'INCOME' AND status = 'COMPLETED'
                AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH))) * 100
        ELSE 0
    END as percentual_renda_total_3_meses,
    
    -- ========== CRESCIMENTO ==========
    -- Variação receita mês atual vs mês anterior
    CASE 
        WHEN COALESCE(SUM(CASE 
            WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH) 
             AND t.date < DATE_SUB(CURDATE(), INTERVAL 1 MONTH) 
            THEN t.amount END), 0) > 0 
        THEN
            ((COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN t.amount END), 0) -
              COALESCE(SUM(CASE 
                  WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH) 
                   AND t.date < DATE_SUB(CURDATE(), INTERVAL 1 MONTH) 
                  THEN t.amount END), 0)) /
             COALESCE(SUM(CASE 
                 WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH) 
                  AND t.date < DATE_SUB(CURDATE(), INTERVAL 1 MONTH) 
                 THEN t.amount END), 0)) * 100
        ELSE 0
    END as crescimento_mes_anterior_percentual,
    
    -- ========== DATA DA ÚLTIMA RECEITA ==========
    MAX(t.date) as data_ultima_receita,
    
    -- Dias desde a última receita
    CASE 
        WHEN MAX(t.date) IS NOT NULL THEN DATEDIFF(CURDATE(), MAX(t.date))
        ELSE NULL
    END as dias_desde_ultima_receita

FROM User u
CROSS JOIN Category c
LEFT JOIN Transaction t ON c.id = t.categoryId 
    AND t.type = 'INCOME' 
    AND t.status = 'COMPLETED' 
    AND t.userId = u.id
WHERE c.type = 'INCOME' 
  AND u.isActive = TRUE
GROUP BY u.id, c.id, c.name
HAVING receita_ultimos_3_meses > 0 OR receita_ultimo_ano > 0
ORDER BY u.id, receita_ultimos_3_meses DESC;


-- =============================================================================
-- 4. VIEW: PORTFOLIO DE INVESTIMENTOS
-- =============================================================================
CREATE OR REPLACE VIEW vw_Portfolio_Investimentos AS
SELECT 
    i.userId,
    i.id as investmentId,
    i.name as nome_investimento,
    i.type as tipo_investimento,
    i.ticker,
    i.cdiPercentage as percentual_cdi,
    i.institution as corretora_ou_banco,
    i.color,
    
    -- ========== POSIÇÃO ATUAL ==========
    COALESCE(SUM(CASE WHEN it.type = 'BUY' THEN it.quantity ELSE -it.quantity END), 0) 
    as quantidade_atual,
    
    COALESCE(SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END), 0) 
    as valor_investido_liquido,
    
    -- Preço médio de compra
    CASE 
        WHEN SUM(CASE WHEN it.type = 'BUY' THEN it.quantity END) > 0 THEN
            SUM(CASE WHEN it.type = 'BUY' THEN it.amount END) / 
            SUM(CASE WHEN it.type = 'BUY' THEN it.quantity END)
        ELSE 0
    END as preco_medio_compra,
    
    -- ========== MOVIMENTAÇÕES ==========
    COUNT(it.id) as total_transacoes,
    
    COUNT(CASE WHEN it.type = 'BUY' THEN 1 END) as total_compras,
    COUNT(CASE WHEN it.type = 'SELL' THEN 1 END) as total_vendas,
    
    -- Últimos 3 meses
    COUNT(CASE WHEN it.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN 1 END) 
    as movimentacoes_3_meses,
    
    COALESCE(SUM(CASE 
        WHEN it.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) AND it.type = 'BUY' 
        THEN it.amount 
    END), 0) as aportes_3_meses,
    
    -- Últimos 12 meses
    COUNT(CASE WHEN it.date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) THEN 1 END) 
    as movimentacoes_12_meses,
    
    COALESCE(SUM(CASE 
        WHEN it.date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) AND it.type = 'BUY' 
        THEN it.amount 
    END), 0) as aportes_12_meses,
    
    -- ========== DATAS ==========
    MIN(it.date) as data_primeira_movimentacao,
    MAX(it.date) as data_ultima_movimentacao,
    
    DATEDIFF(CURDATE(), MAX(it.date)) as dias_desde_ultima_movimentacao,
    DATEDIFF(CURDATE(), MIN(it.date)) as dias_investimento_ativo,
    
    -- ========== CLASSIFICAÇÃO POR RISCO ==========
    CASE 
        -- Renda Fixa (Baixo Risco)
        WHEN i.type = 'CDB' THEN 'BAIXO'
        WHEN i.type = 'TREASURY' THEN 'BAIXO'
        
        -- Fundos Imobiliários (Médio Risco)
        WHEN i.type = 'STOCKS' AND (i.ticker LIKE '%11' OR i.name LIKE '%FII%') THEN 'MEDIO'
        WHEN i.type = 'REAL_ESTATE' THEN 'MEDIO'
        
        -- Fundos de Investimento (Médio a Alto)
        WHEN i.type = 'FUNDS' THEN 'MEDIO_ALTO'
        
        -- Ações (Alto Risco)
        WHEN i.type = 'STOCKS' THEN 'ALTO'
        
        -- Criptomoedas (Muito Alto Risco)
        WHEN i.type = 'CRYPTO' THEN 'MUITO_ALTO'
        
        ELSE 'INDEFINIDO'
    END as nivel_risco,
    
    -- ========== CLASSIFICAÇÃO POR LIQUIDEZ ==========
    CASE 
        WHEN i.type IN ('CDB', 'TREASURY') THEN 'ALTA'
        WHEN i.type IN ('STOCKS', 'REAL_ESTATE', 'CRYPTO') THEN 'ALTA'
        WHEN i.type = 'FUNDS' THEN 'MEDIA'
        ELSE 'MEDIA'
    END as liquidez,
    
    -- ========== FREQUÊNCIA DE APORTES ==========
    CASE 
        WHEN COUNT(CASE WHEN it.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) AND it.type = 'BUY' THEN 1 END) >= 3 
        THEN 'MENSAL'
        
        WHEN COUNT(CASE WHEN it.date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) AND it.type = 'BUY' THEN 1 END) >= 3 
        THEN 'BIMESTRAL'
        
        WHEN COUNT(CASE WHEN it.date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) AND it.type = 'BUY' THEN 1 END) >= 3 
        THEN 'TRIMESTRAL'
        
        WHEN COUNT(CASE WHEN it.type = 'BUY' THEN 1 END) >= 2 
        THEN 'OCASIONAL'
        
        ELSE 'ÚNICA_VEZ'
    END as frequencia_aportes,
    
    -- ========== PERCENTUAL DO PORTFOLIO TOTAL ==========
    -- Será calculado via JOIN com total de investimentos do usuário
    CASE 
        WHEN (SELECT SUM(CASE WHEN it2.type = 'BUY' THEN it2.amount ELSE -it2.amount END)
              FROM InvestmentTransaction it2
              JOIN Investment i2 ON it2.investmentId = i2.id
              WHERE i2.userId = i.userId) > 0 
        THEN
            (COALESCE(SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END), 0) /
             (SELECT SUM(CASE WHEN it2.type = 'BUY' THEN it2.amount ELSE -it2.amount END)
              FROM InvestmentTransaction it2
              JOIN Investment i2 ON it2.investmentId = i2.id
              WHERE i2.userId = i.userId)) * 100
        ELSE 0
    END as percentual_portfolio,
    
    -- ========== ALOCAÇÃO RECOMENDADA ==========
    -- Sugestão baseada em alocação prudente
    CASE 
        WHEN i.type IN ('CDB', 'TREASURY') THEN '40-60%' -- Renda Fixa
        WHEN i.type = 'STOCKS' AND (i.ticker LIKE '%11' OR i.name LIKE '%FII%') THEN '10-20%' -- FIIs
        WHEN i.type = 'STOCKS' THEN '20-40%' -- Ações
        WHEN i.type = 'CRYPTO' THEN '2-5%' -- Cripto (muito volátil)
        ELSE '5-15%'
    END as alocacao_recomendada,
    
    i.notes as observacoes

FROM Investment i
LEFT JOIN InvestmentTransaction it ON i.id = it.investmentId
WHERE EXISTS (SELECT 1 FROM User u WHERE u.id = i.userId AND u.isActive = TRUE)
GROUP BY i.id, i.userId, i.name, i.type, i.ticker, i.cdiPercentage, i.institution, i.color, i.notes
HAVING quantidade_atual > 0 OR valor_investido_liquido > 0
ORDER BY i.userId, valor_investido_liquido DESC;


-- =============================================================================
-- 5. VIEW: ANÁLISE DE CARTÕES DE CRÉDITO
-- =============================================================================
CREATE OR REPLACE VIEW vw_Analise_Cartoes_Credito AS
SELECT 
    cc.userId,
    cc.id as creditCardId,
    cc.name as nome_cartao,
    cc.cardLimit as limite_total,
    cc.initialDebt as divida_atual,
    cc.dueDay as dia_vencimento,
    cc.color,
    
    -- ========== UTILIZAÇÃO DO LIMITE ==========
    (cc.initialDebt / NULLIF(cc.cardLimit, 0)) * 100 as percentual_utilizado,
    
    cc.cardLimit - cc.initialDebt as limite_disponivel,
    
    CASE 
        WHEN (cc.initialDebt / NULLIF(cc.cardLimit, 0)) * 100 > 80 THEN 'CRÍTICO'
        WHEN (cc.initialDebt / NULLIF(cc.cardLimit, 0)) * 100 > 50 THEN 'ALTO'
        WHEN (cc.initialDebt / NULLIF(cc.cardLimit, 0)) * 100 > 30 THEN 'MODERADO'
        ELSE 'SAUDÁVEL'
    END as status_utilizacao,
    
    -- ========== COMPRAS NO CARTÃO ==========
    -- Último mês
    COALESCE((
        SELECT SUM(amount)
        FROM CreditCardPurchase
        WHERE creditCardId = cc.id
          AND date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
    ), 0) as compras_ultimo_mes,
    
    COALESCE((
        SELECT COUNT(*)
        FROM CreditCardPurchase
        WHERE creditCardId = cc.id
          AND date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
    ), 0) as quantidade_compras_ultimo_mes,
    
    -- Últimos 3 meses
    COALESCE((
        SELECT SUM(amount)
        FROM CreditCardPurchase
        WHERE creditCardId = cc.id
          AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
    ), 0) as compras_ultimos_3_meses,
    
    COALESCE((
        SELECT AVG(amount)
        FROM CreditCardPurchase
        WHERE creditCardId = cc.id
          AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
    ), 0) as ticket_medio_compras,
    
    -- Total histórico
    COALESCE((
        SELECT SUM(amount)
        FROM CreditCardPurchase
        WHERE creditCardId = cc.id
    ), 0) as total_compras_historico,
    
    -- ========== PAGAMENTOS ==========
    -- Total pago nos últimos 3 meses
    COALESCE((
        SELECT SUM(amount)
        FROM CreditCardPayment
        WHERE creditCardId = cc.id
          AND status = 'PAID'
          AND paymentDate >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
    ), 0) as total_pago_3_meses,
    
    -- Pagamentos pendentes
    COALESCE((
        SELECT COUNT(*)
        FROM CreditCardPayment
        WHERE creditCardId = cc.id
          AND status = 'PENDING'
    ), 0) as faturas_pendentes,
    
    COALESCE((
        SELECT SUM(amount)
        FROM CreditCardPayment
        WHERE creditCardId = cc.id
          AND status = 'PENDING'
    ), 0) as valor_faturas_pendentes,
    
    -- Próximo vencimento
    COALESCE((
        SELECT MIN(dueDate)
        FROM CreditCardPayment
        WHERE creditCardId = cc.id
          AND status = 'PENDING'
          AND dueDate >= CURDATE()
    ), NULL) as proxima_fatura_vencimento,
    
    COALESCE((
        SELECT amount
        FROM CreditCardPayment
        WHERE creditCardId = cc.id
          AND status = 'PENDING'
          AND dueDate >= CURDATE()
        ORDER BY dueDate ASC
        LIMIT 1
    ), 0) as proxima_fatura_valor,
    
    -- ========== CATEGORIA MAIS GASTA ==========
    COALESCE((
        SELECT c.name
        FROM CreditCardPurchase cp
        JOIN Category c ON cp.categoryId = c.id
        WHERE cp.creditCardId = cc.id
          AND cp.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
        GROUP BY c.id, c.name
        ORDER BY SUM(cp.amount) DESC
        LIMIT 1
    ), 'Sem compras') as categoria_mais_gasta,
    
    COALESCE((
        SELECT SUM(cp.amount)
        FROM CreditCardPurchase cp
        JOIN Category c ON cp.categoryId = c.id
        WHERE cp.creditCardId = cc.id
          AND cp.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
        GROUP BY c.id
        ORDER BY SUM(cp.amount) DESC
        LIMIT 1
    ), 0) as valor_categoria_mais_gasta,
    
    -- ========== ANÁLISE DE COMPORTAMENTO ==========
    -- Média mensal de uso (últimos 3 meses)
    COALESCE((
        SELECT AVG(total_mes)
        FROM (
            SELECT SUM(amount) as total_mes
            FROM CreditCardPurchase
            WHERE creditCardId = cc.id
              AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
            GROUP BY DATE_FORMAT(date, '%Y-%m')
        ) as compras_mensais
    ), 0) as media_mensal_gasto_3_meses,
    
    -- Tendência (crescimento/decrescimento)
    CASE 
        WHEN COALESCE((
            SELECT SUM(amount)
            FROM CreditCardPurchase
            WHERE creditCardId = cc.id
              AND date >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
              AND date < DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
        ), 0) > 0 THEN
            ((COALESCE((
                SELECT SUM(amount)
                FROM CreditCardPurchase
                WHERE creditCardId = cc.id
                  AND date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
            ), 0) -
            COALESCE((
                SELECT SUM(amount)
                FROM CreditCardPurchase
                WHERE creditCardId = cc.id
                  AND date >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
                  AND date < DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
            ), 0)) /
            COALESCE((
                SELECT SUM(amount)
                FROM CreditCardPurchase
                WHERE creditCardId = cc.id
                  AND date >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
                  AND date < DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
            ), 1)) * 100
        ELSE 0
    END as variacao_gasto_mes_anterior_percentual,
    
    -- ========== ALERTA DE PAGAMENTO ==========
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM CreditCardPayment
            WHERE creditCardId = cc.id
              AND status = 'PENDING'
              AND dueDate < CURDATE()
        ) THEN 'FATURA_VENCIDA'
        
        WHEN EXISTS (
            SELECT 1 FROM CreditCardPayment
            WHERE creditCardId = cc.id
              AND status = 'PENDING'
              AND dueDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
        ) THEN 'VENCE_EM_3_DIAS'
        
        WHEN EXISTS (
            SELECT 1 FROM CreditCardPayment
            WHERE creditCardId = cc.id
              AND status = 'PENDING'
              AND dueDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        ) THEN 'VENCE_EM_7_DIAS'
        
        ELSE 'OK'
    END as alerta_pagamento,
    
    -- ========== SCORE DE SAÚDE DO CARTÃO ==========
    -- 0-100, baseado em: utilização, pagamentos em dia, crescimento controlado
    (
        -- 50 pontos: Utilização do limite (quanto menor, melhor)
        CASE 
            WHEN (cc.initialDebt / NULLIF(cc.cardLimit, 0)) * 100 <= 30 THEN 50
            WHEN (cc.initialDebt / NULLIF(cc.cardLimit, 0)) * 100 <= 50 THEN 35
            WHEN (cc.initialDebt / NULLIF(cc.cardLimit, 0)) * 100 <= 80 THEN 20
            ELSE 0
        END +
        
        -- 30 pontos: Pagamentos em dia
        CASE 
            WHEN NOT EXISTS (
                SELECT 1 FROM CreditCardPayment
                WHERE creditCardId = cc.id AND status = 'PENDING' AND dueDate < CURDATE()
            ) THEN 30
            ELSE 0
        END +
        
        -- 20 pontos: Controle de gastos (crescimento moderado)
        CASE 
            WHEN (CASE 
                WHEN COALESCE((
                    SELECT SUM(amount)
                    FROM CreditCardPurchase
                    WHERE creditCardId = cc.id
                      AND date >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
                      AND date < DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
                ), 0) > 0 THEN
                    ((COALESCE((
                        SELECT SUM(amount)
                        FROM CreditCardPurchase
                        WHERE creditCardId = cc.id
                          AND date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
                    ), 0) -
                    COALESCE((
                        SELECT SUM(amount)
                        FROM CreditCardPurchase
                        WHERE creditCardId = cc.id
                          AND date >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
                          AND date < DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
                    ), 0)) /
                    COALESCE((
                        SELECT SUM(amount)
                        FROM CreditCardPurchase
                        WHERE creditCardId = cc.id
                          AND date >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
                          AND date < DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
                    ), 1)) * 100
                ELSE 0
            END) BETWEEN -10 AND 10 THEN 20
            WHEN (CASE 
                WHEN COALESCE((
                    SELECT SUM(amount)
                    FROM CreditCardPurchase
                    WHERE creditCardId = cc.id
                      AND date >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
                      AND date < DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
                ), 0) > 0 THEN
                    ((COALESCE((
                        SELECT SUM(amount)
                        FROM CreditCardPurchase
                        WHERE creditCardId = cc.id
                          AND date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
                    ), 0) -
                    COALESCE((
                        SELECT SUM(amount)
                        FROM CreditCardPurchase
                        WHERE creditCardId = cc.id
                          AND date >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
                          AND date < DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
                    ), 0)) /
                    COALESCE((
                        SELECT SUM(amount)
                        FROM CreditCardPurchase
                        WHERE creditCardId = cc.id
                          AND date >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
                          AND date < DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
                    ), 1)) * 100
                ELSE 0
            END) <= 30 THEN 10
            ELSE 0
        END
    ) as score_saude_cartao,
    
    cc.createdAt as data_cadastro_cartao,
    cc.updatedAt as ultima_atualizacao

FROM CreditCard cc
WHERE EXISTS (SELECT 1 FROM User u WHERE u.id = cc.userId AND u.isActive = TRUE)
ORDER BY cc.userId, cc.name;


-- =============================================================================
-- 6. VIEW: EVOLUÇÃO PATRIMONIAL MENSAL
-- =============================================================================
CREATE OR REPLACE VIEW vw_Evolucao_Patrimonial AS
SELECT 
    base.userId,
    base.mes_ano,
    base.ano,
    base.mes,
    
    -- ========== RECEITAS E DESPESAS (Transações Bancárias) ==========
    base.receita_mes,
    base.despesa_mes,
    base.saldo_liquido_mes,
    
    -- ========== COMPRAS NO CARTÃO ==========
    -- Trazido via JOIN, sem erro de agrupamento
    COALESCE(cartao.total_fatura, 0) as compras_cartao_mes,
    
    -- ========== SALDO LÍQUIDO REAL ==========
    -- (Saldo Bancário - Gastos Cartão)
    (base.saldo_liquido_mes - COALESCE(cartao.total_fatura, 0)) as saldo_liquido_real_mes,
    
    -- ========== INVESTIMENTOS ==========
    COALESCE(invest.total_movimentado, 0) as movimentacao_investimentos_mes,
    
    -- ========== ANÁLISE MENSAL (Cálculos baseados nas colunas acima) ==========
    
    -- Taxa de poupança: (Saldo Real / Receita) * 100
    CASE 
        WHEN base.receita_mes > 0 THEN 
            ((base.saldo_liquido_mes - COALESCE(cartao.total_fatura, 0)) / base.receita_mes) * 100
        ELSE 0
    END as taxa_poupanca_mes_percentual,
    
    -- Desempenho do mês
    CASE 
        WHEN (base.saldo_liquido_mes - COALESCE(cartao.total_fatura, 0)) > 0 THEN 'POSITIVO'
        WHEN (base.saldo_liquido_mes - COALESCE(cartao.total_fatura, 0)) = 0 THEN 'NEUTRO'
        ELSE 'NEGATIVO'
    END as desempenho_mes,
    
    -- Classificação do resultado
    CASE 
        WHEN (base.saldo_liquido_mes - COALESCE(cartao.total_fatura, 0)) >= (base.receita_mes * 0.3) THEN 'EXCELENTE_POUPANCA'
        WHEN (base.saldo_liquido_mes - COALESCE(cartao.total_fatura, 0)) >= (base.receita_mes * 0.2) THEN 'BOA_POUPANCA'
        WHEN (base.saldo_liquido_mes - COALESCE(cartao.total_fatura, 0)) >= (base.receita_mes * 0.1) THEN 'POUPANCA_MODERADA'
        WHEN (base.saldo_liquido_mes - COALESCE(cartao.total_fatura, 0)) > 0 THEN 'POUPANCA_BAIXA'
        ELSE 'DEFICIT'
    END as classificacao_resultado,
    
    -- ========== ESTATÍSTICAS ==========
    base.quantidade_transacoes,
    base.quantidade_receitas,
    base.quantidade_despesas,
    base.ticket_medio_transacoes

FROM 
    -- 1. TABELA BASE: Agrupa as transações por Mês/Ano
    (SELECT 
        t.userId,
        DATE_FORMAT(t.date, '%Y-%m') as mes_ano,
        YEAR(t.date) as ano,
        MONTH(t.date) as mes,
        SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END) as receita_mes,
        SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) as despesa_mes,
        SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE -t.amount END) as saldo_liquido_mes,
        COUNT(t.id) as quantidade_transacoes,
        COUNT(CASE WHEN t.type = 'INCOME' THEN t.id END) as quantidade_receitas,
        COUNT(CASE WHEN t.type = 'EXPENSE' THEN t.id END) as quantidade_despesas,
        AVG(t.amount) as ticket_medio_transacoes
    FROM Transaction t
    WHERE t.status = 'COMPLETED'
    GROUP BY t.userId, DATE_FORMAT(t.date, '%Y-%m'), YEAR(t.date), MONTH(t.date)) as base

-- 2. JOIN CARTÃO: Agrupa compras de cartão separadamente e une pelo Mês/Ano
LEFT JOIN 
    (SELECT 
        userId,
        DATE_FORMAT(date, '%Y-%m') as mes_ano,
        SUM(amount) as total_fatura
    FROM CreditCardPurchase
    GROUP BY userId, DATE_FORMAT(date, '%Y-%m')) as cartao 
    ON base.userId = cartao.userId AND base.mes_ano = cartao.mes_ano

-- 3. JOIN INVESTIMENTOS: Agrupa investimentos separadamente e une pelo Mês/Ano
LEFT JOIN 
    (SELECT 
        i.userId,
        DATE_FORMAT(it.date, '%Y-%m') as mes_ano,
        SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END) as total_movimentado
    FROM InvestmentTransaction it
    JOIN Investment i ON it.investmentId = i.id
    GROUP BY i.userId, DATE_FORMAT(it.date, '%Y-%m')) as invest 
    ON base.userId = invest.userId AND base.mes_ano = invest.mes_ano

ORDER BY base.userId, base.ano DESC, base.mes DESC;

-- =============================================================================
-- 7. VIEW: ANÁLISE DE METAS
-- =============================================================================
CREATE OR REPLACE VIEW vw_Analise_Metas AS
SELECT 
    g.userId,
    g.id as goalId,
    g.name as nome_meta,
    g.targetAmount as valor_objetivo,
    
    -- ========== VALOR ATUAL CALCULADO ==========
    -- Se includeInvestments = true: soma saldo das contas + valor dos investimentos
    -- Se accountId está definido: usa o saldo da conta vinculada
    -- Caso contrário: soma saldo de TODAS as contas do usuário
    CASE 
        WHEN g.includeInvestments = TRUE THEN
            -- Soma saldo de TODAS as contas do usuário + valor dos investimentos
            COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0) +
            COALESCE((
                SELECT SUM(
                    CASE 
                        WHEN it.type = 'BUY' THEN it.amount
                        WHEN it.type = 'SELL' THEN -it.amount
                        ELSE 0
                    END
                )
                FROM InvestmentTransaction it
                JOIN Investment i ON it.investmentId = i.id
                WHERE i.userId = g.userId
            ), 0)
        WHEN g.accountId IS NOT NULL THEN
            -- Usa o saldo da conta vinculada
            COALESCE((SELECT ba.currentBalance FROM BankAccount ba WHERE ba.id = g.accountId), 0)
        ELSE 
            -- Soma saldo de TODAS as contas do usuário
            COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0)
    END as valor_atual,
    
    g.targetDate as data_objetivo,
    g.includeInvestments as incluir_investimentos,
    
    -- ========== PROGRESSO ==========
    -- Progresso calculado com base no valor_atual dinâmico
    (CASE 
        WHEN g.includeInvestments = TRUE THEN
            COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0) +
            COALESCE((
                SELECT SUM(
                    CASE 
                        WHEN it.type = 'BUY' THEN it.amount
                        WHEN it.type = 'SELL' THEN -it.amount
                        ELSE 0
                    END
                )
                FROM InvestmentTransaction it
                JOIN Investment i ON it.investmentId = i.id
                WHERE i.userId = g.userId
            ), 0)
        WHEN g.accountId IS NOT NULL THEN
            COALESCE((SELECT ba.currentBalance FROM BankAccount ba WHERE ba.id = g.accountId), 0)
        ELSE 
            COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0)
    END / NULLIF(g.targetAmount, 0)) * 100 as progresso_percentual,
    
    g.targetAmount - (CASE 
        WHEN g.includeInvestments = TRUE THEN
            COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0) +
            COALESCE((
                SELECT SUM(
                    CASE 
                        WHEN it.type = 'BUY' THEN it.amount
                        WHEN it.type = 'SELL' THEN -it.amount
                        ELSE 0
                    END
                )
                FROM InvestmentTransaction it
                JOIN Investment i ON it.investmentId = i.id
                WHERE i.userId = g.userId
            ), 0)
        WHEN g.accountId IS NOT NULL THEN
            COALESCE((SELECT ba.currentBalance FROM BankAccount ba WHERE ba.id = g.accountId), 0)
        ELSE 
            COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0)
    END) as valor_restante,
    
    -- ========== ANÁLISE TEMPORAL ==========
    DATEDIFF(g.targetDate, CURDATE()) as dias_restantes,
    
    CASE 
        WHEN DATEDIFF(g.targetDate, CURDATE()) < 0 THEN 'VENCIDA'
        WHEN DATEDIFF(g.targetDate, CURDATE()) <= 30 THEN 'URGENTE'
        WHEN DATEDIFF(g.targetDate, CURDATE()) <= 90 THEN 'PRÓXIMA'
        WHEN DATEDIFF(g.targetDate, CURDATE()) <= 365 THEN 'MÉDIO_PRAZO'
        ELSE 'LONGO_PRAZO'
    END as status_prazo,
    
    -- ========== ANÁLISE DE VIABILIDADE ==========
    -- Quanto precisa poupar por mês para atingir a meta (usando valor_atual calculado)
    CASE 
        WHEN DATEDIFF(g.targetDate, CURDATE()) > 0 THEN
            (g.targetAmount - (CASE 
                WHEN g.includeInvestments = TRUE THEN
                    COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0) +
                    COALESCE((
                        SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount WHEN it.type = 'SELL' THEN -it.amount ELSE 0 END)
                        FROM InvestmentTransaction it
                        JOIN Investment i ON it.investmentId = i.id
                        WHERE i.userId = g.userId
                    ), 0)
                WHEN g.accountId IS NOT NULL THEN
                    COALESCE((SELECT ba.currentBalance FROM BankAccount ba WHERE ba.id = g.accountId), 0)
                ELSE COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0)
            END)) / (DATEDIFF(g.targetDate, CURDATE()) / 30)
        ELSE 0
    END as valor_necessario_por_mes,
    
    -- Comparar com capacidade de poupança do usuário
    -- NOTA: Usa receita total - despesas + aportes em investimentos = capacidade real de poupar
    CASE 
        WHEN (SELECT AVG(poupanca_mes)
              FROM (
                  -- Capacidade de poupança = Receitas - Despesas (transações) + Aportes em Investimentos
                  SELECT 
                      COALESCE((
                          SELECT SUM(t.amount)
                          FROM Transaction t
                          WHERE t.userId = g.userId
                            AND t.status = 'COMPLETED'
                            AND t.type = 'INCOME'
                            AND DATE_FORMAT(t.date, '%Y-%m') = mes_ref.mes_ano
                      ), 0) 
                      - COALESCE((
                          SELECT SUM(t.amount)
                          FROM Transaction t
                          WHERE t.userId = g.userId
                            AND t.status = 'COMPLETED'
                            AND t.type = 'EXPENSE'
                            AND DATE_FORMAT(t.date, '%Y-%m') = mes_ref.mes_ano
                      ), 0)
                      - COALESCE((
                          SELECT SUM(cp.amount)
                          FROM CreditCardPurchase cp
                          WHERE cp.userId = g.userId
                            AND DATE_FORMAT(cp.date, '%Y-%m') = mes_ref.mes_ano
                      ), 0)
                      + COALESCE((
                          SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE 0 END)
                          FROM InvestmentTransaction it
                          JOIN Investment i ON it.investmentId = i.id
                          WHERE i.userId = g.userId
                            AND DATE_FORMAT(it.date, '%Y-%m') = mes_ref.mes_ano
                      ), 0) as poupanca_mes
                  FROM (
                      SELECT DISTINCT DATE_FORMAT(t.date, '%Y-%m') as mes_ano
                      FROM Transaction t
                      WHERE t.userId = g.userId
                        AND t.status = 'COMPLETED'
                        AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                  ) as mes_ref
              ) as ultimos_meses) > 0 
             AND DATEDIFF(g.targetDate, CURDATE()) > 0 
        THEN
            -- Percentual da poupança atual que precisa destinar
            (((g.targetAmount - (CASE 
                WHEN g.includeInvestments = TRUE THEN
                    COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0) +
                    COALESCE((
                        SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount WHEN it.type = 'SELL' THEN -it.amount ELSE 0 END)
                        FROM InvestmentTransaction it
                        JOIN Investment i ON it.investmentId = i.id
                        WHERE i.userId = g.userId
                    ), 0)
                WHEN g.accountId IS NOT NULL THEN
                    COALESCE((SELECT ba.currentBalance FROM BankAccount ba WHERE ba.id = g.accountId), 0)
                ELSE COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0)
            END)) / (DATEDIFF(g.targetDate, CURDATE()) / 30)) /
             (SELECT AVG(poupanca_mes)
              FROM (
                  SELECT 
                      COALESCE((
                          SELECT SUM(t.amount)
                          FROM Transaction t
                          WHERE t.userId = g.userId
                            AND t.status = 'COMPLETED'
                            AND t.type = 'INCOME'
                            AND DATE_FORMAT(t.date, '%Y-%m') = mes_ref.mes_ano
                      ), 0) 
                      - COALESCE((
                          SELECT SUM(t.amount)
                          FROM Transaction t
                          WHERE t.userId = g.userId
                            AND t.status = 'COMPLETED'
                            AND t.type = 'EXPENSE'
                            AND DATE_FORMAT(t.date, '%Y-%m') = mes_ref.mes_ano
                      ), 0)
                      - COALESCE((
                          SELECT SUM(cp.amount)
                          FROM CreditCardPurchase cp
                          WHERE cp.userId = g.userId
                            AND DATE_FORMAT(cp.date, '%Y-%m') = mes_ref.mes_ano
                      ), 0)
                      + COALESCE((
                          SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE 0 END)
                          FROM InvestmentTransaction it
                          JOIN Investment i ON it.investmentId = i.id
                          WHERE i.userId = g.userId
                            AND DATE_FORMAT(it.date, '%Y-%m') = mes_ref.mes_ano
                      ), 0) as poupanca_mes
                  FROM (
                      SELECT DISTINCT DATE_FORMAT(t.date, '%Y-%m') as mes_ano
                      FROM Transaction t
                      WHERE t.userId = g.userId
                        AND t.status = 'COMPLETED'
                        AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                  ) as mes_ref
              ) as ultimos_meses)) * 100
        ELSE 0
    END as percentual_poupanca_necessario,
    
    -- ========== CLASSIFICAÇÃO DE VIABILIDADE ==========
    CASE 
        -- Meta já alcançada (usando valor_atual calculado)
        WHEN (CASE 
                WHEN g.includeInvestments = TRUE THEN
                    COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0) +
                    COALESCE((
                        SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount WHEN it.type = 'SELL' THEN -it.amount ELSE 0 END)
                        FROM InvestmentTransaction it
                        JOIN Investment i ON it.investmentId = i.id
                        WHERE i.userId = g.userId
                    ), 0)
                WHEN g.accountId IS NOT NULL THEN
                    COALESCE((SELECT ba.currentBalance FROM BankAccount ba WHERE ba.id = g.accountId), 0)
                ELSE COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0)
            END) >= g.targetAmount THEN 'ALCANÇADA'
        
        -- Meta vencida e não alcançada
        WHEN DATEDIFF(g.targetDate, CURDATE()) < 0 AND (CASE 
                WHEN g.includeInvestments = TRUE THEN
                    COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0) +
                    COALESCE((
                        SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount WHEN it.type = 'SELL' THEN -it.amount ELSE 0 END)
                        FROM InvestmentTransaction it
                        JOIN Investment i ON it.investmentId = i.id
                        WHERE i.userId = g.userId
                    ), 0)
                WHEN g.accountId IS NOT NULL THEN
                    COALESCE((SELECT ba.currentBalance FROM BankAccount ba WHERE ba.id = g.accountId), 0)
                ELSE COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0)
            END) < g.targetAmount THEN 'NÃO_ALCANÇADA'
        
        -- Viabilidade baseada na poupança atual (RECEITA - DESPESA - CARTÃO + APORTES)
        WHEN (SELECT AVG(poupanca_mes)
              FROM (
                  SELECT 
                      COALESCE((SELECT SUM(t2.amount) FROM Transaction t2 WHERE t2.userId = g.userId AND t2.status = 'COMPLETED' AND t2.type = 'INCOME' AND DATE_FORMAT(t2.date, '%Y-%m') = mes_ref.mes_ano), 0) 
                      - COALESCE((SELECT SUM(t2.amount) FROM Transaction t2 WHERE t2.userId = g.userId AND t2.status = 'COMPLETED' AND t2.type = 'EXPENSE' AND DATE_FORMAT(t2.date, '%Y-%m') = mes_ref.mes_ano), 0)
                      - COALESCE((SELECT SUM(cp.amount) FROM CreditCardPurchase cp WHERE cp.userId = g.userId AND DATE_FORMAT(cp.date, '%Y-%m') = mes_ref.mes_ano), 0)
                      + COALESCE((SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE 0 END) FROM InvestmentTransaction it JOIN Investment i ON it.investmentId = i.id WHERE i.userId = g.userId AND DATE_FORMAT(it.date, '%Y-%m') = mes_ref.mes_ano), 0) as poupanca_mes
                  FROM (SELECT DISTINCT DATE_FORMAT(t.date, '%Y-%m') as mes_ano FROM Transaction t WHERE t.userId = g.userId AND t.status = 'COMPLETED' AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)) as mes_ref
              ) as ultimos_meses) > 0 
             AND DATEDIFF(g.targetDate, CURDATE()) > 0 
        THEN
            CASE 
                -- Viável: precisa de menos de 50% da poupança atual
                WHEN (((g.targetAmount - (CASE 
                        WHEN g.includeInvestments = TRUE THEN
                            COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0) +
                            COALESCE((
                                SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount WHEN it.type = 'SELL' THEN -it.amount ELSE 0 END)
                                FROM InvestmentTransaction it
                                JOIN Investment i ON it.investmentId = i.id
                                WHERE i.userId = g.userId
                            ), 0)
                        WHEN g.accountId IS NOT NULL THEN
                            COALESCE((SELECT ba.currentBalance FROM BankAccount ba WHERE ba.id = g.accountId), 0)
                        ELSE COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0)
                    END)) / (DATEDIFF(g.targetDate, CURDATE()) / 30)) /
                     (SELECT AVG(poupanca_mes)
                      FROM (
                          SELECT 
                              COALESCE((SELECT SUM(t2.amount) FROM Transaction t2 WHERE t2.userId = g.userId AND t2.status = 'COMPLETED' AND t2.type = 'INCOME' AND DATE_FORMAT(t2.date, '%Y-%m') = mes_ref.mes_ano), 0) 
                              - COALESCE((SELECT SUM(t2.amount) FROM Transaction t2 WHERE t2.userId = g.userId AND t2.status = 'COMPLETED' AND t2.type = 'EXPENSE' AND DATE_FORMAT(t2.date, '%Y-%m') = mes_ref.mes_ano), 0)
                              - COALESCE((SELECT SUM(cp.amount) FROM CreditCardPurchase cp WHERE cp.userId = g.userId AND DATE_FORMAT(cp.date, '%Y-%m') = mes_ref.mes_ano), 0)
                              + COALESCE((SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE 0 END) FROM InvestmentTransaction it JOIN Investment i ON it.investmentId = i.id WHERE i.userId = g.userId AND DATE_FORMAT(it.date, '%Y-%m') = mes_ref.mes_ano), 0) as poupanca_mes
                          FROM (SELECT DISTINCT DATE_FORMAT(t.date, '%Y-%m') as mes_ano FROM Transaction t WHERE t.userId = g.userId AND t.status = 'COMPLETED' AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)) as mes_ref
                      ) as ultimos_meses)) * 100 <= 50 
                THEN 'VIÁVEL'
                
                -- Desafiadora: precisa de 50-100% da poupança
                WHEN (((g.targetAmount - (CASE 
                        WHEN g.includeInvestments = TRUE THEN
                            COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0) +
                            COALESCE((
                                SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount WHEN it.type = 'SELL' THEN -it.amount ELSE 0 END)
                                FROM InvestmentTransaction it
                                JOIN Investment i ON it.investmentId = i.id
                                WHERE i.userId = g.userId
                            ), 0)
                        WHEN g.accountId IS NOT NULL THEN
                            COALESCE((SELECT ba.currentBalance FROM BankAccount ba WHERE ba.id = g.accountId), 0)
                        ELSE COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0)
                    END)) / (DATEDIFF(g.targetDate, CURDATE()) / 30)) /
                     (SELECT AVG(poupanca_mes)
                      FROM (
                          SELECT 
                              COALESCE((SELECT SUM(t2.amount) FROM Transaction t2 WHERE t2.userId = g.userId AND t2.status = 'COMPLETED' AND t2.type = 'INCOME' AND DATE_FORMAT(t2.date, '%Y-%m') = mes_ref.mes_ano), 0) 
                              - COALESCE((SELECT SUM(t2.amount) FROM Transaction t2 WHERE t2.userId = g.userId AND t2.status = 'COMPLETED' AND t2.type = 'EXPENSE' AND DATE_FORMAT(t2.date, '%Y-%m') = mes_ref.mes_ano), 0)
                              - COALESCE((SELECT SUM(cp.amount) FROM CreditCardPurchase cp WHERE cp.userId = g.userId AND DATE_FORMAT(cp.date, '%Y-%m') = mes_ref.mes_ano), 0)
                              + COALESCE((SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE 0 END) FROM InvestmentTransaction it JOIN Investment i ON it.investmentId = i.id WHERE i.userId = g.userId AND DATE_FORMAT(it.date, '%Y-%m') = mes_ref.mes_ano), 0) as poupanca_mes
                          FROM (SELECT DISTINCT DATE_FORMAT(t.date, '%Y-%m') as mes_ano FROM Transaction t WHERE t.userId = g.userId AND t.status = 'COMPLETED' AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)) as mes_ref
                      ) as ultimos_meses)) * 100 <= 100 
                THEN 'DESAFIADORA'
                
                -- Inviável: precisa de mais de 100% da poupança
                ELSE 'INVIÁVEL_NO_PRAZO'
            END
        ELSE 'INDEFINIDA'
    END as viabilidade,
    
    -- ========== DATA ESTIMADA DE CONCLUSÃO ==========
    -- Baseado na poupança média atual (RECEITA - DESPESA - CARTÃO + APORTES)
    CASE 
        WHEN (CASE 
                WHEN g.includeInvestments = TRUE THEN
                    COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0) +
                    COALESCE((
                        SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount WHEN it.type = 'SELL' THEN -it.amount ELSE 0 END)
                        FROM InvestmentTransaction it
                        JOIN Investment i ON it.investmentId = i.id
                        WHERE i.userId = g.userId
                    ), 0)
                WHEN g.accountId IS NOT NULL THEN
                    COALESCE((SELECT ba.currentBalance FROM BankAccount ba WHERE ba.id = g.accountId), 0)
                ELSE COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0)
            END) >= g.targetAmount THEN CURDATE()
        WHEN (SELECT AVG(poupanca_mes)
              FROM (
                  SELECT 
                      COALESCE((SELECT SUM(t2.amount) FROM Transaction t2 WHERE t2.userId = g.userId AND t2.status = 'COMPLETED' AND t2.type = 'INCOME' AND DATE_FORMAT(t2.date, '%Y-%m') = mes_ref.mes_ano), 0) 
                      - COALESCE((SELECT SUM(t2.amount) FROM Transaction t2 WHERE t2.userId = g.userId AND t2.status = 'COMPLETED' AND t2.type = 'EXPENSE' AND DATE_FORMAT(t2.date, '%Y-%m') = mes_ref.mes_ano), 0)
                      - COALESCE((SELECT SUM(cp.amount) FROM CreditCardPurchase cp WHERE cp.userId = g.userId AND DATE_FORMAT(cp.date, '%Y-%m') = mes_ref.mes_ano), 0)
                      + COALESCE((SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE 0 END) FROM InvestmentTransaction it JOIN Investment i ON it.investmentId = i.id WHERE i.userId = g.userId AND DATE_FORMAT(it.date, '%Y-%m') = mes_ref.mes_ano), 0) as poupanca_mes
                  FROM (SELECT DISTINCT DATE_FORMAT(t.date, '%Y-%m') as mes_ano FROM Transaction t WHERE t.userId = g.userId AND t.status = 'COMPLETED' AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)) as mes_ref
              ) as ultimos_meses) > 0 
        THEN
            DATE_ADD(CURDATE(), INTERVAL 
                CEILING(((g.targetAmount - (CASE 
                    WHEN g.includeInvestments = TRUE THEN
                        COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0) +
                        COALESCE((
                            SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount WHEN it.type = 'SELL' THEN -it.amount ELSE 0 END)
                            FROM InvestmentTransaction it
                            JOIN Investment i ON it.investmentId = i.id
                            WHERE i.userId = g.userId
                        ), 0)
                    WHEN g.accountId IS NOT NULL THEN
                        COALESCE((SELECT ba.currentBalance FROM BankAccount ba WHERE ba.id = g.accountId), 0)
                    ELSE COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0)
                END)) / 
                (SELECT AVG(poupanca_mes)
                 FROM (
                     SELECT 
                         COALESCE((SELECT SUM(t2.amount) FROM Transaction t2 WHERE t2.userId = g.userId AND t2.status = 'COMPLETED' AND t2.type = 'INCOME' AND DATE_FORMAT(t2.date, '%Y-%m') = mes_ref.mes_ano), 0) 
                         - COALESCE((SELECT SUM(t2.amount) FROM Transaction t2 WHERE t2.userId = g.userId AND t2.status = 'COMPLETED' AND t2.type = 'EXPENSE' AND DATE_FORMAT(t2.date, '%Y-%m') = mes_ref.mes_ano), 0)
                         - COALESCE((SELECT SUM(cp.amount) FROM CreditCardPurchase cp WHERE cp.userId = g.userId AND DATE_FORMAT(cp.date, '%Y-%m') = mes_ref.mes_ano), 0)
                         + COALESCE((SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE 0 END) FROM InvestmentTransaction it JOIN Investment i ON it.investmentId = i.id WHERE i.userId = g.userId AND DATE_FORMAT(it.date, '%Y-%m') = mes_ref.mes_ano), 0) as poupanca_mes
                     FROM (SELECT DISTINCT DATE_FORMAT(t.date, '%Y-%m') as mes_ano FROM Transaction t WHERE t.userId = g.userId AND t.status = 'COMPLETED' AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)) as mes_ref
                 ) as ultimos_meses))) 
            MONTH)
        ELSE NULL
    END as data_estimada_conclusao,
    
    -- ========== RECOMENDAÇÃO ==========
    CASE 
        WHEN (CASE 
                WHEN g.includeInvestments = TRUE THEN
                    COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0) +
                    COALESCE((
                        SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount WHEN it.type = 'SELL' THEN -it.amount ELSE 0 END)
                        FROM InvestmentTransaction it
                        JOIN Investment i ON it.investmentId = i.id
                        WHERE i.userId = g.userId
                    ), 0)
                WHEN g.accountId IS NOT NULL THEN
                    COALESCE((SELECT ba.currentBalance FROM BankAccount ba WHERE ba.id = g.accountId), 0)
                ELSE COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0)
            END) >= g.targetAmount THEN 'Meta alcançada! Parabéns! 🎉'
        
        WHEN DATEDIFF(g.targetDate, CURDATE()) < 0 THEN 'Meta vencida. Considere revisar o prazo ou o valor.'
        
        WHEN (SELECT AVG(poupanca_mes)
              FROM (
                  SELECT 
                      COALESCE((SELECT SUM(t2.amount) FROM Transaction t2 WHERE t2.userId = g.userId AND t2.status = 'COMPLETED' AND t2.type = 'INCOME' AND DATE_FORMAT(t2.date, '%Y-%m') = mes_ref.mes_ano), 0) 
                      - COALESCE((SELECT SUM(t2.amount) FROM Transaction t2 WHERE t2.userId = g.userId AND t2.status = 'COMPLETED' AND t2.type = 'EXPENSE' AND DATE_FORMAT(t2.date, '%Y-%m') = mes_ref.mes_ano), 0)
                      - COALESCE((SELECT SUM(cp.amount) FROM CreditCardPurchase cp WHERE cp.userId = g.userId AND DATE_FORMAT(cp.date, '%Y-%m') = mes_ref.mes_ano), 0)
                      + COALESCE((SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE 0 END) FROM InvestmentTransaction it JOIN Investment i ON it.investmentId = i.id WHERE i.userId = g.userId AND DATE_FORMAT(it.date, '%Y-%m') = mes_ref.mes_ano), 0) as poupanca_mes
                  FROM (SELECT DISTINCT DATE_FORMAT(t.date, '%Y-%m') as mes_ano FROM Transaction t WHERE t.userId = g.userId AND t.status = 'COMPLETED' AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)) as mes_ref
              ) as ultimos_meses) > 0 
             AND DATEDIFF(g.targetDate, CURDATE()) > 0 
        THEN
            CASE 
                WHEN (((g.targetAmount - (CASE 
                        WHEN g.includeInvestments = TRUE THEN
                            COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0) +
                            COALESCE((
                                SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount WHEN it.type = 'SELL' THEN -it.amount ELSE 0 END)
                                FROM InvestmentTransaction it
                                JOIN Investment i ON it.investmentId = i.id
                                WHERE i.userId = g.userId
                            ), 0)
                        WHEN g.accountId IS NOT NULL THEN
                            COALESCE((SELECT ba.currentBalance FROM BankAccount ba WHERE ba.id = g.accountId), 0)
                        ELSE COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0)
                    END)) / (DATEDIFF(g.targetDate, CURDATE()) / 30)) /
                     (SELECT AVG(poupanca_mes)
                      FROM (
                          SELECT 
                              COALESCE((SELECT SUM(t2.amount) FROM Transaction t2 WHERE t2.userId = g.userId AND t2.status = 'COMPLETED' AND t2.type = 'INCOME' AND DATE_FORMAT(t2.date, '%Y-%m') = mes_ref.mes_ano), 0) 
                              - COALESCE((SELECT SUM(t2.amount) FROM Transaction t2 WHERE t2.userId = g.userId AND t2.status = 'COMPLETED' AND t2.type = 'EXPENSE' AND DATE_FORMAT(t2.date, '%Y-%m') = mes_ref.mes_ano), 0)
                              - COALESCE((SELECT SUM(cp.amount) FROM CreditCardPurchase cp WHERE cp.userId = g.userId AND DATE_FORMAT(cp.date, '%Y-%m') = mes_ref.mes_ano), 0)
                              + COALESCE((SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE 0 END) FROM InvestmentTransaction it JOIN Investment i ON it.investmentId = i.id WHERE i.userId = g.userId AND DATE_FORMAT(it.date, '%Y-%m') = mes_ref.mes_ano), 0) as poupanca_mes
                          FROM (SELECT DISTINCT DATE_FORMAT(t.date, '%Y-%m') as mes_ano FROM Transaction t WHERE t.userId = g.userId AND t.status = 'COMPLETED' AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)) as mes_ref
                      ) as ultimos_meses)) * 100 <= 50 
                THEN 'Ótimo! Você está no caminho certo. Continue assim!'
                
                WHEN (((g.targetAmount - (CASE 
                        WHEN g.includeInvestments = TRUE THEN
                            COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0) +
                            COALESCE((
                                SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount WHEN it.type = 'SELL' THEN -it.amount ELSE 0 END)
                                FROM InvestmentTransaction it
                                JOIN Investment i ON it.investmentId = i.id
                                WHERE i.userId = g.userId
                            ), 0)
                        WHEN g.accountId IS NOT NULL THEN
                            COALESCE((SELECT ba.currentBalance FROM BankAccount ba WHERE ba.id = g.accountId), 0)
                        ELSE COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = g.userId), 0)
                    END)) / (DATEDIFF(g.targetDate, CURDATE()) / 30)) /
                     (SELECT AVG(poupanca_mes)
                      FROM (
                          SELECT 
                              COALESCE((SELECT SUM(t2.amount) FROM Transaction t2 WHERE t2.userId = g.userId AND t2.status = 'COMPLETED' AND t2.type = 'INCOME' AND DATE_FORMAT(t2.date, '%Y-%m') = mes_ref.mes_ano), 0) 
                              - COALESCE((SELECT SUM(t2.amount) FROM Transaction t2 WHERE t2.userId = g.userId AND t2.status = 'COMPLETED' AND t2.type = 'EXPENSE' AND DATE_FORMAT(t2.date, '%Y-%m') = mes_ref.mes_ano), 0)
                              - COALESCE((SELECT SUM(cp.amount) FROM CreditCardPurchase cp WHERE cp.userId = g.userId AND DATE_FORMAT(cp.date, '%Y-%m') = mes_ref.mes_ano), 0)
                              + COALESCE((SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE 0 END) FROM InvestmentTransaction it JOIN Investment i ON it.investmentId = i.id WHERE i.userId = g.userId AND DATE_FORMAT(it.date, '%Y-%m') = mes_ref.mes_ano), 0) as poupanca_mes
                          FROM (SELECT DISTINCT DATE_FORMAT(t.date, '%Y-%m') as mes_ano FROM Transaction t WHERE t.userId = g.userId AND t.status = 'COMPLETED' AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)) as mes_ref
                      ) as ultimos_meses)) * 100 <= 100 
                THEN 'Meta desafiadora. Considere aumentar a poupança ou revisar o prazo.'
                
                ELSE 'Meta inviável no prazo atual. Recomendamos revisar o valor ou estender o prazo.'
            END
        ELSE 'Sem dados suficientes para análise. Mantenha o controle das finanças!'
    END as recomendacao,
    
    -- Conta vinculada (se houver)
    CASE 
        WHEN g.accountId IS NOT NULL THEN
            (SELECT name FROM BankAccount WHERE id = g.accountId)
        ELSE 'Nenhuma conta vinculada'
    END as conta_vinculada,
    
    g.createdAt as data_criacao,
    g.updatedAt as ultima_atualizacao

FROM Goal g
WHERE EXISTS (SELECT 1 FROM User u WHERE u.id = g.userId AND u.isActive = TRUE)
ORDER BY g.userId, 
    CASE 
        WHEN DATEDIFF(g.targetDate, CURDATE()) < 0 THEN 1  -- Vencidas primeiro
        ELSE 0
    END,
    g.targetDate ASC;


-- =============================================================================
-- 8. VIEW: ALERTAS E RECOMENDAÇÕES FINANCEIRAS (SIMPLIFICADA)
-- =============================================================================
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
        -- Patrimônio líquido disponível = Contas + Investimentos - Dívidas
        COALESCE((SELECT SUM(ba.currentBalance) FROM BankAccount ba WHERE ba.userId = u.id), 0) +
        COALESCE((
            SELECT SUM(
                CASE 
                    WHEN it.type = 'BUY' THEN it.amount
                    WHEN it.type = 'SELL' THEN -it.amount
                    ELSE 0
                END
            )
            FROM InvestmentTransaction it
            JOIN Investment i ON it.investmentId = i.id
            WHERE i.userId = u.id
        ), 0) -
        COALESCE((SELECT SUM(initialDebt) FROM CreditCard WHERE userId = u.id), 0) as saldo_contas,
        
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
                (COALESCE((SELECT SUM(ba2.currentBalance) FROM BankAccount ba2 WHERE ba2.userId = u.id), 0) +
                 COALESCE((
                     SELECT SUM(
                         CASE 
                             WHEN it.type = 'BUY' THEN it.amount
                             WHEN it.type = 'SELL' THEN -it.amount
                             ELSE 0
                         END
                     )
                     FROM InvestmentTransaction it
                     JOIN Investment i ON it.investmentId = i.id
                     WHERE i.userId = u.id
                 ), 0) -
                 COALESCE((SELECT SUM(initialDebt) FROM CreditCard WHERE userId = u.id), 0)) /
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



-- =============================================================================
-- FIM DAS VIEWS
-- =============================================================================
