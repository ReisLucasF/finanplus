'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, DollarSign, Briefcase, LineChart, RefreshCw } from 'lucide-react'

export default function InvestmentsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [investments, setInvestments] = useState<any[]>([])
    const [investmentsSummaries, setInvestmentsSummaries] = useState<Map<string, any>>(new Map())
    const [showModal, setShowModal] = useState(false)
    const [showTransactionModal, setShowTransactionModal] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [selectedInvestment, setSelectedInvestment] = useState<any>(null)
    const [formData, setFormData] = useState({
        name: '',
        type: 'STOCKS',
        ticker: '',
        cdiPercentage: '',
        institution: '',
        notes: '',
        color: '#3B82F6'
    })
    const [transactionData, setTransactionData] = useState({
        type: 'BUY',
        quantity: '',
        price: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    })

    const investmentTypes = {
        STOCKS: 'Ações',
        CDB: 'CDB',
        FUNDS: 'Fundos',
        TREASURY: 'Tesouro Direto',
        CRYPTO: 'Criptomoedas',
        REAL_ESTATE: 'Fundos Imobiliários',
        OTHER: 'Outros'
    }

    const transactionTypes = {
        BUY: 'Compra',
        SELL: 'Venda'
    }

    const parseBRLValue = (value: string | number): number => {
        if (typeof value === 'number') return value
        const cleaned = value.replace(/\./g, '').replace(',', '.')
        return parseFloat(cleaned) || 0
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value)
    }

    const loadInvestments = async () => {
        try {
            const res = await fetch('/api/investments')
            if (res.ok) {
                const data = await res.json()
                setInvestments(data)

                // Buscar summary para cada investimento
                const summaries = new Map()
                for (const inv of data) {
                    const summaryRes = await fetch(`/api/investments/${inv.id}/summary`)
                    if (summaryRes.ok) {
                        const summaryData = await summaryRes.json()
                        summaries.set(inv.id, summaryData.summary)
                    }
                }
                setInvestmentsSummaries(summaries)
            }
        } catch (error) {
            console.error('Erro ao carregar investimentos:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const checkAuth = async () => {
            const res = await fetch('/api/auth/me')
            if (!res.ok) {
                router.push('/login')
                return
            }
            loadInvestments()
        }
        checkAuth()
    }, [router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const payload = {
            ...formData,
            ticker: formData.ticker || null,
            cdiPercentage: formData.cdiPercentage || null,
            institution: formData.institution || null,
            notes: formData.notes || null
        }

        try {
            const url = editingId ? `/api/investments/${editingId}` : '/api/investments'
            const method = editingId ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                await loadInvestments()
                setShowModal(false)
                resetForm()
            } else {
                const error = await res.json()
                alert(error.error || 'Erro ao salvar')
            }
        } catch (error) {
            console.error('Erro:', error)
            alert('Erro ao salvar investimento')
        }
    }

    const handleTransaction = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedInvestment) return

        const payload = {
            type: transactionData.type,
            quantity: transactionData.quantity,
            price: transactionData.price,
            date: transactionData.date,
            notes: transactionData.notes || null
        }

        try {
            const res = await fetch(`/api/investments/${selectedInvestment.id}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                await loadInvestments()
                setShowTransactionModal(false)
                setSelectedInvestment(null)
                setTransactionData({
                    type: 'BUY',
                    quantity: '',
                    price: '',
                    date: new Date().toISOString().split('T')[0],
                    notes: ''
                })
            } else {
                const error = await res.json()
                console.error('Erro da API:', error)
                const errorMessage = error.error || error.message || 'Erro desconhecido'
                const errorDetails = error.details ? JSON.stringify(error.details) : ''
                alert(`Erro: ${errorMessage}\n${errorDetails}`)
            }
        } catch (error) {
            console.error('Erro ao registrar transação:', error)
            alert(`Erro ao registrar transação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja realmente deletar este investimento?')) return

        try {
            const res = await fetch(`/api/investments/${id}`, { method: 'DELETE' })
            if (res.ok) {
                await loadInvestments()
            }
        } catch (error) {
            console.error('Erro ao deletar investimento:', error)
        }
    }

    const openEditModal = (investment: any) => {
        setEditingId(investment.id)
        setFormData({
            name: investment.name,
            type: investment.type,
            ticker: investment.ticker || '',
            cdiPercentage: investment.cdiPercentage?.toString() || '',
            institution: investment.institution || '',
            notes: investment.notes || '',
            color: investment.color || '#3B82F6'
        })
        setShowModal(true)
    }

    const openTransactionModal = (investment: any) => {
        setSelectedInvestment(investment)
        setShowTransactionModal(true)
    }

    const resetForm = () => {
        setEditingId(null)
        setFormData({
            name: '',
            type: 'STOCKS',
            ticker: '',
            cdiPercentage: '',
            institution: '',
            notes: '',
            color: '#3B82F6'
        })
    }

    const getTotalInvested = () => {
        return Array.from(investmentsSummaries.values()).reduce((sum, summary) => sum + (summary?.totalInvested || 0), 0)
    }

    const getTotalCurrent = () => {
        return Array.from(investmentsSummaries.values()).reduce((sum, summary) => sum + (summary?.currentValue || 0), 0)
    }

    const getTotalProfit = () => {
        return getTotalCurrent() - getTotalInvested()
    }

    const getProfitPercentage = () => {
        const invested = getTotalInvested()
        if (invested === 0) return 0
        return ((getTotalProfit() / invested) * 100)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Carregando...</div>
            </div>
        )
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Investimentos</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie sua carteira de investimentos</p>
                </div>
                <button
                    onClick={() => {
                        resetForm()
                        setShowModal(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="h-5 w-5" />
                    Novo Investimento
                </button>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Investimentos</h3>
                        <Briefcase className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{investments.length}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Investido</h3>
                        <DollarSign className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(getTotalInvested())}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Valor Atual</h3>
                        <LineChart className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(getTotalCurrent())}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Rendimento</h3>
                        {getTotalProfit() >= 0 ? (
                            <TrendingUp className="h-5 w-5 text-green-600" />
                        ) : (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                        )}
                    </div>
                    <p className={`text-2xl font-bold ${getTotalProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(getTotalProfit())}
                    </p>
                    <p className={`text-sm mt-1 ${getTotalProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {getProfitPercentage().toFixed(2)}%
                    </p>
                </div>
            </div>

            {/* Lista de Investimentos */}
            {investments.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                    <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Nenhum investimento cadastrado
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Comece cadastrando seus investimentos em ações, CDB, fundos e mais
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {investments.map((investment) => {
                        const summary = investmentsSummaries.get(investment.id)
                        const profit = summary?.profitLoss || 0
                        const profitPercentage = summary?.profitLossPercentage || 0

                        return (
                            <div
                                key={investment.id}
                                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: investment.color }}
                                        />
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                {investment.name}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {investmentTypes[investment.type as keyof typeof investmentTypes]}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(investment)}
                                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                        >
                                            <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(investment.id)}
                                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                        >
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                        </button>
                                    </div>
                                </div>

                                {investment.institution && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                        📍 {investment.institution}
                                    </p>
                                )}

                                {investment.ticker && (
                                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                                        📈 Ticker: {investment.ticker}
                                    </p>
                                )}

                                {investment.cdiPercentage && (
                                    <p className="text-xs text-purple-600 dark:text-purple-400 mb-2">
                                        📊 {parseFloat(investment.cdiPercentage.toString())}% do CDI
                                    </p>
                                )}

                                {summary && (
                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Investido:</span>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {formatCurrency(summary.totalInvested)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Atual:</span>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {formatCurrency(summary.currentValue)}
                                            </span>
                                        </div>
                                        {summary.totalQuantity > 0 && (
                                            <>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">Quantidade:</span>
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {summary.totalQuantity.toFixed(6)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">Preço Médio:</span>
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {formatCurrency(summary.averagePrice)}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                        <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                                            <span className="text-gray-600 dark:text-gray-400">Rendimento:</span>
                                            <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(profit)} ({profitPercentage.toFixed(2)}%)
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openTransactionModal(investment)}
                                        className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                    >
                                        Nova Transação
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Modal de Cadastro/Edição */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                            {editingId ? 'Editar Investimento' : 'Novo Investimento'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Nome *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Ex: Ações Petrobras"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Tipo *
                                    </label>
                                    <select
                                        required
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        {Object.entries(investmentTypes).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                {formData.type === 'STOCKS' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Ticker (opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.ticker}
                                            onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="PETR4, VALE3..."
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Para atualização automática de cotação</p>
                                    </div>
                                )}

                                {formData.type === 'CDB' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            % do CDI (opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.cdiPercentage}
                                            onChange={(e) => setFormData({ ...formData, cdiPercentage: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="Ex: 120"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">120% do CDI = 120</p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Instituição (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.institution}
                                        onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Ex: XP Investimentos"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Cor
                                    </label>
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Observações (opcional)
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    rows={3}
                                    placeholder="Anotações sobre o investimento..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                                >
                                    {editingId ? 'Salvar' : 'Cadastrar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false)
                                        resetForm()
                                    }}
                                    className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Transação */}
            {showTransactionModal && selectedInvestment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            Registrar Transação
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {selectedInvestment.name}
                        </p>

                        <form onSubmit={handleTransaction} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tipo *
                                </label>
                                <select
                                    required
                                    value={transactionData.type}
                                    onChange={(e) => setTransactionData({ ...transactionData, type: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    {Object.entries(transactionTypes).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Quantidade *
                                </label>
                                <input
                                    type="number"
                                    step="0.000001"
                                    required
                                    value={transactionData.quantity}
                                    onChange={(e) => setTransactionData({ ...transactionData, quantity: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="100"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Preço Unitário * (R$)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={transactionData.price}
                                    onChange={(e) => setTransactionData({ ...transactionData, price: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="10,50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Data *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={transactionData.date}
                                    onChange={(e) => setTransactionData({ ...transactionData, date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            {transactionData.quantity && transactionData.price && (
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        Valor Total: <strong>{formatCurrency(parseFloat(transactionData.quantity) * parseFloat(transactionData.price))}</strong>
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Observações (opcional)
                                </label>
                                <textarea
                                    value={transactionData.notes}
                                    onChange={(e) => setTransactionData({ ...transactionData, notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    rows={2}
                                    placeholder="Anotações..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                                >
                                    Registrar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowTransactionModal(false)
                                        setSelectedInvestment(null)
                                    }}
                                    className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
