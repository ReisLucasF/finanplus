'use client'

import { useState } from 'react'

interface MilestoneData {
    intervalo: string
    mesesNoIntervalo: number
    tempoDecorrido: string
}

export default function FirstMillionCalculator() {
    const [valorInicial, setValorInicial] = useState<number>(0)
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
        const parts: string[] = []
        if (years > 0) parts.push(`${years} ano${years !== 1 ? 's' : ''}`)
        if (months > 0) parts.push(`${months} m${months !== 1 ? 'eses' : 'ês'}`)
        if (parts.length === 0) return "Menos de 1 mês"
        return parts.join(' e ')
    }

    const simular = () => {
        if (aporte < 0 || taxaAnual < 0 || valorInicial < 0) {
            alert("Por favor, preencha valores válidos.")
            return
        }

        if (aporte === 0 && valorInicial === 0) {
            alert("Você precisa ter um valor inicial ou um aporte mensal.")
            return
        }

        // Converter taxa anual para mensal
        const taxaMensal = Math.pow(1 + (taxaAnual / 100), 1 / 12) - 1

        let saldo = valorInicial
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
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Simulador do Primeiro Milhão</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Descubra quanto tempo levará para alcançar seu primeiro milhão</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {/* Form */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="flex flex-col">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Valor Inicial (R$)
                            </label>
                            <input
                                type="number"
                                value={valorInicial}
                                onChange={(e) => setValorInicial(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Ex: 0"
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Aporte Mensal (R$)
                            </label>
                            <input
                                type="number"
                                value={aporte}
                                onChange={(e) => setAporte(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Ex: 1000"
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Rentabilidade Anual (%)
                            </label>
                            <input
                                type="number"
                                value={taxaAnual}
                                onChange={(e) => setTaxaAnual(Number(e.target.value))}
                                step="0.1"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Ex: 10"
                            />
                        </div>
                    </div>

                    <button
                        onClick={simular}
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                        Calcular
                    </button>
                </div>

                {/* Results */}
                <div className="p-6">
                    {mostrarResultado ? (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Resultado da Simulação</h2>
                                <span className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-sm font-semibold px-4 py-2 rounded-lg">
                                    Tempo total: {tempoTotal}
                                </span>
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Intervalo de Valor
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Meses no Intervalo
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Tempo Decorrido
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {resultado.map((item, index) => (
                                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                    {item.intervalo}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-semibold text-blue-600 dark:text-blue-400">
                                                    {item.mesesNoIntervalo}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-400">
                                                    {item.tempoDecorrido}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500 dark:text-gray-400">
                                Preencha os dados acima e clique em &quot;Calcular&quot; para ver o resultado
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
