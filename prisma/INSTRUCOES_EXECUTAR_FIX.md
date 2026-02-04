# INSTRUÇÕES: Execute este script no seu cliente MySQL

## OPÇÃO 1: Via linha de comando (se tiver mysql CLI instalado)

```bash
mysql -h 46.202.144.3 -u lucas -p finanplus < fix-alertas-collation.sql
```

Senha: !zJbfC!yamNVbJSnfPNJqN$1

## OPÇÃO 2: Via MySQL Workbench

1. Abra MySQL Workbench
2. Conecte no servidor: 46.202.144.3
3. Usuário: lucas
4. Senha: !zJbfC!yamNVbJSnfPNJqN$1
5. Banco: finanplus
6. Abra o arquivo: fix-alertas-collation.sql
7. Clique em "Execute" (⚡)

## OPÇÃO 3: Copiar e colar direto

Abra o arquivo fix-alertas-collation.sql, copie todo o conteúdo e cole no seu cliente MySQL conectado ao banco finanplus.

## Após executar:

Teste a API novamente: http://localhost:3000/api/analytics/financial-overview
