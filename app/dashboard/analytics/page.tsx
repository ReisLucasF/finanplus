'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    DollarSign,
    PiggyBank,
    CreditCard,
    Target,
    Shield,
    Activity,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    Award,
    AlertCircle,
    Repeat,
    Flame,
    Wallet,
} from 'lucide-react'
import StatCard from '../components/StatCard'
import SectionCard from '../components/SectionCard'
import PieChart from '../components/PieChart'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatCurrency, cn } from '@/lib/utils'

type AnalyticsData = {
    dashboard: {
        saldo_contas_correntes: number
        valor_investido_total: number
        divida_cartoes_atual: number
        patrimonio_liquido_atual: number
        receita_ultimo_mes: number
        receita_media_3_meses: number
        despesa_ultimo_mes: number
        despesa_media_3_meses: number
        taxa_poupanca_percentual: number
        meses_reserva_emergencia: number
        status_saude_financeira: string
        caixa_com_investimentos: number
        utilizacao_limite_percentual: number
    } | null
    fixedCostAnalysis: {
        custo_fixo_mensal_estimado: number
        runway_meses: number
        caixa_total: number
        cobertura_percentual: number
        itens_recorrentes: Array<{
            descricao: string
            categoria: string
            meses_repetidos: number
            media_mensal: number
            confianca: string
        }>
    }
    expensesByCategory: Array<{
        categoria: string
        total_ultimos_3_meses: number
        media_mensal_3_meses: number
        classificacao_categoria: string
        frequencia_uso: string
        variacao_mes_anterior_percentual: number
        percentual_total_3_meses: number
    }>
    incomeAnalysis: Array<{
        fonte_receita: string
        receita_ultimos_3_meses: number
        tipo_renda: string
        regularidade: string
        percentual_renda_total_3_meses: number
        media_mensal_3_meses: number
    }>
    investments: Array<{
        nome_investimento: string
        tipo_investimento: string
        valor_investido_liquido: number
        valor_atual: number
        nivel_risco: string
        percentual_portfolio: number
        aportes_3_meses: number
    }>
    creditCards: Array<{
        nome_cartao: string
        limite_total: number
        divida_atual: number
        percentual_utilizado: number
        status_utilizacao: string
        score_saude_cartao: number
    }>
    patrimonyEvolution: Array<{
        mes_ano: string
        receita_mes: number
        despesa_mes: number
        saldo_liquido_real_mes: number
        taxa_poupanca_mes_percentual: number
        desempenho_mes: string
    }>
    goals: Array<{
        nome_meta: string
        valor_objetivo: number
        valor_atual: number
        progresso_percentual: number
        dias_restantes: number
        viabilidade: string
        valor_necessario_por_mes: number
    }>
    alerts: Array<{
        nivel_prioridade: string
        titulo: string
        mensagem: string
        acao_sugerida: string
    }>
}

function healthStyles(status: string) {
    switch (status) {
        case 'EXCELENTE': return 'from-emerald-500/20 to-teal-500/10 border-emerald-400/40 text-emerald-700 dark:text-emerald-300'
        case 'BOM': return 'from-blue-500/20 to-cyan-500/10 border-blue-400/40 text-blue-700 dark:text-blue-300'
        case 'ATENÇÃO': return 'from-amber-500/20 to-orange-500/10 border-amber-400/40 text-amber-700 dark:text-amber-300'
        case 'CRÍTICO': return 'from-red-500/20 to-rose-500/10 border-red-400/40 text-red-700 dark:text-red-300'
        default: return 'from-gray-500/20 to-gray-500/10 border-gray-400/40'
    }
}

function alertBorder(priority: string) {
    switch (priority) {
        case 'CRÍTICO': return 'border-l-red-500 bg-red-50/80 dark:bg-red-950/30'
        case 'ALTO': return 'border-l-orange-500 bg-orange-50/80 dark:bg-orange-950/30'
        case 'MÉDIO': return 'border-l-amber-500 bg-amber-50/80 dark:bg-amber-950/30'
        default: return 'border-l-blue-500 bg-blue-50/80 dark:bg-blue-950/30'
    }
}

export default function AnalyticsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<AnalyticsData | null>(null)

    useEffect(() => {
        fetch('/api/analytics/financial-overview')
            .then(async (res) => {
                if (res.status === 401) { router.push('/login'); return null }
                if (!res.ok) throw new Error('Erro')
                return res.json()
            })
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [router])

    if (loading) return <LoadingSpinner />

    const dash = data?.dashboard
    if (!dash) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="text-center max-w-md">
                    <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Sem dados suficientes</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Adicione transações para visualizar suas análises financeiras.
                    </p>
                </div>
            </div>
        )
    }

    const fixed = data!.fixedCostAnalysis
    const runwayPct = Math.min((fixed.runway_meses / 12) * 100, 100)

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Inteligência financeira</p>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Análise Completa
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
                    Receitas, despesas e patrimônio calculados direto do banco — sem transferências entre contas nem movimentações de investimento como fluxo operacional.
                </p>
            </div>

            {/* Hero status */}
            <div className={cn(
                'relative overflow-hidden rounded-3xl border p-6 md:p-8 bg-gradient-to-br',
                healthStyles(dash.status_saude_financeira)
            )}>
                <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/60 dark:bg-white/10 backdrop-blur">
                            {dash.status_saude_financeira === 'EXCELENTE' && <Award className="h-7 w-7" />}
                            {dash.status_saude_financeira === 'BOM' && <CheckCircle className="h-7 w-7" />}
                            {dash.status_saude_financeira === 'ATENÇÃO' && <AlertCircle className="h-7 w-7" />}
                            {dash.status_saude_financeira === 'CRÍTICO' && <AlertTriangle className="h-7 w-7" />}
                        </div>
                        <div>
                            <p className="text-sm font-medium opacity-80">Saúde financeira</p>
                            <h2 className="text-2xl md:text-3xl font-bold">{dash.status_saude_financeira}</h2>
                            <p className="mt-1 text-sm opacity-75">
                                Taxa de poupança {dash.taxa_poupanca_percentual.toFixed(1)}% · Reserva {dash.meses_reserva_emergencia.toFixed(1)} meses
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
                        <div className="rounded-2xl bg-white/50 dark:bg-black/20 backdrop-blur px-4 py-3">
                            <p className="text-xs opacity-70">Patrimônio líquido</p>
                            <p className="text-xl font-bold">{formatCurrency(dash.patrimonio_liquido_atual)}</p>
                        </div>
                        <div className="rounded-2xl bg-white/50 dark:bg-black/20 backdrop-blur px-4 py-3">
                            <p className="text-xs opacity-70">Caixa + invest.</p>
                            <p className="text-xl font-bold">{formatCurrency(dash.caixa_com_investimentos)}</p>
                        </div>
                        <div className="rounded-2xl bg-white/50 dark:bg-black/20 backdrop-blur px-4 py-3 col-span-2 md:col-span-1">
                            <p className="text-xs opacity-70">Saldo líquido 3m</p>
                            <p className="text-xl font-bold">{formatCurrency(dash.receita_media_3_meses - dash.despesa_media_3_meses)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Runway / Fixed costs */}
            <div className="grid lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-xl shadow-indigo-500/20">
                    <div className="flex items-center gap-2 mb-4">
                        <Flame className="h-5 w-5" />
                        <h3 className="font-semibold">Runway (custos fixos)</h3>
                    </div>
                    <p className="text-5xl font-bold tracking-tight">
                        {fixed.runway_meses > 0 ? fixed.runway_meses.toFixed(1) : '—'}
                        <span className="text-lg font-normal ml-2 opacity-80">meses</span>
                    </p>
                    <p className="mt-3 text-sm text-indigo-100 leading-relaxed">
                        Com {formatCurrency(fixed.caixa_total)} em caixa + investimentos e custos fixos estimados de{' '}
                        {formatCurrency(fixed.custo_fixo_mensal_estimado)}/mês (base: despesas repetidas nos últimos 4 meses).
                    </p>
                    <div className="mt-5">
                        <div className="flex justify-between text-xs mb-1 opacity-80">
                            <span>0 meses</span>
                            <span>12+ meses</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                            <div
                                className={cn(
                                    'h-full rounded-full transition-all',
                                    fixed.runway_meses >= 12 ? 'bg-emerald-300' :
                                    fixed.runway_meses >= 6 ? 'bg-amber-300' : 'bg-rose-300'
                                )}
                                style={{ width: `${runwayPct}%` }}
                            />
                        </div>
                    </div>
                    <p className="mt-3 text-xs opacity-70">
                        Fixos representam {fixed.cobertura_percentual.toFixed(0)}% da despesa média mensal
                    </p>
                </div>

                <div className="lg:col-span-3 rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Repeat className="h-5 w-5 text-violet-600" />
                            <h3 className="font-bold text-gray-900 dark:text-white">Custos fixos detectados</h3>
                        </div>
                        <span className="text-sm text-gray-500">{fixed.itens_recorrentes.length} itens</span>
                    </div>
                    {fixed.itens_recorrentes.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm py-8 text-center">
                            Nenhum padrão recorrente encontrado nos últimos 4 meses.
                        </p>
                    ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {fixed.itens_recorrentes.slice(0, 12).map((item, i) => (
                                <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">{item.descricao}</p>
                                        <p className="text-xs text-gray-500">
                                            {item.categoria} · {item.meses_repetidos}/4 meses · confiança {item.confianca.toLowerCase()}
                                        </p>
                                    </div>
                                    <p className="font-semibold text-red-600 dark:text-red-400 shrink-0">
                                        {formatCurrency(item.media_mensal)}/mês
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Alerts */}
            {data!.alerts.length > 0 && (
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Alertas ({data!.alerts.length})
                    </h2>
                    <div className="grid md:grid-cols-2 gap-3">
                        {data!.alerts.slice(0, 6).map((alert, i) => (
                            <div key={i} className={cn('rounded-xl border-l-4 p-4', alertBorder(alert.nivel_prioridade))}>
                                <div className="flex justify-between gap-2 mb-1">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">{alert.titulo}</h3>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20">{alert.nivel_prioridade}</span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{alert.mensagem}</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">{alert.acao_sugerida}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Saldo em contas" value={formatCurrency(dash.saldo_contas_correntes)} icon={Wallet}
                    gradient="bg-emerald-500" iconColor="bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/30"
                    trend={{ value: `${dash.meses_reserva_emergencia.toFixed(1)} meses reserva`, isPositive: dash.meses_reserva_emergencia >= 6 }} />
                <StatCard title="Investimentos" value={formatCurrency(dash.valor_investido_total)} icon={TrendingUp}
                    gradient="bg-blue-500" iconColor="bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/30"
                    trend={{ value: `${data!.investments.length} ativos`, isPositive: true }} />
                <StatCard title="Dívida cartões" value={formatCurrency(dash.divida_cartoes_atual)} icon={CreditCard}
                    gradient="bg-red-500" iconColor="bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-500/30"
                    trend={{ value: `${dash.utilizacao_limite_percentual.toFixed(0)}% limite`, isPositive: dash.utilizacao_limite_percentual < 30 }} />
                <StatCard title="Taxa de poupança" value={`${dash.taxa_poupanca_percentual.toFixed(1)}%`} icon={PiggyBank}
                    gradient="bg-violet-500" iconColor="bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-500/30"
                    trend={{ value: dash.taxa_poupanca_percentual >= 20 ? 'Excelente' : 'Melhorar', isPositive: dash.taxa_poupanca_percentual >= 20 }} />
            </div>

            {/* Income / Expense */}
            <div className="grid lg:grid-cols-2 gap-6">
                <SectionCard title="Receitas" description="Últimos 3 meses (operacionais)" icon={TrendingUp}
                    gradient="bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-emerald-500/30">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Média mensal</p>
                            <p className="text-lg font-bold text-emerald-600">{formatCurrency(dash.receita_media_3_meses)}</p>
                        </div>
                        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Último mês</p>
                            <p className="text-lg font-bold">{formatCurrency(dash.receita_ultimo_mes)}</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {data!.incomeAnalysis.slice(0, 5).map((inc, i) => (
                            <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{inc.fonte_receita}</p>
                                    <p className="text-xs text-gray-500">{inc.tipo_renda.replace(/_/g, ' ')} · {inc.regularidade}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-emerald-600">{formatCurrency(inc.media_mensal_3_meses)}</p>
                                    <p className="text-xs text-gray-500">{inc.percentual_renda_total_3_meses.toFixed(1)}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                <SectionCard title="Despesas" description="Últimos 3 meses (operacionais)" icon={TrendingDown}
                    gradient="bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-500/30">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Média mensal</p>
                            <p className="text-lg font-bold text-red-600">{formatCurrency(dash.despesa_media_3_meses)}</p>
                        </div>
                        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Último mês</p>
                            <p className="text-lg font-bold">{formatCurrency(dash.despesa_ultimo_mes)}</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {data!.expensesByCategory.slice(0, 5).map((exp, i) => (
                            <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{exp.categoria}</p>
                                    <p className="text-xs text-gray-500">{exp.classificacao_categoria} · {exp.frequencia_uso}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-red-600">{formatCurrency(exp.media_mensal_3_meses)}</p>
                                    {exp.variacao_mes_anterior_percentual !== 0 && (
                                        <p className={cn('text-xs flex items-center justify-end gap-0.5',
                                            exp.variacao_mes_anterior_percentual > 0 ? 'text-red-500' : 'text-emerald-500')}>
                                            {exp.variacao_mes_anterior_percentual > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                            {Math.abs(exp.variacao_mes_anterior_percentual).toFixed(0)}%
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
                {data!.expensesByCategory.length > 0 && (
                    <div className="rounded-3xl bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <PieChart title="Despesas por categoria (3m)" data={data!.expensesByCategory.slice(0, 8).map(c => ({ name: c.categoria, value: c.total_ultimos_3_meses }))} />
                    </div>
                )}
                {data!.incomeAnalysis.length > 0 && (
                    <div className="rounded-3xl bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <PieChart title="Receitas por fonte (3m)" data={data!.incomeAnalysis.map(i => ({ name: i.fonte_receita, value: i.receita_ultimos_3_meses }))} />
                    </div>
                )}
            </div>

            {/* Portfolio */}
            {data!.investments.length > 0 && (
                <SectionCard title="Portfolio de investimentos" description={`${data!.investments.length} ativo(s)`} icon={Activity}
                    gradient="bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/30">
                    <div className="mb-6">
                        <PieChart title="Alocação" data={data!.investments.map(i => ({ name: i.nome_investimento, value: i.valor_atual }))} />
                    </div>
                    <div className="space-y-2">
                        {data!.investments.map((inv, i) => (
                            <div key={i} className="flex justify-between items-center p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">{inv.nome_investimento}</p>
                                    <p className="text-xs text-gray-500">{inv.tipo_investimento} · Risco {inv.nivel_risco}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-blue-600">{formatCurrency(inv.valor_atual)}</p>
                                    <p className="text-xs text-gray-500">{inv.percentual_portfolio.toFixed(1)}% do portfolio</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* Cards + Goals + Evolution */}
            {data!.creditCards.length > 0 && (
                <SectionCard title="Cartões de crédito" icon={CreditCard}
                    gradient="bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-orange-500/30">
                    <div className="grid md:grid-cols-2 gap-4">
                        {data!.creditCards.map((card, i) => (
                            <div key={i} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between mb-3">
                                    <h4 className="font-bold">{card.nome_cartao}</h4>
                                    <span className={cn('text-xs font-bold px-2 py-1 rounded-full',
                                        card.status_utilizacao === 'CRÍTICO' ? 'bg-red-100 text-red-700' :
                                        card.status_utilizacao === 'ALTO' ? 'bg-orange-100 text-orange-700' :
                                        'bg-green-100 text-green-700')}>{card.status_utilizacao}</span>
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between"><span className="text-gray-500">Utilização</span><span>{card.percentual_utilizado.toFixed(1)}%</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Dívida</span><span className="text-red-600 font-medium">{formatCurrency(card.divida_atual)}</span></div>
                                    <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-600">
                                        <div className={cn('h-2 rounded-full', card.score_saude_cartao >= 70 ? 'bg-green-500' : card.score_saude_cartao >= 40 ? 'bg-amber-500' : 'bg-red-500')}
                                            style={{ width: `${card.score_saude_cartao}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {data!.goals.length > 0 && (
                <SectionCard title="Metas financeiras" icon={Target}
                    gradient="bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-purple-500/30">
                    <div className="space-y-4">
                        {data!.goals.slice(0, 5).map((goal, i) => (
                            <div key={i} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between mb-2">
                                    <h4 className="font-bold">{goal.nome_meta}</h4>
                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">{goal.viabilidade.replace(/_/g, ' ')}</span>
                                </div>
                                <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-600 mb-2">
                                    <div className="h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${Math.min(goal.progresso_percentual, 100)}%` }} />
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div><p className="text-gray-500 text-xs">Atual</p><p className="font-medium">{formatCurrency(goal.valor_atual)}</p></div>
                                    <div><p className="text-gray-500 text-xs">Meta</p><p className="font-medium">{formatCurrency(goal.valor_objetivo)}</p></div>
                                    <div><p className="text-gray-500 text-xs">Prazo</p><p className={cn('font-medium', goal.dias_restantes < 0 && 'text-red-600')}>{goal.dias_restantes < 0 ? `${Math.abs(goal.dias_restantes)}d atraso` : `${goal.dias_restantes}d`}</p></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {data!.patrimonyEvolution.length > 0 && (
                <SectionCard title="Evolução mensal" description="12 meses · fluxo operacional" icon={BarChart3}
                    gradient="bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-cyan-500/30">
                    <div className="overflow-x-auto -mx-2">
                        <table className="w-full text-sm min-w-[640px]">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                                    <th className="pb-3 pl-2 font-semibold text-gray-600 dark:text-gray-400">Mês</th>
                                    <th className="pb-3 text-right font-semibold text-gray-600 dark:text-gray-400">Receitas</th>
                                    <th className="pb-3 text-right font-semibold text-gray-600 dark:text-gray-400">Despesas</th>
                                    <th className="pb-3 text-right font-semibold text-gray-600 dark:text-gray-400">Saldo</th>
                                    <th className="pb-3 text-right font-semibold text-gray-600 dark:text-gray-400">Poupança</th>
                                    <th className="pb-3 text-center font-semibold text-gray-600 dark:text-gray-400">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data!.patrimonyEvolution.slice(-12).reverse().map((m, i) => (
                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                                        <td className="py-3 pl-2 font-medium">{m.mes_ano}</td>
                                        <td className="py-3 text-right text-emerald-600">{formatCurrency(m.receita_mes)}</td>
                                        <td className="py-3 text-right text-red-600">{formatCurrency(m.despesa_mes)}</td>
                                        <td className={cn('py-3 text-right font-semibold', m.saldo_liquido_real_mes >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatCurrency(m.saldo_liquido_real_mes)}</td>
                                        <td className="py-3 text-right">{m.taxa_poupanca_mes_percentual.toFixed(1)}%</td>
                                        <td className="py-3 text-center">
                                            <span className={cn('text-xs px-2 py-1 rounded-full font-medium',
                                                m.desempenho_mes === 'POSITIVO' ? 'bg-emerald-100 text-emerald-700' :
                                                m.desempenho_mes === 'NEGATIVO' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700')}>{m.desempenho_mes}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            )}
        </div>
    )
}
