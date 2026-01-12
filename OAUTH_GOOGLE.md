# Configuração do OAuth Google - FinanPlus

## 📋 Pré-requisitos

Você precisa ter um projeto no Google Cloud Console com as credenciais OAuth 2.0 já criadas.

## 🔧 Configuração no Google Cloud Console

### 1. Acessar o Console

Acesse: https://console.cloud.google.com/

### 2. Selecionar/Criar Projeto

- Selecione seu projeto ou crie um novo

### 3. Ativar Google+ API

- Vá em "APIs & Services" > "Library"
- Procure por "Google+ API"
- Clique em "Enable"

### 4. Criar Credenciais OAuth 2.0

- Vá em "APIs & Services" > "Credentials"
- Clique em "Create Credentials" > "OAuth client ID"
- Tipo de aplicativo: "Web application"
- Nome: "FinanPlus"

### 5. Configurar URIs Autorizadas

**JavaScript origins (Authorized JavaScript origins):**

```
http://localhost:3000
https://seu-dominio-producao.com
```

**Redirect URIs (Authorized redirect URIs):**

```
http://localhost:3000
http://localhost:3000/api/auth/google/callback
https://seu-dominio-producao.com
https://seu-dominio-producao.com/api/auth/google/callback
```

### 6. Obter Credenciais

Após criar, você receberá:

- **Client ID**: algo como `123456789-abc.apps.googleusercontent.com`
- **Client Secret**: algo como `GOCSPX-abc123def456`

## 🔐 Configurar no FinanPlus

### 1. Atualizar arquivo `.env`

```env
GOOGLE_CLIENT_ID="seu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="seu-client-secret"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="seu-client-id.apps.googleusercontent.com"
```

### 2. Reiniciar o servidor

```bash
npm run dev
```

## ✅ Como Testar

1. Acesse http://localhost:3000/login
2. Clique no botão "Continuar com o Google"
3. Selecione sua conta Google
4. Autorize o acesso
5. Você será redirecionado para o dashboard ou onboarding

## 🔄 Fluxo de Autenticação

1. **Usuário clica em "Continuar com Google"**

   - SDK do Google carrega
   - Modal de login aparece

2. **Usuário seleciona conta e autoriza**

   - Google retorna um token JWT

3. **Token é enviado para `/api/auth/google`**

   - Backend valida o token com Google
   - Verifica se usuário já existe (por googleId ou email)
   - Se existir: faz login
   - Se não existir: cria nova conta

4. **JWT do FinanPlus é gerado**
   - Token armazenado em cookie httpOnly
   - Usuário redirecionado para dashboard/onboarding

## 🛡️ Segurança

### Tokens

- Token do Google é validado no backend
- JWT próprio do FinanPlus é gerado
- Cookie httpOnly (não acessível via JavaScript)
- Cookie secure em produção (apenas HTTPS)

### Dados Armazenados

- Google ID (sub)
- Email
- Nome
- Foto (opcional)

### Permissões Necessárias

O OAuth do Google pede acesso a:

- Perfil básico (nome, email)
- Email (para identificação)

## 🔧 Troubleshooting

### Erro: "redirect_uri_mismatch"

**Solução**: Verifique se as URIs autorizadas no Google Console incluem:

- `http://localhost:3000`

### Botão do Google não aparece

**Solução**:

1. Verifique se `NEXT_PUBLIC_GOOGLE_CLIENT_ID` está no `.env`
2. Reinicie o servidor (`npm run dev`)
3. Limpe o cache do navegador

### Erro: "invalid_client"

**Solução**:

- Verifique se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão corretos
- Certifique-se de não ter espaços extras nas variáveis

### Usuário não consegue fazer login

**Solução**:

1. Verifique os logs do servidor
2. Confirme que o banco de dados está acessível
3. Verifique se o email já está cadastrado com senha

## 📱 Produção

### Atualizar URIs para Produção

1. No Google Console, adicione seu domínio de produção
2. Atualize variável `NEXTAUTH_URL` no `.env` de produção
3. Certifique-se de usar HTTPS

### Exemplo de Produção

```env
GOOGLE_CLIENT_ID="seu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="seu-client-secret"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="seu-client-id.apps.googleusercontent.com"
NEXTAUTH_URL="https://finanplus.com"
```

## 📚 Recursos

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In for Web](https://developers.google.com/identity/gsi/web)
- [Google Cloud Console](https://console.cloud.google.com/)

---

**Status**: ✅ Implementado e funcionando
**Última atualização**: 12 de Janeiro de 2026
