'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Plus, Edit, Trash2, Play, Pause, Calendar, DollarSign } from 'lucide-react'

interface Recurring {
    id: string
    description: string
    amount: number
    frequency: string
    dueDay: number
    startDate: string
    endDate: string | null
    isActive: boolean
    type: string
    account: { id: string; name: string }
    category: { id: string; name: string; color: string }
}

interface Account {
    id: string
    name: string
}

interface Category {
    id: string
    name: string
    type: string
}

export default function RecurringPage() {
    const [recurrings, setRecurrings] = useState<Recurring[]>([])
    const [accounts, setAccounts] = useState<Account[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [editingRecurring, setEditingRecurring] = useState<Recurring | null>(null)
    const [formData, setFormData] = useState({
        accountId: '',
        categoryId: '',
        type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
        description: '',
        amount: '',
        frequency: 'MONTHLY' as 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'ANNUAL',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        dueDay: 1,
    })

    const frequencyLabels: Record<string, string> = {
        WEEKLY: 'Semanal',
        BIWEEKLY: 'Quinzenal',
        MONTHLY: 'Mensal',
        ANNUAL: 'Anual'
    }

    const loadData = async () => {
        try {
            const [recurringRes, accountsRes, categoriesRes] = await Promise.all([
                fetch('/api/recurring-transactions'),
                fetch('/api/accounts'),
                fetch('/api/categories')
            ])

            if (recurringRes.ok) setRecurrings(await recurringRes.json())
            if (accountsRes.ok) setAccounts(await accountsRes.json())
            if (categoriesRes.ok) setCategories(await categoriesRes.json())
        } catch (error) {
            console.error('Erro ao carregar dados:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const parseBRLValue = (value: string | number): number => {
        if (typeof value === 'number') return value
        let cleaned = value.trim().replace(/\./g, '').replace(',', '.')
        return parseFloat(cleaned) || 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const url = editingRecurring ? `/api/recurring-transactions/${editingRecurring.id}` : '/api/recurring-transactions'
            const method = editingRecurring ? 'PUT' : 'POST'

            const payload = {
                accountId: formData.accountId,
                categoryId: formData.categoryId,
                type: formData.type,
                description: formData.description,
                amount: parseBRLValue(formData.amount),
                frequency: formData.frequency,
                startDate: formData.startDate,
                endDate: formData.endDate || null,
                dueDay: Number(formData.dueDay),
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                setShowModal(false)
                setEditingRecurring(null)
                setFormData({
                    accountId: '',
                    categoryId: '',
                    type: 'EXPENSE',
                    description: '',
                    amount: '',
                    frequency: 'MONTHLY',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: '',
                    dueDay: 1,
                })
                loadData()
            } else {
                const error = await res.json()
                alert(error.error || 'Erro ao salvar recorrência')
            }
        } catch (error) {
            console.error('Erro:', error)
            alert('Erro ao salvar recorrência')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta recorrência?')) return

        try {
            const res = await fetch(`/api/recurring-transactions/${id}`, { method: 'DELETE' })
            if (res.ok) {
                loadData()
            } else {
                const error = await res.json()
                alert(error.error || 'Erro ao excluir recorrência')
            }
        } catch (error) {
            console.error('Erro:', error)
            alert('Erro ao excluir recorrência')
        }
    }

    const toggleActive = async (recurring: Recurring) => {
        try {
            const res = await fetch(`/api/recurring-transactions/${recurring.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !recurring.isActive }),
            })

            if (res.ok) {
                loadData()
            } else {
                alert('Erro ao atualizar status')
            }
        } catch (error) {
            console.error('Erro:', error)
            alert('Erro ao atualizar status')
        }
    }

    const processRecurrings = async () => {
        if (!confirm('Deseja processar as recorrências agora? Isso criará transações pendentes.')) return

        setProcessing(true)
        try {
            const res = await fetch('/api/recurring-transactions/process', { method: 'POST' })
            if (res.ok) {
                const data = await res.json()
                alert(`Processado! ${data.created} transação(ões) criada(s).`)
                loadData()
            } else {
                const error = await res.json()
                alert(error.error || 'Erro ao processar')
            }
        } catch (error) {
            console.error('Erro:', error)
            alert('Erro ao processar recorrências')
        } finally {
            setProcessing(false)
        }
    }

    const openEditModal = (recurring: Recurring) => {
        setEditingRecurring(recurring)
        setFormData({
            accountId: recurring.account.id,
            categoryId: recurring.category.id,
            type: recurring.type as any,
            description: recurring.description,
            amount: recurring.amount.toString(),
            frequency: recurring.frequency as any,
            startDate: new Date(recurring.startDate).toISOString().split('T')[0],
            endDate: recurring.endDate ? new Date(recurring.endDate).toISOString().split('T')[0] : '',
            dueDay: recurring.dueDay,
        })
        setShowModal(true)
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value)
    }

    if (loading) return <div className="text-center py-8">Carregando...</div>

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transações Recorrentes</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie suas receitas e despesas recorrentes</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={processRecurrings}
                        disabled={processing}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                        <Play className="h-5 w-5" />
                        {processing ? 'Processando...' : 'Processar Agora'}
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="h-5 w-5" />
                        Nova Recorrência
                    </button>
                </div>
            </div>

            {recurrings.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                    <RefreshCw className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Nenhuma recorrência cadastrada
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Cadastre receitas ou despesas que se repetem automaticamente
                    </p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Adicionar Recorrência
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Descrição
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Valor
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Frequência
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Dia
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {recurrings.map((recurring) => (
                                <tr key={recurring.id} className={!recurring.isActive ? 'opacity-50' : ''}>
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">{recurring.description}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {recurring.account.name} • {recurring.category.name}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`font-semibold ${recurring.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                            {recurring.type === 'INCOME' ? '+' : '-'} {formatCurrency(recurring.amount)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-900 dark:text-white">
                                        {frequencyLabels[recurring.frequency]}
                                    </td>
                                    <td className="px-6 py-4 text-gray-900 dark:text-white">
                                        Dia {recurring.dueDay}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${recurring.isActive
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                            }`}>
                                            {recurring.isActive ? 'Ativo' : 'Pausado'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => toggleActive(recurring)}
                                                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                                title={recurring.isActive ? 'Pausar' : 'Ativar'}
                                            >
                                                {recurring.isActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                                            </button>
                                            <button
                                                onClick={() => openEditModal(recurring)}
                                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                            >
                                                <Edit className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(recurring.id)}
                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de Criar/Editar */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            {editingRecurring ? 'Editar Recorrência' : 'Nova Recorrência'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Descrição
                                </label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Ex: Aluguel, Netflix, Salário"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Tipo
                                    </label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="INCOME">Receita</option>
                                        <option value="EXPENSE">Despesa</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Valor
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        placeholder="1.000,00"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Conta
                                </label>
                                <select
                                    value={formData.accountId}
                                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    required
                                >
                                    <option value="">Selecione uma conta</option>
                                    {accounts.map((account) => (
                                        <option key={account.id} value={account.id}>{account.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Categoria
                                </label>
                                <select
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    required
                                >
                                    <option value="">Selecione uma categoria</option>
                                    {categories.filter(c => c.type === formData.type).map((category) => (
                                        <option key={category.id} value={category.id}>{category.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Frequência
                                    </label>
                                    <select
                                        value={formData.frequency}
                                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="WEEKLY">Semanal</option>
                                        <option value="BIWEEKLY">Quinzenal</option>
                                        <option value="MONTHLY">Mensal</option>
                                        <option value="ANNUAL">Anual</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Dia de Vencimento
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={formData.dueDay}
                                        onChange={(e) => setFormData({ ...formData, dueDay: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Data Início
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Data Fim (opcional)
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false)
                                        setEditingRecurring(null)
                                        setFormData({
                                            accountId: '',
                                            categoryId: '',
                                            type: 'EXPENSE',
                                            description: '',
                                            amount: '',
                                            frequency: 'MONTHLY',
                                            startDate: new Date().toISOString().split('T')[0],
                                            endDate: '',
                                            dueDay: 1,
                                        })
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    {editingRecurring ? 'Salvar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
