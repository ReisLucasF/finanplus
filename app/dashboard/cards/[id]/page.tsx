'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, ShoppingBag, CreditCard as CreditCardIcon, Filter, DollarSign } from 'lucide-react'
import LoadingSpinner from '../../components/LoadingSpinner'

interface Card {
    id: string
    name: string
    cardLimit: number
    dueDay: number
    initialDebt: number
    color: string
}

interface Purchase {
    id: string
    description: string
    amount: number
    date: string
    category: {
        id: string
        name: string
    }
}

interface Payment {
    id: string
    amount: number
    dueDate: string
    paymentDate: string | null
    status: 'PENDING' | 'PAID'
    account: {
        id: string
        name: string
    }
}

export default function CardDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const cardId = params.id as string

    const [card, setCard] = useState<Card | null>(null)
    const [purchases, setPurchases] = useState<Purchase[]>([])
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'purchases' | 'payments'>('purchases')

    // Filtros de data
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    useEffect(() => {
        loadData()
    }, [cardId, startDate, endDate])

    const loadData = async () => {
        try {
            setLoading(true)

            // Buscar dados do cartão
            const cardRes = await fetch(`/api/cards/${cardId}`)
            if (!cardRes.ok) throw new Error('Erro ao carregar cartão')
            const cardData = await cardRes.json()
            setCard(cardData)

            // Buscar compras
            const purchasesUrl = new URL(`/api/cards/${cardId}/purchases`, window.location.origin)
            if (startDate) purchasesUrl.searchParams.set('startDate', startDate)
            if (endDate) purchasesUrl.searchParams.set('endDate', endDate)

            const purchasesRes = await fetch(purchasesUrl)
            if (purchasesRes.ok) {
                const purchasesData = await purchasesRes.json()
                setPurchases(purchasesData)
            }

            // Buscar pagamentos
            const paymentsUrl = new URL(`/api/cards/${cardId}/payments`, window.location.origin)
            if (startDate) paymentsUrl.searchParams.set('startDate', startDate)
            if (endDate) paymentsUrl.searchParams.set('endDate', endDate)

            const paymentsRes = await fetch(paymentsUrl)
            if (paymentsRes.ok) {
                const paymentsData = await paymentsRes.json()
                setPayments(paymentsData)
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error)
            alert('Erro ao carregar dados do cartão')
        } finally {
            setLoading(false)
        }
    }

    const clearFilters = () => {
        setStartDate('')
        setEndDate('')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        )
    }

    if (!card) {
        return (
            <div className="p-6">
                <p className="text-red-500">Cartão não encontrado</p>
            </div>
        )
    }

    const totalPurchases = purchases.reduce((sum, p) => sum + p.amount, 0)
    const totalPaid = payments
        .filter(p => p.status === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0)
    const totalPending = payments
        .filter(p => p.status === 'PENDING')
        .reduce((sum, p) => sum + p.amount, 0)

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.push('/dashboard/cards')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">Detalhes do Cartão</h1>
                    <p className="text-gray-600 dark:text-gray-400">{card.name}</p>
                </div>
            </div>

            {/* Card Info */}
            <div
                className="p-6 rounded-xl text-white shadow-lg"
                style={{ backgroundColor: card.color }}
            >
                <div className="space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-white/80 text-sm">Limite</p>
                            <p className="text-2xl font-bold">
                                R$ {card.cardLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <CreditCardIcon className="w-8 h-8 text-white/80" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-white/80 text-sm">Dia do Vencimento</p>
                            <p className="text-lg font-semibold">Dia {card.dueDay}</p>
                        </div>
                        <div>
                            <p className="text-white/80 text-sm">Dívida Inicial</p>
                            <p className="text-lg font-semibold">
                                R$ {card.initialDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="text-sm">Total em Compras</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                        R$ {totalPurchases.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-sm">Pagamentos Realizados</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                        R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                        <CreditCardIcon className="w-4 h-4" />
                        <span className="text-sm">Pagamentos Pendentes</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">
                        R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="font-semibold">Filtrar por Período</h3>
                </div>
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium mb-1">Data Inicial</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                        />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium mb-1">Data Final</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                        />
                    </div>
                    {(startDate || endDate) && (
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        >
                            Limpar Filtros
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('purchases')}
                            className={`flex-1 px-6 py-3 font-medium transition-colors ${activeTab === 'purchases'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <ShoppingBag className="w-5 h-5" />
                                Compras ({purchases.length})
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('payments')}
                            className={`flex-1 px-6 py-3 font-medium transition-colors ${activeTab === 'payments'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <DollarSign className="w-5 h-5" />
                                Pagamentos ({payments.length})
                            </div>
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'purchases' ? (
                        <div className="space-y-3">
                            {purchases.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">
                                    Nenhuma compra encontrada no período selecionado
                                </p>
                            ) : (
                                purchases.map((purchase) => (
                                    <div
                                        key={purchase.id}
                                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium">{purchase.description}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                                                    {purchase.category.name}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(purchase.date).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-lg font-semibold text-red-600">
                                            R$ {purchase.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {payments.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">
                                    Nenhum pagamento encontrado no período selecionado
                                </p>
                            ) : (
                                payments.map((payment) => (
                                    <div
                                        key={payment.id}
                                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium">Pagamento - {payment.account.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span
                                                    className={`text-xs px-2 py-1 rounded ${payment.status === 'PAID'
                                                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                                            : 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                                                        }`}
                                                >
                                                    {payment.status === 'PAID' ? 'Pago' : 'Pendente'}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    Venc: {new Date(payment.dueDate).toLocaleDateString('pt-BR')}
                                                </span>
                                                {payment.paymentDate && (
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        | Pago: {new Date(payment.paymentDate).toLocaleDateString('pt-BR')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className={`text-lg font-semibold ${payment.status === 'PAID' ? 'text-green-600' : 'text-orange-600'
                                            }`}>
                                            R$ {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
