'use client'

import { useState } from 'react'

interface MilestoneData {
    intervalo: string
    mesesNoIntervalo: number
    tempoDecorrido: string
}

export default function FirstMillionCalculator() {
    const [aporte, setAporte] = useState<number>(1000)
    const [taxaAnual, setTaxaAnual] = useState<number>(10)
    const [resultado, setResultado] = useState<MilestoneData[]>([])
    const [tempoTotal, setTempoTotal] = useState<string>('')
    const [mostrarResultado, setMostrarResultado] = useState<boolean>(false)

    const formatMoney = (value: number): string => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
    }

    const formatTime = (totalMonths: number): string => {
        const years = Math.floor(totalMonths / 12)
        const months = totalMonths % 12
        let parts: string[] = []
        if (years > 0) parts.push(`${years} ano${years !== 1 ? 's' : ''}`)
        if (months > 0) parts.push(`${months} m${months !== 1 ? 'eses' : 'ês'}`)
        if (parts.length === 0) return "Menos de 1 mês"
        return parts.join(' e ')
    }

    const simular = () => {
        if (!aporte || !taxaAnual) {
            alert("Por favor, preencha o aporte e a taxa corretamente.")
            return
        }

        // Converter taxa anual para mensal
        const taxaMensal = Math.pow(1 + (taxaAnual / 100), 1 / 12) - 1

        let saldo = 0
        let mesesTotal = 0
        let mesesAcumuladosUltimoMilestone = 0

        const milestones = [100000, 200000, 300000, 400000, 500000, 600000, 700000, 800000, 900000, 1000000]
        let milestoneIndex = 0

        const resultados: MilestoneData[] = []

        // Simulação mês a mês
        while (milestoneIndex < milestones.length) {
            // Aplica juros e aporte
            saldo = saldo * (1 + taxaMensal) + aporte
            mesesTotal++

            // Verifica se bateu o próximo milestone
            if (saldo >= milestones[milestoneIndex]) {
                const intervaloValor = `De ${formatMoney(milestones[milestoneIndex] - 100000)} até ${formatMoney(milestones[milestoneIndex])}`

                // Cálculo de meses gastos APENAS neste intervalo
                const mesesParaEsteMilestone = mesesTotal - mesesAcumuladosUltimoMilestone

                resultados.push({
                    intervalo: intervaloValor,
                    mesesNoIntervalo: mesesParaEsteMilestone,
                    tempoDecorrido: formatTime(mesesParaEsteMilestone).toUpperCase()
                })

                // Prepara para o próximo loop
                mesesAcumuladosUltimoMilestone = mesesTotal
                milestoneIndex++
            }

            // Break de segurança
            if (mesesTotal > 1200) break // 100 anos
        }

        setResultado(resultados)
        setTempoTotal(formatTime(mesesTotal))
        setMostrarResultado(true)
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-slate-900 p-6 text-center">
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Simulador do 1º Milhão 🚀</h1>
                    <p className="text-slate-400">Descubra a velocidade da sua bola de neve</p>
                </div>

                {/* Form */}
                <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                                Aporte Mensal (R$)
                            </label>
                            <input
                                type="number"
                                value={aporte}
                                onChange={(e) => setAporte(Number(e.target.value))}
                                className="w-full p-3 text-lg font-semibold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                                placeholder="Ex: 1000"
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                                Rentabilidade Anual (%)
                            </label>
                            <input
                                type="number"
                                value={taxaAnual}
                                onChange={(e) => setTaxaAnual(Number(e.target.value))}
                                step="0.1"
                                className="w-full p-3 text-lg font-semibold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                                placeholder="Ex: 10"
                            />
                        </div>

                        <button
                            onClick={simular}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-lg text-lg transition shadow-lg transform active:scale-95"
                        >
                            Calcular Tabela
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="p-6 md:p-8">
                    {mostrarResultado ? (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-slate-800">Resultado da Simulação</h2>
                                <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
                                    Tempo total: {tempoTotal}
                                </span>
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                                            <th className="p-4 font-bold border-b border-slate-200">Intervalo de Valor</th>
                                            <th className="p-4 font-bold border-b border-slate-200 text-center">
                                                Meses (Neste intervalo)
                                            </th>
                                            <th className="p-4 font-bold border-b border-slate-200 text-right">Tempo Decorrido</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100">
                                        {resultado.map((item, index) => (
                                            <tr key={index} className="hover:bg-slate-50 transition">
                                                <td className="p-4 border-r border-slate-100 text-slate-900">
                                                    {item.intervalo}
                                                </td>
                                                <td className="p-4 text-center border-r border-slate-100 font-bold text-blue-600">
                                                    {item.mesesNoIntervalo}
                                                </td>
                                                <td className="p-4 text-right text-slate-500">
                                                    {item.tempoDecorrido}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-slate-400">
                            <p>Preencha os dados acima e clique em &quot;Calcular&quot; para ver a mágica.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
