'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TriangleAlert, Package, Home, Smartphone, PartyPopper, TrendingUp, TrendingDown, Wallet, Calendar, CreditCard, Target, PlusCircle, DollarSign, LineChart, AlertTriangle, PiggyBank, Shield, Flame, Repeat, ArrowRight } from 'lucide-react'
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

    
    const [analytics, setAnalytics] = useState<{
        dashboard: any
        fixedCostAnalysis: any
        alerts: any[]
        creditCards: any[]
        patrimonyEvolution: any[]
        incomeAnalysis: any[]
        expensesByCategory: any[]
        investments: any[]
    }>({
        dashboard: null,
        fixedCostAnalysis: null,
        alerts: [],
        creditCards: [],
        patrimonyEvolution: [],
        incomeAnalysis: [],
        expensesByCategory: [],
        investments: [],
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
                const params = new URLSearchParams({
                    startDate: dateRange.start.toISOString(),
                    endDate: dateRange.end.toISOString(),
                })

                const [overviewRes, analyticsRes] = await Promise.all([
                    fetch(`/api/dashboard/overview?${params}`),
                    fetch('/api/analytics/financial-overview'),
                ])

                if (!overviewRes.ok) {
                    router.push('/login')
                    return
                }

                const overview = await overviewRes.json()
                const analyticsData = analyticsRes.ok
                    ? await analyticsRes.json()
                    : { dashboard: null, fixedCostAnalysis: null, alerts: [], creditCards: [], patrimonyEvolution: [], incomeAnalysis: [], expensesByCategory: [], investments: [] }

                setAnalytics(analyticsData)

                const investmentTotals = overview.investments
                const accounts = overview.accounts
                const totalAccountsBalance = overview.available

                const goalsWithCalculated = overview.goals.map((goal: any) => {
                    const accountId = goal.account?.id || goal.accountId
                    const accountFromList = accountId
                        ? accounts.find((acc: any) => acc.id === accountId)
                        : undefined
                    const fallbackBalance = Number(goal.currentAmount) || 0
                    const accountBalance = accountFromList
                        ? (Number(accountFromList.currentBalance) || 0)
                        : (accountId ? fallbackBalance : totalAccountsBalance)

                    const calculatedAmount = goal.includeInvestments
                        ? accountBalance + investmentTotals.current
                        : accountBalance

                    return {
                        ...goal,
                        currentAmount: accountBalance,
                        calculatedAmount,
                        accountBalance,
                    }
                })

                const now = new Date()
                const futureRecurringIncome = overview.recurrings
                    .filter((r: any) => r.isActive && r.type === 'INCOME')
                    .reduce((sum: number, r: any) => {
                        const amount = parseFloat(r.amount) || 0
                        const futureStart = now > dateRange.start ? now : dateRange.start
                        const occurrences = calculateOccurrencesInPeriod(r, futureStart, dateRange.end)
                        return sum + (amount * occurrences)
                    }, 0)

                const futureRecurringExpenses = overview.recurrings
                    .filter((r: any) => r.isActive && r.type === 'EXPENSE')
                    .reduce((sum: number, r: any) => {
                        const amount = parseFloat(r.amount) || 0
                        const futureStart = now > dateRange.start ? now : dateRange.start
                        const occurrences = calculateOccurrencesInPeriod(r, futureStart, dateRange.end)
                        return sum + (amount * occurrences)
                    }, 0)

                const income = overview.income || 0
                const expenses = overview.expenses || 0
                const available = overview.available || 0
                const predicted = available + income - expenses + futureRecurringIncome - futureRecurringExpenses

                setStats({
                    income,
                    expenses,
                    available,
                    predicted,
                    predictedIncome: futureRecurringIncome,
                    accounts,
                    cards: overview.cards,
                    goals: goalsWithCalculated,
                    expensesByCategory: overview.expensesByCategory,
                    incomeByCategory: overview.incomeByCategory,
                    cardExpensesByCategory: overview.cardExpensesByCategory,
                    previousMonth: overview.previousMonth,
                    investments: investmentTotals,
                })
            } catch (error) {
                console.error('Erro ao carregar dados:', error)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [router, dateRange])

    
    const calculateOccurrencesInPeriod = (recurring: any, start: Date, end: Date) => {
        if (!recurring.isActive) return 0

        const recStart = new Date(recurring.startDate)
        const recEnd = recurring.endDate ? new Date(recurring.endDate) : end

        
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

    
    const incomeChange = calculatePercentageChange(stats.income, stats.previousMonth.income)
    const expensesChange = calculatePercentageChange(stats.expenses, stats.previousMonth.expenses)
    const balanceChange = calculatePercentageChange(stats.income - stats.expenses, stats.previousMonth.balance)

    return (
        <div className="space-y-8">
            
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                        Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Visão geral completa das suas finanças
                    </p>
                </div>

                
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

                
                <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-gray-800 px-4 py-3 shadow-sm">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-900 dark:text-white">{getFilterLabel()}</span>
                </div>
            </div>

            
            {analytics.alerts && analytics.alerts.length > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-l-4 border-red-500 p-6 rounded-2xl shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-red-900 dark:text-red-100 mb-3">
                                Alertas Financeiros ({analytics.alerts.length})
                            </h3>
                            <div className="space-y-3">
                                {analytics.alerts.slice(0, 3).map((alert: any, idx: number) => (
                                    <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-red-200 dark:border-red-800">
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="font-semibold text-gray-900 dark:text-white">{alert.titulo}</span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${alert.nivel_prioridade === 'CRÍTICO' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                alert.nivel_prioridade === 'ALTO' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                }`}>
                                                {alert.nivel_prioridade}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{alert.mensagem}</p>
                                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{alert.acao_sugerida}</p>
                                    </div>
                                ))}
                            </div>
                            {analytics.alerts.length > 3 && (
                                <Link href="/dashboard/analytics" className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium mt-3 inline-block">
                                    Ver todos os {analytics.alerts.length} alertas →
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {analytics.fixedCostAnalysis && (
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-1 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-lg shadow-indigo-500/25">
                        <div className="flex items-center gap-2 mb-3">
                            <Flame className="h-5 w-5" />
                            <h3 className="font-semibold">Runway</h3>
                        </div>
                        <p className="text-4xl font-bold">
                            {analytics.fixedCostAnalysis.runway_meses > 0
                                ? analytics.fixedCostAnalysis.runway_meses.toFixed(1)
                                : '—'}
                            <span className="text-base font-normal ml-1 opacity-80">meses</span>
                        </p>
                        <p className="mt-2 text-sm text-indigo-100 leading-relaxed">
                            Caixa + investimentos cobrem custos fixos recorrentes detectados nos últimos 4 meses.
                        </p>
                    </div>
                    <div className="md:col-span-2 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Repeat className="h-5 w-5 text-violet-600" />
                                <h3 className="font-bold text-gray-900 dark:text-white">Custos fixos estimados</h3>
                            </div>
                            <Link href="/dashboard/analytics" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                Ver análise completa <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-4 mb-4">
                            <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-3">
                                <p className="text-xs text-gray-500">Fixo/mês</p>
                                <p className="text-lg font-bold text-red-600">{formatCurrency(analytics.fixedCostAnalysis.custo_fixo_mensal_estimado)}</p>
                            </div>
                            <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-3">
                                <p className="text-xs text-gray-500">Caixa total</p>
                                <p className="text-lg font-bold">{formatCurrency(analytics.fixedCostAnalysis.caixa_total)}</p>
                            </div>
                            <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-3">
                                <p className="text-xs text-gray-500">% da despesa média</p>
                                <p className="text-lg font-bold">{analytics.fixedCostAnalysis.cobertura_percentual.toFixed(0)}%</p>
                            </div>
                        </div>
                        {analytics.fixedCostAnalysis.itens_recorrentes?.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {analytics.fixedCostAnalysis.itens_recorrentes.slice(0, 5).map((item: { descricao: string; media_mensal: number }, i: number) => (
                                    <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200 border border-violet-200 dark:border-violet-800">
                                        {item.descricao}: {formatCurrency(item.media_mensal)}/m
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            
            {analytics.dashboard && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-sm border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Patrimônio Líquido</h3>
                            <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            {formatCurrency(analytics.dashboard.patrimonio_liquido_atual || 0)}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            Contas: {formatCurrency(analytics.dashboard.saldo_contas_correntes || 0)}<br />
                            Investimentos: {formatCurrency(analytics.dashboard.valor_investido_total || 0)}<br />
                            Dívidas: {formatCurrency(analytics.dashboard.divida_cartoes_atual || 0)}
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl shadow-sm border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Taxa de Poupança</h3>
                            <PiggyBank className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            {(analytics.dashboard.taxa_poupanca_percentual || 0).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            Meta recomendada: 20-30%<br />
                            Status: {analytics.dashboard.status_saude_financeira || 'N/A'}
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-2xl shadow-sm border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Reserva de Emergência</h3>
                            <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            {(analytics.dashboard.meses_reserva_emergencia || 0).toFixed(1)} meses
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            Meta: 6 meses de despesas<br />
                            {(analytics.dashboard.meses_reserva_emergencia || 0) >= 6 ? 'Meta atingida!' : 'Abaixo do recomendado'}
                        </p>
                    </div>
                </div>
            )}

            
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
                    value={formatCurrency(
                        analytics.dashboard?.valor_investido_total ?? stats.investments.current
                    )}
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
                    value={formatCurrency(
                        stats.available + (analytics.dashboard?.valor_investido_total ?? stats.investments.current)
                    )}
                    icon={Target}
                    gradient="bg-indigo-500"
                    iconColor="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-indigo-500/30"
                />
            </div>

            
            {analytics.incomeAnalysis && analytics.incomeAnalysis.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Análise de Receitas (Últimos 3 Meses)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        
                        {(() => {
                            const porTipo = analytics.incomeAnalysis.reduce((acc: any, item: any) => {
                                const tipo = item.tipo_renda || 'OUTRAS'
                                acc[tipo] = (acc[tipo] || 0) + (item.receita_ultimos_3_meses || 0)
                                return acc
                            }, {})

                            const tipoLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
                                'ATIVA_PRINCIPAL': { label: 'Renda Ativa', color: 'bg-blue-500', icon: <Wallet className="h-5 w-5 text-blue-600" /> },
                                'PASSIVA': { label: 'Renda Passiva', color: 'bg-green-500', icon: <PiggyBank className="h-5 w-5 text-green-600" /> },
                                'EXTRA_VARIÁVEL': { label: 'Renda Extra', color: 'bg-purple-500', icon: <TrendingUp className="h-5 w-5 text-purple-600" /> },
                                'OUTRAS': { label: 'Outras', color: 'bg-gray-500', icon: <DollarSign className="h-5 w-5 text-gray-600" /> }
                            }

                            return Object.entries(porTipo).map(([tipo, valor]: [string, any]) => {
                                const info = tipoLabels[tipo] || tipoLabels['OUTRAS']
                                return (
                                    <div key={tipo} className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-2xl">{info.icon}</span>
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{info.label}</span>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(valor)}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                            {((valor / analytics.incomeAnalysis.reduce((s: number, i: any) => s + i.receita_ultimos_3_meses, 0)) * 100).toFixed(1)}% do total
                                        </p>
                                    </div>
                                )
                            })
                        })()}
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {analytics.incomeAnalysis.map((income: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900 dark:text-white">{income.fonte_receita}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${income.tipo_renda === 'ATIVA_PRINCIPAL' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                            income.tipo_renda === 'PASSIVA' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                income.tipo_renda === 'EXTRA_VARIÁVEL' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                            }`}>
                                            {income.regularidade}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 dark:text-gray-400">
                                        <span>Média: {formatCurrency(income.media_mensal_3_meses)}/mês</span>
                                        <span>•</span>
                                        <span>{income.quantidade_transacoes} transações</span>
                                        {income.dias_desde_ultima_receita !== undefined && (
                                            <><span>•</span><span>Há {income.dias_desde_ultima_receita} dias</span></>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(income.receita_ultimos_3_meses)}</p>
                                    <p className="text-xs text-gray-500">{income.percentual_renda_total_3_meses?.toFixed(1)}% do total</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            
            {analytics.expensesByCategory && analytics.expensesByCategory.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-red-600" />
                        Análise de Despesas por Categoria (Últimos 3 Meses)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        
                        {(() => {
                            const porClassificacao = analytics.expensesByCategory.reduce((acc: any, item: any) => {
                                const classif = item.classificacao_categoria || 'OUTROS'
                                acc[classif] = (acc[classif] || 0) + (item.total_ultimos_3_meses || 0)
                                return acc
                            }, {})

                            const classifLabels: Record<string, { label: string; color: string; icon: React.ReactNode; desc: string }> = {
                                'ESSENCIAL': { label: 'Essenciais', color: 'bg-red-500', icon: <Home className="h-5 w-5  text-green-600" />, desc: '50% orçamento' },
                                'IMPORTANTE': { label: 'Importantes', color: 'bg-orange-500', icon: <Smartphone className="h-5 w-5   text-purple-600" />, desc: '30% orçamento' },
                                'SUPÉRFLUO': { label: 'Supérfluos', color: 'bg-yellow-500', icon: <PartyPopper className="h-5 w-5  text-red-500" />, desc: '20% orçamento' },
                                'OUTROS': { label: 'Outros', color: 'bg-gray-500', icon: <Package className="h-5 w-5   text-yellow-600" />, desc: 'Diversos' }
                            }

                            return Object.entries(porClassificacao).map(([classif, valor]: [string, any]) => {
                                const info = classifLabels[classif] || classifLabels['OUTROS']
                                return (
                                    <div key={classif} className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-2xl">{info.icon}</span>
                                            <div>
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 block">{info.label}</span>
                                                <span className="text-xs text-gray-400 dark:text-gray-500">{info.desc}</span>
                                            </div>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(valor)}</p>
                                    </div>
                                )
                            })
                        })()}
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {analytics.expensesByCategory.map((expense: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900 dark:text-white">{expense.categoria}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${expense.classificacao_categoria === 'ESSENCIAL' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                            expense.classificacao_categoria === 'IMPORTANTE' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                                expense.classificacao_categoria === 'SUPÉRFLUO' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                            }`}>
                                            {expense.frequencia_uso}
                                        </span>
                                        {expense.alerta_variacao !== 'NORMAL' && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 font-medium">{expense.alerta_variacao}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 dark:text-gray-400">
                                        <span>Média: {formatCurrency(expense.media_mensal_3_meses)}/mês</span>
                                        <span>•</span>
                                        <span>{expense.transacoes_ultimos_3_meses} transações</span>
                                        <span>•</span>
                                        <span>Ticket: {formatCurrency(expense.ticket_medio)}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(expense.total_ultimos_3_meses)}</p>
                                    {expense.variacao_mes_anterior_percentual !== 0 && (
                                        <p className={`text-xs font-medium ${expense.variacao_mes_anterior_percentual > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                            }`}>
                                            {expense.variacao_mes_anterior_percentual > 0 ? '↑' : '↓'} {Math.abs(expense.variacao_mes_anterior_percentual).toFixed(1)}%
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            
            {analytics.investments && analytics.investments.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <LineChart className="h-5 w-5 text-blue-600" />
                            Portfolio de Investimentos
                        </h2>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full font-medium">
                            📊 Dados completos (atemporal)
                        </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-3 rounded-xl">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Investido</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {formatCurrency(analytics.investments.reduce((s: number, i: any) => s + i.valor_investido_liquido, 0))}
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 p-3 rounded-xl">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Aportes 3 Meses</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {formatCurrency(analytics.investments.reduce((s: number, i: any) => s + i.aportes_3_meses, 0))}
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 p-3 rounded-xl">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Ativos</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics.investments.length}</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 p-3 rounded-xl">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Frequência</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {(() => {
                                    const freq = analytics.investments.filter((i: any) => i.frequencia_aportes === 'MENSAL').length
                                    return freq > 0 ? `${freq} mensal` : 'Variável'
                                })()}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {analytics.investments.map((inv: any, idx: number) => (
                            <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: inv.color || '#3B82F6' }}></div>
                                            <span className="font-semibold text-gray-900 dark:text-white">{inv.nome_investimento}</span>
                                            {inv.ticker && <span className="text-xs text-gray-500">({inv.ticker})</span>}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                            <span className={`px-2 py-0.5 rounded-full font-medium ${inv.nivel_risco === 'BAIXO' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                inv.nivel_risco === 'MEDIO' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                    inv.nivel_risco === 'ALTO' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                }`}>
                                                Risco: {inv.nivel_risco}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-medium">
                                                {inv.tipo_investimento}
                                            </span>
                                            <span className="text-gray-600 dark:text-gray-400">
                                                {inv.corretora_ou_banco}
                                            </span>
                                            {inv.percentual_cdi && (
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    {inv.percentual_cdi}% CDI
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 dark:text-gray-400">
                                            <span>{inv.quantidade_atual} {inv.quantidade_atual === 1 ? 'cota' : 'cotas'}</span>
                                            <span>•</span>
                                            <span>Preço médio: {formatCurrency(inv.preco_medio_compra)}</span>
                                            <span>•</span>
                                            <span>{inv.percentual_portfolio?.toFixed(1)}% portfolio</span>
                                        </div>
                                    </div>
                                    <div className="text-right ml-4">
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(inv.valor_investido_liquido)}</p>
                                        <p className="text-xs text-gray-500">Alocação: {inv.alocacao_recomendada}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            
            {analytics.patrimonyEvolution && analytics.patrimonyEvolution.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-purple-600" />
                        Evolução Patrimonial Mensal
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Mês</th>
                                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Receitas</th>
                                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Despesas</th>
                                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Saldo</th>
                                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Taxa Poupança</th>
                                    <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {analytics.patrimonyEvolution.map((month: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="p-3">
                                            <div className="font-medium text-gray-900 dark:text-white">{month.mes_ano}</div>
                                            <div className="text-xs text-gray-500">{month.quantidade_transacoes} transações</div>
                                        </td>
                                        <td className="p-3 text-right text-green-600 dark:text-green-400 font-medium">
                                            {formatCurrency(month.receita_mes)}
                                        </td>
                                        <td className="p-3 text-right text-red-600 dark:text-red-400 font-medium">
                                            {formatCurrency(month.despesa_mes)}
                                        </td>
                                        <td className={`p-3 text-right font-bold ${month.saldo_liquido_real_mes > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                            }`}>
                                            {formatCurrency(month.saldo_liquido_real_mes)}
                                        </td>
                                        <td className="p-3 text-right">
                                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${month.taxa_poupanca_mes_percentual >= 30 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                month.taxa_poupanca_mes_percentual >= 20 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                    month.taxa_poupanca_mes_percentual >= 10 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                }`}>
                                                {month.taxa_poupanca_mes_percentual?.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${month.classificacao_resultado === 'EXCELENTE_POUPANCA' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                month.classificacao_resultado === 'BOA_POUPANCA' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                    month.classificacao_resultado === 'POUPANCA_MODERADA' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                        month.classificacao_resultado === 'POUPANCA_BAIXA' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                }`}>
                                                {month.desempenho_mes}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            
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

            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
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

                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cartões de Crédito</h2>
                        <div className="flex gap-2">
                            {analytics.dashboard && (
                                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full font-medium">
                                    Uso: {(analytics.dashboard.utilizacao_limite_percentual || 0).toFixed(0)}%
                                </span>
                            )}
                            <Link href="/dashboard/cards" className="text-blue-600 hover:text-blue-700 text-sm">
                                Ver todos
                            </Link>
                        </div>
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

                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Metas Financeiras</h2>
                        <div className="flex gap-2 items-center">
                            <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full font-medium">
                                📊 Dados completos
                            </span>
                            {analytics.dashboard && (
                                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full font-medium">
                                    Progresso médio: {(analytics.dashboard.progresso_medio_metas_percentual || 0).toFixed(0)}%
                                </span>
                            )}
                            <Link href="/dashboard/goals" className="text-blue-600 hover:text-blue-700 text-sm">
                                Ver todas
                            </Link>
                        </div>
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
