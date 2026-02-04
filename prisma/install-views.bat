@echo off
REM Script para instalar as Views de Análise Financeira (Windows)
REM FinanPlus - Análise Financeira para Pessoa Física

echo ==========================================
echo   FinanPlus - Instalacao de Views SQL
echo ==========================================
echo.

REM Verificar se o arquivo SQL existe
if not exist "views_financeiras_pf.sql" (
    echo [ERRO] Arquivo views_financeiras_pf.sql nao encontrado!
    echo Certifique-se de estar no diretorio correto: prisma/
    pause
    exit /b 1
)

echo [INFO] Este script ira criar as seguintes views:
echo   1. vw_Dashboard_Principal
echo   2. vw_Gastos_Por_Categoria
echo   3. vw_Analise_Receitas
echo   4. vw_Portfolio_Investimentos
echo   5. vw_Analise_Cartoes_Credito
echo   6. vw_Evolucao_Patrimonial
echo   7. vw_Analise_Metas
echo   8. vw_Alertas_Financeiros
echo.

REM Solicitar credenciais
set /p DB_HOST="Digite o host do MySQL (padrao: localhost): "
if "%DB_HOST%"=="" set DB_HOST=localhost

set /p DB_PORT="Digite a porta do MySQL (padrao: 3306): "
if "%DB_PORT%"=="" set DB_PORT=3306

set /p DB_NAME="Digite o nome do banco de dados: "

set /p DB_USER="Digite o usuario do MySQL: "

set /p DB_PASS="Digite a senha do MySQL: "

echo.
echo [INFO] Confirme os dados:
echo   Host: %DB_HOST%
echo   Porta: %DB_PORT%
echo   Banco: %DB_NAME%
echo   Usuario: %DB_USER%
echo.

set /p CONFIRM="Deseja continuar? (s/n): "
if /i not "%CONFIRM%"=="s" (
    echo [CANCELADO] Instalacao cancelada
    pause
    exit /b 0
)

echo.
echo [INFO] Instalando views...
echo.

REM Executar o script SQL
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASS% %DB_NAME% < views_financeiras_pf.sql

if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCESSO] Views instaladas com sucesso!
    echo.
    
    echo [INFO] Verificando views criadas...
    mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASS% %DB_NAME% -e "SHOW FULL TABLES WHERE Table_type = 'VIEW';"
    
    echo.
    echo [CONCLUIDO] Instalacao concluida!
    echo.
    echo Proximos passos:
    echo 1. Reinicie seu servidor Next.js (npm run dev)
    echo 2. Acesse: http://localhost:3000/dashboard/analytics
    echo 3. Veja a documentacao em: prisma/ANALISE_FINANCEIRA_README.md
    echo.
) else (
    echo.
    echo [ERRO] Erro ao instalar views!
    echo Verifique:
    echo   - Credenciais do banco de dados
    echo   - Permissoes do usuario
    echo   - Sintaxe do arquivo SQL
    echo.
)

pause
