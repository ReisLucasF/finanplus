'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Wallet, Calendar, CreditCard, Target, PlusCircle } from 'lucide-react'
import Link from 'next/link'
import PieChart from './components/PieChart'

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
        accounts: [],
        cards: [],
        goals: [],
        expensesByCategory: [] as { name: string; value: number; color: string }[],
        incomeByCategory: [] as { name: string; value: number; color: string }[],
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

    const formatCurrency = (value: number) => {
        const validValue = isNaN(value) || !isFinite(value) ? 0 : value
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(validValue)
    }

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
                const [accountsRes, cardsRes, goalsRes, transactionsRes, recurringsRes, categoriesRes, investmentsRes] = await Promise.all([
                    fetch('/api/accounts'),
                    fetch('/api/cards'),
                    fetch('/api/goals'),
                    fetch('/api/transactions'),
                    fetch('/api/recurring-transactions'),
                    fetch('/api/categories'),
                    fetch('/api/investments')
                ])

                const accounts = accountsRes.ok ? await accountsRes.json() : []
                const cards = cardsRes.ok ? await cardsRes.json() : []
                const goals = goalsRes.ok ? await goalsRes.json() : []
                const allTransactions = transactionsRes.ok ? await transactionsRes.json() : []
                const recurrings = recurringsRes.ok ? await recurringsRes.json() : []
                const categories = categoriesRes.ok ? await categoriesRes.json() : []
                const investments = investmentsRes.ok ? await investmentsRes.json() : []

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

                // Calcular saldo previsto: considera recorrências futuras do período filtrado
                const recurringIncome = recurrings
                    .filter((r: any) => r.isActive && r.type === 'INCOME')
                    .reduce((sum: number, r: any) => {
                        // Calcula quantas ocorrências terão no período
                        const amount = parseFloat(r.amount) || 0
                        const occurrences = calculateOccurrencesInPeriod(r, dateRange.start, dateRange.end)
                        return sum + (amount * occurrences)
                    }, 0)

                const recurringExpenses = recurrings
                    .filter((r: any) => r.isActive && r.type === 'EXPENSE')
                    .reduce((sum: number, r: any) => {
                        const amount = parseFloat(r.amount) || 0
                        const occurrences = calculateOccurrencesInPeriod(r, dateRange.start, dateRange.end)
                        return sum + (amount * occurrences)
                    }, 0)

                const predicted = available + income - expenses + recurringIncome - recurringExpenses

                // Agrupar por categoria para gráficos
                const expensesByCategory: { [key: string]: { value: number; color?: string } } = {}
                const incomeByCategory: { [key: string]: { value: number; color?: string } } = {}

                transactions.forEach((t: any) => {
                    const categoryName = t.category?.name || 'Sem categoria'
                    const categoryColor = t.category?.color && t.category.color !== '#999999' && t.category.color !== '' 
                        ? t.category.color 
                        : undefined
                    const amount = parseFloat(t.amount) || 0

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

                console.log('📊 Dashboard - Despesas por categoria:', expensesChart)
                console.log('📊 Dashboard - Receitas por categoria:', incomeChart)

                setStats({
                    income: income || 0,
                    expenses: expenses || 0,
                    available: available || 0,
                    predicted: predicted || 0,
                    accounts,
                    cards,
                    goals: goalsWithCalculated,
                    expensesByCategory: expensesChart,
                    incomeByCategory: incomeChart,
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
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Carregando...</div>
            </div>
        )
    }

    // Calcular variações percentuais
    const incomeChange = calculatePercentageChange(stats.income, stats.previousMonth.income)
    const expensesChange = calculatePercentageChange(stats.expenses, stats.previousMonth.expenses)
    const balanceChange = calculatePercentageChange(stats.income - stats.expenses, stats.previousMonth.balance)

    return (
        <div>
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Visão geral das suas finanças</p>
                    </div>
                </div>

                {/* Filtros de Período */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilterType('this-month')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType === 'this-month'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            Este Mês
                        </button>
                        <button
                            onClick={() => setFilterType('last-month')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType === 'last-month'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            Mês Passado
                        </button>
                        <button
                            onClick={() => setFilterType('this-quarter')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType === 'this-quarter'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            Este Trimestre
                        </button>
                        <button
                            onClick={() => setFilterType('this-year')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType === 'this-year'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            Este Ano
                        </button>
                        <button
                            onClick={() => setFilterType('custom')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType === 'custom'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            Personalizado
                        </button>
                    </div>

                    {/* Seletor de Datas Personalizado */}
                    {filterType === 'custom' && (
                        <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                            <div className="flex flex-col">
                                <label className="text-sm text-gray-600 dark:text-gray-400 mb-1">Data Inicial</label>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm text-gray-600 dark:text-gray-400 mb-1">Data Final</label>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                    )}

                    {/* Label do Período Selecionado */}
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="h-5 w-5" />
                        <span className="font-medium">{getFilterLabel()}</span>
                    </div>
                </div>
            </div>

            {/* Cards de Estatísticas com Comparação */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Receitas</h3>
                        <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold">
                        {formatCurrency(stats.income)}
                    </p>
                    <div className={`text-sm mt-2 flex items-center gap-1 ${incomeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {incomeChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {Math.abs(incomeChange).toFixed(1)}% vs período anterior
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Despesas</h3>
                        <TrendingDown className="h-5 w-5 text-red-600" />
                    </div>
                    <p className="text-2xl font-bold">
                        {formatCurrency(stats.expenses)}
                    </p>
                    <div className={`text-sm mt-2 flex items-center gap-1 ${expensesChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {expensesChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {Math.abs(expensesChange).toFixed(1)}% vs período anterior
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Saldo Disponível</h3>
                        <Wallet className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold">
                        {formatCurrency(stats.available)}
                    </p>
                    <div className="text-sm mt-2 text-gray-500 dark:text-gray-400">
                        Soma de todas as contas
                    </div>
                </div>

                <Link href="/dashboard/investments" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Investimentos</h3>
                        <TrendingUp className="h-5 w-5 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold">
                        {formatCurrency(stats.investments.current)}
                    </p>
                    <div className={`text-sm mt-2 flex items-center gap-1 ${stats.investments.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats.investments.profit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {formatCurrency(stats.investments.profit)} ({stats.investments.profitPercentage.toFixed(2)}%)
                    </div>
                </Link>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Patrimônio Total</h3>
                        <Wallet className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className={`text-2xl font-bold ${(stats.available + stats.investments.current) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(stats.available + stats.investments.current)}
                    </p>
                    <div className="text-sm mt-2 text-gray-500 dark:text-gray-400">
                        Contas + Investimentos
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Saldo Previsto</h3>
                        <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className={`text-2xl font-bold ${stats.predicted >= 0 ? 'text-white' : 'text-red-600'}`}>
                        {formatCurrency(stats.predicted)}
                    </p>
                    <div className="text-sm mt-2 text-gray-500 dark:text-gray-400">
                        Com recorrências do período
                    </div>
                </div>
            </div>

            {/* Gráficos de Pizza */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    {stats.expensesByCategory.length > 0 ? (
                        <PieChart title="Despesas por Categoria" data={stats.expensesByCategory} />
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-600 dark:text-gray-400">Nenhuma despesa neste mês</p>
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    {stats.incomeByCategory.length > 0 ? (
                        <PieChart title="Receitas por Categoria" data={stats.incomeByCategory} />
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-600 dark:text-gray-400">Nenhuma receita neste mês</p>
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
                            {stats.accounts.slice(0, 3).map((account: any) => (
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
