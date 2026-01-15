'use client'

import { useEffect, useState, useMemo } from 'react'
import { Receipt, Plus, TrendingUp, TrendingDown, Edit2, Trash2, Filter, X } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

interface Account {
    id: string
    name: string
    type: string
    initialBalance: number
    currentBalance: number
}

interface Category {
    id: string
    name: string
    type: string
}

interface Transaction {
    id: string
    type: string
    description: string
    amount: number
    date: string
    status: string
    account: { id: string, name: string }
    category: { id: string, name: string }
}

interface Transfer {
    id: string
    amount: number
    date: string
    description?: string
    fromAccount: { id: string, name: string }
    toAccount: { id: string, name: string }
}

interface DailyBalance {
    date: string
    accountBalances: { accountName: string, balance: number, accountId: string }[]
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [transfers, setTransfers] = useState<Transfer[]>([])
    const [accounts, setAccounts] = useState<Account[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showFilters, setShowFilters] = useState(false)
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        accountId: '',
        categoryId: '',
    })
    const [formData, setFormData] = useState({
        accountId: '',
        categoryId: '',
        type: 'EXPENSE',
        description: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        status: 'COMPLETED',
    })

    const loadData = async () => {
        try {
            const [transRes, accRes, catRes, transferRes] = await Promise.all([
                fetch('/api/transactions'),
                fetch('/api/accounts'),
                fetch('/api/categories'),
                fetch('/api/transfers'),
            ])

            if (transRes.ok) setTransactions(await transRes.json())
            if (accRes.ok) setAccounts(await accRes.json())
            if (catRes.ok) setCategories(await catRes.json())
            if (transferRes.ok) setTransfers(await transferRes.json())
        } catch (error) {
            console.error('Erro ao carregar dados:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    // Filtrar transações
    const filteredTransactions = useMemo(() => {
        return transactions.filter(transaction => {
            // Filtro de data inicial
            if (filters.startDate && new Date(transaction.date) < new Date(filters.startDate)) {
                return false
            }
            // Filtro de data final
            if (filters.endDate && new Date(transaction.date) > new Date(filters.endDate)) {
                return false
            }
            // Filtro de conta
            if (filters.accountId && transaction.account.id !== filters.accountId) {
                return false
            }
            // Filtro de categoria
            if (filters.categoryId && transaction.category.id !== filters.categoryId) {
                return false
            }
            return true
        })
    }, [transactions, filters])

    // Agrupar transações por dia e calcular saldos
    const transactionsWithBalances = useMemo(() => {
        if (filteredTransactions.length === 0) return []

        // Agrupar transações por data
        const transactionsByDate = filteredTransactions.reduce((acc, transaction) => {
            const dateKey = new Date(transaction.date).toISOString().split('T')[0]
            if (!acc[dateKey]) acc[dateKey] = []
            acc[dateKey].push(transaction)
            return acc
        }, {} as Record<string, Transaction[]>)

        // Ordenar datas (mais recente primeiro)
        const sortedDates = Object.keys(transactionsByDate).sort((a, b) =>
            new Date(b).getTime() - new Date(a).getTime()
        )

        // Calcular saldo acumulado
        const accountBalances = new Map<string, number>()
        accounts.forEach(account => {
            accountBalances.set(account.id, account.initialBalance)
        })

        // Processar todas as transações e transferências em ordem cronológica
        const allDates = [...sortedDates].reverse()
        const dailyBalancesMap = new Map<string, Map<string, number>>()

        // Criar lista de todas as operações (transactions + transfers) ordenadas por data
        const allOperations: Array<{ date: string, type: 'transaction' | 'transfer', data: Transaction | Transfer }> = [
            ...transactions.map(t => ({ date: t.date, type: 'transaction' as const, data: t })),
            ...transfers.map(t => ({ date: t.date, type: 'transfer' as const, data: t }))
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        // Processar operações em ordem cronológica
        allOperations.forEach(op => {
            if (op.type === 'transaction') {
                const transaction = op.data as Transaction
                const currentBalance = accountBalances.get(transaction.account.id) || 0
                const newBalance = transaction.type === 'INCOME'
                    ? currentBalance + transaction.amount
                    : currentBalance - transaction.amount
                accountBalances.set(transaction.account.id, newBalance)
            } else {
                const transfer = op.data as Transfer
                // Diminuir da conta origem
                const fromBalance = accountBalances.get(transfer.fromAccount.id) || 0
                accountBalances.set(transfer.fromAccount.id, fromBalance - transfer.amount)
                // Aumentar na conta destino
                const toBalance = accountBalances.get(transfer.toAccount.id) || 0
                accountBalances.set(transfer.toAccount.id, toBalance + transfer.amount)
            }
        })

        // Agora recalcular apenas para as datas filtradas
        const filteredBalances = new Map<string, number>()
        accounts.forEach(account => {
            filteredBalances.set(account.id, account.initialBalance)
        })

        allDates.forEach(date => {
            // Processar todas as operações até essa data
            const relevantOps = allOperations.filter(op =>
                new Date(op.date).toISOString().split('T')[0] <= date
            )

            // Resetar e recalcular
            accounts.forEach(account => {
                filteredBalances.set(account.id, account.initialBalance)
            })

            relevantOps.forEach(op => {
                if (op.type === 'transaction') {
                    const transaction = op.data as Transaction
                    const currentBalance = filteredBalances.get(transaction.account.id) || 0
                    const newBalance = transaction.type === 'INCOME'
                        ? currentBalance + transaction.amount
                        : currentBalance - transaction.amount
                    filteredBalances.set(transaction.account.id, newBalance)
                } else {
                    const transfer = op.data as Transfer
                    const fromBalance = filteredBalances.get(transfer.fromAccount.id) || 0
                    filteredBalances.set(transfer.fromAccount.id, fromBalance - transfer.amount)
                    const toBalance = filteredBalances.get(transfer.toAccount.id) || 0
                    filteredBalances.set(transfer.toAccount.id, toBalance + transfer.amount)
                }
            })

            // Salvar saldo do dia
            dailyBalancesMap.set(date, new Map(filteredBalances))
        })

        // Construir lista de transações com saldos diários
        const result: Array<Transaction | { type: 'BALANCE_ROW', date: string, balances: Map<string, number> }> = []

        sortedDates.forEach(date => {
            const dayTransactions = transactionsByDate[date].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            )

            result.push(...dayTransactions)

            // Adicionar linha de saldo
            result.push({
                type: 'BALANCE_ROW',
                date,
                balances: dailyBalancesMap.get(date) || new Map()
            })
        })

        return result
    }, [filteredTransactions, accounts, transactions, transfers])

    const clearFilters = () => {
        setFilters({
            startDate: '',
            endDate: '',
            accountId: '',
            categoryId: '',
        })
    }

    const hasActiveFilters = filters.startDate || filters.endDate || filters.accountId || filters.categoryId

    const openEditModal = (transaction: Transaction) => {
        setEditingTransaction(transaction)
        setFormData({
            accountId: transaction.account.id,
            categoryId: transaction.category.id,
            type: transaction.type,
            description: transaction.description,
            amount: transaction.amount,
            date: new Date(transaction.date).toISOString().split('T')[0],
            status: transaction.status
        })
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const url = editingTransaction
                ? `/api/transactions/${editingTransaction.id}`
                : '/api/transactions'
            const method = editingTransaction ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, amount: parseFloat(formData.amount.toString()) }),
            })

            if (res.ok) {
                setShowModal(false)
                setEditingTransaction(null)
                setFormData({
                    accountId: '',
                    categoryId: '',
                    type: 'EXPENSE',
                    description: '',
                    amount: 0,
                    date: new Date().toISOString().split('T')[0],
                    status: 'COMPLETED',
                })
                loadData()
            } else {
                const error = await res.json()
                alert(error.error || `Erro ao ${editingTransaction ? 'atualizar' : 'criar'} transação`)
            }
        } catch (error) {
            console.error('Erro:', error)
            alert(`Erro ao ${editingTransaction ? 'atualizar' : 'criar'} transação`)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta transação?')) {
            return
        }

        try {
            const response = await fetch(`/api/transactions/${id}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                alert('Erro ao excluir transação')
                return
            }

            loadData()
        } catch (error) {
            console.error('Erro ao excluir:', error)
            alert('Erro ao excluir transação')
        }
    }

    if (loading) {
        return <LoadingSpinner />
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transações</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {filteredTransactions.length} transação(ões)
                        {hasActiveFilters && ' (filtrado)'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${hasActiveFilters
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        <Filter className="h-5 w-5" />
                        Filtros
                        {hasActiveFilters && (
                            <span className="bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                                {[filters.startDate, filters.endDate, filters.accountId, filters.categoryId].filter(Boolean).length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => {
                            setEditingTransaction(null)
                            setFormData({
                                accountId: '',
                                categoryId: '',
                                type: 'EXPENSE',
                                description: '',
                                amount: 0,
                                date: new Date().toISOString().split('T')[0],
                                status: 'COMPLETED'
                            })
                            setShowModal(true)
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="h-5 w-5" />
                        Nova Transação
                    </button>
                </div>
            </div>

            {/* Painel de Filtros */}
            {showFilters && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filtros</h2>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                                <X className="h-4 w-4" />
                                Limpar filtros
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Data Inicial
                            </label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Data Final
                            </label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Conta
                            </label>
                            <select
                                value={filters.accountId}
                                onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="">Todas as contas</option>
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
                                value={filters.categoryId}
                                onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="">Todas as categorias</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>{category.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {transactionsWithBalances.length === 0 ? (
                    <div className="text-center py-12">
                        <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Nenhuma transação encontrada
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {hasActiveFilters ? 'Tente ajustar os filtros' : 'Adicione sua primeira transação'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Data
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Descrição
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Categoria
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Conta
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Valor
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {transactionsWithBalances.map((item, index) => {
                                    if ('type' in item && item.type === 'BALANCE_ROW') {
                                        // Linha de saldo do dia
                                        const balanceRow = item as { type: 'BALANCE_ROW', date: string, balances: Map<string, number> }
                                        const balanceAccounts = Array.from(balanceRow.balances.entries())
                                            .map(([accountId, balance]) => {
                                                const account = accounts.find(a => a.id === accountId)
                                                return { accountId, accountName: account?.name || '', balance }
                                            })
                                            .filter(b => b.balance !== 0)

                                        return (
                                            <tr key={`balance-${balanceRow.date}`} className="bg-blue-50 dark:bg-blue-900/20">
                                                <td colSpan={4} className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    Saldo do Dia
                                                </td>
                                                <td colSpan={2} className="px-6 py-3 text-sm text-right">
                                                    <div className="flex gap-4 justify-end flex-wrap">
                                                        {balanceAccounts.map((acc) => (
                                                            <span key={acc.accountId} className="font-medium text-blue-700 dark:text-blue-300">
                                                                {acc.accountName}: R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    }

                                    const transaction = item as Transaction
                                    return (
                                        <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {new Date(transaction.date).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                                <div className="flex items-center gap-2">
                                                    {transaction.type === 'INCOME' ? (
                                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <TrendingDown className="h-4 w-4 text-red-600" />
                                                    )}
                                                    {transaction.description}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                                {transaction.category.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                                {transaction.account.name}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {transaction.type === 'INCOME' ? '+' : '-'} R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(transaction)}
                                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(transaction.id)}
                                                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                            {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Tipo
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="INCOME">Receita</option>
                                    <option value="EXPENSE">Despesa</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Descrição
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Valor
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Conta
                                </label>
                                <select
                                    required
                                    value={formData.accountId}
                                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                                    required
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">Selecione uma categoria</option>
                                    {categories.filter((cat) => cat.type === formData.type).map((category) => (
                                        <option key={category.id} value={category.id}>{category.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Data
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false)
                                        setEditingTransaction(null)
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    {editingTransaction ? 'Salvar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
