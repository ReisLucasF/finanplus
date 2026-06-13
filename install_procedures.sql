-- =============================================================================
-- SCRIPT DE INSTALAÇÃO DAS STORED PROCEDURES
-- Execute este script no seu banco MySQL para instalar as procedures
-- =============================================================================

-- Primeiro, vamos dropar as procedures existentes se houver
DROP PROCEDURE IF EXISTS sp_Dashboard_Por_Usuario;
DROP PROCEDURE IF EXISTS sp_Gastos_Por_Categoria;
DROP PROCEDURE IF EXISTS sp_Analise_Receitas;
DROP PROCEDURE IF EXISTS sp_Portfolio_Investimentos;
DROP PROCEDURE IF EXISTS sp_Alertas_Financeiros;
DROP PROCEDURE IF EXISTS sp_Evolucao_Patrimonial;
DROP PROCEDURE IF EXISTS sp_Relatorio_Periodo_Usuario;

-- Agora execute o arquivo procedures_financeiras_usuario.sql
SOURCE procedures_financeiras_usuario.sql;

-- Verificar se as procedures foram criadas
SHOW PROCEDURE STATUS WHERE Db = DATABASE();

-- Teste básico (substitua 'seu-user-id' por um ID real)
-- CALL sp_Dashboard_Por_Usuario('seu-user-id');
-- CALL sp_Gastos_Por_Categoria('seu-user-id');

SELECT 'Stored Procedures instaladas com sucesso!' as status;