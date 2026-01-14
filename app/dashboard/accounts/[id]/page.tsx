'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, TrendingUp, TrendingDown, ArrowLeftRight, Filter, X } from 'lucide-react'
import LoadingSpinner from '../../components/LoadingSpinner'

interface BankAccount {
    id: string
    name: string
    type: string
    currentBalance: number
    initialBalance: number
    color: string
}

interface Transaction {
    id: string
    type: string
    description: string
    amount: number
    date: string
    category: { name: string }
}

interface Transfer {
    id: string
    amount: number
    date: string
    description?: string
    fromAccount: { id: string, name: string }
    toAccount: { id: string, name: string }
}

type Operation = (Transaction & { opType: 'transaction' }) | (Transfer & { opType: 'transfer' })

export default function AccountDetailPage() {
    const router = useRouter()
    const params = useParams()
    const accountId = params.id as string

    const [account, setAccount] = useState<BankAccount | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [transfers, setTransfers] = useState<Transfer[]>([])
    const [loading, setLoading] = useState(true)
    const [showFilters, setShowFilters] = useState(false)
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        operationType: '', // 'transaction', 'transfer', 'income', 'expense', 'transfer-in', 'transfer-out'
    })

    useEffect(() => {
        loadData()
    }, [accountId])

    const loadData = async () => {
        try {
            const [accRes, transRes, transferRes] = await Promise.all([
                fetch(`/api/accounts/${accountId}`),
                fetch(`/api/transactions?accountId=${accountId}`),
                fetch('/api/transfers')
            ])

            if (accRes.ok) {
                const accData = await accRes.json()
                setAccount(accData)
            }

            if (transRes.ok) {
                setTransactions(await transRes.json())
            }

            if (transferRes.ok) {
                const allTransfers = await transferRes.json()
                const filtered = allTransfers.filter((t: Transfer) =>
                    t.fromAccount.id === accountId || t.toAccount.id === accountId
                )
                setTransfers(filtered)
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error)
        } finally {
            setLoading(false)
        }
    }

    // Combinar e filtrar operações
    const filteredOperations = useMemo(() => {
        const allOps: Operation[] = [
            ...transactions.map(t => ({ ...t, opType: 'transaction' as const })),
            ...transfers.map(t => ({ ...t, opType: 'transfer' as const }))
        ]

        return allOps.filter(op => {
            // Filtro de data inicial
            if (filters.startDate && new Date(op.date) < new Date(filters.startDate)) {
                return false
            }
            // Filtro de data final
            if (filters.endDate && new Date(op.date) > new Date(filters.endDate)) {
                return false
            }
            // Filtro de tipo de operação
            if (filters.operationType) {
                if (filters.operationType === 'transaction' && op.opType !== 'transaction') {
                    return false
                }
                if (filters.operationType === 'transfer' && op.opType !== 'transfer') {
                    return false
                }
                if (filters.operationType === 'income' && (op.opType !== 'transaction' || (op as Transaction).type !== 'INCOME')) {
                    return false
                }
                if (filters.operationType === 'expense' && (op.opType !== 'transaction' || (op as Transaction).type !== 'EXPENSE')) {
                    return false
                }
                if (filters.operationType === 'transfer-in' && (op.opType !== 'transfer' || (op as Transfer).toAccount.id !== accountId)) {
                    return false
                }
                if (filters.operationType === 'transfer-out' && (op.opType !== 'transfer' || (op as Transfer).fromAccount.id !== accountId)) {
                    return false
                }
            }
            return true
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [transactions, transfers, filters, accountId])

    const clearFilters = () => {
        setFilters({
            startDate: '',
            endDate: '',
            operationType: '',
        })
    }

    const hasActiveFilters = filters.startDate || filters.endDate || filters.operationType

    // Calcular totais
    const totals = useMemo(() => {
        let income = 0
        let expense = 0
        let transferIn = 0
        let transferOut = 0

        filteredOperations.forEach(op => {
            if (op.opType === 'transaction') {
                const trans = op as Transaction
                if (trans.type === 'INCOME') {
                    income += trans.amount
                } else {
                    expense += trans.amount
                }
            } else {
                const transfer = op as Transfer
                if (transfer.toAccount.id === accountId) {
                    transferIn += transfer.amount
                } else {
                    transferOut += transfer.amount
                }
            }
        })

        return { income, expense, transferIn, transferOut }
    }, [filteredOperations, accountId])

    if (loading) {
        return <LoadingSpinner />
    }

    if (!account) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Conta não encontrada</h2>
            </div>
        )
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                    <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="flex items-center gap-3">
                    <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: account.color }}
                    />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{account.name}</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Saldo atual: R$ {account.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <p className="text-sm text-green-600 dark:text-green-400 mb-1">Receitas</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <p className="text-sm text-red-600 dark:text-red-400 mb-1">Despesas</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                        R$ {totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Entradas (Transf.)</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        R$ {totals.transferIn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                    <p className="text-sm text-orange-600 dark:text-orange-400 mb-1">Saídas (Transf.)</p>
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                        R$ {totals.transferOut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {filteredOperations.length} operação(ões)
                    {hasActiveFilters && ' (filtrado)'}
                </h2>
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
                            {[filters.startDate, filters.endDate, filters.operationType].filter(Boolean).length}
                        </span>
                    )}
                </button>
            </div>

            {/* Painel de Filtros */}
            {showFilters && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filtros</h3>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                Tipo de Operação
                            </label>
                            <select
                                value={filters.operationType}
                                onChange={(e) => setFilters({ ...filters, operationType: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="">Todas</option>
                                <option value="income">Receitas</option>
                                <option value="expense">Despesas</option>
                                <option value="transfer-in">Transferências Recebidas</option>
                                <option value="transfer-out">Transferências Enviadas</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Lista de Operações */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {filteredOperations.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-600 dark:text-gray-400">
                            {hasActiveFilters ? 'Nenhuma operação encontrada com os filtros aplicados' : 'Nenhuma movimentação encontrada'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredOperations.map((op) => {
                            if (op.opType === 'transaction') {
                                const transaction = op as Transaction
                                return (
                                    <div
                                        key={`trans-${transaction.id}`}
                                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {transaction.type === 'INCOME' ? (
                                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                                ) : (
                                                    <TrendingDown className="h-5 w-5 text-red-600" />
                                                )}
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {transaction.description}
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        {transaction.category.name} • {new Date(transaction.date).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`font-semibold text-lg ${transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {transaction.type === 'INCOME' ? '+' : '-'} R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                )
                            } else {
                                const transfer = op as Transfer
                                const isOutgoing = transfer.fromAccount.id === accountId
                                return (
                                    <div
                                        key={`transfer-${transfer.id}`}
                                        className="p-4 bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <ArrowLeftRight className="h-5 w-5 text-blue-600" />
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {transfer.description || 'Transferência'}
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        {isOutgoing ? (
                                                            <>Para {transfer.toAccount.name}</>
                                                        ) : (
                                                            <>De {transfer.fromAccount.name}</>
                                                        )} • {new Date(transfer.date).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`font-semibold text-lg ${isOutgoing ? 'text-red-600' : 'text-green-600'
                                                }`}>
                                                {isOutgoing ? '-' : '+'} R$ {transfer.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                )
                            }
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
