# 🚀 Guia Rápido de Instalação

## Passo a Passo (5 minutos)

### ⚠️ IMPORTANTE: Desabilitar ONLY_FULL_GROUP_BY (Passo Obrigatório!)

As views utilizam agregações complexas incompatíveis com `ONLY_FULL_GROUP_BY` do MySQL.

**Opção A - Windows (Script Automatizado):**

```bash
cd prisma
fix-mysql-mode.bat
```

**Opção B - Manual (MySQL):**

```sql
SET sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));
```

**Para tornar permanente**, edite o arquivo de configuração:

- **Windows:** `C:\ProgramData\MySQL\MySQL Server 8.0\my.ini`
- **Linux:** `/etc/mysql/my.cnf`

Adicione na seção `[mysqld]`:

```ini
sql_mode="STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION"
```

Reinicie o MySQL após editar.

---

### 1️⃣ Instalar as Views no MySQL

**Opção A - Windows (Mais Fácil):**

```bash
cd prisma
.\install-views.bat
```

**Opção B - Linux/Mac:**

```bash
cd prisma
chmod +x install-views.sh
./install-views.sh
```

**Opção C - Manual:**

```bash
mysql -u seu_usuario -p seu_banco < prisma/views_financeiras_pf.sql
```

### 2️⃣ Testar se funcionou

```bash
mysql -u seu_usuario -p seu_banco < prisma/test-views.sql
```

**OU** Execute no MySQL Workbench/DBeaver:

```sql
-- Listar views criadas
SHOW FULL TABLES WHERE Table_type = 'VIEW';

-- Testar com seu userId (pegue no banco)
SELECT * FROM vw_Dashboard_Principal WHERE userId = 'seu-id-aqui';
```

### 3️⃣ Acessar a Dashboard

```bash
# Reiniciar o servidor
npm run dev
```

Acesse: http://localhost:3000/dashboard/analytics

---

## ✅ Checklist

- [ ] MySQL 5.7+ ou 8.0+
- [ ] Node.js 18+
- [ ] Prisma configurado
- [ ] Banco de dados com dados de teste
- [ ] Views instaladas
- [ ] Servidor rodando

---

## ❓ Problemas Comuns

### "Views não aparecem"

```bash
# Verificar permissões
SHOW GRANTS FOR CURRENT_USER;

# Ver erros do MySQL
SHOW WARNINGS;
```

### "Erro de collation"

```sql
-- Configurar banco
ALTER DATABASE seu_banco
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

### "Dados não aparecem"

1. Adicione transações de teste
2. Verifique se userId está correto
3. Execute test-views.sql

---

## 📚 Documentação Completa

Leia: [ANALISE_FINANCEIRA_README.md](./ANALISE_FINANCEIRA_README.md)

---

**Pronto! 🎉** Sua análise financeira está configurada!
