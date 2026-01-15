'use client'

import { useEffect, useState } from 'react'
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

    const calculateDateRange = () => {
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
    }

    const calculatePercentageChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0
        return ((current - previous) / previous) * 100
    }

    useEffect(() => {
        calculateDateRange()
    }, [filterType, customStartDate, customEndDate])

    useEffect(() => {
        const loadData = async () => {
            try {
                const res = await fetch('/api/auth/me')
                if (!res.ok) {
                    router.push('/login')
                    return
                }

                // Buscar dados do dashboard
                const [accountsRes, cardsRes, goalsRes, transactionsRes, recurringsRes, categoriesRes, investmentsRes, cardExpensesRes] = await Promise.all([
                    fetch('/api/accounts'),
                    fetch('/api/cards'),
                    fetch('/api/goals'),
                    fetch('/api/transactions'),
                    fetch('/api/recurring-transactions'),
                    fetch('/api/categories'),
                    fetch('/api/investments'),
                    fetch(`/api/cards/expenses-by-category?startDate=${dateRange.start.toISOString()}&endDate=${dateRange.end.toISOString()}`)
                ])

                const accounts = accountsRes.ok ? await accountsRes.json() : []
                const cards = cardsRes.ok ? await cardsRes.json() : []
                const goals = goalsRes.ok ? await goalsRes.json() : []
                const allTransactions = transactionsRes.ok ? await transactionsRes.json() : []
                const recurrings = recurringsRes.ok ? await recurringsRes.json() : []
                const categories = categoriesRes.ok ? await categoriesRes.json() : []
                const investments = investmentsRes.ok ? await investmentsRes.json() : []
                const cardExpensesByCategory = cardExpensesRes.ok ? await cardExpensesRes.json() : []

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

    if (loading) {
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

            {/* Grid de Seções */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
