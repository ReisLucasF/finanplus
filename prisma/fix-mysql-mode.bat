@echo off
setlocal enabledelayedexpansion

echo ================================================
echo   FIX: Desabilitar ONLY_FULL_GROUP_BY no MySQL
echo ================================================
echo.

:: Solicitar informações de conexão
set /p MYSQL_USER="Digite o usuario do MySQL (padrao: root): "
if "!MYSQL_USER!"=="" set MYSQL_USER=root

set /p MYSQL_PASSWORD="Digite a senha do MySQL: "
if "!MYSQL_PASSWORD!"=="" (
    echo ERRO: Senha e obrigatoria
    pause
    exit /b 1
)

set /p MYSQL_DATABASE="Digite o nome do banco de dados: "
if "!MYSQL_DATABASE!"=="" (
    echo ERRO: Nome do banco e obrigatorio
    pause
    exit /b 1
)

set /p MYSQL_HOST="Digite o host do MySQL (padrao: localhost): "
if "!MYSQL_HOST!"=="" set MYSQL_HOST=localhost

echo.
echo Conectando ao MySQL...
echo.

:: Executar comandos SQL
mysql -h !MYSQL_HOST! -u !MYSQL_USER! -p!MYSQL_PASSWORD! !MYSQL_DATABASE! -e "SET sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY','')); SELECT @@sql_mode AS 'SQL_MODE Atualizado';"

if errorlevel 1 (
    echo.
    echo ERRO: Falha ao executar comando no MySQL
    echo Verifique as credenciais e tente novamente.
    pause
    exit /b 1
)

echo.
echo ================================================
echo   Sucesso! ONLY_FULL_GROUP_BY foi desabilitado
echo ================================================
echo.
echo IMPORTANTE: Esta mudanca e temporaria (apenas para a sessao atual).
echo.
echo Para tornar permanente:
echo 1. Localize o arquivo de configuracao do MySQL:
echo    - Windows: C:\ProgramData\MySQL\MySQL Server 8.0\my.ini
echo    - Ou procure por "my.ini" no diretorio de instalacao do MySQL
echo.
echo 2. Adicione ou edite a secao [mysqld]:
echo    [mysqld]
echo    sql_mode="STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION"
echo.
echo 3. Reinicie o servico MySQL:
echo    - Abra services.msc
echo    - Localize "MySQL"
echo    - Clique com botao direito e selecione "Reiniciar"
echo.
echo ================================================
echo.
pause
