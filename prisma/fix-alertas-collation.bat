@echo off
chcp 65001 > nul
echo ========================================
echo CORRIGINDO VIEW vw_Alertas_Financeiros
echo Fix: Collation Error no UNION
echo ========================================
echo.

set /p DB_HOST="Host do MySQL [localhost]: " || set DB_HOST=localhost
set /p DB_PORT="Porta [3306]: " || set DB_PORT=3306
set /p DB_NAME="Nome do Banco [finanplus]: " || set DB_NAME=finanplus
set /p DB_USER="Usuário [root]: " || set DB_USER=root
set /p DB_PASS="Senha: "

echo.
echo Executando correção...
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASS% %DB_NAME% < fix-alertas-collation.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ View corrigida com sucesso!
    echo.
    echo Agora teste: http://localhost:3000/api/analytics/financial-overview
) else (
    echo.
    echo ❌ Erro ao corrigir view!
    echo Verifique as credenciais e tente novamente.
)

echo.
pause
