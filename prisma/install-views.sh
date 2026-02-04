#!/bin/bash

# Script para instalar as Views de Análise Financeira
# FinanPlus - Análise Financeira para Pessoa Física

echo "=========================================="
echo "  FinanPlus - Instalação de Views SQL"
echo "=========================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se o arquivo SQL existe
if [ ! -f "views_financeiras_pf.sql" ]; then
    echo -e "${RED}❌ Erro: Arquivo views_financeiras_pf.sql não encontrado!${NC}"
    echo "Certifique-se de estar no diretório correto: prisma/"
    exit 1
fi

echo -e "${YELLOW}📋 Este script irá criar as seguintes views:${NC}"
echo "  1. vw_Dashboard_Principal"
echo "  2. vw_Gastos_Por_Categoria"
echo "  3. vw_Analise_Receitas"
echo "  4. vw_Portfolio_Investimentos"
echo "  5. vw_Analise_Cartoes_Credito"
echo "  6. vw_Evolucao_Patrimonial"
echo "  7. vw_Analise_Metas"
echo "  8. vw_Alertas_Financeiros"
echo ""

# Solicitar credenciais do banco
read -p "Digite o host do MySQL (padrão: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Digite a porta do MySQL (padrão: 3306): " DB_PORT
DB_PORT=${DB_PORT:-3306}

read -p "Digite o nome do banco de dados: " DB_NAME

read -p "Digite o usuário do MySQL: " DB_USER

read -sp "Digite a senha do MySQL: " DB_PASS
echo ""
echo ""

# Confirmar
echo -e "${YELLOW}⚠️  Confirme os dados:${NC}"
echo "  Host: $DB_HOST"
echo "  Porta: $DB_PORT"
echo "  Banco: $DB_NAME"
echo "  Usuário: $DB_USER"
echo ""

read -p "Deseja continuar? (s/n): " CONFIRM

if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
    echo -e "${RED}❌ Instalação cancelada${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🔄 Instalando views...${NC}"

# Executar o script SQL
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < views_financeiras_pf.sql 2>&1

# Verificar se foi bem sucedido
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Views instaladas com sucesso!${NC}"
    echo ""
    
    # Verificar views criadas
    echo -e "${YELLOW}📊 Verificando views criadas...${NC}"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW FULL TABLES WHERE Table_type = 'VIEW';" 2>/dev/null
    
    echo ""
    echo -e "${GREEN}🎉 Instalação concluída!${NC}"
    echo ""
    echo "Próximos passos:"
    echo "1. Reinicie seu servidor Next.js (npm run dev)"
    echo "2. Acesse: http://localhost:3000/dashboard/analytics"
    echo "3. Veja a documentação em: prisma/ANALISE_FINANCEIRA_README.md"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Erro ao instalar views!${NC}"
    echo "Verifique:"
    echo "  - Credenciais do banco de dados"
    echo "  - Permissões do usuário"
    echo "  - Sintaxe do arquivo SQL"
    echo ""
    exit 1
fi
