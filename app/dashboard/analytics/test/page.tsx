'use client'

import { useEffect, useState } from 'react'

export default function TestViewsPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                console.log(' Fazendo requisição para API...')
                const res = await fetch('/api/analytics/financial-overview')

                console.log(' Status da resposta:', res.status)

                if (!res.ok) {
                    const errorData = await res.json()
                    console.error(' Erro na resposta:', errorData)
                    setError(JSON.stringify(errorData, null, 2))
                    return
                }

                const result = await res.json()
                console.log(' Dados recebidos:', result)
                setData(result)
            } catch (err: any) {
                console.error(' Erro ao buscar dados:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4">Teste das Views - Carregando...</h1>
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4 text-red-600">Erro ao buscar dados</h1>
                <pre className="bg-red-50 p-4 rounded overflow-auto text-sm">
                    {error}
                </pre>
            </div>
        )
    }

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Teste das Views Financeiras
            </h1>

            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Dashboard Principal</h2>
                {data?.dashboard ? (
                    <pre className="bg-gray-50 dark:bg-gray-700 p-4 rounded overflow-auto text-sm">
                        {JSON.stringify(data.dashboard, null, 2)}
                    </pre>
                ) : (
                    <p className="text-yellow-600">⚠️ Nenhum dado encontrado na view vw_Dashboard_Principal</p>
                )}
            </div>

            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">
                    Gastos por Categoria ({data?.expensesByCategory?.length || 0} categorias)
                </h2>
                {data?.expensesByCategory && data.expensesByCategory.length > 0 ? (
                    <pre className="bg-gray-50 dark:bg-gray-700 p-4 rounded overflow-auto text-sm max-h-96">
                        {JSON.stringify(data.expensesByCategory, null, 2)}
                    </pre>
                ) : (
                    <p className="text-yellow-600">⚠️ Nenhum dado encontrado na view vw_Gastos_Por_Categoria</p>
                )}
            </div>

            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">
                    Análise de Receitas ({data?.incomeAnalysis?.length || 0} fontes)
                </h2>
                {data?.incomeAnalysis && data.incomeAnalysis.length > 0 ? (
                    <pre className="bg-gray-50 dark:bg-gray-700 p-4 rounded overflow-auto text-sm max-h-96">
                        {JSON.stringify(data.incomeAnalysis, null, 2)}
                    </pre>
                ) : (
                    <p className="text-yellow-600">⚠️ Nenhum dado encontrado na view vw_Analise_Receitas</p>
                )}
            </div>

            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">
                    Portfolio de Investimentos ({data?.investments?.length || 0} investimentos)
                </h2>
                {data?.investments && data.investments.length > 0 ? (
                    <pre className="bg-gray-50 dark:bg-gray-700 p-4 rounded overflow-auto text-sm max-h-96">
                        {JSON.stringify(data.investments, null, 2)}
                    </pre>
                ) : (
                    <p className="text-yellow-600">⚠️ Nenhum dado encontrado na view vw_Portfolio_Investimentos</p>
                )}
            </div>

            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">
                    Análise de Cartões ({data?.creditCards?.length || 0} cartões)
                </h2>
                {data?.creditCards && data.creditCards.length > 0 ? (
                    <pre className="bg-gray-50 dark:bg-gray-700 p-4 rounded overflow-auto text-sm max-h-96">
                        {JSON.stringify(data.creditCards, null, 2)}
                    </pre>
                ) : (
                    <p className="text-yellow-600">⚠️ Nenhum dado encontrado na view vw_Analise_Cartoes_Credito</p>
                )}
            </div>

            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">
                    Evolução Patrimonial ({data?.patrimonyEvolution?.length || 0} meses)
                </h2>
                {data?.patrimonyEvolution && data.patrimonyEvolution.length > 0 ? (
                    <pre className="bg-gray-50 dark:bg-gray-700 p-4 rounded overflow-auto text-sm max-h-96">
                        {JSON.stringify(data.patrimonyEvolution, null, 2)}
                    </pre>
                ) : (
                    <p className="text-yellow-600">⚠️ Nenhum dado encontrado na view vw_Evolucao_Patrimonial</p>
                )}
            </div>

            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">
                    Análise de Metas ({data?.goals?.length || 0} metas)
                </h2>
                {data?.goals && data.goals.length > 0 ? (
                    <pre className="bg-gray-50 dark:bg-gray-700 p-4 rounded overflow-auto text-sm max-h-96">
                        {JSON.stringify(data.goals, null, 2)}
                    </pre>
                ) : (
                    <p className="text-yellow-600">⚠️ Nenhum dado encontrado na view vw_Analise_Metas</p>
                )}
            </div>

            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">
                    Alertas Financeiros ({data?.alerts?.length || 0} alertas)
                </h2>
                {data?.alerts && data.alerts.length > 0 ? (
                    <pre className="bg-gray-50 dark:bg-gray-700 p-4 rounded overflow-auto text-sm max-h-96">
                        {JSON.stringify(data.alerts, null, 2)}
                    </pre>
                ) : (
                    <p className="text-yellow-600">⚠️ Nenhum dado encontrado na view vw_Alertas_Financeiros</p>
                )}
            </div>

            
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg shadow text-white">
                <h2 className="text-xl font-semibold mb-4">Resumo</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-sm opacity-80">Dashboard</p>
                        <p className="text-2xl font-bold">{data?.dashboard ? '✓' : '✗'}</p>
                    </div>
                    <div>
                        <p className="text-sm opacity-80">Categorias</p>
                        <p className="text-2xl font-bold">{data?.expensesByCategory?.length || 0}</p>
                    </div>
                    <div>
                        <p className="text-sm opacity-80">Receitas</p>
                        <p className="text-2xl font-bold">{data?.incomeAnalysis?.length || 0}</p>
                    </div>
                    <div>
                        <p className="text-sm opacity-80">Investimentos</p>
                        <p className="text-2xl font-bold">{data?.investments?.length || 0}</p>
                    </div>
                    <div>
                        <p className="text-sm opacity-80">Cartões</p>
                        <p className="text-2xl font-bold">{data?.creditCards?.length || 0}</p>
                    </div>
                    <div>
                        <p className="text-sm opacity-80">Patrimônio</p>
                        <p className="text-2xl font-bold">{data?.patrimonyEvolution?.length || 0}</p>
                    </div>
                    <div>
                        <p className="text-sm opacity-80">Metas</p>
                        <p className="text-2xl font-bold">{data?.goals?.length || 0}</p>
                    </div>
                    <div>
                        <p className="text-sm opacity-80">Alertas</p>
                        <p className="text-2xl font-bold">{data?.alerts?.length || 0}</p>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 <strong>Dica:</strong> Verifique o console do navegador (F12) para ver logs detalhados da API.
                </p>
            </div>
        </div>
    )
}
