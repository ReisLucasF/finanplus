@echo off
echo =====================================================
echo INSTALANDO STORED PROCEDURES NO MYSQL
echo =====================================================

echo.
echo Conectando ao MySQL e executando procedures...
echo.

mysql --host=46.202.144.3 --user=lucas --password="!zJbfC!yamNVbJSnfPNJqN$1" --database=finanplus < procedures_financeiras_usuario.sql

if %ERRORLEVEL% equ 0 (
    echo.
    echo ✅ PROCEDURES INSTALADAS COM SUCESSO!
    echo.
    echo Verificando procedures instaladas...
    mysql --host=46.202.144.3 --user=lucas --password="!zJbfC!yamNVbJSnfPNJqN$1" --database=finanplus --execute="SHOW PROCEDURE STATUS WHERE Db='finanplus' AND Name LIKE 'sp_%';"
) else (
    echo.
    echo ❌ ERRO ao instalar procedures!
    echo.
)

echo.
echo Pressione qualquer tecla para continuar...
pause >nul