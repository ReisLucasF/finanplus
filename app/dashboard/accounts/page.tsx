'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet, Plus, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import LoadingSpinner from '../components/LoadingSpinner'

interface BankAccount {
    id: string
    name: string
    type: string
    currentBalance: number
    initialBalance: number
    color: string
}

export default function AccountsPage() {
    const router = useRouter()
    const [accounts, setAccounts] = useState<BankAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        type: 'CHECKING',
        initialBalance: 0,
        color: '#3B82F6',
    })

    const loadAccounts = async () => {
        try {
            const res = await fetch('/api/accounts')
            if (res.ok) {
                const data = await res.json()
                setAccounts(data)
            }
        } catch (error) {
            console.error('Erro ao carregar contas:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadAccounts()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const url = editingAccount ? `/api/accounts/${editingAccount.id}` : '/api/accounts'
            const method = editingAccount ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (res.ok) {
                setShowModal(false)
                setEditingAccount(null)
                setFormData({ name: '', type: 'CHECKING', initialBalance: 0, color: '#3B82F6' })
                loadAccounts()
            } else {
                const error = await res.json()
                alert(error.error || 'Erro ao salvar conta')
            }
        } catch (error) {
            console.error('Erro:', error)
            alert('Erro ao salvar conta')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta conta?')) return

        try {
            const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
            if (res.ok) {
                loadAccounts()
            } else {
                const error = await res.json()
                alert(error.error || 'Erro ao excluir conta')
            }
        } catch (error) {
            console.error('Erro:', error)
            alert('Erro ao excluir conta')
        }
    }

    const openEditModal = (account: BankAccount) => {
        setEditingAccount(account)
        setFormData({
            name: account.name,
            type: account.type,
            initialBalance: account.initialBalance,
            color: account.color,
        })
        setShowModal(true)
    }

    const openCreateModal = () => {
        setEditingAccount(null)
        setFormData({ name: '', type: 'CHECKING', initialBalance: 0, color: '#3B82F6' })
        setShowModal(true)
    }

    if (loading) {
        return <LoadingSpinner />
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contas Bancárias</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie suas contas</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="h-5 w-5" />
                    Nova Conta
                </button>
            </div>

            {accounts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                    <Wallet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Nenhuma conta cadastrada
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Comece adicionando sua primeira conta bancária
                    </p>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="h-5 w-5" />
                        Adicionar Conta
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {accounts.map((account) => (
                        <div
                            key={account.id}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer"
                            onClick={() => router.push(`/dashboard/accounts/${account.id}`)}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: account.color }}
                                    />
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{account.name}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {account.type === 'CHECKING' ? 'Conta Corrente' : 'Poupança'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => openEditModal(account)}
                                        className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(account.id)}
                                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Saldo Atual</span>
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                        R$ {account.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                            {editingAccount ? 'Editar Conta' : 'Nova Conta'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nome da Conta
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
                                    Tipo
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="CHECKING">Conta Corrente</option>
                                    <option value="SAVINGS">Poupança</option>
                                </select>
                            </div>
                            {!editingAccount && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Saldo Inicial
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.initialBalance}
                                        onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Cor
                                </label>
                                <input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="w-full h-10 rounded-lg cursor-pointer"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false)
                                        setEditingAccount(null)
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    {editingAccount ? 'Salvar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
