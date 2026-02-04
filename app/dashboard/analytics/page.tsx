'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    DollarSign,
    PiggyBank,
    CreditCard,
    Target,
    TrendingDown as TrendingDownIcon,
    Shield,
    Zap,
    Activity,
    BarChart3,
    PieChart as PieChartIcon,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    Calendar,
    Percent,
    Award,
    AlertCircle,
    Info
} from 'lucide-react'
import StatCard from '../components/StatCard'
import SectionCard from '../components/SectionCard'
import PieChart from '../components/PieChart'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface DashboardData {
    saldo_contas_correntes: number
    valor_investido_total: number
    divida_cartoes_atual: number
    patrimonio_liquido_atual: number
    receita_ultimo_mes: number
    receita_media_3_meses: number
    despesa_ultimo_mes: number
    despesa_media_3_meses: number
    taxa_poupanca_percentual: number
    meses_reserva_emergencia: number
    total_metas_ativas: number
    metas_atrasadas: number
    progresso_medio_metas_percentual: number
    total_cartoes: number
    limite_total_cartoes: number
    utilizacao_limite_percentual: number
    total_investimentos_ativos: number
    aportes_investimentos_3_meses: number
    status_saude_financeira: string
}

interface ExpenseCategory {
    categoria: string
    total_ultimo_mes: number
    total_ultimos_3_meses: number
    media_mensal_3_meses: number
    classificacao_categoria: string
    frequencia_uso: string
    variacao_mes_anterior_percentual: number
    alerta_variacao: string
}

interface IncomeSource {
    fonte_receita: string
    receita_ultimo_mes: number
    receita_ultimos_3_meses: number
    tipo_renda: string
    regularidade: string
    percentual_renda_total_3_meses: number
}

interface Investment {
    nome_investimento: string
    tipo_investimento: string
    valor_investido_liquido: number
    nivel_risco: string
    percentual_portfolio: number
    aportes_3_meses: number
    dias_desde_ultima_movimentacao: number
}

interface CreditCard {
    nome_cartao: string
    limite_total: number
    divida_atual: number
    percentual_utilizado: number
    status_utilizacao: string
    score_saude_cartao: number
    alerta_pagamento: string
    proxima_fatura_valor: number
}

interface Goal {
    nome_meta: string
    valor_objetivo: number
    valor_atual: number
    progresso_percentual: number
    dias_restantes: number
    status_prazo: string
    viabilidade: string
    valor_necessario_por_mes: number
}

interface Alert {
    tipo_alerta: string
    nivel_prioridade: string
    titulo: string
    mensagem: string
    acao_sugerida: string
}

interface PatrimonyMonth {
    mes_ano: string
    receita_mes: number
    despesa_mes: number
    saldo_liquido_real_mes: number
    taxa_poupanca_mes_percentual: number
    desempenho_mes: string
}

export default function AnalyticsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<{
        dashboard: DashboardData | null
        expensesByCategory: ExpenseCategory[]
        incomeAnalysis: IncomeSource[]
        investments: Investment[]
        creditCards: CreditCard[]
        patrimonyEvolution: PatrimonyMonth[]
        goals: Goal[]
        alerts: Alert[]
    }>({
        dashboard: null,
        expensesByCategory: [],
        incomeAnalysis: [],
        investments: [],
        creditCards: [],
        patrimonyEvolution: [],
        goals: [],
        alerts: []
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const response = await fetch('/api/analytics/financial-overview')
            if (!response.ok) {
                if (response.status === 401) {
                    router.push('/login')
                    return
                }
                throw new Error('Erro ao carregar dados')
            }
            const result = await response.json()
            setData(result)
        } catch (error) {
            console.error('Erro:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <LoadingSpinner />
    }

    const dashboard = data.dashboard

    if (!dashboard) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
                    <h2 className="mt-4 text-xl font-semibold">Dados insuficientes</h2>
                    <p className="mt-2 text-gray-600">
                        Adicione transações para visualizar suas análises financeiras
                    </p>
                </div>
            </div>
        )
    }

    // Preparar dados para gráficos
    const expensesChartData = data.expensesByCategory.slice(0, 8).map(cat => ({
        name: cat.categoria,
        value: cat.total_ultimos_3_meses
    }))

    const incomeChartData = data.incomeAnalysis.map(inc => ({
        name: inc.fonte_receita,
        value: inc.receita_ultimos_3_meses
    }))

    const investmentsChartData = data.investments.map(inv => ({
        name: inv.nome_investimento,
        value: inv.valor_investido_liquido
    }))

    // Função para determinar a cor do status de saúde
    const getHealthStatusColor = (status: string) => {
        switch (status) {
            case 'EXCELENTE':
                return 'text-green-600 bg-green-50 border-green-200'
            case 'BOM':
                return 'text-blue-600 bg-blue-50 border-blue-200'
            case 'ATENÇÃO':
                return 'text-yellow-600 bg-yellow-50 border-yellow-200'
            case 'CRÍTICO':
                return 'text-red-600 bg-red-50 border-red-200'
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200'
        }
    }

    // Função para determinar cor de prioridade de alerta
    const getAlertPriorityColor = (priority: string) => {
        switch (priority) {
            case 'CRÍTICO':
                return 'border-l-4 border-red-500 bg-red-50'
            case 'ALTO':
                return 'border-l-4 border-orange-500 bg-orange-50'
            case 'MÉDIO':
                return 'border-l-4 border-yellow-500 bg-yellow-50'
            default:
                return 'border-l-4 border-blue-500 bg-blue-50'
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 dark:from-gray-900 dark:to-gray-800 md:p-8">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
                        Análise Financeira Completa
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Visão detalhada da sua saúde financeira e patrimônio
                    </p>
                </div>

                {/* Status de Saúde Financeira - Destaque */}
                <div className={cn(
                    "mb-8 rounded-2xl border-2 p-6 shadow-lg",
                    getHealthStatusColor(dashboard.status_saude_financeira)
                )}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/50">
                                {dashboard.status_saude_financeira === 'EXCELENTE' && (
                                    <Award className="h-8 w-8" />
                                )}
                                {dashboard.status_saude_financeira === 'BOM' && (
                                    <CheckCircle className="h-8 w-8" />
                                )}
                                {dashboard.status_saude_financeira === 'ATENÇÃO' && (
                                    <AlertCircle className="h-8 w-8" />
                                )}
                                {dashboard.status_saude_financeira === 'CRÍTICO' && (
                                    <AlertTriangle className="h-8 w-8" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">
                                    Status: {dashboard.status_saude_financeira}
                                </h2>
                                <p className="mt-1 text-sm opacity-80">
                                    {dashboard.status_saude_financeira === 'EXCELENTE' &&
                                        'Parabéns! Suas finanças estão excelentes! Continue assim! 🎉'}
                                    {dashboard.status_saude_financeira === 'BOM' &&
                                        'Suas finanças estão bem encaminhadas! Continue melhorando! 💪'}
                                    {dashboard.status_saude_financeira === 'ATENÇÃO' &&
                                        'Atenção necessária. Revise seus gastos e reserve de emergência.'}
                                    {dashboard.status_saude_financeira === 'CRÍTICO' &&
                                        'Situação crítica. Ação imediata necessária!'}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm opacity-80">Patrimônio Líquido</div>
                            <div className="text-3xl font-bold">
                                {formatCurrency(dashboard.patrimonio_liquido_atual)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alertas Críticos */}
                {data.alerts.length > 0 && (
                    <div className="mb-8">
                        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
                            <AlertTriangle className="h-6 w-6 text-yellow-500" />
                            Alertas e Recomendações
                        </h2>
                        <div className="space-y-3">
                            {data.alerts.slice(0, 5).map((alert, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "rounded-xl p-4 shadow-sm",
                                        getAlertPriorityColor(alert.nivel_prioridade)
                                    )}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900">
                                                {alert.titulo}
                                            </h3>
                                            <p className="mt-1 text-sm text-gray-700">
                                                {alert.mensagem}
                                            </p>
                                            <p className="mt-2 text-xs font-medium text-gray-600">
                                                💡 {alert.acao_sugerida}
                                            </p>
                                        </div>
                                        <span
                                            className={cn(
                                                "ml-4 rounded-full px-3 py-1 text-xs font-bold",
                                                alert.nivel_prioridade === 'CRÍTICO' && 'bg-red-600 text-white',
                                                alert.nivel_prioridade === 'ALTO' && 'bg-orange-600 text-white',
                                                alert.nivel_prioridade === 'MÉDIO' && 'bg-yellow-600 text-white'
                                            )}
                                        >
                                            {alert.nivel_prioridade}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* KPIs Principais */}
                <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Saldo em Contas"
                        value={formatCurrency(dashboard.saldo_contas_correntes)}
                        icon={DollarSign}
                        gradient="bg-gradient-to-br from-green-400 to-green-600"
                        trend={{
                            value: `${dashboard.meses_reserva_emergencia.toFixed(1)} meses`,
                            isPositive: dashboard.meses_reserva_emergencia >= 6
                        }}
                    />
                    <StatCard
                        title="Investimentos"
                        value={formatCurrency(dashboard.valor_investido_total)}
                        icon={TrendingUp}
                        gradient="bg-gradient-to-br from-blue-400 to-blue-600"
                        trend={{
                            value: `${data.investments.length} ativos`,
                            isPositive: true
                        }}
                    />
                    <StatCard
                        title="Dívida Cartões"
                        value={formatCurrency(dashboard.divida_cartoes_atual)}
                        icon={CreditCard}
                        gradient="bg-gradient-to-br from-red-400 to-red-600"
                        trend={{
                            value: `${dashboard.utilizacao_limite_percentual.toFixed(1)}% do limite`,
                            isPositive: dashboard.utilizacao_limite_percentual < 30
                        }}
                    />
                    <StatCard
                        title="Taxa de Poupança"
                        value={`${dashboard.taxa_poupanca_percentual.toFixed(1)}%`}
                        icon={PiggyBank}
                        gradient="bg-gradient-to-br from-purple-400 to-purple-600"
                        trend={{
                            value: dashboard.taxa_poupanca_percentual >= 20 ? 'Excelente' : 'Melhorar',
                            isPositive: dashboard.taxa_poupanca_percentual >= 20
                        }}
                    />
                </div>

                {/* Receitas vs Despesas */}
                <div className="mb-8 grid gap-6 lg:grid-cols-2">
                    <SectionCard
                        title="Receitas Mensais"
                        description="Análise de receitas dos últimos 3 meses"
                        icon={TrendingUp}
                        gradient="bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-green-500/30"
                    >
                        <div className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Média Mensal (3m)
                                </span>
                                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                                    {formatCurrency(dashboard.receita_media_3_meses)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Último Mês
                                </span>
                                <span className="text-xl font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(dashboard.receita_ultimo_mes)}
                                </span>
                            </div>

                            {/* Fontes de Receita */}
                            <div className="mt-4">
                                <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Principais Fontes
                                </h4>
                                <div className="space-y-2">
                                    {data.incomeAnalysis.slice(0, 3).map((income, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                                        >
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {income.fonte_receita}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {income.tipo_renda.replace(/_/g, ' ')} •{' '}
                                                    {income.regularidade}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold text-green-600 dark:text-green-400">
                                                    {formatCurrency(income.receita_ultimos_3_meses / 3)}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {income.percentual_renda_total_3_meses.toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Despesas Mensais"
                        description="Análise de gastos dos últimos 3 meses"
                        icon={TrendingDownIcon}
                        gradient="bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-500/30"
                    >
                        <div className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Média Mensal (3m)
                                </span>
                                <span className="text-xl font-bold text-red-600 dark:text-red-400">
                                    {formatCurrency(dashboard.despesa_media_3_meses)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Último Mês
                                </span>
                                <span className="text-xl font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(dashboard.despesa_ultimo_mes)}
                                </span>
                            </div>

                            {/* Top Categorias */}
                            <div className="mt-4">
                                <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Maiores Gastos
                                </h4>
                                <div className="space-y-2">
                                    {data.expensesByCategory.slice(0, 3).map((expense, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                                        >
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {expense.categoria}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {expense.classificacao_categoria} •{' '}
                                                    {expense.frequencia_uso}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold text-red-600 dark:text-red-400">
                                                    {formatCurrency(expense.media_mensal_3_meses)}
                                                </div>
                                                {expense.variacao_mes_anterior_percentual !== 0 && (
                                                    <div
                                                        className={cn(
                                                            'flex items-center gap-1 text-xs',
                                                            expense.variacao_mes_anterior_percentual > 0
                                                                ? 'text-red-600'
                                                                : 'text-green-600'
                                                        )}
                                                    >
                                                        {expense.variacao_mes_anterior_percentual > 0 ? (
                                                            <ArrowUpRight className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowDownRight className="h-3 w-3" />
                                                        )}
                                                        {Math.abs(expense.variacao_mes_anterior_percentual).toFixed(
                                                            1
                                                        )}
                                                        %
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </SectionCard>
                </div>

                {/* Gráficos de Pizza */}
                <div className="mb-8 grid gap-6 lg:grid-cols-2">
                    {expensesChartData.length > 0 && (
                        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
                            <PieChart title="Despesas por Categoria (3 meses)" data={expensesChartData} />
                        </div>
                    )}
                    {incomeChartData.length > 0 && (
                        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
                            <PieChart title="Receitas por Fonte (3 meses)" data={incomeChartData} />
                        </div>
                    )}
                </div>

                {/* Cartões de Crédito */}
                {data.creditCards.length > 0 && (
                    <div className="mb-8">
                        <SectionCard
                            title="Análise de Cartões de Crédito"
                            description={`${data.creditCards.length} cartão(ões) em uso`}
                            icon={CreditCard}
                            gradient="bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-orange-500/30"
                        >
                            <div className="grid gap-4 md:grid-cols-2">
                                {data.creditCards.map((card, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-xl border-2 border-gray-200 p-4 dark:border-gray-700"
                                    >
                                        <div className="mb-3 flex items-center justify-between">
                                            <h4 className="font-bold text-gray-900 dark:text-white">
                                                {card.nome_cartao}
                                            </h4>
                                            <span
                                                className={cn(
                                                    'rounded-full px-3 py-1 text-xs font-bold',
                                                    card.status_utilizacao === 'CRÍTICO' &&
                                                    'bg-red-100 text-red-700',
                                                    card.status_utilizacao === 'ALTO' &&
                                                    'bg-orange-100 text-orange-700',
                                                    card.status_utilizacao === 'MODERADO' &&
                                                    'bg-yellow-100 text-yellow-700',
                                                    card.status_utilizacao === 'SAUDÁVEL' &&
                                                    'bg-green-100 text-green-700'
                                                )}
                                            >
                                                {card.status_utilizacao}
                                            </span>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    Utilização
                                                </span>
                                                <span className="font-semibold">
                                                    {card.percentual_utilizado.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    Dívida Atual
                                                </span>
                                                <span className="font-semibold text-red-600">
                                                    {formatCurrency(card.divida_atual)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    Limite Total
                                                </span>
                                                <span className="font-semibold">
                                                    {formatCurrency(card.limite_total)}
                                                </span>
                                            </div>

                                            {/* Score de Saúde */}
                                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">
                                                        Score de Saúde
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 w-24 rounded-full bg-gray-200">
                                                            <div
                                                                className={cn(
                                                                    'h-2 rounded-full',
                                                                    card.score_saude_cartao >= 70 && 'bg-green-500',
                                                                    card.score_saude_cartao >= 40 &&
                                                                    card.score_saude_cartao < 70 &&
                                                                    'bg-yellow-500',
                                                                    card.score_saude_cartao < 40 && 'bg-red-500'
                                                                )}
                                                                style={{
                                                                    width: `${card.score_saude_cartao}%`
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="font-bold">
                                                            {card.score_saude_cartao.toFixed(0)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Alerta de Pagamento */}
                                            {card.alerta_pagamento !== 'OK' && (
                                                <div className="mt-2 rounded-lg bg-yellow-50 p-2 text-xs font-medium text-yellow-800">
                                                    ⚠️ {card.alerta_pagamento.replace(/_/g, ' ')}
                                                    {card.proxima_fatura_valor > 0 && (
                                                        <>
                                                            {' - '}
                                                            {formatCurrency(card.proxima_fatura_valor)}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>
                    </div>
                )}

                {/* Investimentos */}
                {data.investments.length > 0 && (
                    <div className="mb-8">
                        <SectionCard
                            title="Portfolio de Investimentos"
                            description={`${data.investments.length} investimento(s) ativo(s)`}
                            icon={Activity}
                            gradient="bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/30"
                        >
                            <div className="mb-6">
                                <PieChart title="Alocação do Portfolio" data={investmentsChartData} />
                            </div>

                            <div className="space-y-3">
                                {data.investments.map((investment, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                                    >
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900 dark:text-white">
                                                {investment.nome_investimento}
                                            </div>
                                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                                <span
                                                    className={cn(
                                                        'rounded px-2 py-1',
                                                        investment.nivel_risco === 'BAIXO' &&
                                                        'bg-green-100 text-green-700',
                                                        investment.nivel_risco === 'MEDIO' &&
                                                        'bg-yellow-100 text-yellow-700',
                                                        investment.nivel_risco === 'ALTO' &&
                                                        'bg-orange-100 text-orange-700',
                                                        investment.nivel_risco === 'MUITO_ALTO' &&
                                                        'bg-red-100 text-red-700'
                                                    )}
                                                >
                                                    {investment.nivel_risco}
                                                </span>
                                                <span>{investment.tipo_investimento}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-blue-600 dark:text-blue-400">
                                                {formatCurrency(investment.valor_investido_liquido)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {investment.percentual_portfolio.toFixed(1)}% do portfolio
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>
                    </div>
                )}

                {/* Metas */}
                {data.goals.length > 0 && (
                    <div className="mb-8">
                        <SectionCard
                            title="Análise de Metas"
                            description={`${dashboard.total_metas_ativas} meta(s) ativa(s)`}
                            icon={Target}
                            gradient="bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-purple-500/30"
                        >
                            <div className="space-y-4">
                                {data.goals.slice(0, 5).map((goal, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-xl border-2 border-gray-200 p-4 dark:border-gray-700"
                                    >
                                        <div className="mb-3 flex items-center justify-between">
                                            <h4 className="font-bold text-gray-900 dark:text-white">
                                                {goal.nome_meta}
                                            </h4>
                                            <span
                                                className={cn(
                                                    'rounded-full px-3 py-1 text-xs font-bold',
                                                    goal.viabilidade === 'ALCANÇADA' &&
                                                    'bg-green-100 text-green-700',
                                                    goal.viabilidade === 'VIÁVEL' &&
                                                    'bg-blue-100 text-blue-700',
                                                    goal.viabilidade === 'DESAFIADORA' &&
                                                    'bg-yellow-100 text-yellow-700',
                                                    goal.viabilidade === 'INVIÁVEL_NO_PRAZO' &&
                                                    'bg-red-100 text-red-700'
                                                )}
                                            >
                                                {goal.viabilidade.replace(/_/g, ' ')}
                                            </span>
                                        </div>

                                        {/* Barra de Progresso */}
                                        <div className="mb-3">
                                            <div className="mb-1 flex justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    Progresso
                                                </span>
                                                <span className="font-semibold">
                                                    {goal.progresso_percentual.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="h-3 w-full rounded-full bg-gray-200">
                                                <div
                                                    className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                                                    style={{
                                                        width: `${Math.min(goal.progresso_percentual, 100)}%`
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <div className="text-gray-600 dark:text-gray-400">Atual</div>
                                                <div className="font-semibold">
                                                    {formatCurrency(goal.valor_atual)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-gray-600 dark:text-gray-400">Objetivo</div>
                                                <div className="font-semibold">
                                                    {formatCurrency(goal.valor_objetivo)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-gray-600 dark:text-gray-400">
                                                    Necessário/mês
                                                </div>
                                                <div className="font-semibold text-blue-600">
                                                    {formatCurrency(goal.valor_necessario_por_mes)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-gray-600 dark:text-gray-400">Prazo</div>
                                                <div
                                                    className={cn(
                                                        'font-semibold',
                                                        goal.dias_restantes < 0 && 'text-red-600',
                                                        goal.dias_restantes >= 0 &&
                                                        goal.dias_restantes <= 30 &&
                                                        'text-yellow-600',
                                                        goal.dias_restantes > 30 && 'text-green-600'
                                                    )}
                                                >
                                                    {goal.dias_restantes < 0
                                                        ? `${Math.abs(goal.dias_restantes)} dias atrás`
                                                        : `${goal.dias_restantes} dias`}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>
                    </div>
                )}

                {/* Evolução Patrimonial */}
                {data.patrimonyEvolution.length > 0 && (
                    <div className="mb-8">
                        <SectionCard
                            title="Evolução Patrimonial"
                            description="Últimos 12 meses de movimentação"
                            icon={BarChart3}
                            gradient="bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-cyan-500/30"
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <th className="pb-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                                                Mês
                                            </th>
                                            <th className="pb-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                                                Receitas
                                            </th>
                                            <th className="pb-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                                                Despesas
                                            </th>
                                            <th className="pb-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                                                Saldo
                                            </th>
                                            <th className="pb-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                                                Taxa Poupança
                                            </th>
                                            <th className="pb-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.patrimonyEvolution.slice(0, 12).map((month, idx) => (
                                            <tr
                                                key={idx}
                                                className="border-b border-gray-100 dark:border-gray-800"
                                            >
                                                <td className="py-3 font-medium text-gray-900 dark:text-white">
                                                    {month.mes_ano}
                                                </td>
                                                <td className="py-3 text-right text-green-600 dark:text-green-400">
                                                    {formatCurrency(month.receita_mes)}
                                                </td>
                                                <td className="py-3 text-right text-red-600 dark:text-red-400">
                                                    {formatCurrency(month.despesa_mes)}
                                                </td>
                                                <td
                                                    className={cn(
                                                        'py-3 text-right font-semibold',
                                                        month.saldo_liquido_real_mes >= 0
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : 'text-red-600 dark:text-red-400'
                                                    )}
                                                >
                                                    {formatCurrency(month.saldo_liquido_real_mes)}
                                                </td>
                                                <td className="py-3 text-right font-semibold">
                                                    {month.taxa_poupanca_mes_percentual.toFixed(1)}%
                                                </td>
                                                <td className="py-3 text-center">
                                                    <span
                                                        className={cn(
                                                            'inline-flex rounded-full px-2 py-1 text-xs font-medium',
                                                            month.desempenho_mes === 'POSITIVO' &&
                                                            'bg-green-100 text-green-700',
                                                            month.desempenho_mes === 'NEUTRO' &&
                                                            'bg-gray-100 text-gray-700',
                                                            month.desempenho_mes === 'NEGATIVO' &&
                                                            'bg-red-100 text-red-700'
                                                        )}
                                                    >
                                                        {month.desempenho_mes}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </SectionCard>
                    </div>
                )}
            </div>
        </div>
    )
}
