# 📊 Sistema de Relatórios Financeiros Pessoais - FinanPlus

## 📋 Visão Geral

Este sistema foi adaptado da sua lógica empresarial para finanças pessoais, criando views e procedures que fornecem análises detalhadas para dashboard e tomada de decisões financeiras pessoais.

## 🗃️ Arquivos do Sistema

### 1. `relatorio_pf_view.sql`

**VIEW Principal**: `vw_Relatorio_Financeiro_Pessoal`

- Análise completa histórica das finanças pessoais
- Classificação inteligente de receitas e despesas
- Cálculo automático de métricas de saúde financeira
- Alertas e recomendações automatizadas

### 2. `relatorio_pf_procedure.sql`

**PROCEDURE**: `sp_Relatorio_Financeiro_Pessoal_Periodo`

- Análise por período específico (ano ou range de anos)
- Comparação com período anterior
- Projeções e tendências
- Status detalhado de metas e objetivos

### 3. `views_dashboard_auxiliares.sql`

**6 Views Auxiliares** para dashboard:

- Dashboard principal resumido
- Análise por categorias
- Análise de receitas
- Portfolio de investimentos
- Evolução patrimonial mensal
- Alertas automáticos

---

## 🎯 Como Usar

### 📈 Relatório Completo Histórico

```sql
SELECT * FROM vw_Relatorio_Financeiro_Pessoal;
```

**Retorna**: Análise completa de toda a vida financeira

### 📅 Relatório por Período

```sql
-- Ano específico
CALL sp_Relatorio_Financeiro_Pessoal_Periodo(2026, 2026);

-- Range de anos
CALL sp_Relatorio_Financeiro_Pessoal_Periodo(2025, 2026);

-- Comparação anual
CALL sp_Relatorio_Financeiro_Pessoal_Periodo(2024, 2025);
```

### 🎛️ Dashboard Principal

```sql
SELECT * FROM vw_Dashboard_Financeiro_Pessoal;
```

**Ideal para**: KPIs principais, resumo executivo, status atual

### 📊 Análises Específicas

#### Gastos por Categoria

```sql
SELECT * FROM vw_Gastos_Por_Categoria
WHERE prioridade = 'ESSENCIAL'
ORDER BY total_ultimos_3_meses DESC;
```

#### Fontes de Receita

```sql
SELECT * FROM vw_Analise_Receitas
WHERE tipo_renda = 'PASSIVA'
ORDER BY receita_ultimos_3_meses DESC;
```

#### Portfolio de Investimentos

```sql
SELECT * FROM vw_Portfolio_Investimentos
ORDER BY percentual_portfolio DESC;
```

#### Alertas Críticos

```sql
SELECT * FROM vw_Alertas_Financeiros
WHERE nivel = 'CRÍTICO';
```

---

## 📊 Principais Métricas Calculadas

### 🏦 **Patrimônio e Liquidez**

- **Patrimônio Líquido Total**: Saldo bancos + investimentos - dívidas
- **Runway (Reserva)**: Quantos meses consegue viver com saldo atual
- **Reserva de Emergência**: Status (Adequada/Mínima/Insuficiente)

### 💰 **Eficiência Financeira**

- **Taxa de Poupança**: % da receita que consegue economizar
- **Taxa de Investimento**: % da receita destinada a investimentos
- **Taxa de Endividamento**: % da receita comprometida com dívidas

### 📈 **Diversificação**

- **% Renda Passiva**: Independência financeira
- **% Gastos Supérfluos**: Controle de gastos discricionários
- **Crescimento Patrimonial**: Evolução mês a mês

### 🎯 **Metas e Objetivos**

- **Progresso das Metas**: % de conclusão
- **Tempo para Reserva**: Meses para atingir 6 meses de reserva
- **Projeções Anuais**: Baseadas no desempenho atual

---

## 🚨 Sistema de Alertas Automáticos

### 🔴 **Alertas Críticos**

- Liquidez < 3 meses de gastos
- Endividamento > 30% da receita
- Taxa de poupança negativa

### 🟡 **Alertas de Atenção**

- Liquidez < 6 meses de gastos
- Gastos supérfluos > 15% da receita
- Metas com atraso

### 🟢 **Status Saudável**

- Reserva adequada (≥ 6 meses)
- Taxa de poupança ≥ 20%
- Endividamento controlado

---

## 🎨 Adaptações para Dashboard

### Cards Principais (KPIs)

```sql
SELECT
    receita_media_mensal,
    economia_media_mensal,
    patrimonio_liquido,
    status_reserva_emergencia
FROM vw_Dashboard_Financeiro_Pessoal;
```

### Gráfico de Evolução Patrimonial

```sql
SELECT
    mes_ano,
    patrimonio_acumulado,
    crescimento_percentual
FROM vw_Evolucao_Patrimonial_Mensal
ORDER BY mes_ano DESC
LIMIT 12;
```

### Gráfico Pizza - Gastos por Categoria

```sql
SELECT
    categoria,
    total_ultimos_3_meses,
    prioridade
FROM vw_Gastos_Por_Categoria
WHERE total_ultimos_3_meses > 0
ORDER BY total_ultimos_3_meses DESC
LIMIT 10;
```

### Lista de Investimentos

```sql
SELECT
    nome_investimento,
    tipo_investimento,
    valor_investido_liquido,
    percentual_portfolio,
    nivel_risco
FROM vw_Portfolio_Investimentos
ORDER BY valor_investido_liquido DESC;
```

---

## 🧮 Classificação Automática

### 📥 **Receitas**

- **SALARIO_PRINCIPAL**: Salário fixo
- **RENDA_PASSIVA**: Dividendos, rendimentos
- **RENDA_EXTRA**: Vendas ocasionais, freelances
- **CAPITAL_TERCEIROS**: Empréstimos recebidos

### 📤 **Despesas**

- **CUSTOS_FIXOS_ESSENCIAIS**: Aluguel, água, luz
- **CUSTOS_FIXOS_OPCIONAIS**: Planos, assinaturas
- **CUSTOS_VARIÁVEIS_NECESSÁRIOS**: Alimentação, remédios
- **CUSTOS_VARIÁVEIS_DISCRICIONÁRIOS**: Lazer, supérfluos
- **INVESTIMENTOS_DÍVIDAS**: Ações, pagamento empréstimos

---

## 🔄 Exemplos de Uso Prático

### Para Análise Mensal

```sql
-- Situação atual
SELECT
    patrimonio_liquido,
    status_reserva_emergencia,
    tendencia_financeira
FROM vw_Dashboard_Financeiro_Pessoal;

-- Gastos do mês
SELECT categoria, total_ultimo_mes, prioridade
FROM vw_Gastos_Por_Categoria
WHERE total_ultimo_mes > 0
ORDER BY total_ultimo_mes DESC;
```

### Para Planejamento Anual

```sql
-- Performance do ano
CALL sp_Relatorio_Financeiro_Pessoal_Periodo(2026, 2026);

-- Comparar com ano anterior
CALL sp_Relatorio_Financeiro_Pessoal_Periodo(2025, 2026);
```

### Para Revisão de Investimentos

```sql
-- Portfolio atual
SELECT * FROM vw_Portfolio_Investimentos;

-- Diversificação de renda
SELECT * FROM vw_Analise_Receitas
WHERE tipo_renda = 'PASSIVA';
```

---

## 💡 Dicas de Implementação

1. **Execute as views na ordem**: View principal → Procedure → Views auxiliares
2. **Agende execução automática** da procedure mensalmente
3. **Use as views auxiliares** para construir dashboards específicos
4. **Monitore os alertas** para ação proativa
5. **Customize as classificações** conforme suas categorias específicas

Este sistema fornece uma visão 360° das suas finanças pessoais, permitindo tomada de decisão baseada em dados e acompanhamento contínuo da saúde financeira! 🚀
