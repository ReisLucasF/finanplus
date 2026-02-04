'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Wallet, Calendar, CreditCard, Target, PlusCircle, DollarSign, LineChart } from 'lucide-react'
import Link from 'next/link'
import PieChart from './components/PieChart'
import StatCard from './components/StatCard'
import LoadingSpinner from './components/LoadingSpinner'
import { formatCurrency } from '@/lib/utils'

type FilterType = 'this-month' | 'last-month' | 'this-quarter' | 'this-year' | 'custom'

export default function DashboardPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [filterType, setFilterType] = useState<FilterType>('this-month')
    const [customStartDate, setCustomStartDate] = useState('')
    const [customEndDate, setCustomEndDate] = useState('')
    const [dateRange, setDateRange] = useState({ start: new Date(), end: new Date() })
    const [stats, setStats] = useState({
        income: 0,
        expenses: 0,
        available: 0,
        predicted: 0,
        predictedIncome: 0,
        accounts: [],
        cards: [],
        goals: [],
        expensesByCategory: [] as { name: string; value: number; color?: string }[],
        incomeByCategory: [] as { name: string; value: number; color?: string }[],
        cardExpensesByCategory: [] as { name: string; value: number; color?: string }[],
        previousMonth: {
            income: 0,
            expenses: 0,
            balance: 0
        },
        investments: {
            total: 0,
            invested: 0,
            current: 0,
            profit: 0,
            profitPercentage: 0
        }
    })

    // Novos estados para dados das views avançadas
    interface DashboardData {
        receita_media_mensal: number;
        despesa_media_mensal: number;
        saldo_bancos: number;
        divida_cartoes: number;
        valor_investimentos: number;
    }

    interface GastoPorCategoria {
        categoria: string;
        total_ultimo_mes: number;
        total_ultimos_3_meses: number;
        media_mensal_3_meses: number;
        prioridade: string;
    }

    interface AnaliseReceita {
        fonte_receita: string;
        receita_ultimo_mes: number;
        receita_ultimos_3_meses: number;
        tipo_renda: string;
        regularidade: string;
    }

    interface EvolucaoPatrimonial {
        mes: string;
        saldo_liquido_mes: number;
        patrimonio_acumulado: number;
        crescimento_percentual: number;
    }

    interface Alerta {
        tipo_alerta: string;
        nivel: string;
        mensagem: string;
        valor_atual: number;
        valor_recomendado: number;
    }

    interface PortfolioInvestimento {
        nome_investimento: string;
        tipo_investimento: string;
        valor_investido_liquido: number;
        nivel_risco: string;
    }

    interface RelatorioCompleto {
        resumo_historico: {
            total_receitas_historico: number;
            total_despesas_historico: number;
            saldo_liquido_historico: number;
        };
        patrimonio_atual: {
            saldo_bancos: number;
            divida_cartoes: number;
            valor_investimentos: number;
            patrimonio_liquido: number;
        };
    }

    const [advancedData, setAdvancedData] = useState({
        dashboard: {} as DashboardData,
        gastosPorCategoria: [] as GastoPorCategoria[],
        analiseReceitas: [] as AnaliseReceita[],
        evolucaoPatrimonial: [] as EvolucaoPatrimonial[],
        alertas: [] as Alerta[],
        portfolioInvestimentos: [] as PortfolioInvestimento[],
        relatorioCompleto: {} as RelatorioCompleto
    })
    const [loadingAdvanced, setLoadingAdvanced] = useState(true)



    const getFilterLabel = () => {
        switch (filterType) {
            case 'this-month':
                return 'Este Mês'
            case 'last-month':
                return 'Mês Passado'
            case 'this-quarter':
                return 'Este Trimestre'
            case 'this-year':
                return 'Este Ano'
            case 'custom':
                if (customStartDate && customEndDate) {
                    return `${new Date(customStartDate).toLocaleDateString('pt-BR')} - ${new Date(customEndDate).toLocaleDateString('pt-BR')}`
                }
                return 'Período Personalizado'
            default:
                return 'Este Mês'
        }
    }

    const calculateDateRange = useCallback(() => {
        const now = new Date()
        let start = new Date()
        let end = new Date()

        switch (filterType) {
            case 'this-month':
                start = new Date(now.getFullYear(), now.getMonth(), 1)
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                break
            case 'last-month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                end = new Date(now.getFullYear(), now.getMonth(), 0)
                break
            case 'this-quarter':
                const quarter = Math.floor(now.getMonth() / 3)
                start = new Date(now.getFullYear(), quarter * 3, 1)
                end = new Date(now.getFullYear(), quarter * 3 + 3, 0)
                break
            case 'this-year':
                start = new Date(now.getFullYear(), 0, 1)
                end = new Date(now.getFullYear(), 11, 31)
                break
            case 'custom':
                if (customStartDate && customEndDate) {
                    start = new Date(customStartDate)
                    end = new Date(customEndDate)
                }
                break
        }

        setDateRange({ start, end })
    }, [filterType, customStartDate, customEndDate])

    const calculatePercentageChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0
        return ((current - previous) / previous) * 100
    }

    useEffect(() => {
        calculateDateRange()
    }, [calculateDateRange])

    useEffect(() => {
        const loadData = async () => {
            try {
                const res = await fetch('/api/auth/me')
                if (!res.ok) {
                    router.push('/login')
                    return
                }

                // Buscar dados do dashboard tradicional + novos dados avançados
                const [accountsRes, cardsRes, goalsRes, transactionsRes, recurringsRes, categoriesRes, investmentsRes, cardExpensesRes, advancedDashboardRes, relatorioCompletoRes] = await Promise.all([
                    fetch('/api/accounts'),
                    fetch('/api/cards'),
                    fetch('/api/goals'),
                    fetch('/api/transactions'),
                    fetch('/api/recurring-transactions'),
                    fetch('/api/categories'),
                    fetch('/api/investments'),
                    fetch(`/api/cards/expenses-by-category?startDate=${dateRange.start.toISOString()}&endDate=${dateRange.end.toISOString()}`),
                    fetch('/api/reports/dashboard'),
                    fetch('/api/reports/completo')
                ])

                const accounts = accountsRes.ok ? await accountsRes.json() : []
                const cards = cardsRes.ok ? await cardsRes.json() : []
                const goals = goalsRes.ok ? await goalsRes.json() : []
                const allTransactions = transactionsRes.ok ? await transactionsRes.json() : []
                const recurrings = recurringsRes.ok ? await recurringsRes.json() : []
                const categories = categoriesRes.ok ? await categoriesRes.json() : []
                const investments = investmentsRes.ok ? await investmentsRes.json() : []
                const cardExpensesByCategory = cardExpensesRes.ok ? await cardExpensesRes.json() : []

                // Dados avançados das views
                const advancedDashboard = advancedDashboardRes.ok ? await advancedDashboardRes.json() : {}
                const relatorioCompleto = relatorioCompletoRes.ok ? await relatorioCompletoRes.json() : {}

                console.log('🚀 Dashboard Advanced API Response:', {
                    advancedDashboardStatus: advancedDashboardRes.status,
                    advancedDashboardOk: advancedDashboardRes.ok,
                    advancedDashboard,
                    relatorioCompletoStatus: relatorioCompletoRes.status,
                    relatorioCompletoOk: relatorioCompletoRes.ok,
                    relatorioCompleto
                })

                // Log detalhado dos dados recebidos
                console.log('📊 Advanced Dashboard Data Details:', {
                    'dashboard keys': Object.keys(advancedDashboard),
                    'dashboard.dashboard': advancedDashboard.dashboard,
                    'dashboard.gastosPorCategoria': advancedDashboard.gastosPorCategoria,
                    'dashboard.alertas': advancedDashboard.alertas,
                    'relatorio keys': Object.keys(relatorioCompleto),
                    'relatorio.relatorio': relatorioCompleto.relatorio
                })

                // Buscar summaries dos investimentos
                const investmentSummaries = await Promise.all(
                    investments.map((inv: any) =>
                        fetch(`/api/investments/${inv.id}/summary`)
                            .then(res => res.ok ? res.json() : null)
                            .catch(() => null)
                    )
                )

                // Calcular totais de investimentos
                const investmentTotals = investmentSummaries.reduce((acc, summaryData) => {
                    if (summaryData && summaryData.summary) {
                        const s = summaryData.summary
                        return {
                            total: acc.total + 1,
                            invested: acc.invested + (s.totalInvested || 0),
                            current: acc.current + (s.currentValue || 0),
                            profit: acc.profit + (s.profitLoss || 0),
                        }
                    }
                    return acc
                }, { total: 0, invested: 0, current: 0, profit: 0 })

                investmentTotals.profitPercentage = investmentTotals.invested > 0
                    ? (investmentTotals.profit / investmentTotals.invested) * 100
                    : 0

                // Adicionar calculatedAmount nas metas que incluem investimentos
                const goalsWithCalculated = goals.map((goal: any) => ({
                    ...goal,
                    calculatedAmount: goal.includeInvestments
                        ? goal.currentAmount + investmentTotals.current
                        : goal.currentAmount
                }))

                // Filtrar transações do período selecionado
                const transactions = allTransactions.filter((t: any) => {
                    const date = new Date(t.date)
                    return date >= dateRange.start && date <= dateRange.end
                })

                // Calcular período anterior com mesma duração para comparação
                const rangeDuration = dateRange.end.getTime() - dateRange.start.getTime()
                const prevStart = new Date(dateRange.start.getTime() - rangeDuration)
                const prevEnd = new Date(dateRange.start.getTime() - 1)

                const previousTransactions = allTransactions.filter((t: any) => {
                    const date = new Date(t.date)
                    return date >= prevStart && date <= prevEnd
                })

                // Calcular estatísticas com valores seguros
                const available = accounts.reduce((sum: number, acc: any) => {
                    const balance = parseFloat(acc.currentBalance) || 0
                    return sum + balance
                }, 0)

                const income = transactions
                    .filter((t: any) => t.type === 'INCOME')
                    .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0)

                const expenses = transactions
                    .filter((t: any) => t.type === 'EXPENSE')
                    .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0)

                // Período anterior
                const prevIncome = previousTransactions
                    .filter((t: any) => t.type === 'INCOME')
                    .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0)

                const prevExpenses = previousTransactions
                    .filter((t: any) => t.type === 'EXPENSE')
                    .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0)

                // Calcular receitas previstas: apenas recorrências futuras (ainda não recebidas)
                const now = new Date()
                const futureRecurringIncome = recurrings
                    .filter((r: any) => r.isActive && r.type === 'INCOME')
                    .reduce((sum: number, r: any) => {
                        // Calcula quantas ocorrências FUTURAS terão no período
                        const amount = parseFloat(r.amount) || 0
                        const futureStart = now > dateRange.start ? now : dateRange.start
                        const occurrences = calculateOccurrencesInPeriod(r, futureStart, dateRange.end)
                        return sum + (amount * occurrences)
                    }, 0)

                const futureRecurringExpenses = recurrings
                    .filter((r: any) => r.isActive && r.type === 'EXPENSE')
                    .reduce((sum: number, r: any) => {
                        const amount = parseFloat(r.amount) || 0
                        const futureStart = now > dateRange.start ? now : dateRange.start
                        const occurrences = calculateOccurrencesInPeriod(r, futureStart, dateRange.end)
                        return sum + (amount * occurrences)
                    }, 0)

                const predicted = available + income - expenses + futureRecurringIncome - futureRecurringExpenses
                const predictedIncome = futureRecurringIncome // Apenas receitas futuras não recebidas

                // Agrupar por categoria para gráficos
                const expensesByCategory: { [key: string]: { value: number; color?: string } } = {}
                const incomeByCategory: { [key: string]: { value: number; color?: string } } = {}

                console.log('📊 Dashboard - Transações filtradas:', transactions.length)
                console.log('📊 Dashboard - Exemplos de transações:', transactions.slice(0, 3))

                transactions.forEach((t: any) => {
                    const categoryName = t.category?.name || 'Sem categoria'
                    const categoryColor = t.category?.color && t.category.color !== '#999999' && t.category.color !== ''
                        ? t.category.color
                        : undefined
                    const amount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0

                    console.log(`📊 Transação: ${t.description} - Tipo: ${t.type} - Categoria: ${categoryName} - Valor: ${amount}`)

                    if (t.type === 'EXPENSE') {
                        if (!expensesByCategory[categoryName]) {
                            expensesByCategory[categoryName] = {
                                value: 0,
                                color: categoryColor
                            }
                        }
                        expensesByCategory[categoryName].value += amount
                    } else if (t.type === 'INCOME') {
                        if (!incomeByCategory[categoryName]) {
                            incomeByCategory[categoryName] = {
                                value: 0,
                                color: categoryColor
                            }
                        }
                        incomeByCategory[categoryName].value += amount
                    }
                })

                const expensesChart = Object.entries(expensesByCategory).map(([name, data]) => ({
                    name,
                    value: data.value,
                    ...(data.color && { color: data.color })
                }))

                const incomeChart = Object.entries(incomeByCategory).map(([name, data]) => ({
                    name,
                    value: data.value,
                    ...(data.color && { color: data.color })
                }))

                console.log('📊 Dashboard - Despesas por categoria (FINAL):', expensesChart)
                console.log('📊 Dashboard - Receitas por categoria (FINAL):', incomeChart)

                setStats({
                    income: income || 0,
                    expenses: expenses || 0,
                    available: available || 0,
                    predicted: predicted || 0,
                    predictedIncome: predictedIncome || 0,
                    accounts,
                    cards,
                    goals: goalsWithCalculated,
                    expensesByCategory: expensesChart,
                    incomeByCategory: incomeChart,
                    cardExpensesByCategory: cardExpensesByCategory,
                    previousMonth: {
                        income: prevIncome || 0,
                        expenses: prevExpenses || 0,
                        balance: prevIncome - prevExpenses
                    },
                    investments: investmentTotals
                })

                // Atualizar dados avançados
                const newAdvancedData = {
                    dashboard: advancedDashboard.dashboard || {},
                    gastosPorCategoria: advancedDashboard.gastosPorCategoria || [],
                    analiseReceitas: advancedDashboard.analiseReceitas || [],
                    evolucaoPatrimonial: advancedDashboard.evolucaoPatrimonial || [],
                    alertas: advancedDashboard.alertas || [],
                    portfolioInvestimentos: advancedDashboard.portfolioInvestimentos || [],
                    relatorioCompleto: relatorioCompleto.relatorio || {}
                }

                console.log('🎯 Setting Advanced Data:', newAdvancedData)

                setAdvancedData(newAdvancedData)

                setLoadingAdvanced(false)
            } catch (error) {
                console.error('Erro ao carregar dados:', error)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [router, dateRange])

    // Função para calcular quantas ocorrências uma recorrência terá no período
    const calculateOccurrencesInPeriod = (recurring: any, start: Date, end: Date) => {
        if (!recurring.isActive) return 0

        const recStart = new Date(recurring.startDate)
        const recEnd = recurring.endDate ? new Date(recurring.endDate) : end

        // Se a recorrência começa depois do período ou termina antes, não conta
        if (recStart > end || recEnd < start) return 0

        const periodStart = recStart > start ? recStart : start
        const periodEnd = recEnd < end ? recEnd : end
        const daysDiff = Math.floor((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))

        switch (recurring.frequency) {
            case 'WEEKLY':
                return Math.floor(daysDiff / 7) + 1
            case 'BIWEEKLY':
                return Math.floor(daysDiff / 15) + 1
            case 'MONTHLY':
                const monthsDiff = (periodEnd.getFullYear() - periodStart.getFullYear()) * 12 +
                    (periodEnd.getMonth() - periodStart.getMonth())
                return monthsDiff + 1
            case 'ANNUAL':
                const yearsDiff = periodEnd.getFullYear() - periodStart.getFullYear()
                return yearsDiff + 1
            default:
                return 1
        }
    }

    if (loading || loadingAdvanced) {
        return <LoadingSpinner />
    }

    // Calcular variações percentuais
    const incomeChange = calculatePercentageChange(stats.income, stats.previousMonth.income)
    const expensesChange = calculatePercentageChange(stats.expenses, stats.previousMonth.expenses)
    const balanceChange = calculatePercentageChange(stats.income - stats.expenses, stats.previousMonth.balance)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                        Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Visão geral completa das suas finanças
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                    <Link
                        href="/dashboard/transactions"
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Nova Transação
                    </Link>
                </div>
            </div>

            {/* Filtros de Período */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilterType('this-month')}
                        className={`px-4 py-2.5 rounded-xl font-medium transition-all ${filterType === 'this-month'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm'
                            }`}
                    >
                        Este Mês
                    </button>
                    <button
                        onClick={() => setFilterType('last-month')}
                        className={`px-4 py-2.5 rounded-xl font-medium transition-all ${filterType === 'last-month'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm'
                            }`}
                    >
                        Mês Passado
                    </button>
                    <button
                        onClick={() => setFilterType('this-quarter')}
                        className={`px-4 py-2.5 rounded-xl font-medium transition-all ${filterType === 'this-quarter'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm'
                            }`}
                    >
                        Este Trimestre
                    </button>
                    <button
                        onClick={() => setFilterType('this-year')}
                        className={`px-4 py-2.5 rounded-xl font-medium transition-all ${filterType === 'this-year'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm'
                            }`}
                    >
                        Este Ano
                    </button>
                    <button
                        onClick={() => setFilterType('custom')}
                        className={`px-4 py-2.5 rounded-xl font-medium transition-all ${filterType === 'custom'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm'
                            }`}
                    >
                        Personalizado
                    </button>
                </div>

                {/* Seletor de Datas Personalizado */}
                {filterType === 'custom' && (
                    <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Data Inicial</label>
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Data Final</label>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                )}

                {/* Label do Período Selecionado */}
                <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-gray-800 px-4 py-3 shadow-sm">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-900 dark:text-white">{getFilterLabel()}</span>
                </div>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                    title="Receitas"
                    value={formatCurrency(stats.income)}
                    icon={TrendingUp}
                    trend={{
                        value: `${Math.abs(incomeChange).toFixed(1)}%`,
                        isPositive: incomeChange >= 0
                    }}
                    gradient="bg-green-500"
                    iconColor="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-green-500/30"
                />
                <StatCard
                    title="Despesas"
                    value={formatCurrency(stats.expenses)}
                    icon={TrendingDown}
                    trend={{
                        value: `${Math.abs(expensesChange).toFixed(1)}%`,
                        isPositive: expensesChange <= 0
                    }}
                    gradient="bg-red-500"
                    iconColor="bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-500/30"
                />
                <StatCard
                    title="Receita Prevista"
                    value={formatCurrency(stats.predictedIncome)}
                    icon={Calendar}
                    gradient="bg-blue-500"
                    iconColor="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/30"
                />
                <StatCard
                    title="Disponível"
                    value={formatCurrency(stats.available)}
                    icon={DollarSign}
                    gradient="bg-purple-500"
                    iconColor="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-purple-500/30"
                />
                <StatCard
                    title="Investimentos"
                    value={formatCurrency(stats.investments.current)}
                    icon={LineChart}
                    trend={{
                        value: `${stats.investments.profitPercentage.toFixed(2)}%`,
                        isPositive: stats.investments.profit >= 0
                    }}
                    gradient="bg-orange-500"
                    iconColor="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-orange-500/30"
                />
                <StatCard
                    title="Patrimônio Total"
                    value={formatCurrency(stats.available + stats.investments.current)}
                    icon={Target}
                    gradient="bg-indigo-500"
                    iconColor="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-indigo-500/30"
                />
            </div>

            {/* Seção de Debug - Remover em produção */}
            {/* {process.env.NODE_ENV === 'development' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-yellow-800 mb-2">DEBUG - Dados Avançados (Procedures)</h3>
                    <div className="text-xs text-yellow-700 space-y-1">
                        <div>Gastos por categoria: {advancedData.gastosPorCategoria.length} itens</div>
                        <div>Análise receitas: {advancedData.analiseReceitas.length} itens</div>
                        <div>Alertas: {advancedData.alertas.length} itens</div>
                        <div>Portfolio investimentos: {advancedData.portfolioInvestimentos.length} itens</div>
                        <div>Evolução patrimonial: {advancedData.evolucaoPatrimonial.length} itens</div>
                        <div>Dashboard keys: {Object.keys(advancedData.dashboard).join(', ')}</div>
                        <div>Dashboard values: {JSON.stringify(advancedData.dashboard).substring(0, 100)}...</div>
                        <div>Relatório completo keys: {Object.keys(advancedData.relatorioCompleto).join(', ')}</div>
                        <div className="mt-2 p-2 bg-yellow-100 rounded text-xs">
                            <strong>Últimos logs do console:</strong> Verifique o console do navegador para logs detalhados
                        </div>
                    </div>
                </div>
            )} */}

            {/* Alertas Financeiros */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl shadow-lg shadow-yellow-500/30">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    Alertas Financeiros
                </h3>
                {advancedData.alertas.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {advancedData.alertas.map((alerta: any, index: number) => (
                            <div key={index} className={`p-4 rounded-lg border-l-4 ${alerta.prioridade === 'ALTO' ? 'bg-red-50 border-red-500' :
                                alerta.prioridade === 'MEDIO' ? 'bg-yellow-50 border-yellow-500' :
                                    'bg-green-50 border-green-500'
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-sm font-medium ${alerta.prioridade === 'ALTO' ? 'text-red-800' :
                                        alerta.prioridade === 'MEDIO' ? 'text-yellow-800' :
                                            'text-green-800'
                                        }`}>
                                        {alerta.tipo_alerta === 'GASTO_ALTO' ? '💳 Gasto Alto' :
                                            alerta.tipo_alerta === 'LIMITE_CARTAO' ? '⚠️ Limite Cartão' :
                                                alerta.tipo_alerta === 'META_ATRASADA' ? '🎯 Meta Atrasada' :
                                                    alerta.tipo_alerta === 'DASHBOARD_OK' ? '✅ Sistema OK' : alerta.tipo_alerta}
                                    </span>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${alerta.prioridade === 'ALTO' ? 'bg-red-100 text-red-800' :
                                        alerta.prioridade === 'MEDIO' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-green-100 text-green-800'
                                        }`}>
                                        {alerta.prioridade}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600">{alerta.mensagem}</p>
                                <div className="text-xs text-gray-500 mt-2">
                                    {new Date(alerta.data_alerta).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 font-medium">Nenhum alerta financeiro no momento</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Suas finanças estão em ordem!</p>
                    </div>
                )}
            </div>

            {/* Gastos por Categoria - Dados Avançados */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/30">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    Análise de Gastos por Categoria (Últimos 3 Meses)
                </h3>
                {advancedData.gastosPorCategoria.length > 0 ? (
                    <div className="space-y-3">
                        {advancedData.gastosPorCategoria.map((categoria: any, index: number) => (
                            <div key={index} className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-750 rounded-xl hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600">
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-white">{categoria.categoria}</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {categoria.quantidade_transacoes} transações + {categoria.quantidade_compras_cartao} compras no cartão
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-lg text-gray-900 dark:text-white">
                                        R$ {Number(categoria.total_ultimos_3_meses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                    {/* <div className="text-sm text-gray-600">
                                        R$ {Number(categoria.total_ultimo_mes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} este mês
                                    </div> */}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 font-medium">Nenhum gasto registrado</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Adicione transações para ver a análise por categoria</p>
                    </div>
                )}
            </div>

            {/* KPIs do Dashboard Avançado */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg shadow-green-500/30">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    KPIs Financeiros Avançados
                </h3>
                {Object.keys(advancedData.dashboard).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {advancedData.dashboard.receita_media_mensal !== undefined && (
                            <div className="text-center p-5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-700 hover:shadow-lg transition-all duration-200">
                                <div className="text-2xl font-bold text-green-600">
                                    R$ {Number(advancedData.dashboard.receita_media_mensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-sm text-gray-600">Receita Média Mensal</div>
                            </div>
                        )}
                        {advancedData.dashboard.despesa_media_mensal !== undefined && (
                            <div className="text-center p-5 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl border border-red-200 dark:border-red-700 hover:shadow-lg transition-all duration-200">
                                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                    R$ {Number(advancedData.dashboard.despesa_media_mensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">Despesa Média Mensal</div>
                            </div>
                        )}
                        {advancedData.dashboard.patrimonio_liquido !== undefined && (
                            <div className="text-center p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-700 hover:shadow-lg transition-all duration-200">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    R$ {Number(advancedData.dashboard.patrimonio_liquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">Patrimônio Líquido</div>
                            </div>
                        )}
                        {advancedData.dashboard.total_metas !== undefined && (
                            <div className="text-center p-5 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl border border-yellow-200 dark:border-yellow-700 hover:shadow-lg transition-all duration-200">
                                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                    {Number(advancedData.dashboard.total_metas || 0)}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">Metas Ativas</div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 font-medium">Carregando KPIs...</p>
                    </div>
                )}
            </div>

            {/* Insights do Relatório Avançado */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    Análise Financeira Avançada
                </h3>
                {advancedData.relatorioCompleto && advancedData.relatorioCompleto.relatorio ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Taxa de Poupança */}
                        {advancedData.relatorioCompleto.relatorio.taxa_poupanca_historica !== undefined && (
                            <div className={`p-5 rounded-xl border-2 hover:shadow-xl transition-all duration-200 ${advancedData.relatorioCompleto.relatorio.taxa_poupanca_historica >= 20 ? 'bg-green-50' :
                                advancedData.relatorioCompleto.relatorio.taxa_poupanca_historica >= 10 ? 'bg-yellow-50' :
                                    'bg-red-50'
                                }`}>
                                <h4 className={`font-medium mb-2 ${advancedData.relatorioCompleto.relatorio.taxa_poupanca_historica >= 20 ? 'text-green-900' :
                                    advancedData.relatorioCompleto.relatorio.taxa_poupanca_historica >= 10 ? 'text-yellow-900' :
                                        'text-red-900'
                                    }`}>Taxa de Poupança</h4>
                                <div className={`text-3xl font-bold ${advancedData.relatorioCompleto.relatorio.taxa_poupanca_historica >= 20 ? 'text-green-700' :
                                    advancedData.relatorioCompleto.relatorio.taxa_poupanca_historica >= 10 ? 'text-yellow-700' :
                                        'text-red-700'
                                    }`}>
                                    {Number(advancedData.relatorioCompleto.relatorio.taxa_poupanca_historica).toFixed(1)}%
                                </div>
                                <div className="text-sm opacity-75 mt-2 font-medium">
                                    {advancedData.relatorioCompleto.relatorio.taxa_poupanca_historica >= 20 ? 'Excelente!' :
                                        advancedData.relatorioCompleto.relatorio.taxa_poupanca_historica >= 10 ? 'Bom progresso' :
                                            'Precisa melhorar'}
                                </div>
                            </div>
                        )}

                        {/* Runway */}
                        {advancedData.relatorioCompleto.relatorio.runway_meses_reserva !== undefined && (
                            <div className={`p-5 rounded-xl border-2 hover:shadow-xl transition-all duration-200 ${advancedData.relatorioCompleto.relatorio.runway_meses_reserva >= 6 ? 'bg-green-50' :
                                advancedData.relatorioCompleto.relatorio.runway_meses_reserva >= 3 ? 'bg-yellow-50' :
                                    'bg-red-50'
                                }`}>
                                <h4 className={`font-medium mb-2 ${advancedData.relatorioCompleto.relatorio.runway_meses_reserva >= 6 ? 'text-green-900' :
                                    advancedData.relatorioCompleto.relatorio.runway_meses_reserva >= 3 ? 'text-yellow-900' :
                                        'text-red-900'
                                    }`}>Reserva de Emergência</h4>
                                <div className={`text-3xl font-bold ${advancedData.relatorioCompleto.relatorio.runway_meses_reserva >= 6 ? 'text-green-700' :
                                    advancedData.relatorioCompleto.relatorio.runway_meses_reserva >= 3 ? 'text-yellow-700' :
                                        'text-red-700'
                                    }`}>
                                    {Number(advancedData.relatorioCompleto.relatorio.runway_meses_reserva).toFixed(1)}
                                </div>
                                <div className="text-sm opacity-75 mt-2 font-medium">meses de cobertura</div>
                            </div>
                        )}

                        {/* Balanço Mensal */}
                        {advancedData.relatorioCompleto.relatorio.resumo_historico && (
                            <div className={`p-5 rounded-xl border-2 hover:shadow-xl transition-all duration-200 ${advancedData.relatorioCompleto.relatorio.resumo_historico.saldo_liquido_historico >= 0 ? 'bg-green-50' : 'bg-red-50'
                                }`}>
                                <h4 className={`font-medium mb-2 ${advancedData.relatorioCompleto.relatorio.resumo_historico.saldo_liquido_historico >= 0 ? 'text-green-900' : 'text-red-900'
                                    }`}>Saldo Médio Mensal</h4>
                                <div className={`text-3xl font-bold ${advancedData.relatorioCompleto.relatorio.resumo_historico.saldo_liquido_historico >= 0 ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                    R$ {Number(advancedData.relatorioCompleto.relatorio.resumo_historico.saldo_liquido_historico || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-xs opacity-75 mt-1">
                                    Receita: R$ {Number(advancedData.relatorioCompleto.relatorio.resumo_historico.receita_media_mensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - Despesa: R$ {Number(advancedData.relatorioCompleto.relatorio.resumo_historico.despesa_media_mensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 font-medium">Carregando análise financeira...</p>
                    </div>
                )}

                {/* Status da Reserva de Emergência */}
                {advancedData.relatorioCompleto && advancedData.relatorioCompleto.relatorio && advancedData.relatorioCompleto.relatorio.status_reserva_emergencia && (
                    <div className="mt-6 p-5 rounded-xl border-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-750 border-gray-200 dark:border-gray-600">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Status da Reserva de Emergência:</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${advancedData.relatorioCompleto.relatorio.status_reserva_emergencia === 'ADEQUADA' ? 'bg-green-100 text-green-800' :
                                advancedData.relatorioCompleto.relatorio.status_reserva_emergencia === 'MÍNIMA' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                }`}>
                                {advancedData.relatorioCompleto.relatorio.status_reserva_emergencia}
                            </span>
                        </div>
                    </div>
                )}

                {/* Resumo Executivo */}
                {advancedData.relatorioCompleto && advancedData.relatorioCompleto.relatorio && advancedData.relatorioCompleto.relatorio.resumo_executivo_pessoal && (
                    <div className="mt-6 p-5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Resumo Executivo
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {advancedData.relatorioCompleto.relatorio.resumo_executivo_pessoal}
                        </p>
                    </div>
                )}
            </div>

            {/* Gráficos de Pizza */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
                    {stats.expensesByCategory.length > 0 ? (
                        <PieChart title="Despesas por Categoria" data={stats.expensesByCategory} />
                    ) : (
                        <div className="text-center py-12">
                            <TrendingDown className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                            <p className="text-gray-600 dark:text-gray-400">Nenhuma despesa neste período</p>
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
                    {stats.incomeByCategory.length > 0 ? (
                        <PieChart title="Receitas por Categoria" data={stats.incomeByCategory} />
                    ) : (
                        <div className="text-center py-12">
                            <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                            <p className="text-gray-600 dark:text-gray-400">Nenhuma receita neste período</p>
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
                    {stats.cardExpensesByCategory.length > 0 ? (
                        <PieChart title="Gastos com Cartão" data={stats.cardExpensesByCategory} />
                    ) : (
                        <div className="text-center py-12">
                            <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                            <p className="text-gray-600 dark:text-gray-400">Nenhuma compra no cartão neste período</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Evolução Patrimonial */}
            {advancedData.evolucaoPatrimonial.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <LineChart className="h-5 w-5 text-purple-500" />
                        Evolução Patrimonial (Últimos 12 Meses)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {formatCurrency(advancedData.evolucaoPatrimonial[0]?.patrimonio_acumulado || 0)}
                            </div>
                            <div className="text-sm text-gray-600">Patrimônio Atual</div>
                        </div>
                        <div className="text-center">
                            <div className={`text-2xl font-bold ${(advancedData.evolucaoPatrimonial[0]?.saldo_liquido_mes || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {formatCurrency(advancedData.evolucaoPatrimonial[0]?.saldo_liquido_mes || 0)}
                            </div>
                            <div className="text-sm text-gray-600">Resultado do Mês</div>
                        </div>
                        <div className="text-center">
                            <div className={`text-2xl font-bold ${(advancedData.evolucaoPatrimonial[0]?.crescimento_percentual || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {(advancedData.evolucaoPatrimonial[0]?.crescimento_percentual || 0).toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-600">Crescimento Mensal</div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <div className="flex gap-2 min-w-max pb-2">
                            {advancedData.evolucaoPatrimonial.slice(0, 12).reverse().map((mes: any, index: number) => (
                                <div key={index} className="flex flex-col items-center min-w-[80px]">
                                    <div className="text-xs text-gray-500 mb-1">{mes.mes_ano}</div>
                                    <div className={`h-20 w-8 rounded-t flex items-end justify-center text-xs font-medium ${mes.desempenho_mes === 'POSITIVO' ? 'bg-green-500 text-white' :
                                        mes.desempenho_mes === 'NEUTRO' ? 'bg-gray-500 text-white' :
                                            'bg-red-500 text-white'
                                        }`} style={{
                                            height: `${Math.max(20, Math.min(80, Math.abs(mes.saldo_liquido_mes) / 1000 * 20))}px`
                                        }}>
                                        <span className="transform -rotate-90 origin-center whitespace-nowrap">
                                            {Math.abs(mes.saldo_liquido_mes) > 1000 ?
                                                `${(mes.saldo_liquido_mes / 1000).toFixed(1)}k` :
                                                mes.saldo_liquido_mes.toFixed(0)
                                            }
                                        </span>
                                    </div>
                                    <div className={`text-xs mt-1 ${mes.desempenho_mes === 'POSITIVO' ? 'text-green-600' :
                                        mes.desempenho_mes === 'NEUTRO' ? 'text-gray-600' :
                                            'text-red-600'
                                        }`}>
                                        {mes.desempenho_mes === 'POSITIVO' ? '↑' :
                                            mes.desempenho_mes === 'NEUTRO' ? '→' : '↓'
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Portfolio de Investimentos Avançado */}
            {advancedData.portfolioInvestimentos.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        Portfolio de Investimentos Detalhado
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2">Investimento</th>
                                    <th className="text-left py-2">Tipo</th>
                                    <th className="text-right py-2">Valor</th>
                                    <th className="text-right py-2">% Portfolio</th>
                                    <th className="text-center py-2">Risco</th>
                                </tr>
                            </thead>
                            <tbody>
                                {advancedData.portfolioInvestimentos.map((inv: any, index: number) => (
                                    <tr key={index} className="border-b hover:bg-gray-50">
                                        <td className="py-2 font-medium">{inv.nome_investimento}</td>
                                        <td className="py-2 text-gray-600">{inv.tipo_investimento}</td>
                                        <td className="py-2 text-right font-mono">
                                            {formatCurrency(Number(inv.valor_investido_liquido))}
                                        </td>
                                        <td className="py-2 text-right">
                                            {Number(inv.percentual_portfolio).toFixed(1)}%
                                        </td>
                                        <td className="py-2 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${inv.nivel_risco === 'BAIXO' ? 'bg-green-100 text-green-800' :
                                                inv.nivel_risco === 'MEDIO' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {inv.nivel_risco}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Grid de Seções */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Análise de Gastos por Categoria */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Target className="h-5 w-5 text-blue-500" />
                            Análise de Gastos por Categoria
                        </h2>
                    </div>
                    <div className="space-y-4">
                        {advancedData.gastosPorCategoria.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Carregando análise de gastos...</p>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-blue-600">
                                            {formatCurrency(advancedData.gastosPorCategoria.reduce((acc: number, cat: any) => acc + Number(cat.total_ultimo_mes), 0))}
                                        </div>
                                        <div className="text-xs text-gray-500">Último Mês</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-green-600">
                                            {formatCurrency(advancedData.gastosPorCategoria.reduce((acc: number, cat: any) => acc + Number(cat.media_mensal_3_meses), 0))}
                                        </div>
                                        <div className="text-xs text-gray-500">Média Mensal</div>
                                    </div>
                                </div>
                                {advancedData.gastosPorCategoria.slice(0, 5).map((categoria: any, index: number) => (
                                    <div key={index} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-medium text-sm text-gray-900 dark:text-white">{categoria.categoria}</h4>
                                            <span className={`text-xs px-2 py-1 rounded ${categoria.prioridade === 'ESSENCIAL' ? 'bg-red-100 text-red-800' :
                                                categoria.prioridade === 'IMPORTANTE' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-green-100 text-green-800'
                                                }`}>
                                                {categoria.prioridade}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <div className="text-gray-600 dark:text-gray-400">Último mês</div>
                                                <div className="font-mono text-gray-900 dark:text-white">{formatCurrency(Number(categoria.total_ultimo_mes))}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-600 dark:text-gray-400">Média 3m</div>
                                                <div className="font-mono text-gray-900 dark:text-white">{formatCurrency(Number(categoria.media_mensal_3_meses))}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* Análise de Receitas */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            Fontes de Receita
                        </h2>
                    </div>
                    <div className="space-y-4">
                        {advancedData.analiseReceitas.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Carregando análise de receitas...</p>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-green-600">
                                            {formatCurrency(advancedData.analiseReceitas.reduce((acc: number, rec: any) => acc + Number(rec.receita_ultimo_mes), 0))}
                                        </div>
                                        <div className="text-xs text-gray-500">Último Mês</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-blue-600">
                                            {advancedData.analiseReceitas.filter((r: any) => r.tipo_renda === 'PASSIVA').length}
                                        </div>
                                        <div className="text-xs text-gray-500">Fontes Passivas</div>
                                    </div>
                                </div>
                                {advancedData.analiseReceitas.slice(0, 5).map((receita: any, index: number) => (
                                    <div key={index} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-medium text-sm text-gray-900 dark:text-white">{receita.fonte_receita}</h4>
                                            <div className="flex gap-2">
                                                <span className={`text-xs px-2 py-1 rounded ${receita.tipo_renda === 'ATIVA_PRINCIPAL' ? 'bg-blue-100 text-blue-800' :
                                                    receita.tipo_renda === 'PASSIVA' ? 'bg-green-100 text-green-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {receita.tipo_renda === 'ATIVA_PRINCIPAL' ? 'Principal' :
                                                        receita.tipo_renda === 'PASSIVA' ? 'Passiva' : 'Extra'}
                                                </span>
                                                <span className={`text-xs px-2 py-1 rounded ${receita.regularidade === 'REGULAR' ? 'bg-green-100 text-green-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {receita.regularidade}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <div className="text-gray-600 dark:text-gray-400">Último mês</div>
                                                <div className="font-mono text-gray-900 dark:text-white">{formatCurrency(Number(receita.receita_ultimo_mes))}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-600 dark:text-gray-400">Últimos 3 meses</div>
                                                <div className="font-mono text-gray-900 dark:text-white">{formatCurrency(Number(receita.receita_ultimos_3_meses))}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
                {/* Contas Bancárias */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contas Bancárias</h2>
                        <Link href="/dashboard/accounts" className="text-blue-600 hover:text-blue-700 text-sm">
                            Ver todas
                        </Link>
                    </div>
                    {stats.accounts.length > 0 ? (
                        <div className="space-y-3">
                            {stats.accounts.slice(0, 4).map((account: any) => (
                                <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: account.color }} />
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{account.name}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{account.type === 'CHECKING' ? 'Conta Corrente' : 'Poupança'}</p>
                                        </div>
                                    </div>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(account.currentBalance || 0)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-600 dark:text-gray-400 mb-4">Nenhuma conta cadastrada</p>
                            <Link href="/dashboard/accounts" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                <PlusCircle className="h-4 w-4" />
                                Adicionar Conta
                            </Link>
                        </div>
                    )}
                </div>

                {/* Cartões de Crédito */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cartões de Crédito</h2>
                        <Link href="/dashboard/cards" className="text-blue-600 hover:text-blue-700 text-sm">
                            Ver todos
                        </Link>
                    </div>
                    {stats.cards.length > 0 ? (
                        <div className="space-y-3">
                            {stats.cards.slice(0, 4).map((card: any) => (
                                <div key={card.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} />
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{card.name}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Vence dia {card.dueDay}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Limite</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(card.cardLimit || 0)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-600 dark:text-gray-400 mb-4">Nenhum cartão cadastrado</p>
                            <Link href="/dashboard/cards" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                <PlusCircle className="h-4 w-4" />
                                Adicionar Cartão
                            </Link>
                        </div>
                    )}
                </div>

                {/* Metas */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Metas Financeiras</h2>
                        <Link href="/dashboard/goals" className="text-blue-600 hover:text-blue-700 text-sm">
                            Ver todas
                        </Link>
                    </div>
                    {stats.goals.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {stats.goals.slice(0, 4).map((goal: any) => {
                                const progress = (goal.calculatedAmount / goal.targetAmount) * 100
                                return (
                                    <div key={goal.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900 dark:text-white">{goal.name}</p>
                                                {goal.includeInvestments && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 mt-0.5 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 rounded">
                                                        c/ Investimentos
                                                    </span>
                                                )}
                                            </div>
                                            <Target className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div className="mb-2">
                                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full"
                                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">
                                                {formatCurrency(goal.calculatedAmount || 0)}
                                            </span>
                                            <span className="text-gray-600 dark:text-gray-400">
                                                {formatCurrency(goal.targetAmount || 0)}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Target className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-600 dark:text-gray-400 mb-4">Nenhuma meta cadastrada</p>
                            <Link href="/dashboard/goals" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                <PlusCircle className="h-4 w-4" />
                                Criar Meta
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
