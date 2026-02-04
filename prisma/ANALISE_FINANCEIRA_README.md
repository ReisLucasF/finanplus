# 📊 Análise Financeira Completa - FinanPlus

## Visão Geral

Este módulo implementa uma análise financeira avançada para pessoa física, com 8 VIEWs SQL que fornecem insights detalhados sobre:

- 💰 Patrimônio líquido e saúde financeira
- 📈 Taxa de poupança e reserva de emergência
- 💳 Análise de cartões de crédito
- 🎯 Acompanhamento de metas
- 📊 Portfolio de investimentos
- ⚠️ Alertas e recomendações inteligentes

## 🚀 Instalação

### 1. Criar as VIEWs no Banco de Dados

Execute o arquivo SQL no seu banco MySQL:

```bash
mysql -u seu_usuario -p seu_banco < prisma/views_financeiras_pf.sql
```

Ou use uma ferramenta GUI como MySQL Workbench, phpMyAdmin, DBeaver, etc.

**IMPORTANTE:** As views foram criadas com `CREATE OR REPLACE VIEW`, então você pode executar o script múltiplas vezes sem problemas.

### 2. Verificar se as Views foram criadas

```sql
-- Ver todas as views criadas
SHOW FULL TABLES WHERE Table_type = 'VIEW';

-- Testar uma view específica (substitua 'seu-user-id' pelo ID real)
SELECT * FROM vw_Dashboard_Principal WHERE userId = 'seu-user-id';
```

### 3. Acessar a Dashboard

Após fazer login no sistema, acesse:

```
http://localhost:3000/dashboard/analytics
```

Ou clique no menu lateral em **"Análise Financeira"** (ícone de gráfico de barras).

## 📋 VIEWs Disponíveis

### 1. `vw_Dashboard_Principal`

**Dados principais do usuário**

Retorna:

- Patrimônio líquido (contas + investimentos - dívidas)
- Receitas e despesas médias (1 mês e 3 meses)
- Taxa de poupança (%)
- Reserva de emergência (em meses)
- Status de saúde financeira (EXCELENTE, BOM, ATENÇÃO, CRÍTICO)
- Informações sobre cartões e metas

**Exemplo:**

```sql
SELECT * FROM vw_Dashboard_Principal
WHERE userId = 'seu-user-id';
```

### 2. `vw_Gastos_Por_Categoria`

**Análise detalhada de despesas**

Retorna para cada categoria:

- Total gasto (1, 3, 6, 12 meses)
- Média mensal
- Classificação (ESSENCIAL, IMPORTANTE, SUPÉRFLUO, etc)
- Frequência de uso
- Variação percentual vs mês anterior
- Alertas de aumento significativo

**Exemplo:**

```sql
SELECT * FROM vw_Gastos_Por_Categoria
WHERE userId = 'seu-user-id'
ORDER BY total_ultimos_3_meses DESC
LIMIT 10;
```

### 3. `vw_Analise_Receitas`

**Fontes de renda e regularidade**

Retorna:

- Receitas por período
- Classificação (ATIVA_PRINCIPAL, PASSIVA, EXTRA_VARIÁVEL)
- Regularidade (MUITO_REGULAR, REGULAR, OCASIONAL)
- Percentual da renda total
- Crescimento entre períodos

**Exemplo:**

```sql
SELECT * FROM vw_Analise_Receitas
WHERE userId = 'seu-user-id'
ORDER BY receita_ultimos_3_meses DESC;
```

### 4. `vw_Portfolio_Investimentos`

**Análise completa do portfolio**

Retorna:

- Posição atual e preço médio
- Classificação por risco (BAIXO, MÉDIO, ALTO, MUITO_ALTO)
- Liquidez e frequência de aportes
- Percentual do portfolio total
- Alocação recomendada

**Exemplo:**

```sql
SELECT * FROM vw_Portfolio_Investimentos
WHERE userId = 'seu-user-id'
ORDER BY valor_investido_liquido DESC;
```

### 5. `vw_Analise_Cartoes_Credito`

**Gestão de cartões de crédito**

Retorna:

- Utilização do limite (%)
- Status (CRÍTICO/ALTO/MODERADO/SAUDÁVEL)
- Compras por período
- **Score de saúde do cartão** (0-100)
- Alertas de vencimento
- Categoria mais gasta

**Exemplo:**

```sql
SELECT * FROM vw_Analise_Cartoes_Credito
WHERE userId = 'seu-user-id'
ORDER BY score_saude_cartao ASC;
```

### 6. `vw_Evolucao_Patrimonial`

**Evolução mês a mês**

Retorna:

- Receitas, despesas e saldo líquido mensal
- Taxa de poupança do mês
- Classificação (EXCELENTE_POUPANCA, BOA_POUPANCA, DEFICIT)
- Desempenho (POSITIVO/NEUTRO/NEGATIVO)

**Exemplo:**

```sql
SELECT * FROM vw_Evolucao_Patrimonial
WHERE userId = 'seu-user-id'
ORDER BY ano DESC, mes DESC
LIMIT 12;
```

### 7. `vw_Analise_Metas`

**Acompanhamento de metas financeiras**

Retorna:

- Progresso (%)
- Valor necessário por mês
- **Viabilidade** (VIÁVEL, DESAFIADORA, INVIÁVEL_NO_PRAZO)
- Data estimada de conclusão
- Recomendações personalizadas

**Exemplo:**

```sql
SELECT * FROM vw_Analise_Metas
WHERE userId = 'seu-user-id'
ORDER BY dias_restantes ASC;
```

### 8. `vw_Alertas_Financeiros`

**Sistema de alertas inteligente**

Retorna alertas sobre:

- ⚠️ Reserva de emergência insuficiente
- 💳 Cartões próximos do limite
- 📅 Faturas vencidas
- 🎯 Metas inviáveis
- 📉 Taxa de poupança baixa

**Exemplo:**

```sql
SELECT * FROM vw_Alertas_Financeiros
WHERE userId = 'seu-user-id'
ORDER BY
    CASE
        WHEN nivel_prioridade = 'CRÍTICO' THEN 1
        WHEN nivel_prioridade = 'ALTO' THEN 2
        WHEN nivel_prioridade = 'MÉDIO' THEN 3
        ELSE 4
    END;
```

## 🎨 Interface da Dashboard

A dashboard foi desenvolvida com:

- ✅ **Design Responsivo** - Funciona perfeitamente em mobile e desktop
- ✅ **Dark Mode** - Suporte completo a tema escuro
- ✅ **Gráficos Interativos** - Visualização de dados com Highcharts
- ✅ **Cards Informativos** - KPIs principais em destaque
- ✅ **Alertas Prioritários** - Sistema de cores por prioridade
- ✅ **Score de Saúde** - Classificação visual (EXCELENTE → CRÍTICO)

### Componentes Principais:

1. **Status de Saúde Financeira** - Banner destacado no topo
2. **Alertas e Recomendações** - Ações sugeridas prioritárias
3. **KPIs Principais** - 4 cards com métricas essenciais
4. **Receitas vs Despesas** - Análise comparativa
5. **Gráficos de Pizza** - Distribuição visual de gastos/receitas
6. **Análise de Cartões** - Score e utilização detalhada
7. **Portfolio de Investimentos** - Alocação e risco
8. **Metas** - Progresso e viabilidade
9. **Evolução Patrimonial** - Tabela com histórico mensal

## 📊 Métricas e Indicadores

### Taxa de Poupança (Savings Rate)

```
Taxa = ((Receita - Despesa) / Receita) × 100
```

- **Excelente**: ≥ 30%
- **Bom**: 20-30%
- **Regular**: 10-20%
- **Baixo**: < 10%

### Reserva de Emergência

```
Meses = Saldo em Contas / Despesa Média Mensal
```

- **Recomendado**: 6 meses
- **Mínimo aceitável**: 3 meses
- **Crítico**: < 3 meses

### Score de Saúde do Cartão (0-100)

```
Score = Utilização(50pts) + Pagamentos(30pts) + Controle(20pts)
```

- **Excelente**: 70-100
- **Bom**: 40-69
- **Ruim**: 0-39

### Status de Saúde Financeira

Avaliação combinada de:

- Reserva de emergência ≥ 6 meses
- Taxa de poupança ≥ 20%
- Dívida de cartões < 30% da renda

## 🔧 Personalização

### Adicionar novas categorias na classificação

Edite o arquivo `views_financeiras_pf.sql` e procure por:

```sql
CASE
    WHEN c.name IN ('Aluguel', 'Alimentação', ...) THEN 'ESSENCIAL'
    -- Adicione suas categorias aqui
END as classificacao_categoria
```

### Alterar limites de alertas

Procure por seções como:

```sql
WHEN saldo_total < (gasto_medio_mensal * 3) THEN 'CRÍTICO'
```

E ajuste os multiplicadores conforme necessário.

### Adicionar novos tipos de investimento

No `schema.prisma`:

```prisma
enum InvestmentType {
  STOCKS
  CDB
  FUNDS
  TREASURY
  CRYPTO
  REAL_ESTATE
  OTHER
  SEU_NOVO_TIPO  // Adicione aqui
}
```

## 🐛 Troubleshooting

### Views não aparecem

```sql
-- Verificar se foram criadas
SHOW FULL TABLES WHERE Table_type = 'VIEW';

-- Verificar permissões
SHOW GRANTS FOR CURRENT_USER;
```

### Erro de collation

Se aparecer erro relacionado a collation, certifique-se de que o banco está configurado como:

```sql
ALTER DATABASE seu_banco
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

### Dados não aparecem na dashboard

1. Verifique se há transações cadastradas
2. Verifique se o userId está correto
3. Veja o console do navegador para erros de API
4. Teste as views diretamente no MySQL:

```sql
SELECT COUNT(*) FROM Transaction WHERE userId = 'seu-user-id';
SELECT * FROM vw_Dashboard_Principal WHERE userId = 'seu-user-id';
```

### Performance lenta

As views fazem muitos cálculos. Para otimizar:

1. **Adicione índices**:

```sql
CREATE INDEX idx_transaction_user_date ON Transaction(userId, date);
CREATE INDEX idx_transaction_type_status ON Transaction(type, status);
CREATE INDEX idx_creditcard_purchase_user_date ON CreditCardPurchase(userId, date);
```

2. **Considere materializar as views** (criar tabelas reais atualizadas por triggers)

## 📝 Notas Importantes

- As views **NÃO armazenam dados**, apenas fazem consultas em tempo real
- Quanto mais transações você tiver, mais precisas serão as análises
- Os cálculos de média consideram os **últimos 3 meses** por padrão
- A taxa de poupança considera **transações + compras no cartão**
- Os alertas são recalculados a cada vez que você acessa a página

## 🎯 Próximos Passos

Após visualizar seus dados:

1. ✅ Revise os **alertas críticos**
2. ✅ Ajuste suas **metas** baseado na viabilidade
3. ✅ Reduza utilização de **cartões** se > 30%
4. ✅ Aumente sua **reserva de emergência** se < 6 meses
5. ✅ Melhore sua **taxa de poupança** para ≥ 20%
6. ✅ Diversifique seus **investimentos** se concentração alta

## 💡 Dicas de Uso

- Acesse a análise **semanalmente** para acompanhar evolução
- Use os **alertas** como guia de prioridades
- Compare sua **evolução patrimonial** mês a mês
- Ajuste **metas** conforme sua capacidade real de poupança
- Mantenha **utilização de cartões** abaixo de 30% do limite

---

**Desenvolvido com ❤️ para o FinanPlus**

Para dúvidas ou sugestões, abra uma issue no repositório.
