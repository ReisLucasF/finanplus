-- =============================================================================
-- VIEW: RELATÓRIO FINANCEIRO PESSOAL AVANÇADO
-- Baseado na estrutura do banco FinanPlus (Finanças Pessoais)
-- Adaptado da lógica empresarial para uso pessoal
-- =============================================================================

CREATE OR REPLACE VIEW vw_Relatorio_Financeiro_Pessoal AS
WITH 
    -- 1. IDENTIFICAR O PERÍODO RECENTE
    Parametros AS (
        SELECT 
            MAX(date) as data_referencia 
        FROM Transaction
        WHERE status = 'COMPLETED'
    ),

    -- 2. CLASSIFICAÇÃO FINANCEIRA PESSOAL (ADAPTADA PARA PF)
    ClassificacaoTransacoes AS (
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
                WHEN t.type = 'EXPENSE' AND c.name IN ('Alimentação', 'Alimentação Pets') THEN 'CUSTOS_VARIÁVEIS_NECESSÁRIOS'
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
        WHERE t.status = 'COMPLETED'
    ),

    -- 3. CLASSIFICAÇÃO DE GASTOS NO CARTÃO DE CRÉDITO
    ClassificacaoCartao AS (
        SELECT 
            cp.amount as valor,
            'EXPENSE' as type,
            c.name as categoria_nome,
            cp.date as data_transacao,
            cc.name as cartao_nome,
            CASE 
                WHEN c.name IN ('Alimentação', 'Alimentação Pets') THEN 'CUSTOS_VARIÁVEIS_NECESSÁRIOS'
                WHEN c.name IN ('Plano de saúde', 'Assinaturas') THEN 'CUSTOS_FIXOS_OPCIONAIS'
                WHEN c.name IN ('Lazer', 'Outras Despesas') THEN 'CUSTOS_VARIÁVEIS_DISCRICIONÁRIOS'
                ELSE 'OUTRAS_DESPESAS'
            END as grupo_financeiro
        FROM CreditCardPurchase cp
        LEFT JOIN Category c ON cp.categoryId = c.id
        LEFT JOIN CreditCard cc ON cp.creditCardId = cc.id
    ),

    -- 4. CÁLCULO DA MÉDIA DE CUSTOS FIXOS (ÚLTIMOS 3 MESES)
    CustosRecentesTransacoes AS (
        SELECT 
            COALESCE(AVG(total_mensal.custos_fixos), 0) as media_custos_fixos_3meses,
            COALESCE(AVG(total_mensal.custos_variáveis), 0) as media_custos_variáveis_3meses
        FROM (
            SELECT 
                DATE_FORMAT(data_transacao, '%Y-%m') as mes_ano,
                SUM(CASE WHEN grupo_financeiro IN ('CUSTOS_FIXOS_ESSENCIAIS', 'CUSTOS_FIXOS_OPCIONAIS') THEN valor ELSE 0 END) as custos_fixos,
                SUM(CASE WHEN grupo_financeiro IN ('CUSTOS_VARIÁVEIS_NECESSÁRIOS', 'CUSTOS_VARIÁVEIS_DISCRICIONÁRIOS') THEN valor ELSE 0 END) as custos_variáveis
            FROM ClassificacaoTransacoes
            WHERE data_transacao >= DATE_SUB((SELECT data_referencia FROM Parametros), INTERVAL 3 MONTH)
              AND grupo_financeiro LIKE 'CUSTOS_%'
            GROUP BY DATE_FORMAT(data_transacao, '%Y-%m')
        ) total_mensal
    ),

    -- 5. CÁLCULO DA MÉDIA DE CUSTOS FIXOS NO CARTÃO (ÚLTIMOS 3 MESES)
    CustosRecentesCartao AS (
        SELECT 
            COALESCE(AVG(total_mensal.custos_fixos_cartao), 0) as media_custos_fixos_cartao_3meses,
            COALESCE(AVG(total_mensal.custos_variáveis_cartao), 0) as media_custos_variáveis_cartao_3meses
        FROM (
            SELECT 
                DATE_FORMAT(data_transacao, '%Y-%m') as mes_ano,
                SUM(CASE WHEN grupo_financeiro IN ('CUSTOS_FIXOS_OPCIONAIS') THEN valor ELSE 0 END) as custos_fixos_cartao,
                SUM(CASE WHEN grupo_financeiro IN ('CUSTOS_VARIÁVEIS_NECESSÁRIOS', 'CUSTOS_VARIÁVEIS_DISCRICIONÁRIOS') THEN valor ELSE 0 END) as custos_variáveis_cartao
            FROM ClassificacaoCartao
            WHERE data_transacao >= DATE_SUB((SELECT data_referencia FROM Parametros), INTERVAL 3 MONTH)
            GROUP BY DATE_FORMAT(data_transacao, '%Y-%m')
        ) total_mensal
    ),

    -- 6. TOTAIS ACUMULADOS (HISTÓRICO COMPLETO)
    TotaisHistoricos AS (
        SELECT 
            -- RECEITAS
            SUM(CASE WHEN grupo_financeiro = 'SALARIO_PRINCIPAL' THEN valor ELSE 0 END) as salario_total,
            SUM(CASE WHEN grupo_financeiro = 'RENDA_PASSIVA' THEN valor ELSE 0 END) as renda_passiva_total,
            SUM(CASE WHEN grupo_financeiro = 'RENDA_EXTRA' THEN valor ELSE 0 END) as renda_extra_total,
            SUM(CASE WHEN grupo_financeiro = 'CAPITAL_TERCEIROS' THEN valor ELSE 0 END) as emprestimos_recebidos,
            SUM(CASE WHEN grupo_financeiro LIKE '%RECEITA%' OR grupo_financeiro IN ('SALARIO_PRINCIPAL', 'RENDA_PASSIVA', 'RENDA_EXTRA') THEN valor ELSE 0 END) as receita_total,
            
            -- DESPESAS
            SUM(CASE WHEN grupo_financeiro = 'CUSTOS_FIXOS_ESSENCIAIS' THEN valor ELSE 0 END) as custos_fixos_essenciais,
            SUM(CASE WHEN grupo_financeiro = 'CUSTOS_FIXOS_OPCIONAIS' THEN valor ELSE 0 END) as custos_fixos_opcionais,
            SUM(CASE WHEN grupo_financeiro = 'CUSTOS_VARIÁVEIS_NECESSÁRIOS' THEN valor ELSE 0 END) as custos_variáveis_necessários,
            SUM(CASE WHEN grupo_financeiro = 'CUSTOS_VARIÁVEIS_DISCRICIONÁRIOS' THEN valor ELSE 0 END) as custos_variáveis_discricionários,
            SUM(CASE WHEN grupo_financeiro = 'INVESTIMENTOS_DÍVIDAS' THEN valor ELSE 0 END) as pagamentos_dividas_investimentos,
            SUM(CASE WHEN grupo_financeiro = 'PAGAMENTO_CARTÃO' THEN valor ELSE 0 END) as pagamentos_cartão,
            
            -- INVESTIMENTOS
            SUM(valor_investimento_aplicado) as total_investido_historico
        FROM ClassificacaoTransacoes
    ),

    -- 7. TOTAIS DO CARTÃO DE CRÉDITO
    TotaisCartao AS (
        SELECT 
            SUM(CASE WHEN grupo_financeiro = 'CUSTOS_FIXOS_OPCIONAIS' THEN valor ELSE 0 END) as custos_fixos_cartao,
            SUM(CASE WHEN grupo_financeiro IN ('CUSTOS_VARIÁVEIS_NECESSÁRIOS', 'CUSTOS_VARIÁVEIS_DISCRICIONÁRIOS') THEN valor ELSE 0 END) as custos_variáveis_cartao,
            SUM(valor) as total_gastos_cartao
        FROM ClassificacaoCartao
    ),

    -- 8. SALDO ATUAL DAS CONTAS CORRENTES
    SaldoAtualContas AS (
        SELECT 
            SUM(currentBalance) as saldo_total_bancos,
            COUNT(*) as quantidade_contas,
            AVG(currentBalance) as saldo_medio_conta
        FROM BankAccount
    ),

    -- 9. SITUAÇÃO DOS CARTÕES DE CRÉDITO
    SituacaoCartoes AS (
        SELECT 
            SUM(cardLimit) as limite_total_disponível,
            SUM(initialDebt) as dívida_inicial_total,
            COUNT(*) as quantidade_cartões,
            AVG(cardLimit) as limite_medio_cartao,
            -- Estimativa da dívida atual (dívida inicial + gastos - pagamentos)
            SUM(initialDebt) + COALESCE((SELECT SUM(valor) FROM ClassificacaoCartao), 0) - 
            (SELECT COALESCE(SUM(CASE WHEN grupo_financeiro = 'PAGAMENTO_CARTÃO' THEN valor ELSE 0 END), 0) FROM ClassificacaoTransacoes) as dívida_estimada_atual
        FROM CreditCard
    ),

    -- 10. POSIÇÃO EM INVESTIMENTOS
    PosicaoInvestimentos AS (
        SELECT 
            SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END) as valor_investido_líquido,
            COUNT(DISTINCT i.id) as quantidade_investimentos,
            COUNT(it.id) as quantidade_transações,
            AVG(CASE WHEN it.type = 'BUY' THEN it.amount END) as valor_medio_aporte
        FROM InvestmentTransaction it
        LEFT JOIN Investment i ON it.investmentId = i.id
    ),

    -- 11. METAS FINANCEIRAS
    ProgressoMetas AS (
        SELECT 
            COUNT(*) as total_metas,
            SUM(targetAmount) as valor_total_metas,
            SUM(currentAmount) as valor_atual_metas,
            AVG((currentAmount / targetAmount) * 100) as progresso_medio_metas,
            COUNT(CASE WHEN targetDate < CURDATE() AND currentAmount < targetAmount THEN 1 END) as metas_atrasadas
        FROM Goal
    ),

    -- 12. TRANSAÇÕES RECORRENTES (PREVISIBILIDADE)
    ReceitaRecorrente AS (
        SELECT 
            SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as receita_recorrente_mensal,
            SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as despesa_recorrente_mensal,
            COUNT(CASE WHEN type = 'INCOME' THEN 1 END) as quantidade_receitas_recorrentes,
            COUNT(CASE WHEN type = 'EXPENSE' THEN 1 END) as quantidade_despesas_recorrentes
        FROM RecurringTransaction
        WHERE isActive = '1' AND frequency = 'MONTHLY'
    )

-- RELATÓRIO FINAL UNIFICADO PARA FINANÇAS PESSOAIS
SELECT
    -- ===== BLOCO A: VISÃO GERAL FINANCEIRA =====
    t.receita_total as receita_total_histórica,
    (t.custos_fixos_essenciais + t.custos_fixos_opcionais + t.custos_variáveis_necessários + 
     t.custos_variáveis_discricionários + t.pagamentos_dividas_investimentos + t.pagamentos_cartão + 
     tc.total_gastos_cartao) as despesas_total_históricas,
    
    -- Resultado Líquido (Receitas - Despesas)
    (t.receita_total - (t.custos_fixos_essenciais + t.custos_fixos_opcionais + t.custos_variáveis_necessários + 
     t.custos_variáveis_discricionários + t.pagamentos_dividas_investimentos + t.pagamentos_cartão + 
     tc.total_gastos_cartao)) as resultado_líquido_histórico,

    -- ===== BLOCO B: BREAKDOWN DE RECEITAS =====
    t.salario_total as total_salários_recebidos,
    t.renda_passiva_total as total_renda_passiva,
    t.renda_extra_total as total_renda_extra,
    (t.renda_passiva_total / NULLIF(t.receita_total, 0) * 100) as percentual_renda_passiva,
    
    -- ===== BLOCO C: BREAKDOWN DE DESPESAS =====
    t.custos_fixos_essenciais as gastos_fixos_essenciais,
    t.custos_fixos_opcionais as gastos_fixos_opcionais,
    t.custos_variáveis_necessários as gastos_variáveis_necessários,
    t.custos_variáveis_discricionários as gastos_variáveis_discricionários,
    tc.total_gastos_cartao as gastos_cartão_crédito,
    
    -- Percentuais por categoria
    (t.custos_fixos_essenciais / NULLIF(t.receita_total, 0) * 100) as perc_gastos_fixos_essenciais,
    (t.custos_variáveis_discricionários / NULLIF(t.receita_total, 0) * 100) as perc_gastos_discricionários,
    
    -- ===== BLOCO D: SITUAÇÃO PATRIMONIAL ATUAL =====
    sac.saldo_total_bancos as saldo_contas_correntes,
    sc.dívida_estimada_atual as dívida_cartões_estimada,
    (sac.saldo_total_bancos - sc.dívida_estimada_atual) as patrimônio_líquido_bancário,
    pi.valor_investido_líquido as valor_investimentos,
    (sac.saldo_total_bancos - sc.dívida_estimada_atual + pi.valor_investido_líquido) as patrimônio_líquido_total,
    
    -- ===== BLOCO E: CAPACIDADE FINANCEIRA E SEGURANÇA =====
    (crt.media_custos_fixos_3meses + crt.media_custos_variáveis_3meses + 
     crc.media_custos_fixos_cartao_3meses + crc.media_custos_variáveis_cartao_3meses) as custo_vida_mensal_médio,
    
    -- Runway (quantos meses consegue viver com o saldo atual)
    CASE 
        WHEN (crt.media_custos_fixos_3meses + crt.media_custos_variáveis_3meses + 
              crc.media_custos_fixos_cartao_3meses + crc.media_custos_variáveis_cartao_3meses) > 0
        THEN sac.saldo_total_bancos / (crt.media_custos_fixos_3meses + crt.media_custos_variáveis_3meses + 
                                       crc.media_custos_fixos_cartao_3meses + crc.media_custos_variáveis_cartao_3meses)
        ELSE 999
    END as runway_meses_reserva,
    
    -- Reserva de emergência recomendada (6 meses de custos)
    (crt.media_custos_fixos_3meses + crt.media_custos_variáveis_3meses + 
     crc.media_custos_fixos_cartao_3meses + crc.media_custos_variáveis_cartao_3meses) * 6 as reserva_emergência_recomendada,
    
    -- Status da reserva de emergência
    CASE 
        WHEN sac.saldo_total_bancos >= (crt.media_custos_fixos_3meses + crt.media_custos_variáveis_3meses + 
                                        crc.media_custos_fixos_cartao_3meses + crc.media_custos_variáveis_cartao_3meses) * 6
        THEN 'ADEQUADA'
        WHEN sac.saldo_total_bancos >= (crt.media_custos_fixos_3meses + crt.media_custos_variáveis_3meses + 
                                        crc.media_custos_fixos_cartao_3meses + crc.media_custos_variáveis_cartao_3meses) * 3
        THEN 'MÍNIMA'
        ELSE 'INSUFICIENTE'
    END as status_reserva_emergência,
    
    -- ===== BLOCO F: EFICIÊNCIA E CONTROLE FINANCEIRO =====
    -- Taxa de Poupança
    ((t.receita_total - (t.custos_fixos_essenciais + t.custos_fixos_opcionais + t.custos_variáveis_necessários + 
      t.custos_variáveis_discricionários + tc.total_gastos_cartao)) / NULLIF(t.receita_total, 0) * 100) as taxa_poupança_histórica,
    
    -- Taxa de Investimento
    (t.total_investido_historico / NULLIF(t.receita_total, 0) * 100) as taxa_investimento_histórica,
    
    -- Endividamento
    (sc.dívida_estimada_atual / NULLIF(t.receita_total, 0) * 100) as taxa_endividamento,
    
    -- ===== BLOCO G: PREVISIBILIDADE (RECEITAS/DESPESAS RECORRENTES) =====
    rr.receita_recorrente_mensal,
    rr.despesa_recorrente_mensal,
    (rr.receita_recorrente_mensal - rr.despesa_recorrente_mensal) as saldo_recorrente_mensal,
    (rr.receita_recorrente_mensal / NULLIF((rr.receita_recorrente_mensal + rr.despesa_recorrente_mensal), 0) * 100) as taxa_previsibilidade_receita,
    
    -- ===== BLOCO H: METAS E OBJETIVOS =====
    pm.total_metas,
    pm.valor_total_metas,
    pm.progresso_medio_metas,
    pm.metas_atrasadas,
    CASE 
        WHEN pm.progresso_medio_metas >= 80 THEN 'NO CAMINHO'
        WHEN pm.progresso_medio_metas >= 50 THEN 'ATENÇÃO'
        ELSE 'ATRASADO'
    END as status_metas,
    
    -- ===== BLOCO I: ALERTAS E RECOMENDAÇÕES =====
    -- Alertas de Liquidez
    CASE 
        WHEN sac.saldo_total_bancos / (crt.media_custos_fixos_3meses + crt.media_custos_variáveis_3meses + 
                                       crc.media_custos_fixos_cartao_3meses + crc.media_custos_variáveis_cartao_3meses) < 3
        THEN 'CRÍTICO: Liquidez < 3 meses'
        WHEN sac.saldo_total_bancos / (crt.media_custos_fixos_3meses + crt.media_custos_variáveis_3meses + 
                                       crc.media_custos_fixos_cartao_3meses + crc.media_custos_variáveis_cartao_3meses) < 6
        THEN 'ATENÇÃO: Liquidez < 6 meses'
        ELSE 'SAUDÁVEL'
    END as alerta_liquidez,
    
    -- Alertas de Endividamento
    CASE 
        WHEN (sc.dívida_estimada_atual / NULLIF(t.receita_total, 0) * 100) > 30 THEN 'ALTO: Endividamento > 30%'
        WHEN (sc.dívida_estimada_atual / NULLIF(t.receita_total, 0) * 100) > 20 THEN 'MODERADO: Endividamento > 20%'
        ELSE 'BAIXO'
    END as alerta_endividamento,
    
    -- Alertas de Gastos Discricionários
    CASE 
        WHEN (t.custos_variáveis_discricionários / NULLIF(t.receita_total, 0) * 100) > 15 THEN 'ALTO: Gastos supérfluos > 15%'
        WHEN (t.custos_variáveis_discricionários / NULLIF(t.receita_total, 0) * 100) > 10 THEN 'MODERADO: Gastos supérfluos > 10%'
        ELSE 'CONTROLADO'
    END as alerta_gastos_supérfluos,
    
    -- ===== BLOCO J: RESUMO EXECUTIVO =====
    CONCAT(
        'FINANÇAS PESSOAIS: Receita histórica R$ ', FORMAT(t.receita_total, 2), 
        '. Resultado líquido R$ ', FORMAT((t.receita_total - (t.custos_fixos_essenciais + t.custos_fixos_opcionais + t.custos_variáveis_necessários + t.custos_variáveis_discricionários + t.pagamentos_dividas_investimentos + t.pagamentos_cartão + tc.total_gastos_cartao)), 2),
        '. Patrimônio líquido R$ ', FORMAT((sac.saldo_total_bancos - sc.dívida_estimada_atual + pi.valor_investido_líquido), 2),
        '. Taxa de poupança: ', FORMAT(((t.receita_total - (t.custos_fixos_essenciais + t.custos_fixos_opcionais + t.custos_variáveis_necessários + t.custos_variáveis_discricionários + tc.total_gastos_cartao)) / NULLIF(t.receita_total, 0) * 100), 1), '%',
        '. Reserva para ', FORMAT(CASE WHEN (crt.media_custos_fixos_3meses + crt.media_custos_variáveis_3meses + crc.media_custos_fixos_cartao_3meses + crc.media_custos_variáveis_cartao_3meses) > 0 THEN sac.saldo_total_bancos / (crt.media_custos_fixos_3meses + crt.media_custos_variáveis_3meses + crc.media_custos_fixos_cartao_3meses + crc.media_custos_variáveis_cartao_3meses) ELSE 999 END, 1), ' meses',
        '. Status: ', CASE WHEN sac.saldo_total_bancos / (crt.media_custos_fixos_3meses + crt.media_custos_variáveis_3meses + crc.media_custos_fixos_cartao_3meses + crc.media_custos_variáveis_cartao_3meses) < 3 THEN 'CRÍTICO' WHEN sac.saldo_total_bancos / (crt.media_custos_fixos_3meses + crt.media_custos_variáveis_3meses + crc.media_custos_fixos_cartao_3meses + crc.media_custos_variáveis_cartao_3meses) < 6 THEN 'ATENÇÃO' ELSE 'SAUDÁVEL' END,
        '. Renda passiva representa ', FORMAT((t.renda_passiva_total / NULLIF(t.receita_total, 0) * 100), 1), '% da receita total.'
    ) as resumo_executivo_pessoal

FROM TotaisHistoricos t, TotaisCartao tc, SaldoAtualContas sac, SituacaoCartoes sc, 
     PosicaoInvestimentos pi, ProgressoMetas pm, ReceitaRecorrente rr,
     CustosRecentesTransacoes crt, CustosRecentesCartao crc;