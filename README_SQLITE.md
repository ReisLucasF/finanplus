# 🚀 FinanPlus - Início Rápido com SQLite

Guia completo para configurar e iniciar a aplicação usando SQLite.

## 📋 Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn
- Git (opcional)

## 🔧 Instalação e Configuração

### 1. Clone ou baixe o projeto

```bash
git clone https://github.com/ReisLucasF/finanplus.git
cd finanplus
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# JWT Secret (gere uma chave aleatória forte)
JWT_SECRET=sua_chave_secreta_aqui_minimo_32_caracteres

# Google OAuth (opcional - só se for usar login com Google)
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret

# URL base da aplicação
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

> 💡 **Dica**: Para gerar uma chave JWT segura, use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 4. Gere o cliente Prisma

```bash
npx prisma generate
```

Isso cria o cliente TypeScript para acessar o banco de dados.

### 5. Crie o banco de dados SQLite

```bash
npx prisma db push
```

Isso cria o arquivo `prisma/dev.db` com todas as tabelas necessárias.

### 6. Popule com dados iniciais (Seed)

```bash
npx tsx prisma/seed.sqlite.ts
```

Isso cria:

- ✅ **Usuário padrão**: `admin@finanplus.com` / senha: `admin123`
- ✅ **Categorias de receita**: Salário, Freelance, Investimentos, etc.
- ✅ **Categorias de despesa**: Alimentação, Moradia, Transporte, etc.

### 7. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse: **http://localhost:3000**

## 🔑 Login

Após o seed, faça login com as credenciais padrão:

- **Email**: `admin@finanplus.com`
- **Senha**: `admin123`

> ⚠️ **IMPORTANTE**: Altere a senha após o primeiro login em produção!

## 📊 Banco de Dados

O banco SQLite é criado em: `prisma/dev.db`

### Comandos úteis do Prisma

```bash
# Ver o banco no Prisma Studio (interface gráfica)
npx prisma studio

# Resetar o banco (CUIDADO: apaga todos os dados)
npx prisma db push --force-reset

# Ver logs de queries (desenvolvimento)
# Adicione no schema.prisma: log = ["query"]
```

## 🔄 Reset Completo do Banco

Se precisar recomeçar do zero:

```bash
# 1. Apagar o banco
rm prisma/dev.db

# 2. Recriar estrutura
npx prisma db push

# 3. Popular novamente
npx tsx prisma/seed.sqlite.ts

# 4. Reiniciar servidor
npm run dev
```

## 📁 Estrutura do Banco

```
prisma/
├── dev.db              # Banco SQLite
├── schema.prisma       # Schema do banco
└── seed.sqlite.ts      # Script de população inicial
```

## 🎯 Próximos Passos

Após o login, você pode:

1. **Criar contas bancárias** - Dashboard → Contas
2. **Adicionar cartões de crédito** - Dashboard → Cartões
3. **Registrar transações** - Dashboard → Transações
4. **Criar investimentos** - Dashboard → Investimentos
5. **Definir metas** - Dashboard → Metas

## 🐛 Problemas Comuns

### Erro: "Cannot find module '@prisma/client'"

```bash
npx prisma generate
```

### Erro: "Database file not found"

```bash
npx prisma db push
```

### Erro: "User already exists" no seed

```bash
# Resetar e popular novamente
rm prisma/dev.db
npx prisma db push
npx tsx prisma/seed.sqlite.ts
```

### Porta 3000 já está em uso

```bash
# Use outra porta
PORT=3001 npm run dev
```

## 📚 Documentação Adicional

- **Migração MySQL → SQLite**: Ver [MIGRACAO_SQLITE.md](MIGRACAO_SQLITE.md)
- **Schema completo**: Ver [prisma/schema.prisma](prisma/schema.prisma)
- **Analytics Engine**: Ver [lib/analytics.ts](lib/analytics.ts)

## 💾 Backup do Banco

Para fazer backup do seu banco SQLite:

```bash
# Copiar arquivo do banco
cp prisma/dev.db prisma/backup-$(date +%Y%m%d).db

# Ou use o Prisma Studio para exportar dados
npx prisma studio
```

## 🔒 Segurança

Para produção:

1. ✅ Altere a senha padrão do admin
2. ✅ Use uma JWT_SECRET forte e aleatória
3. ✅ Configure HTTPS
4. ✅ Ative rate limiting
5. ✅ Faça backups regulares

## ❓ Suporte

Encontrou algum problema? Abra uma issue no GitHub:
https://github.com/ReisLucasF/finanplus/issues

---

**Desenvolvido com ❤️ usando Next.js, Prisma e SQLite**
