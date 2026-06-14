'use client'

import { useEffect, useState, useMemo } from 'react'
import { Receipt, Plus, TrendingUp, TrendingDown, Edit2, Trash2, Filter, X, ArrowLeftRight, Upload } from 'lucide-react'
import { categoryMatchesTransactionType } from '@/lib/category-utils'
import LoadingSpinner from '../components/LoadingSpinner'
import { parseBankStatementFile, type ParsedBankTransaction, SUPPORTED_BANKS } from '@/lib/bank-statement-parser'


const dateUtils = {
    
    toDateString: (dateInput: string | Date): string => {
        if (typeof dateInput === 'string') {
            return dateInput.split('T')[0]
        }
        const year = dateInput.getFullYear()
        const month = String(dateInput.getMonth() + 1).padStart(2, '0')
        const day = String(dateInput.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    },

    
    formatBR: (dateStr: string): string => {
        const [year, month, day] = dateStr.split('T')[0].split('-')
        return `${day}/${month}/${year}`
    },

    
    today: (): string => {
        const now = new Date()
        return dateUtils.toDateString(now)
    }
}

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

type TransactionOrTransfer = Transaction | (Transfer & { type: 'TRANSFER' })

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
    const [showImportModal, setShowImportModal] = useState(false)
    const [importAccountId, setImportAccountId] = useState('')
    const [importPreview, setImportPreview] = useState<ParsedBankTransaction[]>([])
    const [importBankLabel, setImportBankLabel] = useState('')
    const [importError, setImportError] = useState('')
    const [importing, setImporting] = useState(false)
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
        date: dateUtils.today(),
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

    
    const filteredTransactions = useMemo(() => {
        return transactions.filter(transaction => {
            const transactionDate = dateUtils.toDateString(transaction.date)

            if (filters.startDate && transactionDate < filters.startDate) {
                return false
            }
            if (filters.endDate && transactionDate > filters.endDate) {
                return false
            }
            if (filters.accountId && transaction.account.id !== filters.accountId) {
                return false
            }
            if (filters.categoryId && transaction.category.id !== filters.categoryId) {
                return false
            }
            return true
        })
    }, [transactions, filters])

    
    const filteredTransfers = useMemo(() => {
        return transfers.filter(transfer => {
            const transferDate = dateUtils.toDateString(transfer.date)

            if (filters.startDate && transferDate < filters.startDate) {
                return false
            }
            if (filters.endDate && transferDate > filters.endDate) {
                return false
            }
            
            if (filters.accountId && transfer.fromAccount.id !== filters.accountId && transfer.toAccount.id !== filters.accountId) {
                return false
            }
            
            return true
        })
    }, [transfers, filters])

    
    const transactionsWithBalances = useMemo(() => {
        if (filteredTransactions.length === 0 && filteredTransfers.length === 0) return []

        
        const allItems: TransactionOrTransfer[] = [
            ...filteredTransactions,
            ...filteredTransfers.map(t => ({ ...t, type: 'TRANSFER' as const }))
        ]

        
        const itemsByDate = allItems.reduce((acc, item) => {
            const dateKey = dateUtils.toDateString(item.date)
            if (!acc[dateKey]) acc[dateKey] = []
            acc[dateKey].push(item)
            return acc
        }, {} as Record<string, TransactionOrTransfer[]>)

        
        const sortedDates = Object.keys(itemsByDate).sort((a, b) => b.localeCompare(a))

        const allOperations: Array<{ date: string, type: 'transaction' | 'transfer', data: Transaction | Transfer }> = [
            ...transactions.map(t => ({ date: dateUtils.toDateString(t.date), type: 'transaction' as const, data: t })),
            ...transfers.map(t => ({ date: dateUtils.toDateString(t.date), type: 'transfer' as const, data: t }))
        ].sort((a, b) => a.date.localeCompare(b.date))

        const applyOperation = (
            balances: Map<string, number>,
            op: { type: 'transaction' | 'transfer', data: Transaction | Transfer },
        ) => {
            if (op.type === 'transaction') {
                const transaction = op.data as Transaction
                const currentBalance = balances.get(transaction.account.id) || 0
                const newBalance = transaction.type === 'INCOME'
                    ? currentBalance + transaction.amount
                    : currentBalance - transaction.amount
                balances.set(transaction.account.id, newBalance)
                return
            }

            const transfer = op.data as Transfer
            const fromBalance = balances.get(transfer.fromAccount.id) || 0
            balances.set(transfer.fromAccount.id, fromBalance - transfer.amount)
            const toBalance = balances.get(transfer.toAccount.id) || 0
            balances.set(transfer.toAccount.id, toBalance + transfer.amount)
        }

        const opsByDate = new Map<string, typeof allOperations>()
        for (const op of allOperations) {
            if (!opsByDate.has(op.date)) opsByDate.set(op.date, [])
            opsByDate.get(op.date)!.push(op)
        }

        const endOfDayBalance = new Map<string, Map<string, number>>()
        const runningBalance = new Map<string, number>()
        accounts.forEach(account => {
            runningBalance.set(account.id, account.initialBalance)
        })

        for (const date of [...opsByDate.keys()].sort((a, b) => a.localeCompare(b))) {
            for (const op of opsByDate.get(date)!) {
                applyOperation(runningBalance, op)
            }
            endOfDayBalance.set(date, new Map(runningBalance))
        }

        const getBalanceOnDate = (targetDate: string) => {
            let latest: Map<string, number> | null = null
            for (const [date, balances] of endOfDayBalance) {
                if (date <= targetDate) latest = balances
                else break
            }

            if (latest) return latest

            const initial = new Map<string, number>()
            accounts.forEach(account => {
                initial.set(account.id, account.initialBalance)
            })
            return initial
        }

        const dailyBalancesMap = new Map<string, Map<string, number>>()
        for (const date of sortedDates) {
            dailyBalancesMap.set(date, getBalanceOnDate(date))
        }

        
        const result: Array<TransactionOrTransfer | { type: 'BALANCE_ROW', date: string, balances: Map<string, number> }> = []

        sortedDates.forEach(date => {
            const dayItems = itemsByDate[date].sort((a, b) =>
                b.date.localeCompare(a.date)
            )

            result.push(...dayItems)

            
            result.push({
                type: 'BALANCE_ROW',
                date,
                balances: dailyBalancesMap.get(date) || new Map()
            })
        })

        return result
    }, [filteredTransactions, filteredTransfers, accounts, transactions, transfers])

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
            date: dateUtils.toDateString(transaction.date),
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
                    date: dateUtils.today(),
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

    const handleCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setImportError('')
        setImportPreview([])
        setImportBankLabel('')

        try {
            const buffer = await file.arrayBuffer()
            const result = parseBankStatementFile(buffer)
            setImportPreview(result.transactions)
            setImportBankLabel(result.bankLabel)
        } catch (error) {
            setImportError(error instanceof Error ? error.message : 'Erro ao ler o arquivo CSV')
        }

        e.target.value = ''
    }

    const handleImport = async () => {
        if (!importAccountId) {
            setImportError('Selecione a conta de destino')
            return
        }
        if (importPreview.length === 0) {
            setImportError('Nenhuma transação para importar')
            return
        }

        setImporting(true)
        setImportError('')

        try {
            const res = await fetch('/api/transactions/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountId: importAccountId,
                    transactions: importPreview,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setImportError(typeof data.error === 'string' ? data.error : 'Erro ao importar transações')
                return
            }

            alert(data.message)
            setShowImportModal(false)
            setImportAccountId('')
            setImportPreview([])
            setImportBankLabel('')
            loadData()
        } catch (error) {
            console.error('Erro ao importar:', error)
            setImportError('Erro ao importar transações')
        } finally {
            setImporting(false)
        }
    }

    const importSummary = useMemo(() => {
        const income = importPreview.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
        const expense = importPreview.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
        return { income, expense, count: importPreview.length }
    }, [importPreview])

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
                        {filteredTransactions.length} transação(ões) e {filteredTransfers.length} transferência(s)
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
                            setImportAccountId('')
                            setImportPreview([])
                            setImportBankLabel('')
                            setImportError('')
                            setShowImportModal(true)
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        <Upload className="h-5 w-5" />
                        Importar CSV
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
                                date: dateUtils.today(),
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

                                    const typedItem = item as TransactionOrTransfer

                                    
                                    if ('type' in typedItem && typedItem.type === 'TRANSFER') {
                                        const transfer = typedItem as Transfer & { type: 'TRANSFER' }
                                        return (
                                            <tr key={`transfer-${transfer.id}`} className="hover:bg-purple-50 dark:hover:bg-purple-900/10 bg-purple-50/30 dark:bg-purple-900/5">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                    {dateUtils.formatBR(transfer.date)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                                    <div className="flex items-center gap-2">
                                                        <ArrowLeftRight className="h-4 w-4 text-purple-600" />
                                                        {transfer.description || 'Transferência entre contas'}
                                                        <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">(somente visualização)</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                                    Transferência
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                    <div className="flex flex-col">
                                                        <span className="text-red-600 dark:text-red-400">↓ {transfer.fromAccount.name}</span>
                                                        <span className="text-green-600 dark:text-green-400">↑ {transfer.toAccount.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-purple-600 dark:text-purple-400">
                                                    R$ {transfer.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-400">
                                                    -
                                                </td>
                                            </tr>
                                        )
                                    }

                                    
                                    const transaction = typedItem as Transaction
                                    return (
                                        <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {dateUtils.formatBR(transaction.date)}
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

            
            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Importar extrato bancário
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Suporta extratos do {SUPPORTED_BANKS}. Selecione a conta de destino e envie o arquivo CSV ou TXT exportado pelo banco.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Conta de destino
                                </label>
                                <select
                                    value={importAccountId}
                                    onChange={(e) => setImportAccountId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">Selecione a conta</option>
                                    {accounts.map((account) => (
                                        <option key={account.id} value={account.id}>{account.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Arquivo CSV
                                </label>
                                <input
                                    type="file"
                                    accept=".csv,.txt,text/csv,text/plain"
                                    onChange={handleCsvFile}
                                    className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                                />
                            </div>

                            {importError && (
                                <p className="text-sm text-red-600 dark:text-red-400">{importError}</p>
                            )}

                            {importBankLabel && importPreview.length > 0 && (
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                    Banco detectado: {importBankLabel}
                                </p>
                            )}

                            {importPreview.length > 0 && (
                                <div>
                                    <div className="flex gap-4 text-sm mb-3">
                                        <span className="text-gray-600 dark:text-gray-400">
                                            {importSummary.count} transação(ões)
                                        </span>
                                        <span className="text-green-600">
                                            + R$ {importSummary.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-red-600">
                                            - R$ {importSummary.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Data</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Descrição</th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300">Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {importPreview.map((item, i) => (
                                                    <tr key={i}>
                                                        <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-white">
                                                            {dateUtils.formatBR(item.date)}
                                                        </td>
                                                        <td className="px-3 py-2 text-gray-900 dark:text-white truncate max-w-xs" title={item.description}>
                                                            {item.description}
                                                        </td>
                                                        <td className={`px-3 py-2 text-right font-medium whitespace-nowrap ${item.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                                            {item.type === 'INCOME' ? '+' : '-'} R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                        Transações duplicadas (mesma data, descrição e valor) serão ignoradas. Categoria: Importação bancária.
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowImportModal(false)
                                        setImportAccountId('')
                                        setImportPreview([])
                                        setImportBankLabel('')
                                        setImportError('')
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleImport}
                                    disabled={importing || importPreview.length === 0 || !importAccountId}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {importing ? 'Importando...' : `Importar ${importPreview.length || ''} transação(ões)`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                    {categories.filter((cat) => categoryMatchesTransactionType(cat.type, formData.type)).map((category) => (
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
