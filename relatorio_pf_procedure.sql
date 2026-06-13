-- =============================================================================
-- PROCEDURE: RELATÓRIO FINANCEIRO PESSOAL POR PERÍODO
-- Baseado na estrutura do banco FinanPlus (Finanças Pessoais)
-- Permite análise de períodos específicos com comparações
-- =============================================================================

DELIMITER $$

CREATE PROCEDURE sp_Relatorio_Financeiro_Pessoal_Periodo(
    IN p_ano_inicio INT, 
    IN p_ano_fim INT
)
BEGIN
    -- Definição das datas de corte baseadas nos anos recebidos
    DECLARE v_data_inicio DATE;
    DECLARE v_data_fim DATE;

    -- Se não passar ano final, considera apenas o ano de início
    SET v_data_inicio = STR_TO_DATE(CONCAT(p_ano_inicio, '-01-01'), '%Y-%m-%d');
    SET v_data_fim = STR_TO_DATE(CONCAT(IFNULL(p_ano_fim, p_ano_inicio), '-12-31'), '%Y-%m-%d');

    -- INÍCIO DA CONSULTA
    WITH 
    -- 1. IDENTIFICAR O ÚLTIMO DIA COM DADOS NO PERÍODO
    Parametros AS (
        SELECT MAX(date) as data_referencia 
        FROM Transaction 
        WHERE date BETWEEN v_data_inicio AND v_data_fim
          AND status = 'COMPLETED'
    ),

    -- 2. CLASSIFICAÇÃO FINANCEIRA DO PERÍODO
    ClassificacaoTransacoesPeriodo AS (
        SELECT 
            t.amount as valor,
            t.type,
            c.name as categoria_nome,
            t.date as data_transacao,
            CASE 
                -- RECEITAS CLASSIFICADAS
                WHEN t.type = 'INCOME' AND c.name = 'Salário' THEN 'SALARIO_PRINCIPAL'
                WHEN t.type = 'INCOME' AND c.name = 'Dividendos' THEN 'RENDA_PASSIVA'
                WHEN t.type = 'INCOME' AND c.name = 'Investimentos' THEN 'RENDA_PASSIVA'
                WHEN t.type = 'INCOME' AND c.name IN ('Vendas', 'Outras Receitas') THEN 'RENDA_EXTRA'
                WHEN t.type = 'INCOME' AND c.name = 'Empréstimo' THEN 'CAPITAL_TERCEIROS'
                WHEN t.type = 'INCOME' THEN 'OUTRAS_RECEITAS'
                
                -- DESPESAS CLASSIFICADAS
                WHEN t.type = 'EXPENSE' AND c.name IN ('Aluguel', 'Luz', 'Água', 'Internet') THEN 'CUSTOS_FIXOS_ESSENCIAIS'
                WHEN t.type = 'EXPENSE' AND c.name IN ('Plano de saúde', 'Assinaturas') THEN 'CUSTOS_FIXOS_OPCIONAIS'
                WHEN t.type = 'EXPENSE' AND c.name IN ('Alimentação', 'Alimentação Pets', 'remédios', 'remédios pets') THEN 'CUSTOS_VARIÁVEIS_NECESSÁRIOS'
                WHEN t.type = 'EXPENSE' AND c.name IN ('Lazer', 'Outras Despesas') THEN 'CUSTOS_VARIÁVEIS_DISCRICIONÁRIOS'
                WHEN t.type = 'EXPENSE' AND c.name IN ('compra de ação', 'Pgto. Empréstimo') THEN 'INVESTIMENTOS_DÍVIDAS'
                WHEN t.type = 'EXPENSE' AND c.name = 'Pagamento de Cartão' THEN 'PAGAMENTO_CARTÃO'
                WHEN t.type = 'EXPENSE' THEN 'OUTRAS_DESPESAS'
                
                ELSE 'OUTROS'
            END as grupo_financeiro,
            
            -- Identificar aportes para investimentos
            CASE 
                WHEN t.type = 'EXPENSE' AND c.name = 'compra de ação' THEN t.amount 
                ELSE 0 
            END as valor_investimento_aplicado
        FROM Transaction t
        LEFT JOIN Category c ON t.categoryId = c.id
        WHERE t.date BETWEEN v_data_inicio AND v_data_fim
          AND t.status = 'COMPLETED'
    ),

    -- 3. GASTOS DO CARTÃO NO PERÍODO
    GastosCartaoPeriodo AS (
        SELECT 
            SUM(cp.amount) as total_gastos_cartao_periodo
        FROM CreditCardPurchase cp
        WHERE cp.date BETWEEN v_data_inicio AND v_data_fim
    ),

    -- 4. CUSTOS RECENTES PARA CÁLCULO DE SEGURANÇA (ÚLTIMOS 3 MESES DO PERÍODO)
    CustosRecentesPeriodo AS (
        SELECT 
            COALESCE(SUM(valor) / 3, 0) as media_custo_mensal_3meses
        FROM ClassificacaoTransacoesPeriodo
        WHERE grupo_financeiro IN ('CUSTOS_FIXOS_ESSENCIAIS', 'CUSTOS_FIXOS_OPCIONAIS', 
                                   'CUSTOS_VARIÁVEIS_NECESSÁRIOS', 'CUSTOS_VARIÁVEIS_DISCRICIONÁRIOS')
          AND data_transacao >= DATE_SUB((SELECT data_referencia FROM Parametros), INTERVAL 3 MONTH)
    ),

    -- 5. TOTAIS DO PERÍODO
    TotaisPeriodo AS (
        SELECT 
            -- RECEITAS
            SUM(CASE WHEN grupo_financeiro = 'SALARIO_PRINCIPAL' THEN valor ELSE 0 END) as salario_periodo,
            SUM(CASE WHEN grupo_financeiro = 'RENDA_PASSIVA' THEN valor ELSE 0 END) as renda_passiva_periodo,
            SUM(CASE WHEN grupo_financeiro = 'RENDA_EXTRA' THEN valor ELSE 0 END) as renda_extra_periodo,
            SUM(CASE WHEN grupo_financeiro = 'CAPITAL_TERCEIROS' THEN valor ELSE 0 END) as emprestimos_periodo,
            
            -- RECEITA TOTAL
            SUM(CASE WHEN grupo_financeiro IN ('SALARIO_PRINCIPAL', 'RENDA_PASSIVA', 'RENDA_EXTRA', 'OUTRAS_RECEITAS') THEN valor ELSE 0 END) as receita_total_periodo,
            
            -- DESPESAS DETALHADAS
            SUM(CASE WHEN grupo_financeiro = 'CUSTOS_FIXOS_ESSENCIAIS' THEN valor ELSE 0 END) as custos_fixos_essenciais_periodo,
            SUM(CASE WHEN grupo_financeiro = 'CUSTOS_FIXOS_OPCIONAIS' THEN valor ELSE 0 END) as custos_fixos_opcionais_periodo,
            SUM(CASE WHEN grupo_financeiro = 'CUSTOS_VARIÁVEIS_NECESSÁRIOS' THEN valor ELSE 0 END) as custos_variáveis_necessários_periodo,
            SUM(CASE WHEN grupo_financeiro = 'CUSTOS_VARIÁVEIS_DISCRICIONÁRIOS' THEN valor ELSE 0 END) as custos_variáveis_discricionários_periodo,
            SUM(CASE WHEN grupo_financeiro = 'INVESTIMENTOS_DÍVIDAS' THEN valor ELSE 0 END) as investimentos_dividas_periodo,
            SUM(CASE WHEN grupo_financeiro = 'PAGAMENTO_CARTÃO' THEN valor ELSE 0 END) as pagamentos_cartão_periodo,
            
            -- INVESTIMENTOS
            SUM(valor_investimento_aplicado) as total_investido_periodo
        FROM ClassificacaoTransacoesPeriodo
    ),

    -- 6. COMPARAÇÃO COM PERÍODO ANTERIOR
    PeriodoAnterior AS (
        SELECT 
            SUM(CASE WHEN ctp_ant.grupo_financeiro IN ('SALARIO_PRINCIPAL', 'RENDA_PASSIVA', 'RENDA_EXTRA', 'OUTRAS_RECEITAS') THEN ctp_ant.valor ELSE 0 END) as receita_periodo_anterior,
            SUM(CASE WHEN ctp_ant.grupo_financeiro IN ('CUSTOS_FIXOS_ESSENCIAIS', 'CUSTOS_FIXOS_OPCIONAIS', 'CUSTOS_VARIÁVEIS_NECESSÁRIOS', 'CUSTOS_VARIÁVEIS_DISCRICIONÁRIOS') THEN ctp_ant.valor ELSE 0 END) as despesas_periodo_anterior,
            SUM(CASE WHEN ctp_ant.grupo_financeiro = 'RENDA_PASSIVA' THEN ctp_ant.valor ELSE 0 END) as renda_passiva_anterior
        FROM (
            SELECT 
                t.amount as valor,
                t.type,
                c.name as categoria_nome,
                CASE 
                    WHEN t.type = 'INCOME' AND c.name = 'Salário' THEN 'SALARIO_PRINCIPAL'
                    WHEN t.type = 'INCOME' AND c.name IN ('Dividendos', 'Investimentos') THEN 'RENDA_PASSIVA'
                    WHEN t.type = 'INCOME' AND c.name IN ('Vendas', 'Outras Receitas') THEN 'RENDA_EXTRA'
                    WHEN t.type = 'INCOME' THEN 'OUTRAS_RECEITAS'
                    WHEN t.type = 'EXPENSE' AND c.name IN ('Aluguel', 'Luz', 'Água') THEN 'CUSTOS_FIXOS_ESSENCIAIS'
                    WHEN t.type = 'EXPENSE' AND c.name IN ('Plano de saúde', 'Assinaturas') THEN 'CUSTOS_FIXOS_OPCIONAIS'
                    WHEN t.type = 'EXPENSE' AND c.name IN ('Alimentação', 'Alimentação Pets', 'remédios', 'remédios pets') THEN 'CUSTOS_VARIÁVEIS_NECESSÁRIOS'
                    WHEN t.type = 'EXPENSE' AND c.name IN ('Lazer', 'Outras Despesas') THEN 'CUSTOS_VARIÁVEIS_DISCRICIONÁRIOS'
                    ELSE 'OUTROS'
                END as grupo_financeiro
            FROM Transaction t
            LEFT JOIN Category c ON t.categoryId = c.id
            WHERE t.date BETWEEN DATE_SUB(v_data_inicio, INTERVAL (DATEDIFF(v_data_fim, v_data_inicio) + 1) DAY) 
                               AND DATE_SUB(v_data_inicio, INTERVAL 1 DAY)
              AND t.status = 'COMPLETED'
        ) ctp_ant
    ),

    -- 7. SITUAÇÃO DOS INVESTIMENTOS NO PERÍODO
    InvestimentosPeriodo AS (
        SELECT 
            SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END) as movimentacao_investimentos_periodo,
            COUNT(CASE WHEN it.type = 'BUY' THEN 1 END) as aportes_realizados,
            COUNT(CASE WHEN it.type = 'SELL' THEN 1 END) as resgates_realizados,
            AVG(CASE WHEN it.type = 'BUY' THEN it.amount END) as valor_medio_aporte
        FROM InvestmentTransaction it
        WHERE it.date BETWEEN v_data_inicio AND v_data_fim
    ),

    -- 8. SALDO ATUAL (PARA CONTEXTUALIZAR)
    SaldoAtual AS (
        SELECT 
            SUM(currentBalance) as saldo_atual_total,
            SUM(initialDebt) as dívida_cartões_inicial
        FROM BankAccount ba
        LEFT JOIN CreditCard cc ON ba.userId = cc.userId
    )

    -- RELATÓRIO FINAL DO PERÍODO
    SELECT
        CONCAT(p_ano_inicio, IF(p_ano_inicio = IFNULL(p_ano_fim, p_ano_inicio), '', CONCAT(' - ', IFNULL(p_ano_fim, p_ano_inicio)))) as periodo_analisado,
        
        -- ===== SEÇÃO A: RECEITAS DO PERÍODO =====
        tp.receita_total_periodo,
        tp.salario_periodo,
        tp.renda_passiva_periodo,
        tp.renda_extra_periodo,
        tp.emprestimos_periodo,
        
        -- Participação de cada fonte de receita
        (tp.salario_periodo / NULLIF(tp.receita_total_periodo, 0) * 100) as perc_salario,
        (tp.renda_passiva_periodo / NULLIF(tp.receita_total_periodo, 0) * 100) as perc_renda_passiva,
        (tp.renda_extra_periodo / NULLIF(tp.receita_total_periodo, 0) * 100) as perc_renda_extra,
        
        -- ===== SEÇÃO B: DESPESAS DO PERÍODO =====
        tp.custos_fixos_essenciais_periodo,
        tp.custos_fixos_opcionais_periodo,
        tp.custos_variáveis_necessários_periodo,
        tp.custos_variáveis_discricionários_periodo,
        gcp.total_gastos_cartao_periodo,
        tp.pagamentos_cartão_periodo,
        
        -- Total de despesas
        (tp.custos_fixos_essenciais_periodo + tp.custos_fixos_opcionais_periodo + 
         tp.custos_variáveis_necessários_periodo + tp.custos_variáveis_discricionários_periodo + 
         gcp.total_gastos_cartao_periodo + tp.pagamentos_cartão_periodo + tp.investimentos_dividas_periodo) as total_despesas_periodo,
        
        -- Percentuais das despesas
        ((tp.custos_fixos_essenciais_periodo + tp.custos_fixos_opcionais_periodo) / NULLIF(tp.receita_total_periodo, 0) * 100) as perc_custos_fixos,
        (tp.custos_variáveis_discricionários_periodo / NULLIF(tp.receita_total_periodo, 0) * 100) as perc_gastos_supérfluos,
        
        -- ===== SEÇÃO C: RESULTADO E POUPANÇA DO PERÍODO =====
        (tp.receita_total_periodo - (tp.custos_fixos_essenciais_periodo + tp.custos_fixos_opcionais_periodo + 
         tp.custos_variáveis_necessários_periodo + tp.custos_variáveis_discricionários_periodo + 
         gcp.total_gastos_cartao_periodo + tp.pagamentos_cartão_periodo)) as resultado_operacional_periodo,
        
        (tp.receita_total_periodo - (tp.custos_fixos_essenciais_periodo + tp.custos_fixos_opcionais_periodo + 
         tp.custos_variáveis_necessários_periodo + tp.custos_variáveis_discricionários_periodo + 
         gcp.total_gastos_cartao_periodo + tp.pagamentos_cartão_periodo + tp.investimentos_dividas_periodo)) as resultado_líquido_período,
        
        -- Taxa de poupança do período
        ((tp.receita_total_periodo - (tp.custos_fixos_essenciais_periodo + tp.custos_fixos_opcionais_periodo + 
          tp.custos_variáveis_necessários_periodo + tp.custos_variáveis_discricionários_periodo + 
          gcp.total_gastos_cartao_periodo + tp.pagamentos_cartão_periodo)) / NULLIF(tp.receita_total_periodo, 0) * 100) as taxa_poupança_periodo,
        
        -- ===== SEÇÃO D: INVESTIMENTOS DO PERÍODO =====
        tp.total_investido_periodo,
        ip.movimentacao_investimentos_periodo,
        ip.aportes_realizados,
        ip.resgates_realizados,
        ip.valor_medio_aporte,
        (tp.total_investido_periodo / NULLIF(tp.receita_total_periodo, 0) * 100) as taxa_investimento_periodo,
        
        -- ===== SEÇÃO E: COMPARAÇÃO COM PERÍODO ANTERIOR =====
        pa.receita_periodo_anterior,
        pa.despesas_periodo_anterior,
        pa.renda_passiva_anterior,
        
        -- Crescimento/Redução
        CASE 
            WHEN pa.receita_periodo_anterior > 0 
            THEN ((tp.receita_total_periodo - pa.receita_periodo_anterior) / pa.receita_periodo_anterior * 100)
            ELSE 0
        END as crescimento_receita_perc,
        
        CASE 
            WHEN pa.despesas_periodo_anterior > 0 
            THEN (((tp.custos_fixos_essenciais_periodo + tp.custos_fixos_opcionais_periodo + 
                    tp.custos_variáveis_necessários_periodo + tp.custos_variáveis_discricionários_periodo + 
                    gcp.total_gastos_cartao_periodo) - pa.despesas_periodo_anterior) / pa.despesas_periodo_anterior * 100)
            ELSE 0
        END as variacao_despesas_perc,
        
        CASE 
            WHEN pa.renda_passiva_anterior > 0 
            THEN ((tp.renda_passiva_periodo - pa.renda_passiva_anterior) / pa.renda_passiva_anterior * 100)
            ELSE 0
        END as crescimento_renda_passiva_perc,
        
        -- ===== SEÇÃO F: SAÚDE FINANCEIRA E SEGURANÇA =====
        crp.media_custo_mensal_3meses,
        sa.saldo_atual_total,
        sa.dívida_cartões_inicial,
        
        -- Runway baseado nos custos do período
        CASE 
            WHEN crp.media_custo_mensal_3meses > 0
            THEN sa.saldo_atual_total / crp.media_custo_mensal_3meses
            ELSE 999
        END as runway_meses_atual,
        
        -- ===== SEÇÃO G: ALERTAS E RECOMENDAÇÕES =====
        -- Status da poupança
        CASE 
            WHEN ((tp.receita_total_periodo - (tp.custos_fixos_essenciais_periodo + tp.custos_fixos_opcionais_periodo + 
                   tp.custos_variáveis_necessários_periodo + tp.custos_variáveis_discricionários_periodo + 
                   gcp.total_gastos_cartao_periodo + tp.pagamentos_cartão_periodo)) / NULLIF(tp.receita_total_periodo, 0) * 100) >= 20
            THEN 'EXCELENTE: Poupança ≥ 20%'
            WHEN ((tp.receita_total_periodo - (tp.custos_fixos_essenciais_periodo + tp.custos_fixos_opcionais_periodo + 
                   tp.custos_variáveis_necessários_periodo + tp.custos_variáveis_discricionários_periodo + 
                   gcp.total_gastos_cartao_periodo + tp.pagamentos_cartão_periodo)) / NULLIF(tp.receita_total_periodo, 0) * 100) >= 10
            THEN 'ADEQUADA: Poupança ≥ 10%'
            WHEN ((tp.receita_total_periodo - (tp.custos_fixos_essenciais_periodo + tp.custos_fixos_opcionais_periodo + 
                   tp.custos_variáveis_necessários_periodo + tp.custos_variáveis_discricionários_periodo + 
                   gcp.total_gastos_cartao_periodo + tp.pagamentos_cartão_periodo)) / NULLIF(tp.receita_total_periodo, 0) * 100) >= 0
            THEN 'MÍNIMA: Poupança baixa'
            ELSE 'CRÍTICA: Gastando mais que ganha'
        END as status_poupança,
        
        -- Status dos gastos supérfluos
        CASE 
            WHEN (tp.custos_variáveis_discricionários_periodo / NULLIF(tp.receita_total_periodo, 0) * 100) > 20 
            THEN 'ALTO: Gastos supérfluos > 20%'
            WHEN (tp.custos_variáveis_discricionários_periodo / NULLIF(tp.receita_total_periodo, 0) * 100) > 15 
            THEN 'MODERADO: Gastos supérfluos > 15%'
            WHEN (tp.custos_variáveis_discricionários_periodo / NULLIF(tp.receita_total_periodo, 0) * 100) > 10 
            THEN 'ACEITÁVEL: Gastos supérfluos > 10%'
            ELSE 'CONTROLADO'
        END as status_gastos_supérfluos,
        
        -- Status diversificação de receitas
        CASE 
            WHEN (tp.renda_passiva_periodo / NULLIF(tp.receita_total_periodo, 0) * 100) > 30 
            THEN 'EXCELENTE: Renda passiva > 30%'
            WHEN (tp.renda_passiva_periodo / NULLIF(tp.receita_total_periodo, 0) * 100) > 15 
            THEN 'ADEQUADA: Renda passiva > 15%'
            WHEN (tp.renda_passiva_periodo / NULLIF(tp.receita_total_periodo, 0) * 100) > 5 
            THEN 'INICIAL: Renda passiva > 5%'
            ELSE 'DEPENDENTE: Precisa diversificar fontes'
        END as status_diversificação_receita,
        
        -- ===== SEÇÃO H: PROJEÇÕES E METAS =====
        -- Projeção anual baseada no período
        CASE 
            WHEN DATEDIFF(v_data_fim, v_data_inicio) > 0
            THEN (tp.receita_total_periodo * 365) / DATEDIFF(v_data_fim, v_data_inicio)
            ELSE tp.receita_total_periodo
        END as projecao_receita_anual,
        
        CASE 
            WHEN DATEDIFF(v_data_fim, v_data_inicio) > 0
            THEN (tp.total_investido_periodo * 365) / DATEDIFF(v_data_fim, v_data_inicio)
            ELSE tp.total_investido_periodo
        END as projecao_investimento_anual,
        
        -- Meta de reserva de emergência (6 meses de custos)
        (crp.media_custo_mensal_3meses * 6) as meta_reserva_emergencia,
        
        -- Tempo para atingir reserva de emergência
        CASE 
            WHEN ((tp.receita_total_periodo - (tp.custos_fixos_essenciais_periodo + tp.custos_fixos_opcionais_periodo + 
                   tp.custos_variáveis_necessários_periodo + tp.custos_variáveis_discricionários_periodo + 
                   gcp.total_gastos_cartao_periodo + tp.pagamentos_cartão_periodo)) > 0) 
                 AND (crp.media_custo_mensal_3meses * 6 - sa.saldo_atual_total > 0)
            THEN ((crp.media_custo_mensal_3meses * 6 - sa.saldo_atual_total) / 
                  ((tp.receita_total_periodo - (tp.custos_fixos_essenciais_periodo + tp.custos_fixos_opcionais_periodo + 
                    tp.custos_variáveis_necessários_periodo + tp.custos_variáveis_discricionários_periodo + 
                    gcp.total_gastos_cartao_periodo + tp.pagamentos_cartão_periodo)) / 
                   GREATEST(TIMESTAMPDIFF(MONTH, v_data_inicio, v_data_fim), 1)))
            WHEN sa.saldo_atual_total >= (crp.media_custo_mensal_3meses * 6)
            THEN 0 -- Já atingiu
            ELSE 999 -- Impossível com poupança atual
        END as meses_para_reserva_emergencia,
        
        -- ===== SEÇÃO I: RESUMO EXECUTIVO PERSONALIZADO =====
        CONCAT(
            'PERÍODO ', p_ano_inicio, IF(p_ano_inicio = IFNULL(p_ano_fim, p_ano_inicio), '', CONCAT('-', IFNULL(p_ano_fim, p_ano_inicio))), 
            ': Receita R$ ', FORMAT(tp.receita_total_periodo, 2), 
            ' (', FORMAT(CASE WHEN pa.receita_periodo_anterior > 0 THEN ((tp.receita_total_periodo - pa.receita_periodo_anterior) / pa.receita_periodo_anterior * 100) ELSE 0 END, 1), '% vs período anterior)',
            '. Resultado líquido R$ ', FORMAT((tp.receita_total_periodo - (tp.custos_fixos_essenciais_periodo + tp.custos_fixos_opcionais_periodo + tp.custos_variáveis_necessários_periodo + tp.custos_variáveis_discricionários_periodo + gcp.total_gastos_cartao_periodo + tp.pagamentos_cartão_periodo + tp.investimentos_dividas_periodo)), 2),
            '. Taxa de poupança: ', FORMAT(((tp.receita_total_periodo - (tp.custos_fixos_essenciais_periodo + tp.custos_fixos_opcionais_periodo + tp.custos_variáveis_necessários_periodo + tp.custos_variáveis_discricionários_periodo + gcp.total_gastos_cartao_periodo + tp.pagamentos_cartão_periodo)) / NULLIF(tp.receita_total_periodo, 0) * 100), 1), '%',
            '. Investiu R$ ', FORMAT(tp.total_investido_periodo, 2), 
            ' (', FORMAT((tp.total_investido_periodo / NULLIF(tp.receita_total_periodo, 0) * 100), 1), '% da receita)',
            '. Renda passiva: ', FORMAT((tp.renda_passiva_periodo / NULLIF(tp.receita_total_periodo, 0) * 100), 1), '%',
            '. Status: ', CASE WHEN ((tp.receita_total_periodo - (tp.custos_fixos_essenciais_periodo + tp.custos_fixos_opcionais_periodo + tp.custos_variáveis_necessários_periodo + tp.custos_variáveis_discricionários_periodo + gcp.total_gastos_cartao_periodo + tp.pagamentos_cartão_periodo)) / NULLIF(tp.receita_total_periodo, 0) * 100) >= 20 THEN 'EXCELENTE' WHEN ((tp.receita_total_periodo - (tp.custos_fixos_essenciais_periodo + tp.custos_fixos_opcionais_periodo + tp.custos_variáveis_necessários_periodo + tp.custos_variáveis_discricionários_periodo + gcp.total_gastos_cartao_periodo + tp.pagamentos_cartão_periodo)) / NULLIF(tp.receita_total_periodo, 0) * 100) >= 10 THEN 'ADEQUADA' WHEN ((tp.receita_total_periodo - (tp.custos_fixos_essenciais_periodo + tp.custos_fixos_opcionais_periodo + tp.custos_variáveis_necessários_periodo + tp.custos_variáveis_discricionários_periodo + gcp.total_gastos_cartao_periodo + tp.pagamentos_cartão_periodo)) / NULLIF(tp.receita_total_periodo, 0) * 100) >= 0 THEN 'MÍNIMA' ELSE 'CRÍTICA' END,
            '.'
        ) as resumo_executivo_periodo

    FROM TotaisPeriodo tp, PeriodoAnterior pa, InvestimentosPeriodo ip, 
         CustosRecentesPeriodo crp, SaldoAtual sa, GastosCartaoPeriodo gcp;

END $$
DELIMITER ;