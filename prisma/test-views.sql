-- =============================================================================
-- SCRIPT DE TESTE PARA AS VIEWS DE ANÁLISE FINANCEIRA
-- Execute este script após instalar as views para verificar se tudo está OK
-- =============================================================================

-- Substitua 'SEU_USER_ID_AQUI' pelo ID real do usuário que você quer testar

SET @user_id = 'SEU_USER_ID_AQUI';

-- =============================================================================
-- 1. VERIFICAR SE AS VIEWS FORAM CRIADAS
-- =============================================================================
SELECT 
    '1. VERIFICAÇÃO DE VIEWS' as teste,
    COUNT(*) as total_views_criadas
FROM information_schema.VIEWS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME LIKE 'vw_%';

-- Listar todas as views
SELECT 
    TABLE_NAME as nome_view,
    VIEW_DEFINITION as definicao_resumida
FROM information_schema.VIEWS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME LIKE 'vw_%';

-- =============================================================================
-- 2. TESTAR DASHBOARD PRINCIPAL
-- =============================================================================
SELECT '2. DASHBOARD PRINCIPAL' as teste;

SELECT 
    userId,
    FORMAT(patrimonio_liquido_atual, 2) as patrimonio_liquido,
    FORMAT(saldo_contas_correntes, 2) as saldo_contas,
    FORMAT(valor_investido_total, 2) as investimentos,
    FORMAT(divida_cartoes_atual, 2) as dividas,
    FORMAT(taxa_poupanca_percentual, 1) as taxa_poupanca_pct,
    FORMAT(meses_reserva_emergencia, 1) as meses_reserva,
    status_saude_financeira
FROM vw_Dashboard_Principal 
WHERE userId = @user_id;

-- =============================================================================
-- 3. TESTAR GASTOS POR CATEGORIA
-- =============================================================================
SELECT '3. GASTOS POR CATEGORIA' as teste;

SELECT 
    categoria,
    FORMAT(media_mensal_3_meses, 2) as media_mensal,
    classificacao_categoria,
    frequencia_uso,
    FORMAT(variacao_mes_anterior_percentual, 1) as variacao_pct,
    alerta_variacao
FROM vw_Gastos_Por_Categoria 
WHERE userId = @user_id
ORDER BY total_ultimos_3_meses DESC
LIMIT 5;

-- =============================================================================
-- 4. TESTAR ANÁLISE DE RECEITAS
-- =============================================================================
SELECT '4. ANÁLISE DE RECEITAS' as teste;

SELECT 
    fonte_receita,
    FORMAT(receita_ultimos_3_meses / 3, 2) as media_mensal,
    tipo_renda,
    regularidade,
    FORMAT(percentual_renda_total_3_meses, 1) as percentual_total
FROM vw_Analise_Receitas 
WHERE userId = @user_id
ORDER BY receita_ultimos_3_meses DESC
LIMIT 5;

-- =============================================================================
-- 5. TESTAR PORTFOLIO DE INVESTIMENTOS
-- =============================================================================
SELECT '5. PORTFOLIO DE INVESTIMENTOS' as teste;

SELECT 
    nome_investimento,
    tipo_investimento,
    FORMAT(valor_investido_liquido, 2) as valor_investido,
    nivel_risco,
    FORMAT(percentual_portfolio, 1) as percentual_portfolio,
    frequencia_aportes
FROM vw_Portfolio_Investimentos 
WHERE userId = @user_id
ORDER BY valor_investido_liquido DESC;

-- =============================================================================
-- 6. TESTAR ANÁLISE DE CARTÕES
-- =============================================================================
SELECT '6. ANÁLISE DE CARTÕES' as teste;

SELECT 
    nome_cartao,
    FORMAT(divida_atual, 2) as divida,
    FORMAT(limite_total, 2) as limite,
    FORMAT(percentual_utilizado, 1) as utilizacao_pct,
    status_utilizacao,
    score_saude_cartao,
    alerta_pagamento
FROM vw_Analise_Cartoes_Credito 
WHERE userId = @user_id
ORDER BY score_saude_cartao ASC;

-- =============================================================================
-- 7. TESTAR EVOLUÇÃO PATRIMONIAL
-- =============================================================================
SELECT '7. EVOLUÇÃO PATRIMONIAL' as teste;

SELECT 
    mes_ano,
    FORMAT(receita_mes, 2) as receitas,
    FORMAT(despesa_mes, 2) as despesas,
    FORMAT(saldo_liquido_real_mes, 2) as saldo,
    FORMAT(taxa_poupanca_mes_percentual, 1) as taxa_poupanca,
    desempenho_mes
FROM vw_Evolucao_Patrimonial 
WHERE userId = @user_id
ORDER BY ano DESC, mes DESC
LIMIT 6;

-- =============================================================================
-- 8. TESTAR ANÁLISE DE METAS
-- =============================================================================
SELECT '8. ANÁLISE DE METAS' as teste;

SELECT 
    nome_meta,
    FORMAT(valor_atual, 2) as valor_atual,
    FORMAT(valor_objetivo, 2) as objetivo,
    FORMAT(progresso_percentual, 1) as progresso_pct,
    dias_restantes,
    status_prazo,
    viabilidade,
    FORMAT(valor_necessario_por_mes, 2) as necessario_mes
FROM vw_Analise_Metas 
WHERE userId = @user_id
ORDER BY dias_restantes ASC;

-- =============================================================================
-- 9. TESTAR ALERTAS FINANCEIROS
-- =============================================================================
SELECT '9. ALERTAS FINANCEIROS' as teste;

SELECT 
    tipo_alerta,
    nivel_prioridade,
    titulo,
    mensagem,
    acao_sugerida
FROM vw_Alertas_Financeiros 
WHERE userId = @user_id
ORDER BY 
    CASE 
        WHEN nivel_prioridade = 'CRÍTICO' THEN 1
        WHEN nivel_prioridade = 'ALTO' THEN 2
        WHEN nivel_prioridade = 'MÉDIO' THEN 3
        ELSE 4
    END;

-- =============================================================================
-- 10. ESTATÍSTICAS GERAIS DO USUÁRIO
-- =============================================================================
SELECT '10. ESTATÍSTICAS GERAIS' as teste;

SELECT 
    'Transações Totais' as metrica,
    COUNT(*) as valor
FROM Transaction 
WHERE userId = @user_id AND status = 'COMPLETED'

UNION ALL

SELECT 
    'Transações Últimos 3 Meses' as metrica,
    COUNT(*) as valor
FROM Transaction 
WHERE userId = @user_id 
  AND status = 'COMPLETED'
  AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)

UNION ALL

SELECT 
    'Contas Bancárias' as metrica,
    COUNT(*) as valor
FROM BankAccount 
WHERE userId = @user_id

UNION ALL

SELECT 
    'Cartões de Crédito' as metrica,
    COUNT(*) as valor
FROM CreditCard 
WHERE userId = @user_id

UNION ALL

SELECT 
    'Investimentos' as metrica,
    COUNT(*) as valor
FROM Investment 
WHERE userId = @user_id

UNION ALL

SELECT 
    'Metas Ativas' as metrica,
    COUNT(*) as valor
FROM Goal 
WHERE userId = @user_id AND targetDate >= CURDATE()

UNION ALL

SELECT 
    'Categorias de Despesa' as metrica,
    COUNT(DISTINCT categoryId) as valor
FROM Transaction 
WHERE userId = @user_id 
  AND type = 'EXPENSE' 
  AND status = 'COMPLETED';

-- =============================================================================
-- 11. RESUMO EXECUTIVO
-- =============================================================================
SELECT '11. RESUMO EXECUTIVO' as teste;

SELECT 
    CONCAT(
        '📊 RESUMO FINANCEIRO:\n',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n',
        '💰 Patrimônio: R$ ', FORMAT(patrimonio_liquido_atual, 2), '\n',
        '📈 Status: ', status_saude_financeira, '\n',
        '💵 Taxa de Poupança: ', FORMAT(taxa_poupanca_percentual, 1), '%\n',
        '🏦 Reserva: ', FORMAT(meses_reserva_emergencia, 1), ' meses\n',
        '💳 Dívida Cartões: R$ ', FORMAT(divida_cartoes_atual, 2), '\n',
        '📊 Investimentos: R$ ', FORMAT(valor_investido_total, 2), '\n',
        '🎯 Metas Ativas: ', total_metas_ativas, '\n',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    ) as resumo_executivo
FROM vw_Dashboard_Principal 
WHERE userId = @user_id;

-- =============================================================================
-- RESULTADO DO TESTE
-- =============================================================================
SELECT 
    '✅ TESTE CONCLUÍDO' as status,
    'Se você viu dados nas consultas acima, as views estão funcionando!' as mensagem,
    'Acesse http://localhost:3000/dashboard/analytics para ver a dashboard' as proximo_passo;
