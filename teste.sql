DELIMITER $$

CREATE PROCEDURE sp_Relatorio_Financeiro_Periodo(
    IN p_ano_inicio INT, 
    IN p_ano_fim INT
)
BEGIN
    -- Definição das datas de corte baseadas nos anos recebidos
    DECLARE v_data_inicio DATE;
    DECLARE v_data_fim DATE;

    -- Se não passar ano final, considera apenas o ano de início (ex: 2025-01-01 a 2025-12-31)
    SET v_data_inicio = STR_TO_DATE(CONCAT(p_ano_inicio, '-01-01'), '%Y-%m-%d');
    SET v_data_fim = STR_TO_DATE(CONCAT(IFNULL(p_ano_fim, p_ano_inicio), '-12-31'), '%Y-%m-%d');

    -- INÍCIO DA CONSULTA
    WITH 
    -- 1. IDENTIFICAR O ÚLTIMO DIA COM DADOS NO PERÍODO (Para cálculo de custos recentes)
    Parametros AS (
        SELECT MAX(date) as data_referencia 
        FROM FinancialTransaction 
        WHERE date BETWEEN v_data_inicio AND v_data_fim
    ),

    -- 2. CLASSIFICAÇÃO FINANCEIRA (Filtrada pelo Período)
    Classificacao AS (
        SELECT 
            ft.value,
            ft.type,
            fc.name as categoria_nome,
            CASE 
                WHEN ft.type = 'EXPENSE' AND fc.name = 'Salários' THEN 'SALARIOS'
                WHEN ft.type = 'EXPENSE' AND fc.name = 'Impostos' THEN 'IMPOSTOS'
                WHEN ft.type = 'EXPENSE' AND fc.name = 'Infraestrutura Física' THEN 'CAPEX'
                WHEN ft.type = 'EXPENSE' THEN 'OPEX'
                WHEN ft.type = 'REVENUE' THEN 'RECEITA'
                WHEN ft.type = 'DIVIDEND' THEN 'DIVIDENDOS_PAGOS'
                ELSE 'OUTROS'
            END as grupo,
            CASE WHEN ft.type = 'REVENUE' AND ft.description LIKE '%Aporte%' THEN ft.value ELSE 0 END as valor_aporte
        FROM FinancialTransaction ft
        LEFT JOIN FinancialCategory fc ON ft.categoryId = fc.id
        -- FILTRO DINÂMICO AQUI:
        WHERE ft.date BETWEEN v_data_inicio AND v_data_fim
    ),

    -- 3. CUSTOS RECENTES (Últimos 3 meses DENTRO do período analisado)
    CustosRecentes AS (
        SELECT 
            COALESCE(SUM(ft.value) / 3, 0) as media_custo_fixo_3meses
        FROM FinancialTransaction ft
        LEFT JOIN FinancialCategory fc ON ft.categoryId = fc.id
        WHERE ft.type = 'EXPENSE'
          AND fc.name NOT IN ('Infraestrutura Física', 'Impostos')
          -- Pega os 3 meses anteriores à data máxima do filtro
          AND ft.date >= DATE_SUB((SELECT data_referencia FROM Parametros), INTERVAL 3 MONTH)
          AND ft.date <= (SELECT data_referencia FROM Parametros)
    ),

    -- 4. TOTAIS DO PERÍODO
    Totais AS (
        SELECT 
            SUM(CASE WHEN grupo = 'RECEITA' THEN value ELSE 0 END) as receita,
            SUM(CASE WHEN grupo = 'SALARIOS' THEN value ELSE 0 END) as salarios,
            SUM(CASE WHEN grupo = 'OPEX' THEN value ELSE 0 END) as opex,
            SUM(CASE WHEN grupo = 'IMPOSTOS' THEN value ELSE 0 END) as impostos,
            SUM(CASE WHEN grupo = 'CAPEX' THEN value ELSE 0 END) as capex,
            SUM(CASE WHEN grupo = 'DIVIDENDOS_PAGOS' THEN value ELSE 0 END) as dividendos,
            SUM(valor_aporte) as aportes
        FROM Classificacao
    ),

    -- 5. MÉTRICAS SaaS (Ativas no final do período)
    MetricasSaaS AS (
        SELECT 
            COALESCE(SUM(CASE WHEN billingCycle = 'MONTHLY' THEN value ELSE 0 END), 0) as mrr_fim_periodo,
            COALESCE(AVG(value), 0) as ticket_medio,
            COALESCE(AVG(cac), 0) as cac_medio,
            COALESCE(COUNT(DISTINCT id), 0) as total_clientes_ativos,
            -- Churn: clientes que cancelaram no período
            COALESCE(COUNT(DISTINCT CASE WHEN endDate BETWEEN v_data_inicio AND v_data_fim THEN id END), 0) as clientes_cancelados
        FROM Service
        -- Considera contratos ativos na data fim do filtro
        WHERE startDate <= v_data_fim 
          AND (endDate >= v_data_inicio OR endDate IS NULL)
    ),

    -- 6. MÉTRICAS DO PERÍODO ANTERIOR (Para Comparação)
    PeriodoAnterior AS (
        SELECT 
            COALESCE(SUM(CASE WHEN c.grupo = 'RECEITA' THEN c.value ELSE 0 END), 0) as receita_anterior,
            COALESCE(SUM(CASE WHEN s.billingCycle = 'MONTHLY' THEN s.value ELSE 0 END), 0) as mrr_anterior
        FROM FinancialTransaction ft
        LEFT JOIN FinancialCategory fc ON ft.categoryId = fc.id
        LEFT JOIN (
            SELECT value, type, 
                CASE 
                    WHEN type = 'EXPENSE' AND fc2.name = 'Salários' THEN 'SALARIOS'
                    WHEN type = 'EXPENSE' AND fc2.name = 'Impostos' THEN 'IMPOSTOS'
                    WHEN type = 'EXPENSE' AND fc2.name = 'Infraestrutura Física' THEN 'CAPEX'
                    WHEN type = 'EXPENSE' THEN 'OPEX'
                    WHEN type = 'REVENUE' THEN 'RECEITA'
                    WHEN type = 'DIVIDEND' THEN 'DIVIDENDOS_PAGOS'
                    ELSE 'OUTROS'
                END as grupo
            FROM FinancialTransaction ft2
            LEFT JOIN FinancialCategory fc2 ON ft2.categoryId = fc2.id
            WHERE ft2.date BETWEEN DATE_SUB(v_data_inicio, INTERVAL (DATEDIFF(v_data_fim, v_data_inicio) + 1) DAY) 
                               AND DATE_SUB(v_data_inicio, INTERVAL 1 DAY)
        ) c ON 1=1
        LEFT JOIN (
            SELECT value, billingCycle 
            FROM Service 
            WHERE startDate <= DATE_SUB(v_data_inicio, INTERVAL 1 DAY)
              AND (endDate >= DATE_SUB(v_data_fim, INTERVAL (DATEDIFF(v_data_fim, v_data_inicio) + 1) DAY) OR endDate IS NULL)
        ) s ON 1=1
        WHERE ft.date BETWEEN DATE_SUB(v_data_inicio, INTERVAL (DATEDIFF(v_data_fim, v_data_inicio) + 1) DAY) 
                          AND DATE_SUB(v_data_inicio, INTERVAL 1 DAY)
    )

    -- RELATÓRIO FINAL
    SELECT
        CONCAT(p_ano_inicio, IF(p_ano_inicio = IFNULL(p_ano_fim, p_ano_inicio), '', CONCAT(' - ', IFNULL(p_ano_fim, p_ano_inicio)))) as periodo,
        
        -- ESTRATÉGIA & VALUATION
        (ms.mrr_fim_periodo * 12 * 5) as valuation_estimado_fim_periodo,
        (ms.mrr_fim_periodo * 12 * 3) as valuation_conservador_3x,
        (ms.mrr_fim_periodo * 12 * 10) as valuation_agressivo_10x,
        ((t.receita - t.salarios - t.opex - t.impostos - t.capex) / NULLIF(t.receita, 0) * 100) as margem_liquida_periodo,
        
        -- ROE do Período
        CASE 
            WHEN (t.aportes + (t.receita - t.salarios - t.opex - t.impostos - t.capex - t.dividendos)) > 0 
            THEN ((t.receita - t.salarios - t.opex - t.impostos - t.capex) / (t.aportes + (t.receita - t.salarios - t.opex - t.impostos - t.capex - t.dividendos))) * 100 
            ELSE 0 
        END as roe_periodo,

        -- OPERACIONAL
        (t.receita - t.salarios - t.opex) as ebitda_periodo,
        ms.cac_medio,
        ms.ticket_medio as ticket_medio_ideal,
        ms.total_clientes_ativos,
        
        -- MÉTRICAS SAAS AVANÇADAS
        -- Churn Rate (%)
        CASE 
            WHEN ms.total_clientes_ativos > 0 
            THEN (ms.clientes_cancelados / ms.total_clientes_ativos * 100)
            ELSE 0 
        END as churn_rate_periodo,
        
        -- LTV (Lifetime Value) = Ticket Médio / (Churn Rate Mensal)
        CASE 
            WHEN ms.clientes_cancelados > 0 AND ms.total_clientes_ativos > 0
            THEN ms.ticket_medio / (ms.clientes_cancelados / ms.total_clientes_ativos / GREATEST(TIMESTAMPDIFF(MONTH, v_data_inicio, v_data_fim), 1))
            ELSE ms.ticket_medio * 36 -- Assume 3 anos se sem churn
        END as ltv_estimado,
        
        -- LTV:CAC Ratio (Ideal > 3)
        CASE 
            WHEN ms.cac_medio > 0 THEN 
                (CASE 
                    WHEN ms.clientes_cancelados > 0 AND ms.total_clientes_ativos > 0
                    THEN ms.ticket_medio / (ms.clientes_cancelados / ms.total_clientes_ativos / GREATEST(TIMESTAMPDIFF(MONTH, v_data_inicio, v_data_fim), 1))
                    ELSE ms.ticket_medio * 36
                END) / ms.cac_medio
            ELSE 0
        END as ltv_cac_ratio,
        
        -- Payback Period (meses) = CAC / MRR por cliente
        CASE 
            WHEN ms.total_clientes_ativos > 0 AND ms.mrr_fim_periodo > 0
            THEN ms.cac_medio / (ms.mrr_fim_periodo / ms.total_clientes_ativos)
            ELSE 0
        END as payback_months,

        -- TESOURARIA (Caixa Gerado no Período)
        (t.receita - t.salarios - t.opex - t.impostos - t.capex - t.dividendos) as caixa_gerado_periodo,
        cr.media_custo_fixo_3meses as custo_seguranca_periodo,
        t.salarios as total_salarios_pagos,
        
        -- EFICIÊNCIA & CRESCIMENTO
        -- Burn Rate (quanto queima por mês)
        ((t.salarios + t.opex + t.impostos) / GREATEST(TIMESTAMPDIFF(MONTH, v_data_inicio, v_data_fim), 1)) as burn_rate_mensal,
        
        -- Runway (meses até acabar o caixa)
        CASE 
            WHEN (t.salarios + t.opex + t.impostos) > 0
            THEN ((t.receita - t.salarios - t.opex - t.impostos - t.capex - t.dividendos) / 
                  ((t.salarios + t.opex + t.impostos) / GREATEST(TIMESTAMPDIFF(MONTH, v_data_inicio, v_data_fim), 1)))
            ELSE 999
        END as runway_meses,
        
        -- Growth Rate (comparado ao período anterior)
        CASE 
            WHEN pa.receita_anterior > 0 
            THEN ((t.receita - pa.receita_anterior) / pa.receita_anterior * 100)
            ELSE 0
        END as growth_rate_receita,
        
        -- MRR Growth
        CASE 
            WHEN pa.mrr_anterior > 0 
            THEN ((ms.mrr_fim_periodo - pa.mrr_anterior) / pa.mrr_anterior * 100)
            ELSE 0
        END as mrr_growth_rate,
        
        -- Rule of 40 (Growth% + Profit Margin% deve ser > 40)
        (CASE 
            WHEN pa.receita_anterior > 0 
            THEN ((t.receita - pa.receita_anterior) / pa.receita_anterior * 100)
            ELSE 0
        END + ((t.receita - t.salarios - t.opex - t.impostos - t.capex) / NULLIF(t.receita, 0) * 100)) as rule_of_40,

        -- SUGESTÃO (Considerando o resultado deste período)
        CASE 
            WHEN ((t.receita - t.salarios - t.opex - t.impostos - t.capex - t.dividendos) - cr.media_custo_fixo_3meses) > 0
            THEN (((t.receita - t.salarios - t.opex - t.impostos - t.capex - t.dividendos) - cr.media_custo_fixo_3meses) / 2)
            ELSE 0 
        END as sugestao_retirada_extra,

        -- ALERTAS DE GOVERNANÇA
        CASE 
            WHEN ((t.receita - t.salarios - t.opex - t.impostos - t.capex - t.dividendos) / 
                  ((t.salarios + t.opex + t.impostos) / GREATEST(TIMESTAMPDIFF(MONTH, v_data_inicio, v_data_fim), 1))) < 6
            THEN 'CRÍTICO: Runway < 6 meses'
            WHEN ((t.receita - t.salarios - t.opex - t.impostos - t.capex - t.dividendos) / 
                  ((t.salarios + t.opex + t.impostos) / GREATEST(TIMESTAMPDIFF(MONTH, v_data_inicio, v_data_fim), 1))) < 12
            THEN 'ATENÇÃO: Runway < 12 meses'
            ELSE 'Saudável'
        END as alerta_runway,
        
        CASE 
            WHEN ms.cac_medio > 0 AND
                 (CASE 
                    WHEN ms.clientes_cancelados > 0 AND ms.total_clientes_ativos > 0
                    THEN ms.ticket_medio / (ms.clientes_cancelados / ms.total_clientes_ativos / GREATEST(TIMESTAMPDIFF(MONTH, v_data_inicio, v_data_fim), 1))
                    ELSE ms.ticket_medio * 36
                 END) / ms.cac_medio < 3
            THEN 'CRÍTICO: LTV:CAC < 3'
            ELSE 'Saudável'
        END as alerta_ltv_cac,
        
        CASE 
            WHEN ms.total_clientes_ativos > 0 AND 
                 (ms.clientes_cancelados / ms.total_clientes_ativos * 100) > 5
            THEN 'ATENÇÃO: Churn > 5%'
            ELSE 'Saudável'
        END as alerta_churn,

        CONCAT(
            'Em ', p_ano_inicio, IF(p_ano_inicio = IFNULL(p_ano_fim, p_ano_inicio), '', '...'), 
            ', o EBITDA foi R$ ', FORMAT((t.receita - t.salarios - t.opex), 2), 
            '. O caixa gerado foi R$ ', FORMAT((t.receita - t.salarios - t.opex - t.impostos - t.capex - t.dividendos), 2),
            '. MRR cresceu ', FORMAT(CASE WHEN pa.mrr_anterior > 0 THEN ((ms.mrr_fim_periodo - pa.mrr_anterior) / pa.mrr_anterior * 100) ELSE 0 END, 1), '%',
            '. LTV:CAC Ratio: ', FORMAT(CASE WHEN ms.cac_medio > 0 THEN (CASE WHEN ms.clientes_cancelados > 0 AND ms.total_clientes_ativos > 0 THEN ms.ticket_medio / (ms.clientes_cancelados / ms.total_clientes_ativos / GREATEST(TIMESTAMPDIFF(MONTH, v_data_inicio, v_data_fim), 1)) ELSE ms.ticket_medio * 36 END) / ms.cac_medio ELSE 0 END, 2), ':1',
            '.'
        ) as resumo_executivo

    FROM Totais t, CustosRecentes cr, MetricasSaaS ms, PeriodoAnterior pa;

END $$
DELIMITER ;








---------------------------------------------


CREATE OR REPLACE VIEW vw_Relatorio_Avancado_Socios AS
WITH 
    -- 1. IDENTIFICAR O PERÍODO RECENTE
    Parametros AS (
        SELECT MAX(date) as data_referencia FROM FinancialTransaction
    ),

    -- 2. CLASSIFICAÇÃO FINANCEIRA (ETIQUETAGEM)
    Classificacao AS (
        SELECT 
            ft.value,
            ft.type,
            fc.name as categoria_nome,
            CASE 
                -- Categorias Rígidas
                WHEN ft.type = 'EXPENSE' AND fc.name = 'Salários' THEN 'SALARIOS'
                WHEN ft.type = 'EXPENSE' AND fc.name = 'Impostos' THEN 'IMPOSTOS'
                WHEN ft.type = 'EXPENSE' AND fc.name = 'Infraestrutura Física' THEN 'CAPEX'
                -- Todo o resto de despesa é Custo Operacional
                WHEN ft.type = 'EXPENSE' THEN 'OPEX'
                WHEN ft.type = 'REVENUE' THEN 'RECEITA'
                WHEN ft.type = 'DIVIDEND' THEN 'DIVIDENDOS_PAGOS'
                ELSE 'OUTROS'
            END as grupo,
            -- Detectar Aportes de Capital (Dinheiro que os sócios colocaram, não vendas)
            CASE WHEN ft.type = 'REVENUE' AND ft.description LIKE '%Aporte%' THEN ft.value ELSE 0 END as valor_aporte
        FROM FinancialTransaction ft
        LEFT JOIN FinancialCategory fc ON ft.categoryId = fc.id
    ),

    -- 3. CÁLCULO DA MÉDIA DE CUSTO FIXO (SEGURANÇA - ÚLTIMOS 3 MESES)
    CustosRecentes AS (
        SELECT 
            -- Média mensal de (Salários + Opex) dos últimos 90 dias
            COALESCE(SUM(ft.value) / 3, 0) as media_custo_fixo_3meses
        FROM FinancialTransaction ft
        LEFT JOIN FinancialCategory fc ON ft.categoryId = fc.id
        WHERE ft.type = 'EXPENSE'
          AND fc.name NOT IN ('Infraestrutura Física', 'Impostos') -- Ignora investimentos e impostos variáveis
          AND ft.date >= DATE_SUB((SELECT data_referencia FROM Parametros), INTERVAL 3 MONTH)
    ),

    -- 4. TOTAIS ACUMULADOS (HISTÓRICO COMPLETO)
    TotaisHistoricos AS (
        SELECT 
            SUM(CASE WHEN grupo = 'RECEITA' THEN value ELSE 0 END) as receita_total,
            SUM(CASE WHEN grupo = 'SALARIOS' THEN value ELSE 0 END) as salarios_total,
            SUM(CASE WHEN grupo = 'OPEX' THEN value ELSE 0 END) as opex_total,
            SUM(CASE WHEN grupo = 'IMPOSTOS' THEN value ELSE 0 END) as impostos_total,
            SUM(CASE WHEN grupo = 'CAPEX' THEN value ELSE 0 END) as capex_total,
            SUM(CASE WHEN grupo = 'DIVIDENDOS_PAGOS' THEN value ELSE 0 END) as dividendos_total,
            SUM(valor_aporte) as capital_aportado
        FROM Classificacao
    ),

    -- 5. MÉTRICAS DE SERVIÇO (SaaS / CLIENTES)
    MetricasSaaS AS (
        SELECT 
            SUM(CASE WHEN billingCycle = 'MONTHLY' THEN value ELSE 0 END) as mrr_atual,
            AVG(value) as ticket_medio,
            SUM(cac) as investimento_mkt_total,
            AVG(cac) as cac_medio,
            COUNT(id) as total_clientes,
            -- Churn histórico
            COUNT(CASE WHEN endDate IS NOT NULL AND endDate < CURDATE() THEN id END) as clientes_cancelados_historico,
            -- Clientes ativos
            COUNT(CASE WHEN (endDate IS NULL OR endDate >= CURDATE()) THEN id END) as clientes_ativos_atual,
            -- Concentração de receita (top cliente)
            MAX(value) as receita_maior_cliente
        FROM Service
    ),

    -- 6. ANÁLISE DE TENDÊNCIAS (Últimos 12 meses)
    TendenciasMRR AS (
        SELECT 
            DATE_FORMAT(ft.date, '%Y-%m') as mes,
            SUM(CASE WHEN ft.type = 'REVENUE' AND ft.description NOT LIKE '%Aporte%' THEN ft.value ELSE 0 END) as receita_mes
        FROM FinancialTransaction ft
        WHERE ft.date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(ft.date, '%Y-%m')
        ORDER BY mes DESC
        LIMIT 12
    ),

    -- 7. ANÁLISE DE RISCO
    AnaliseRisco AS (
        SELECT 
            -- Concentração: quanto % o maior cliente representa
            CASE 
                WHEN SUM(CASE WHEN billingCycle = 'MONTHLY' THEN value ELSE 0 END) > 0
                THEN (MAX(value) / SUM(CASE WHEN billingCycle = 'MONTHLY' THEN value ELSE 0 END) * 100)
                ELSE 0
            END as concentracao_receita_top1,
            -- Churn Rate histórico
            CASE 
                WHEN COUNT(id) > 0
                THEN (COUNT(CASE WHEN endDate IS NOT NULL AND endDate < CURDATE() THEN id END) / COUNT(id) * 100)
                ELSE 0
            END as churn_rate_historico
        FROM Service
    )

-- 6. O RELATÓRIO FINAL UNIFICADO
SELECT
    -- --- BLOCO A: TOTAIS GERAIS ---
    t.receita_total as total_receitas_historico,
    (t.salarios_total + t.opex_total + t.impostos_total + t.capex_total) as total_despesas_historico,
    (t.receita_total - (t.salarios_total + t.opex_total + t.impostos_total + t.capex_total)) as lucro_liquido_total,
    
    -- EBITDA: Receita - (Salários + Opex) -> Mede a saúde do motor da empresa
    (t.receita_total - t.salarios_total - t.opex_total) as ebitda_total,

    -- --- BLOCO B: VALUATION & ESTRATÉGIA ---
    (ms.mrr_atual * 12 * 5) as valuation_estimado_5x,
    ((t.receita_total - t.salarios_total - t.opex_total - t.impostos_total - t.capex_total) / t.receita_total * 100) as margem_lucro_liquida_percentual,
    
    -- ROE (Return on Equity)
    CASE 
        WHEN (t.capital_aportado + (t.receita_total - t.salarios_total - t.opex_total - t.impostos_total - t.capex_total - t.dividendos_total)) > 0 
        THEN ((t.receita_total - t.salarios_total - t.opex_total - t.impostos_total - t.capex_total) / (t.capital_aportado + (t.receita_total - t.salarios_total - t.opex_total - t.impostos_total - t.capex_total - t.dividendos_total))) * 100 
        ELSE 0 
    END as roe_percentual,

    -- --- BLOCO B: SAÚDE OPERACIONAL (EBITDA & CAC) ---
    -- EBITDA = Receita - Custo Operacional (Sem impostos e sem Capex)
    (t.receita_total - t.salarios_total - t.opex_total) as ebitda_acumulado,
    ms.cac_medio as custo_aquisicao_cliente,
    ms.ticket_medio as valor_cliente_ideal,
    ms.clientes_ativos_atual as total_clientes_ativos,
    ms.total_clientes as total_clientes_historico,
    
    -- MÉTRICAS SAAS AVANÇADAS
    -- LTV Estimado
    CASE 
        WHEN ar.churn_rate_historico > 0
        THEN ms.ticket_medio / (ar.churn_rate_historico / 100 / 12) -- LTV = Ticket / Churn Mensal
        ELSE ms.ticket_medio * 36 -- 3 anos se sem dados de churn
    END as ltv_estimado,
    
    -- LTV:CAC Ratio
    CASE 
        WHEN ms.cac_medio > 0
        THEN (CASE 
                WHEN ar.churn_rate_historico > 0
                THEN ms.ticket_medio / (ar.churn_rate_historico / 100 / 12)
                ELSE ms.ticket_medio * 36
              END) / ms.cac_medio
        ELSE 0
    END as ltv_cac_ratio,
    
    -- Payback em meses
    CASE 
        WHEN ms.clientes_ativos_atual > 0 AND ms.mrr_atual > 0
        THEN ms.cac_medio / (ms.mrr_atual / ms.clientes_ativos_atual)
        ELSE 0
    END as payback_months,
    
    -- Churn Rate
    ar.churn_rate_historico,
    
    -- Net Revenue Retention (simplificado)
    CASE 
        WHEN ms.clientes_cancelados_historico > 0
        THEN ((ms.clientes_ativos_atual * ms.ticket_medio) / (ms.total_clientes * ms.ticket_medio) * 100)
        ELSE 100
    END as nrr_estimado,
    
    -- Gross Margin (estimado - assumindo custos variáveis baixos em SaaS)
    ((t.receita_total - t.opex_total) / NULLIF(t.receita_total, 0) * 100) as gross_margin_percentual,

    -- --- BLOCO C: DIAGNÓSTICO DE CAIXA (REALIDADE BANCÁRIA) ---
    -- Saldo Real = Receita - (Tudo que saiu)
    (t.receita_total - t.salarios_total - t.opex_total - t.impostos_total - t.capex_total - t.dividendos_total) as saldo_banco_atual,
    
    -- Custo para Respeitar (Média 3 meses)
    cr.media_custo_fixo_3meses as reserva_emergencia_necessaria,
    
    -- Total Gasto com Equipe (Lifetime)
    t.salarios_total as total_gasto_salarios_historico,

    -- --- BLOCO D: DIAGNÓSTICO DE CAIXA REAL ---
    (t.receita_total - t.salarios_total - t.opex_total - t.impostos_total - t.capex_total - t.dividendos_total) as saldo_banco_real,
    cr.media_custo_fixo_3meses as custo_seguranca_mensal,
    t.dividendos_total as total_dividendos_distribuidos,


    -- --- BLOCO E: A RESPOSTA FINAL (DISTRIBUIÇÃO) ---
    ((t.receita_total - t.salarios_total - t.opex_total - t.impostos_total - t.capex_total - t.dividendos_total) - cr.media_custo_fixo_3meses) as caixa_livre_distribuivel,
    
    CASE 
        WHEN ((t.receita_total - t.salarios_total - t.opex_total - t.impostos_total - t.capex_total - t.dividendos_total) - cr.media_custo_fixo_3meses) > 0
        THEN (((t.receita_total - t.salarios_total - t.opex_total - t.impostos_total - t.capex_total - t.dividendos_total) - cr.media_custo_fixo_3meses) / 2)
        ELSE 0 
    END as sugestao_retirada_hoje_por_socio,
    
    -- --- BLOCO F: PROJEÇÕES ---
    -- Valuation em múltiplos cenários
    (ms.mrr_atual * 12 * 3) as valuation_conservador_3x_arr,
    (ms.mrr_atual * 12 * 5) as valuation_moderado_5x_arr,
    (ms.mrr_atual * 12 * 10) as valuation_agressivo_10x_arr,
    
    -- Projeção de MRR em 12 meses (assumindo crescimento constante)
    ms.mrr_atual * POWER(1.05, 12) as mrr_projetado_12m_5pct,
    
    -- Runway (meses de caixa disponível)
    CASE 
        WHEN cr.media_custo_fixo_3meses > 0
        THEN (t.receita_total - t.salarios_total - t.opex_total - t.impostos_total - t.capex_total - t.dividendos_total) / cr.media_custo_fixo_3meses
        ELSE 999
    END as runway_meses,
    
    -- Burn Rate
    cr.media_custo_fixo_3meses as burn_rate_mensal,
    
    -- --- BLOCO G: ANÁLISE DE RISCO ---
    ar.concentracao_receita_top1,
    CASE 
        WHEN ar.concentracao_receita_top1 > 30 THEN 'ALTO RISCO: Concentração > 30%'
        WHEN ar.concentracao_receita_top1 > 20 THEN 'ATENÇÃO: Concentração > 20%'
        ELSE 'Saudável'
    END as alerta_concentracao,
    
    -- --- BLOCO H: ALERTAS DE GOVERNANÇA ---
    CASE 
        WHEN (t.receita_total - t.salarios_total - t.opex_total - t.impostos_total - t.capex_total - t.dividendos_total) / cr.media_custo_fixo_3meses < 6
        THEN 'CRÍTICO: Runway < 6 meses'
        WHEN (t.receita_total - t.salarios_total - t.opex_total - t.impostos_total - t.capex_total - t.dividendos_total) / cr.media_custo_fixo_3meses < 12
        THEN 'ATENÇÃO: Runway < 12 meses'
        ELSE 'Saudável'
    END as alerta_runway,
    
    CASE 
        WHEN ms.cac_medio > 0 AND
             (CASE WHEN ar.churn_rate_historico > 0 THEN ms.ticket_medio / (ar.churn_rate_historico / 100 / 12) ELSE ms.ticket_medio * 36 END) / ms.cac_medio < 3
        THEN 'CRÍTICO: LTV:CAC < 3'
        ELSE 'Saudável'
    END as alerta_ltv_cac,
    
    CASE 
        WHEN ar.churn_rate_historico > 5 THEN 'ATENÇÃO: Churn > 5%'
        ELSE 'Saudável'
    END as alerta_churn,
    
    -- Status geral da empresa
    CASE 
        WHEN (t.receita_total - t.salarios_total - t.opex_total - t.impostos_total - t.capex_total - t.dividendos_total) / cr.media_custo_fixo_3meses < 6
             OR ar.churn_rate_historico > 8
             OR (CASE WHEN ms.cac_medio > 0 THEN (CASE WHEN ar.churn_rate_historico > 0 THEN ms.ticket_medio / (ar.churn_rate_historico / 100 / 12) ELSE ms.ticket_medio * 36 END) / ms.cac_medio ELSE 0 END) < 2
        THEN 'CRÍTICO'
        WHEN (t.receita_total - t.salarios_total - t.opex_total - t.impostos_total - t.capex_total - t.dividendos_total) / cr.media_custo_fixo_3meses < 12
             OR ar.churn_rate_historico > 5
             OR (CASE WHEN ms.cac_medio > 0 THEN (CASE WHEN ar.churn_rate_historico > 0 THEN ms.ticket_medio / (ar.churn_rate_historico / 100 / 12) ELSE ms.ticket_medio * 36 END) / ms.cac_medio ELSE 0 END) < 3
        THEN 'ATENÇÃO'
        ELSE 'SAUDÁVEL'
    END as status_geral_empresa,

    -- --- BLOCO I: ANÁLISE DE TEXTO ENRIQUECIDA ---
    CONCAT(
        'Empresa com EBITDA de R$ ', FORMAT((t.receita_total - t.salarios_total - t.opex_total), 2), 
        '. Lucro Líquido Acumulado: R$ ', FORMAT((t.receita_total - t.salarios_total - t.opex_total - t.impostos_total - t.capex_total), 2),
        '. Saldo atual em Banco: R$ ', FORMAT((t.receita_total - t.salarios_total - t.opex_total - t.impostos_total - t.capex_total - t.dividendos_total), 2),
        '. MRR Atual: R$ ', FORMAT(ms.mrr_atual, 2),
        '. LTV:CAC Ratio: ', FORMAT(CASE WHEN ms.cac_medio > 0 THEN (CASE WHEN ar.churn_rate_historico > 0 THEN ms.ticket_medio / (ar.churn_rate_historico / 100 / 12) ELSE ms.ticket_medio * 36 END) / ms.cac_medio ELSE 0 END, 2), ':1',
        '. Runway: ', FORMAT(CASE WHEN cr.media_custo_fixo_3meses > 0 THEN (t.receita_total - t.salarios_total - t.opex_total - t.impostos_total - t.capex_total - t.dividendos_total) / cr.media_custo_fixo_3meses ELSE 999 END, 1), ' meses',
        '. Valuation Estimado (5x ARR): R$ ', FORMAT((ms.mrr_atual * 12 * 5), 2),
        '. Status: ', CASE 
            WHEN (t.receita_total - t.salarios_total - t.opex_total - t.impostos_total - t.capex_total - t.dividendos_total) / cr.media_custo_fixo_3meses < 6
                 OR ar.churn_rate_historico > 8
                 OR (CASE WHEN ms.cac_medio > 0 THEN (CASE WHEN ar.churn_rate_historico > 0 THEN ms.ticket_medio / (ar.churn_rate_historico / 100 / 12) ELSE ms.ticket_medio * 36 END) / ms.cac_medio ELSE 0 END) < 2
            THEN 'CRÍTICO'
            WHEN (t.receita_total - t.salarios_total - t.opex_total - t.impostos_total - t.capex_total - t.dividendos_total) / cr.media_custo_fixo_3meses < 12
                 OR ar.churn_rate_historico > 5
                 OR (CASE WHEN ms.cac_medio > 0 THEN (CASE WHEN ar.churn_rate_historico > 0 THEN ms.ticket_medio / (ar.churn_rate_historico / 100 / 12) ELSE ms.ticket_medio * 36 END) / ms.cac_medio ELSE 0 END) < 3
            THEN 'ATENÇÃO'
            ELSE 'SAUDÁVEL'
        END,
        '.'
    ) as analise_executiva_completa

FROM TotaisHistoricos t, CustosRecentes cr, MetricasSaaS ms, AnaliseRisco ar;