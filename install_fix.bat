@echo off
echo Instalando procedures corrigidas no MySQL...

"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" ^
  --host=46.202.144.3 ^
  --user=lucas ^
  --password="!zJbfC!yamNVbJSnfPNJqN$1" ^
  --database=finanplus ^
  < procedures_fix_collation.sql

if %errorlevel% equ 0 (
    echo Procedures instaladas com sucesso!
) else (
    echo Erro na instalacao das procedures!
)

pause