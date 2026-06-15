'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
    Plus, Edit, Trash2, TrendingUp, TrendingDown, DollarSign, Briefcase,
    LineChart, X, ChevronRight, History, ShoppingCart, Tag, Calendar,
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatCurrency, cn } from '@/lib/utils'

interface Investment {
    id: string
    name: string
    type: string
    ticker?: string | null
    cdiPercentage?: number | string | null
    institution?: string | null
    notes?: string | null
    color: string
}

interface InvestmentSummary {
    totalQuantity: number
    averagePrice: number
    totalInvested: number
    currentValue: number
    profitLoss: number
    profitLossPercentage: number
}

interface InvestmentTransaction {
    id: string
    type: 'BUY' | 'SELL'
    quantity: number
    price: number
    amount: number
    date: string
    notes: string | null
}

const INVESTMENT_TYPES: Record<string, string> = {
    STOCKS: 'Ações',
    CDB: 'CDB',
    FUNDS: 'Fundos',
    TREASURY: 'Tesouro Direto',
    CRYPTO: 'Criptomoedas',
    REAL_ESTATE: 'Fundos Imobiliários',
    OTHER: 'Outros',
}

const emptyForm = {
    name: '',
    type: 'STOCKS',
    ticker: '',
    cdiPercentage: '',
    institution: '',
    notes: '',
    color: '#3B82F6',
}

const emptyTxForm = {
    type: 'BUY' as 'BUY' | 'SELL',
    quantity: '',
    price: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
}

function formatDateBR(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR')
}

export default function InvestmentsPage() {
    const [loading, setLoading] = useState(true)
    const [investments, setInvestments] = useState<Investment[]>([])
    const [summaries, setSummaries] = useState<Map<string, InvestmentSummary>>(new Map())

    const [showAssetModal, setShowAssetModal] = useState(false)
    const [editingAssetId, setEditingAssetId] = useState<string | null>(null)
    const [assetForm, setAssetForm] = useState(emptyForm)

    const [detailInvestment, setDetailInvestment] = useState<Investment | null>(null)
    const [transactions, setTransactions] = useState<InvestmentTransaction[]>([])
    const [loadingTx, setLoadingTx] = useState(false)
    const [txForm, setTxForm] = useState(emptyTxForm)
    const [editingTxId, setEditingTxId] = useState<string | null>(null)
    const [showTxForm, setShowTxForm] = useState(false)
    const [savingTx, setSavingTx] = useState(false)

    const loadInvestments = useCallback(async () => {
        try {
            const [investmentsRes, summariesRes] = await Promise.all([
                fetch('/api/investments'),
                fetch('/api/investments/summaries'),
            ])

            if (investmentsRes.ok) {
                setInvestments(await investmentsRes.json())
            }

            if (summariesRes.ok) {
                const { summaries: list } = await summariesRes.json()
                setSummaries(
                    new Map(
                        list.map((item: { id: string; summary: InvestmentSummary }) => [
                            item.id,
                            item.summary,
                        ]),
                    ),
                )
            }
        } catch (error) {
            console.error('Erro ao carregar investimentos:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    const loadTransactions = useCallback(async (investmentId: string) => {
        setLoadingTx(true)
        try {
            const res = await fetch(`/api/investments/${investmentId}/transactions`)
            if (res.ok) {
                setTransactions(await res.json())
            }
        } catch (error) {
            console.error('Erro ao carregar transações:', error)
        } finally {
            setLoadingTx(false)
        }
    }, [])

    useEffect(() => {
        void loadInvestments()
    }, [loadInvestments])

    const detailSummary = detailInvestment
        ? summaries.get(detailInvestment.id)
        : undefined

    const openDetail = async (investment: Investment) => {
        setDetailInvestment(investment)
        setShowTxForm(false)
        setEditingTxId(null)
        setTxForm(emptyTxForm)
        await loadTransactions(investment.id)
    }

    const closeDetail = () => {
        setDetailInvestment(null)
        setTransactions([])
        setShowTxForm(false)
        setEditingTxId(null)
    }

    const openTxForm = (type: 'BUY' | 'SELL', tx?: InvestmentTransaction) => {
        if (tx) {
            setEditingTxId(tx.id)
            setTxForm({
                type: tx.type,
                quantity: String(tx.quantity),
                price: String(tx.price),
                date: tx.date.split('T')[0],
                notes: tx.notes ?? '',
            })
        } else {
            setEditingTxId(null)
            setTxForm({
                ...emptyTxForm,
                type,
                date: new Date().toISOString().split('T')[0],
            })
        }
        setShowTxForm(true)
    }

    const handleSaveAsset = async (e: React.FormEvent) => {
        e.preventDefault()
        const payload = {
            ...assetForm,
            ticker: assetForm.ticker || null,
            cdiPercentage: assetForm.cdiPercentage || null,
            institution: assetForm.institution || null,
            notes: assetForm.notes || null,
        }

        try {
            const url = editingAssetId
                ? `/api/investments/${editingAssetId}`
                : '/api/investments'
            const res = await fetch(url, {
                method: editingAssetId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                await loadInvestments()
                setShowAssetModal(false)
                setEditingAssetId(null)
                setAssetForm(emptyForm)
            } else {
                const err = await res.json()
                alert(err.error || 'Erro ao salvar')
            }
        } catch {
            alert('Erro ao salvar investimento')
        }
    }

    const handleSaveTransaction = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!detailInvestment) return

        setSavingTx(true)
        try {
            const payload = {
                type: txForm.type,
                quantity: txForm.quantity,
                price: txForm.price,
                date: txForm.date,
                notes: txForm.notes || null,
            }

            const url = editingTxId
                ? `/api/investments/${detailInvestment.id}/transactions/${editingTxId}`
                : `/api/investments/${detailInvestment.id}/transactions`

            const res = await fetch(url, {
                method: editingTxId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                await Promise.all([
                    loadInvestments(),
                    loadTransactions(detailInvestment.id),
                ])
                setShowTxForm(false)
                setEditingTxId(null)
                setTxForm(emptyTxForm)
            } else {
                const err = await res.json()
                alert(err.error || 'Erro ao salvar transação')
            }
        } catch {
            alert('Erro ao salvar transação')
        } finally {
            setSavingTx(false)
        }
    }

    const handleDeleteTransaction = async (txId: string) => {
        if (!detailInvestment || !confirm('Excluir esta movimentação?')) return

        try {
            const res = await fetch(
                `/api/investments/${detailInvestment.id}/transactions/${txId}`,
                { method: 'DELETE' },
            )
            if (res.ok) {
                await Promise.all([
                    loadInvestments(),
                    loadTransactions(detailInvestment.id),
                ])
            } else {
                alert('Erro ao excluir')
            }
        } catch {
            alert('Erro ao excluir transação')
        }
    }

    const handleDeleteAsset = async (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation()
        if (!confirm('Deseja realmente deletar este investimento e todo o histórico?')) return

        try {
            const res = await fetch(`/api/investments/${id}`, { method: 'DELETE' })
            if (res.ok) {
                if (detailInvestment?.id === id) closeDetail()
                await loadInvestments()
            }
        } catch {
            alert('Erro ao deletar')
        }
    }

    const txTotal = useMemo(() => {
        const q = parseFloat(txForm.quantity) || 0
        const p = parseFloat(txForm.price) || 0
        return q * p
    }, [txForm.quantity, txForm.price])

    const totals = useMemo(() => {
        const all = Array.from(summaries.values())
        const invested = all.reduce((s, x) => s + x.totalInvested, 0)
        const current = all.reduce((s, x) => s + x.currentValue, 0)
        const profit = current - invested
        return {
            invested,
            current,
            profit,
            profitPct: invested > 0 ? (profit / invested) * 100 : 0,
        }
    }, [summaries])

    if (loading) return <LoadingSpinner />

    return (
        <div className="relative">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Investimentos</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Clique em um ativo para ver histórico, comprar ou vender
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingAssetId(null)
                        setAssetForm(emptyForm)
                        setShowAssetModal(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/25"
                >
                    <Plus className="h-5 w-5" />
                    Novo ativo
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Ativos</span>
                        <Briefcase className="h-4 w-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold">{investments.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Investido</span>
                        <DollarSign className="h-4 w-4 text-violet-500" />
                    </div>
                    <p className="text-2xl font-bold text-violet-600">{formatCurrency(totals.invested)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Valor atual</span>
                        <LineChart className="h-4 w-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.current)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Rendimento</span>
                        {totals.profit >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                    </div>
                    <p className={cn('text-2xl font-bold', totals.profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                        {formatCurrency(totals.profit)}
                    </p>
                    <p className={cn('text-xs mt-0.5', totals.profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                        {totals.profitPct.toFixed(2)}%
                    </p>
                </div>
            </div>

            {/* Lista de ativos */}
            {investments.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center border border-gray-100 dark:border-gray-700">
                    <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Nenhum investimento cadastrado
                    </h3>
                    <p className="text-gray-500 mb-6">Cadastre ações, CDB, fundos e acompanhe cada movimentação.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {investments.map((inv) => {
                        const summary = summaries.get(inv.id)
                        const profit = summary?.profitLoss ?? 0
                        const isSelected = detailInvestment?.id === inv.id

                        return (
                            <button
                                key={inv.id}
                                type="button"
                                onClick={() => openDetail(inv)}
                                className={cn(
                                    'text-left bg-white dark:bg-gray-800 rounded-2xl p-5 border transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 group',
                                    isSelected
                                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg'
                                        : 'border-gray-100 dark:border-gray-700 shadow-sm',
                                )}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className="w-3 h-3 rounded-full shrink-0"
                                            style={{ backgroundColor: inv.color }}
                                        />
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                {inv.name}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                {INVESTMENT_TYPES[inv.type] ?? inv.type}
                                                {inv.ticker && ` · ${inv.ticker}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setEditingAssetId(inv.id)
                                                setAssetForm({
                                                    name: inv.name,
                                                    type: inv.type,
                                                    ticker: inv.ticker ?? '',
                                                    cdiPercentage: inv.cdiPercentage?.toString() ?? '',
                                                    institution: inv.institution ?? '',
                                                    notes: inv.notes ?? '',
                                                    color: inv.color,
                                                })
                                                setShowAssetModal(true)
                                            }}
                                            onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
                                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Edit className="h-4 w-4 text-gray-500" />
                                        </span>
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => handleDeleteAsset(inv.id, e)}
                                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </span>
                                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                </div>

                                {summary && (
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <p className="text-gray-500 text-xs">Posição</p>
                                            <p className="font-semibold">{formatCurrency(summary.currentValue)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-gray-500 text-xs">Rendimento</p>
                                            <p className={cn('font-semibold', profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                                                {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                                            </p>
                                        </div>
                                        {summary.totalQuantity > 0 && (
                                            <>
                                                <div>
                                                    <p className="text-gray-500 text-xs">Quantidade</p>
                                                    <p className="font-medium">{summary.totalQuantity}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-gray-500 text-xs">Preço médio</p>
                                                    <p className="font-medium">{formatCurrency(summary.averagePrice)}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Painel de detalhe */}
            {detailInvestment && (
                <>
                    <div
                        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
                        onClick={closeDetail}
                    />
                    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-700">
                        {/* Header */}
                        <div className="p-5 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className="w-4 h-4 rounded-full shrink-0"
                                        style={{ backgroundColor: detailInvestment.color }}
                                    />
                                    <div className="min-w-0">
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                                            {detailInvestment.name}
                                        </h2>
                                        <p className="text-sm text-gray-500">
                                            {INVESTMENT_TYPES[detailInvestment.type]}
                                            {detailInvestment.ticker && ` · ${detailInvestment.ticker}`}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={closeDetail}
                                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {detailSummary && (
                                <div className="mt-4 grid grid-cols-3 gap-2">
                                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
                                        <p className="text-xs text-gray-500">Investido</p>
                                        <p className="font-bold text-sm">{formatCurrency(detailSummary.totalInvested)}</p>
                                    </div>
                                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
                                        <p className="text-xs text-gray-500">Atual</p>
                                        <p className="font-bold text-sm">{formatCurrency(detailSummary.currentValue)}</p>
                                    </div>
                                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
                                        <p className="text-xs text-gray-500">Cotas</p>
                                        <p className="font-bold text-sm">{detailSummary.totalQuantity || '—'}</p>
                                    </div>
                                </div>
                            )}

                            {/* Ações rápidas */}
                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={() => openTxForm('BUY')}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                                >
                                    <ShoppingCart className="h-4 w-4" />
                                    Comprar
                                </button>
                                <button
                                    onClick={() => openTxForm('SELL')}
                                    disabled={!detailSummary || detailSummary.totalQuantity <= 0}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Tag className="h-4 w-4" />
                                    Vender
                                </button>
                            </div>
                        </div>

                        {/* Formulário compra/venda */}
                        {showTxForm && (
                            <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-950/20 shrink-0">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                                    {editingTxId
                                        ? 'Editar movimentação'
                                        : txForm.type === 'BUY'
                                          ? 'Registrar compra'
                                          : 'Registrar venda'}
                                </h3>
                                <form onSubmit={handleSaveTransaction} className="space-y-3">
                                    {!editingTxId && (
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setTxForm((f) => ({ ...f, type: 'BUY' }))}
                                                className={cn(
                                                    'flex-1 py-2 rounded-lg text-sm font-medium border',
                                                    txForm.type === 'BUY'
                                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                                        : 'border-gray-300 dark:border-gray-600',
                                                )}
                                            >
                                                Compra
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setTxForm((f) => ({ ...f, type: 'SELL' }))}
                                                className={cn(
                                                    'flex-1 py-2 rounded-lg text-sm font-medium border',
                                                    txForm.type === 'SELL'
                                                        ? 'bg-red-600 text-white border-red-600'
                                                        : 'border-gray-300 dark:border-gray-600',
                                                )}
                                            >
                                                Venda
                                            </button>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                                Quantidade *
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                required
                                                min="0.000001"
                                                value={txForm.quantity}
                                                onChange={(e) => setTxForm({ ...txForm, quantity: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                                                placeholder="100"
                                            />
                                            {txForm.type === 'SELL' && detailSummary && detailSummary.totalQuantity > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setTxForm((f) => ({
                                                            ...f,
                                                            quantity: String(detailSummary.totalQuantity),
                                                        }))
                                                    }
                                                    className="text-xs text-blue-600 mt-1 hover:underline"
                                                >
                                                    Vender tudo ({detailSummary.totalQuantity})
                                                </button>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                                Preço unit. (R$) *
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                min="0.01"
                                                value={txForm.price}
                                                onChange={(e) => setTxForm({ ...txForm, price: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                                                placeholder="10,50"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                            Data *
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={txForm.date}
                                            onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                                        />
                                    </div>

                                    {txTotal > 0 && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Total: <strong className="text-gray-900 dark:text-white">{formatCurrency(txTotal)}</strong>
                                        </p>
                                    )}

                                    <input
                                        type="text"
                                        value={txForm.notes}
                                        onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })}
                                        placeholder="Observações (opcional)"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                                    />

                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            disabled={savingTx}
                                            className={cn(
                                                'flex-1 py-2.5 rounded-xl text-white font-medium text-sm',
                                                txForm.type === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700',
                                                savingTx && 'opacity-60',
                                            )}
                                        >
                                            {savingTx ? 'Salvando...' : editingTxId ? 'Salvar alterações' : 'Confirmar'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowTxForm(false)
                                                setEditingTxId(null)
                                            }}
                                            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Histórico */}
                        <div className="flex-1 overflow-y-auto p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <History className="h-5 w-5 text-gray-500" />
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    Histórico de movimentações
                                </h3>
                                <span className="text-xs text-gray-500 ml-auto">{transactions.length}</span>
                            </div>

                            {loadingTx ? (
                                <p className="text-center text-gray-500 py-8 text-sm">Carregando...</p>
                            ) : transactions.length === 0 ? (
                                <div className="text-center py-12">
                                    <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm">Nenhuma movimentação ainda.</p>
                                    <button
                                        onClick={() => openTxForm('BUY')}
                                        className="mt-3 text-sm text-blue-600 hover:underline"
                                    >
                                        Registrar primeira compra
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {transactions.map((tx) => (
                                        <div
                                            key={tx.id}
                                            className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 group"
                                        >
                                            <div
                                                className={cn(
                                                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                                                    tx.type === 'BUY'
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-600',
                                                )}
                                            >
                                                {tx.type === 'BUY' ? (
                                                    <TrendingUp className="h-5 w-5" />
                                                ) : (
                                                    <TrendingDown className="h-5 w-5" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-900 dark:text-white text-sm">
                                                        {tx.type === 'BUY' ? 'Compra' : 'Venda'}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {formatDateBR(tx.date)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {tx.quantity} × {formatCurrency(tx.price)}
                                                    {tx.notes && ` · ${tx.notes}`}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={cn(
                                                    'font-semibold text-sm',
                                                    tx.type === 'BUY' ? 'text-emerald-600' : 'text-red-600',
                                                )}>
                                                    {tx.type === 'BUY' ? '+' : '-'}{formatCurrency(tx.amount)}
                                                </p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <button
                                                    onClick={() => openTxForm(tx.type, tx)}
                                                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                                                >
                                                    <Edit className="h-3.5 w-3.5 text-gray-500" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTransaction(tx.id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Modal cadastro de ativo */}
            {showAssetModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                            {editingAssetId ? 'Editar ativo' : 'Novo ativo'}
                        </h2>
                        <form onSubmit={handleSaveAsset} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Nome *</label>
                                    <input
                                        type="text"
                                        required
                                        value={assetForm.name}
                                        onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                        placeholder="Ex: PETR4"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Tipo *</label>
                                    <select
                                        required
                                        value={assetForm.type}
                                        onChange={(e) => setAssetForm({ ...assetForm, type: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    >
                                        {Object.entries(INVESTMENT_TYPES).map(([k, v]) => (
                                            <option key={k} value={k}>{v}</option>
                                        ))}
                                    </select>
                                </div>
                                {assetForm.type === 'STOCKS' && (
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Ticker</label>
                                        <input
                                            type="text"
                                            value={assetForm.ticker}
                                            onChange={(e) => setAssetForm({ ...assetForm, ticker: e.target.value.toUpperCase() })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                            placeholder="PETR4"
                                        />
                                    </div>
                                )}
                                {assetForm.type === 'CDB' && (
                                    <div>
                                        <label className="block text-sm font-medium mb-2">% do CDI</label>
                                        <input
                                            type="text"
                                            value={assetForm.cdiPercentage}
                                            onChange={(e) => setAssetForm({ ...assetForm, cdiPercentage: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                            placeholder="120"
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Instituição</label>
                                    <input
                                        type="text"
                                        value={assetForm.institution}
                                        onChange={(e) => setAssetForm({ ...assetForm, institution: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Cor</label>
                                    <input
                                        type="color"
                                        value={assetForm.color}
                                        onChange={(e) => setAssetForm({ ...assetForm, color: e.target.value })}
                                        className="w-full h-10 border rounded-lg"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Observações</label>
                                <textarea
                                    value={assetForm.notes}
                                    onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    rows={2}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700">
                                    {editingAssetId ? 'Salvar' : 'Cadastrar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowAssetModal(false); setEditingAssetId(null) }}
                                    className="flex-1 border border-gray-300 dark:border-gray-600 py-2.5 rounded-xl"
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
