# 🏦 Sistema de Relatórios Financeiros Pessoais com Stored Procedures

## 📋 Visão Geral

Este sistema implementa **stored procedures** MySQL para análise financeira pessoal **multiusuário**. Cada procedure filtra automaticamente os dados pelo `userId`, garantindo **segurança** e **privacidade**.

## 🔧 Instalação

### 1. Executar as Stored Procedures no Banco

```sql
-- No MySQL Workbench ou linha de comando
SOURCE procedures_financeiras_usuario.sql;

-- Ou usar o script de instalação
SOURCE install_procedures.sql;
```

### 2. Verificar Instalação

```sql
-- Listar procedures criadas
SHOW PROCEDURE STATUS WHERE Db = DATABASE();

-- Testar uma procedure (substitua pelo seu userId)
CALL sp_Dashboard_Por_Usuario('seu-user-id-aqui');
```

## 🚀 Stored Procedures Disponíveis

### 1. **sp_Dashboard_Por_Usuario**

**Finalidade:** KPIs principais do dashboard
**Parâmetros:** `p_user_id VARCHAR(255)`
**Retorna:**

- Receita média mensal (últimos 3 meses)
- Despesa média mensal (últimos 3 meses)
- Saldo atual em bancos
- Dívida em cartões
- Valor total investido
- Total de metas ativas
- Progresso médio das metas

```sql
CALL sp_Dashboard_Por_Usuario('123e4567-e89b-12d3-a456-426614174000');
```

### 2. **sp_Gastos_Por_Categoria**

**Finalidade:** Análise detalhada de gastos por categoria
**Parâmetros:** `p_user_id VARCHAR(255)`
**Retorna:**

- Categoria e tipo
- Gastos do último mês
- Gastos dos últimos 3 meses
- Média mensal
- Classificação de prioridade (ESSENCIAL, IMPORTANTE, OPCIONAL)
- Quantidade de transações

### 3. **sp_Analise_Receitas**

**Finalidade:** Análise de fontes de renda
**Parâmetros:** `p_user_id VARCHAR(255)`
**Retorna:**

- Fonte da receita
- Receitas por período (1 mês, 3 meses, 12 meses)
- Tipo de renda (ATIVA_PRINCIPAL, PASSIVA, EXTRA_VARIÁVEL)
- Regularidade (MUITO_REGULAR, REGULAR, OCASIONAL, RARA)

### 4. **sp_Portfolio_Investimentos**

**Finalidade:** Análise do portfólio de investimentos
**Parâmetros:** `p_user_id VARCHAR(255)`
**Retorna:**

- Detalhes do investimento (nome, tipo, ticker, corretora)
- Posição atual e valor investido
- Movimentações recentes
- Classificação de risco

### 5. **sp_Alertas_Financeiros**

**Finalidade:** Alertas automáticos baseados em indicadores
**Parâmetros:** `p_user_id VARCHAR(255)`
**Retorna:**

- Alertas de liquidez (reserva de emergência)
- Alertas de endividamento
- Alertas de metas vencidas
- Nível de criticidade

### 6. **sp_Evolucao_Patrimonial**

**Finalidade:** Evolução mensal do patrimônio
**Parâmetros:**

- `p_user_id VARCHAR(255)`
- `p_meses INT` (padrão: 12)
  **Retorna:**
- Evolução mês a mês
- Saldo líquido mensal
- Patrimônio acumulado
- Crescimento percentual

### 7. **sp_Relatorio_Periodo_Usuario**

**Finalidade:** Relatório de período específico
**Parâmetros:**

- `p_user_id VARCHAR(255)`
- `p_ano_inicio INT`
- `p_ano_fim INT` (opcional)
  **Retorna:**
- Análise financeira do período
- Receitas, despesas e resultado líquido
- Movimentação de investimentos

## 🔒 Segurança Multiusuário

✅ **Cada procedure filtra automaticamente pelo userId**
✅ **Impossível acessar dados de outros usuários**
✅ **Queries otimizadas com índices**
✅ **Validação de parâmetros**

## 🌐 APIs Integradas

As APIs utilizam as procedures automaticamente:

| Endpoint                     | Procedure Utilizada               |
| ---------------------------- | --------------------------------- |
| `GET /api/reports/dashboard` | sp_Dashboard_Por_Usuario + outras |
| `GET /api/reports/periodo`   | sp_Relatorio_Periodo_Usuario      |
| `GET /api/reports/completo`  | Múltiplas procedures              |

## 🎯 Vantagens das Stored Procedures

1. **Performance:** Processamento no banco de dados
2. **Segurança:** Filtro automático por usuário
3. **Manutenibilidade:** Lógica centralizada no banco
4. **Escalabilidade:** Otimização automática pelo MySQL
5. **Flexibilidade:** Fácil adição de novos parâmetros

## 🧪 Testando as APIs

```javascript
// No console do navegador (após login)
fetch("/api/reports/dashboard")
  .then((res) => res.json())
  .then((data) => console.log("Dashboard:", data));

fetch("/api/reports/periodo?anoInicio=2024")
  .then((res) => res.json())
  .then((data) => console.log("Período:", data));
```

## 🔄 Atualizações Futuras

Para adicionar novas análises, basta:

1. Criar nova stored procedure
2. Adicionar endpoint na API
3. Integrar no dashboard

## 📊 Dashboard Integrado

O dashboard React consome automaticamente todos os dados das procedures, exibindo:

- 📈 **KPIs principais**
- 📋 **Gastos por categoria**
- 💰 **Análise de receitas**
- 🚨 **Alertas inteligentes**
- 📊 **Portfolio de investimentos**
- 📈 **Evolução patrimonial**

## 🏃‍♂️ Próximos Passos

1. Execute `install_procedures.sql` no seu banco MySQL
2. Reinicie o servidor de desenvolvimento
3. Acesse `/dashboard` para ver os dados avançados
4. Verifique o console do navegador para logs de debug

---

**✨ Sistema completo de análise financeira pessoal com segurança multiusuário!**
