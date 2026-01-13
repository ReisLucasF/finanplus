'use client'

import { useEffect, useState } from 'react'
import { Receipt, Plus, TrendingUp, TrendingDown, Edit2, Trash2 } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

interface Account {
    id: string
    name: string
    type: string
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

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [accounts, setAccounts] = useState<Account[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
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
            const [transRes, accRes, catRes] = await Promise.all([
                fetch('/api/transactions'),
                fetch('/api/accounts'),
                fetch('/api/categories'),
            ])

            if (transRes.ok) setTransactions(await transRes.json())
            if (accRes.ok) setAccounts(await accRes.json())
            if (catRes.ok) setCategories(await catRes.json())
        } catch (error) {
            console.error('Erro ao carregar dados:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

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
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Histórico completo</p>
                </div>
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

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {transactions.length === 0 ? (
                    <div className="text-center py-12">
                        <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Nenhuma transação
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Adicione sua primeira transação
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
                                {transactions.map((transaction) => (
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
                                ))}
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
