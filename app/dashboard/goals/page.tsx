'use client'

import { useEffect, useState } from 'react'
import { Target, Plus, Edit, Trash2 } from 'lucide-react'

interface Goal {
    id: string
    name: string
    targetAmount: number
    currentAmount: number
    targetDate: string
    account?: { id: string; name: string }
    includeInvestments?: boolean
}

interface GoalWithCalculated extends Goal {
    calculatedAmount: number
}

export default function GoalsPage() {
    const [goals, setGoals] = useState<GoalWithCalculated[]>([])
    const [accounts, setAccounts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
    const [monthlySavings, setMonthlySavings] = useState({
        recurringIncome: 0,
        recurringExpenses: 0,
        available: 0,
        monthlyBudget: 0,
    })
    const [formData, setFormData] = useState({
        name: '',
        targetAmount: '',
        currentAmount: '',
        targetDate: '',
        accountId: '',
        includeInvestments: false,
    })

    const parseBRLValue = (value: string | number): number => {
        if (typeof value === 'number') return value
        let cleaned = value.trim().replace(/\./g, '').replace(',', '.')
        return parseFloat(cleaned) || 0
    }

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value)
    }

    const loadData = async () => {
        try {
            const [goalsRes, accountsRes, recurringRes] = await Promise.all([
                fetch('/api/goals'),
                fetch('/api/accounts'),
                fetch('/api/recurring-transactions'),
            ])

            if (goalsRes.ok) {
                const goalsData: Goal[] = await goalsRes.json()

                // Buscar investimentos se alguma meta incluir investimentos
                const hasGoalsWithInvestments = goalsData.some(g => g.includeInvestments)
                let investmentsTotal = 0

                if (hasGoalsWithInvestments) {
                    const investmentsRes = await fetch('/api/investments')
                    if (investmentsRes.ok) {
                        const investments = await investmentsRes.json()

                        // Buscar summary de cada investimento
                        const summaries = await Promise.all(
                            investments.map((inv: any) =>
                                fetch(`/api/investments/${inv.id}/summary`)
                                    .then(r => r.json())
                                    .catch(() => null)
                            )
                        )

                        investmentsTotal = summaries.reduce((total, summaryData) => {
                            if (summaryData && summaryData.summary) {
                                return total + (summaryData.summary.currentValue || 0)
                            }
                            return total
                        }, 0)
                    }
                }

                // Adicionar campo calculatedAmount em cada meta
                const goalsWithCalculated: GoalWithCalculated[] = goalsData.map(goal => ({
                    ...goal,
                    currentAmount: Number(goal.currentAmount) || 0,
                    targetAmount: Number(goal.targetAmount) || 0,
                    calculatedAmount: goal.includeInvestments
                        ? (Number(goal.currentAmount) || 0) + investmentsTotal
                        : (Number(goal.currentAmount) || 0)
                }))

                setGoals(goalsWithCalculated)
            }
            if (accountsRes.ok) setAccounts(await accountsRes.json())

            // Calcular receitas e despesas recorrentes mensais
            if (recurringRes.ok) {
                const recurrings = await recurringRes.json()

                const activeRecurrings = recurrings.filter((r: any) => r.isActive)

                const monthlyIncome = activeRecurrings
                    .filter((r: any) => r.type === 'INCOME')
                    .reduce((sum: number, r: any) => {
                        const amount = Number(r.amount) || 0
                        // Calcular quantidade mensal baseado na frequência
                        const monthlyOccurrences = r.frequency === 'MONTHLY' ? 1 :
                            r.frequency === 'WEEKLY' ? 4.33 :
                                r.frequency === 'YEARLY' ? 1 / 12 : 1
                        return sum + (amount * monthlyOccurrences)
                    }, 0)

                const monthlyExpenses = activeRecurrings
                    .filter((r: any) => r.type === 'EXPENSE')
                    .reduce((sum: number, r: any) => {
                        const amount = Number(r.amount) || 0
                        const monthlyOccurrences = r.frequency === 'MONTHLY' ? 1 :
                            r.frequency === 'WEEKLY' ? 4.33 :
                                r.frequency === 'YEARLY' ? 1 / 12 : 1
                        return sum + (amount * monthlyOccurrences)
                    }, 0)

                setMonthlySavings({
                    recurringIncome: monthlyIncome,
                    recurringExpenses: monthlyExpenses,
                    available: monthlyIncome - monthlyExpenses,
                    monthlyBudget: 0, // TODO: buscar das configurações do usuário
                })
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const url = editingGoal ? `/api/goals/${editingGoal.id}` : '/api/goals'
            const method = editingGoal ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    targetAmount: parseBRLValue(formData.targetAmount),
                    currentAmount: parseBRLValue(formData.currentAmount),
                    targetDate: formData.targetDate,
                    accountId: formData.accountId || null,
                    includeInvestments: formData.includeInvestments,
                }),
            })

            if (res.ok) {
                setShowModal(false)
                setEditingGoal(null)
                setFormData({ name: '', targetAmount: '', currentAmount: '', targetDate: '', accountId: '', includeInvestments: false })
                loadData()
            } else {
                const error = await res.json()
                alert(error.error || 'Erro ao salvar meta')
            }
        } catch (error) {
            console.error('Erro:', error)
            alert('Erro ao salvar meta')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta meta?')) return

        try {
            const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' })
            if (res.ok) {
                loadData()
            } else {
                const error = await res.json()
                alert(error.error || 'Erro ao excluir meta')
            }
        } catch (error) {
            console.error('Erro:', error)
            alert('Erro ao excluir meta')
        }
    }

    const openEditModal = (goal: Goal) => {
        setEditingGoal(goal)
        setFormData({
            name: goal.name,
            targetAmount: goal.targetAmount?.toString() || '',
            currentAmount: goal.currentAmount?.toString() || '',
            targetDate: goal.targetDate.split('T')[0],
            accountId: goal.account?.id || '',
            includeInvestments: goal.includeInvestments || false,
        })
        setShowModal(true)
    }

    if (loading) return <div className="text-center py-8">Carregando...</div>

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Metas Financeiras</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Planeje e alcance seus objetivos</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="h-5 w-5" />
                    Nova Meta
                </button>
            </div>

            {/* Card de Análise de Capacidade de Poupança */}
            {monthlySavings.recurringIncome > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg shadow p-6 mb-8 border border-blue-200 dark:border-blue-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-600" />
                        Análise de Capacidade de Poupança
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Receitas Recorrentes</p>
                            <p className="text-xl font-bold text-green-600">
                                R$ {formatCurrency(monthlySavings.recurringIncome)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">por mês</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Despesas Recorrentes</p>
                            <p className="text-xl font-bold text-red-600">
                                R$ {formatCurrency(monthlySavings.recurringExpenses)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">por mês</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Disponível para Poupar</p>
                            <p className={`text-xl font-bold ${monthlySavings.available >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                R$ {formatCurrency(monthlySavings.available)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">por mês</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">% da Receita</p>
                            <p className="text-xl font-bold text-purple-600">
                                {monthlySavings.recurringIncome > 0
                                    ? ((monthlySavings.available / monthlySavings.recurringIncome) * 100).toFixed(1)
                                    : '0'}%
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">capacidade</p>
                        </div>
                    </div>
                    {goals.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Necessário para Atingir Metas:
                            </h3>
                            <div className="space-y-2">
                                {goals.map((goal) => {
                                    const remaining = goal.targetAmount - goal.calculatedAmount
                                    if (remaining <= 0) return null

                                    const targetDate = new Date(goal.targetDate)
                                    const today = new Date()
                                    const monthsRemaining = Math.max(
                                        1,
                                        Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30))
                                    )
                                    const monthlyNeeded = remaining / monthsRemaining
                                    const isAchievable = monthlyNeeded <= monthlySavings.available

                                    return (
                                        <div key={goal.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-3">
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900 dark:text-white">{goal.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {monthsRemaining <= 12
                                                        ? `Falta${monthsRemaining === 1 ? '' : 'm'} ${monthsRemaining} ${monthsRemaining === 1 ? 'mês' : 'meses'}`
                                                        : (() => {
                                                            const years = Math.floor(monthsRemaining / 12);
                                                            const months = monthsRemaining % 12;
                                                            const yearText = `${years} ${years === 1 ? 'ano' : 'anos'}`;
                                                            const monthText = months > 0 ? ` e ${months} ${months === 1 ? 'mês' : 'meses'}` : '';
                                                            return `Falta${years === 1 && months === 0 ? '' : 'm'} ${yearText}${monthText}`;
                                                        })()
                                                    }
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold ${isAchievable ? 'text-green-600' : 'text-orange-600'}`}>
                                                    R$ {formatCurrency(monthlyNeeded)}/mês
                                                </p>
                                                {!isAchievable && (
                                                    <p className="text-xs text-orange-600">
                                                        Excede capacidade
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {goals.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                    <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Nenhuma meta cadastrada
                    </h2>
                    <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-4"
                    >
                        <Plus className="h-5 w-5" />
                        Criar Meta
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {goals.map((goal) => {
                        const progress = (goal.calculatedAmount / goal.targetAmount) * 100
                        return (
                            <div key={goal.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{goal.name}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            até {new Date(goal.targetDate).toLocaleDateString('pt-BR')}
                                        </p>
                                        {goal.includeInvestments && (
                                            <span className="inline-flex items-center px-2 py-0.5 mt-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 rounded">
                                                Inclui Investimentos
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(goal)}
                                            className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(goal.id)}
                                            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all"
                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">
                                            R$ {formatCurrency(goal.calculatedAmount)}
                                        </span>
                                        <span className="font-semibold text-blue-600">
                                            {progress.toFixed(0)}%
                                        </span>
                                        <span className="text-gray-600 dark:text-gray-400">
                                            R$ {formatCurrency(goal.targetAmount)}
                                        </span>
                                    </div>
                                    {goal.includeInvestments && goal.calculatedAmount !== goal.currentAmount && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Contas: R$ {formatCurrency(goal.currentAmount)} |
                                            Investimentos: R$ {formatCurrency(goal.calculatedAmount - goal.currentAmount)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                            {editingGoal ? 'Editar Meta' : 'Nova Meta'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nome da Meta
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Valor Alvo
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.targetAmount}
                                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                                    placeholder="Ex: 10.000,00"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Use . para milhares e , para decimais
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Valor Atual
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.currentAmount}
                                    onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                                    placeholder="Ex: 5.000,00"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Use . para milhares e , para decimais
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Data Alvo
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.targetDate}
                                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Conta Vinculada (opcional)
                                </label>
                                <select
                                    value={formData.accountId}
                                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">Nenhuma</option>
                                    {accounts.map((account: any) => (
                                        <option key={account.id} value={account.id}>{account.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="includeInvestments"
                                    checked={formData.includeInvestments}
                                    onChange={(e) => setFormData({ ...formData, includeInvestments: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <label htmlFor="includeInvestments" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Incluir investimentos no cálculo da meta
                                </label>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false)
                                        setEditingGoal(null)
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    {editingGoal ? 'Salvar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
