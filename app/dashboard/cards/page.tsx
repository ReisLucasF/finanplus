'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Plus, Edit, Trash2, DollarSign, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'

interface Card {
    id: string
    name: string
    cardLimit: number
    dueDay: number
    initialDebt: number
    color: string
    currentDebt?: number
    usagePercentage?: number
}

interface Account {
    id: string
    name: string
    balance: number
}

export default function CardsPage() {
    const [cards, setCards] = useState<Card[]>([])
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [editingCard, setEditingCard] = useState<Card | null>(null)
    const [payingCard, setPayingCard] = useState<Card | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        cardLimit: 0,
        dueDay: 1,
        initialDebt: 0,
        color: '#EF4444',
    })
    const [paymentData, setPaymentData] = useState({
        amount: 0,
        accountId: '',
    })

    // Converter valor BRL para número
    const parseBRLValue = (value: string | number): number => {
        if (typeof value === 'number') return value
        // Remove espaços e caracteres inválidos
        let cleaned = value.trim()
        // Remove pontos (separador de milhar brasileiro)
        cleaned = cleaned.replace(/\./g, '')
        // Substitui vírgula por ponto (decimal brasileiro -> US)
        cleaned = cleaned.replace(',', '.')
        const parsed = parseFloat(cleaned)
        return isNaN(parsed) ? 0 : parsed
    }

    const loadCards = async () => {
        try {
            const res = await fetch('/api/cards')
            if (res.ok) {
                const data = await res.json()

                // Calcular dívida atual de cada cartão
                const cardsWithDebt = await Promise.all(
                    data.map(async (card: Card) => {
                        try {
                            const txRes = await fetch(`/api/transactions?cardId=${card.id}`)
                            if (txRes.ok) {
                                const transactions = await txRes.json()
                                const totalSpent = transactions.reduce((sum: number, tx: any) => {
                                    const amount = parseFloat(tx.amount) || 0
                                    return sum + amount
                                }, 0)
                                const initialDebt = parseFloat(card.initialDebt as any) || 0
                                const currentDebt = initialDebt + totalSpent
                                const usagePercentage = (currentDebt / card.cardLimit) * 100

                                console.log(`💳 ${card.name}:`, {
                                    initialDebt,
                                    totalSpent,
                                    currentDebt,
                                    cardLimit: card.cardLimit
                                })

                                return {
                                    ...card,
                                    currentDebt,
                                    usagePercentage: Math.min(usagePercentage, 100)
                                }
                            }
                            const initialDebt = parseFloat(card.initialDebt as any) || 0
                            return { ...card, currentDebt: initialDebt, usagePercentage: (initialDebt / card.cardLimit) * 100 }
                        } catch {
                            const initialDebt = parseFloat(card.initialDebt as any) || 0
                            return { ...card, currentDebt: initialDebt, usagePercentage: (initialDebt / card.cardLimit) * 100 }
                        }
                    })
                )

                setCards(cardsWithDebt)

                console.log('💳 Cards carregados:', cardsWithDebt.map(c => ({
                    name: c.name,
                    cardLimit: c.cardLimit,
                    tipo: typeof c.cardLimit,
                    currentDebt: c.currentDebt
                })))

                const totalLimit = cardsWithDebt.reduce((sum, card) => {
                    const limit = parseFloat(card.cardLimit as any) || 0
                    console.log(`  ${card.name}: ${limit}`)
                    return sum + limit
                }, 0)
                console.log('💰 Limite Total calculado:', totalLimit)
            }
        } catch (error) {
            console.error('Erro ao carregar cartões:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadAccounts = async () => {
        try {
            const res = await fetch('/api/accounts')
            if (res.ok) {
                const data = await res.json()
                setAccounts(data)
            }
        } catch (error) {
            console.error('Erro ao carregar contas:', error)
        }
    }

    useEffect(() => {
        loadCards()
        loadAccounts()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const url = editingCard ? `/api/cards/${editingCard.id}` : '/api/cards'
            const method = editingCard ? 'PUT' : 'POST'

            const payload = editingCard
                ? {
                    name: formData.name,
                    cardLimit: parseBRLValue(formData.cardLimit),
                    dueDay: Number(formData.dueDay),
                    color: formData.color
                }
                : {
                    name: formData.name,
                    cardLimit: parseBRLValue(formData.cardLimit),
                    dueDay: Number(formData.dueDay),
                    initialDebt: parseBRLValue(formData.initialDebt),
                    color: formData.color
                }

            console.log('📤 Payload enviado:', JSON.stringify(payload, null, 2))

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                setShowModal(false)
                setEditingCard(null)
                setFormData({ name: '', cardLimit: 0, dueDay: 1, initialDebt: 0, color: '#EF4444' })
                loadCards()
            } else {
                const error = await res.json()
                alert(error.error || 'Erro ao salvar cartão')
            }
        } catch (error) {
            console.error('Erro:', error)
            alert('Erro ao salvar cartão')
        }
    }

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault()

        const parsedAmount = parseBRLValue(paymentData.amount)

        if (!payingCard || !paymentData.accountId || parsedAmount <= 0) {
            alert('Preencha todos os campos corretamente')
            return
        }

        try {
            const res = await fetch('/api/cards/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cardId: payingCard.id,
                    accountId: paymentData.accountId,
                    amount: parsedAmount,
                }),
            })

            if (res.ok) {
                setShowPaymentModal(false)
                setPayingCard(null)
                setPaymentData({ amount: 0, accountId: '' })
                loadCards()
                alert('Pagamento registrado com sucesso!')
            } else {
                const error = await res.json()
                alert(error.error || 'Erro ao processar pagamento')
            }
        } catch (error) {
            console.error('Erro:', error)
            alert('Erro ao processar pagamento')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este cartão?')) return

        try {
            const res = await fetch(`/api/cards/${id}`, { method: 'DELETE' })
            if (res.ok) {
                loadCards()
            } else {
                const error = await res.json()
                alert(error.error || 'Erro ao excluir cartão')
            }
        } catch (error) {
            console.error('Erro:', error)
            alert('Erro ao excluir cartão')
        }
    }

    const openEditModal = (card: Card) => {
        setEditingCard(card)
        setFormData({
            name: card.name || '',
            cardLimit: card.cardLimit?.toString() || '0',
            dueDay: card.dueDay || 1,
            initialDebt: card.initialDebt?.toString() || '0',
            color: card.color || '#EF4444',
        })
        setShowModal(true)
    }

    const openPaymentModal = (card: Card) => {
        setPayingCard(card)
        setPaymentData({ amount: card.currentDebt || 0, accountId: accounts[0]?.id || '' })
        setShowPaymentModal(true)
    }

    const getProgressBarColor = (percentage: number) => {
        if (percentage >= 90) return 'bg-red-500'
        if (percentage >= 70) return 'bg-yellow-500'
        return 'bg-green-500'
    }

    const getStatusIcon = (percentage: number) => {
        if (percentage >= 90) return <AlertCircle className="h-5 w-5 text-red-500" />
        if (percentage >= 70) return <TrendingUp className="h-5 w-5 text-yellow-500" />
        return <CheckCircle className="h-5 w-5 text-green-500" />
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
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cartões de Crédito</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie seus cartões e controle seus gastos</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    Novo Cartão
                </button>
            </div>

            {/* Resumo Geral */}
            {cards.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-blue-900 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-blue-100">Total de Cartões</span>
                            <CreditCard className="h-6 w-6 text-blue-100" />
                        </div>
                        <p className="text-3xl font-bold">{cards.length}</p>
                    </div>

                    <div className="bg-green-900 to-green-600 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-green-100">Limite Total</span>
                            <TrendingUp className="h-6 w-6 text-green-100" />
                        </div>
                        <p className="text-3xl font-bold">
                            {formatCurrency(cards.reduce((sum, card) => sum + (parseFloat(card.cardLimit as any) || 0), 0))}
                        </p>
                    </div>

                    <div className="bg-red-900 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-red-100">Dívida Total</span>
                            <DollarSign className="h-6 w-6 text-red-100" />
                        </div>
                        <p className="text-3xl font-bold">
                            {formatCurrency(cards.reduce((sum, card) => sum + (card.currentDebt || 0), 0))}
                        </p>
                    </div>
                </div>
            )}

            {cards.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                    <CreditCard className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Nenhum cartão cadastrado
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Comece adicionando seu primeiro cartão de crédito
                    </p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Adicionar Cartão
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {cards.map((card) => (
                        <div
                            key={card.id}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                        >
                            {/* Header do Cartão com Cor */}
                            <div
                                className="h-32 p-6 relative"
                                style={{ backgroundColor: card.color }}
                            >
                                <div className="flex justify-between items-start text-white">
                                    <div>
                                        <CreditCard className="h-8 w-8 mb-2 opacity-80" />
                                        <h3 className="text-xl font-bold">{card.name}</h3>
                                        <p className="text-sm opacity-90">Vence dia {card.dueDay}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(card)}
                                            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(card.id)}
                                            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Corpo do Cartão */}
                            <div className="p-6">
                                {/* Valores */}
                                <div className="space-y-3 mb-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Dívida Atual</span>
                                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(card.currentDebt || 0)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Limite Total</span>
                                        <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                            {formatCurrency(card.cardLimit)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Disponível</span>
                                        <span className={`text-lg font-semibold ${(card.cardLimit - (card.currentDebt || 0)) < 0
                                                ? 'text-red-600 dark:text-red-400'
                                                : 'text-green-600 dark:text-green-400'
                                            }`}>
                                            {formatCurrency(card.cardLimit - (card.currentDebt || 0))}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                            Utilização do Limite
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {getStatusIcon(card.usagePercentage || 0)}
                                            <span className="text-xs font-bold text-gray-900 dark:text-white">
                                                {(card.usagePercentage || 0).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ${getProgressBarColor(card.usagePercentage || 0)}`}
                                            style={{ width: `${Math.min(card.usagePercentage || 0, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Botão de Pagamento */}
                                <button
                                    onClick={() => openPaymentModal(card)}
                                    disabled={(card.currentDebt || 0) <= 0}
                                    className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <DollarSign className="h-5 w-5" />
                                    Pagar Fatura
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Criar/Editar Cartão */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            {editingCard ? 'Editar Cartão' : 'Novo Cartão'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nome do Cartão
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Limite do Cartão
                                </label>
                                <input
                                    type="text"
                                    value={formData.cardLimit}
                                    onChange={(e) => setFormData({ ...formData, cardLimit: e.target.value as any })}
                                    placeholder="Ex: 5000 ou 5.000,00"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    required
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Use . para milhares e , para decimais (5.000,00)
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Dia do Vencimento
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
                            {!editingCard && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Dívida Inicial
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.initialDebt}
                                        onChange={(e) => setFormData({ ...formData, initialDebt: e.target.value as any })}
                                        placeholder="Ex: 1404 ou 1.404,00"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Use . para milhares e , para decimais (1.404,00)
                                    </p>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Cor do Cartão
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-20 h-12 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-600"
                                    />
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={formData.color.toUpperCase()}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            placeholder="#000000"
                                            pattern="^#[0-9A-Fa-f]{6}$"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                                        />
                                    </div>
                                    <div
                                        className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-inner"
                                        style={{ backgroundColor: formData.color }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Escolha a cor que identificará seu cartão
                                </p>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false)
                                        setEditingCard(null)
                                        setFormData({ name: '', cardLimit: 0, dueDay: 1, initialDebt: 0, color: '#EF4444' })
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    {editingCard ? 'Salvar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Pagamento */}
            {showPaymentModal && payingCard && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Pagar Fatura
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {payingCard.name} - Dívida: {formatCurrency(payingCard.currentDebt || 0)}
                        </p>
                        <form onSubmit={handlePayment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Conta de Origem
                                </label>
                                <select
                                    value={paymentData.accountId}
                                    onChange={(e) => setPaymentData({ ...paymentData, accountId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    required
                                >
                                    <option value="">Selecione uma conta</option>
                                    {accounts.map((account) => (
                                        <option key={account.id} value={account.id}>
                                            {account.name} - {formatCurrency(account.balance)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Valor do Pagamento
                                </label>
                                <input
                                    type="text"
                                    value={paymentData.amount}
                                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value as any })}
                                    placeholder="Ex: 1.000,00"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    required
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Dívida atual: {formatCurrency(payingCard.currentDebt || 0)}
                                </p>
                                <div className="flex gap-2 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentData({ ...paymentData, amount: (payingCard.currentDebt || 0) * 0.5 })}
                                        className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
                                    >
                                        50%
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentData({ ...paymentData, amount: payingCard.currentDebt || 0 })}
                                        className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
                                    >
                                        Total
                                    </button>
                                </div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    💡 O pagamento será registrado como uma despesa na categoria "Pagamento de Cartão"
                                </p>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPaymentModal(false)
                                        setPayingCard(null)
                                        setPaymentData({ amount: 0, accountId: '' })
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                                >
                                    Confirmar Pagamento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
