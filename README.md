# FinanPlus

Sistema completo de controle financeiro pessoal desenvolvido com Next.js 14, Prisma ORM e MySQL.

## Funcionalidades

### Implementado (Sprint 1 - Fundação)

- Projeto Next.js configurado com TypeScript e Tailwind CSS
- Banco de dados MySQL com Prisma ORM
- Schema completo do banco de dados
- Sistema de autenticação JWT com jose e bcrypt
- **OAuth do Google** para login/registro
- Middleware de proteção de rotas
- Landing page responsiva
- Páginas de login e registro com Google
- APIs de autenticação (register, login, logout, me, google)
- Dashboard básico

### Em Desenvolvimento

- Sistema de onboarding
- Dashboard principal
- Gestão de contas bancárias
- Sistema de transações
- Gestão de cartões de crédito
- Sistema de metas
- Painel admin

## Como Rodar o Projeto

### Pré-requisitos

- Node.js 18+ instalado
- Acesso ao banco MySQL (já configurado)

### Instalação

1. **Clone ou navegue até a pasta do projeto**

```bash
cd c:\Users\lucas\Desktop\LucasReis\finanplus
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure as variáveis de ambiente**
   O arquivo `.env` já está configurado com:

- DATABASE_URL (MySQL)
- JWT_SECRET
- RECURRING_API_TOKEN
- GOOGLE_CLIENT_ID (para OAuth - a implementar)
- GOOGLE_CLIENT_SECRET (para OAuth - a implementar)

4. **Execute as migrations (se necessário)**

```bash
npx prisma migrate dev
```

5. **Gere o Prisma Client**

```bash
npx prisma generate
```

6. **Inicie o servidor de desenvolvimento**

```bash
npm run dev
```

7. **Acesse a aplicação**
   Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## Estrutura do Projeto

```
finanplus/
├── app/                    # App Router do Next.js
│   ├── (auth)/            # Páginas de autenticação
│   │   ├── login/         # Página de login
│   │   └── register/      # Página de registro
│   ├── api/               # API Routes
│   │   └── auth/          # Endpoints de autenticação
│   ├── dashboard/         # Dashboard principal
│   ├── onboarding/        # Fluxo de onboarding
│   └── page.tsx           # Landing page
├── components/            # Componentes React
│   └── auth/              # Componentes de autenticação
│       └── GoogleSignInButton.tsx
├── lib/                   # Utilitários e configurações
│   ├── prisma.ts          # Cliente Prisma
│   ├── auth.ts            # Helpers JWT
│   └── validators.ts      # Schemas Zod
├── prisma/
│   ├── schema.prisma      # Schema do banco
│   ├── seed.ts            # Seed de categorias
│   └── migrations/        # Migrations SQL
├── middleware.ts          # Proteção de rotas
├── BLUEPRINT.md           # Documentação técnica completa
└── OAUTH_GOOGLE.md        # Guia de configuração OAuth
```

## Autenticação

### Endpoints Disponíveis

**POST /api/auth/register**

- Cria novo usuário
- Retorna JWT em cookie httpOnly

```json
{
  "email": "user@example.com",
  "password": "senha123",
  "name": "Nome do Usuário"
}
```

**POST /api/auth/login**

- Autentica usuário existente
- Retorna JWT em cookie httpOnly

```json
{
  "email": "user@example.com",
  "password": "senha123"
}
```

**POST /api/auth/google**

- Autentica usuário via OAuth Google
- Cria conta automaticamente se não existir

```json
{
  "token": "google-id-token"
}
```

**POST /api/auth/logout**

- Remove cookie de autenticação

**GET /api/auth/me**

- Retorna dados do usuário logado
- Requer autenticação

### OAuth do Google

Para configurar o OAuth do Google, consulte o guia completo: [OAUTH_GOOGLE.md](./OAUTH_GOOGLE.md)

**Resumo rápido:**

1. Configure as credenciais no Google Cloud Console
2. Adicione as variáveis no `.env`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
3. Adicione `http://localhost:3000` nas URIs autorizadas
4. Reinicie o servidor

## 🗄️ Banco de Dados

### Modelos Principais

- **User**: Usuários do sistema
- **BankAccount**: Contas bancárias
- **CreditCard**: Cartões de crédito
- **Transaction**: Transações avulsas
- **RecurringTransaction**: Transações recorrentes
- **Category**: Categorias de receita/despesa
- **Transfer**: Transferências entre contas
- **Goal**: Metas financeiras
- **Review**: Avaliações de usuários
- **CreditCardPayment**: Pagamentos de faturas

### Comandos Úteis

```bash
# Ver banco no Prisma Studio
npx prisma studio

# Criar nova migration
npx prisma migrate dev --name nome_da_migration

# Resetar banco (cuidado!)
npx prisma migrate reset

# Executar seed
npm run db:seed
```

## Stack Tecnológica

- **Framework**: Next.js 14 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS
- **Banco de Dados**: MySQL
- **ORM**: Prisma
- **Autenticação**: JWT (jose) + bcrypt
- **Validação**: Zod
- **Formulários**: React Hook Form
- **State Management**: Tanstack Query
- **Ícones**: Lucide React
- **Gráficos**: Recharts
- **Notificações**: Sonner

## Próximos Passos

1. Implementar sistema de onboarding (5 etapas)
2. Criar dashboard principal com widgets
3. Implementar CRUD de contas bancárias
4. Sistema completo de transações
5. Gestão de cartões de crédito
6. Sistema de metas financeiras
7. OAuth com Google
8. API de processamento de recorrências
9. Painel administrativo

## Autor

Lucas Reis

