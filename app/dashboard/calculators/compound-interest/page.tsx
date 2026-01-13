'use client'

import { useState } from 'react'

interface ResultData {
    year: number
    invested: number
    total: number
    interest: number
}

export default function CompoundInterestCalculator() {
    const [initialAmount, setInitialAmount] = useState<number>(10000)
    const [monthlyDeposit, setMonthlyDeposit] = useState<number>(500)
    const [annualRate, setAnnualRate] = useState<number>(10)
    const [years, setYears] = useState<number>(10)
    const [results, setResults] = useState<ResultData[]>([])
    const [showResults, setShowResults] = useState<boolean>(false)

    const formatCurrency = (value: number): string => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
    }

    const calculate = () => {
        if (years <= 0 || annualRate < 0) {
            alert('Por favor, preencha valores válidos.')
            return
        }

        const monthlyRate = Math.pow(1 + (annualRate / 100), 1 / 12) - 1
        const data: ResultData[] = []

        let balance = initialAmount
        let totalInvested = initialAmount

        for (let year = 1; year <= years; year++) {
            // Calcular mês a mês
            for (let month = 1; month <= 12; month++) {
                balance = balance * (1 + monthlyRate) + monthlyDeposit
                totalInvested += monthlyDeposit
            }

            data.push({
                year,
                invested: totalInvested,
                total: balance,
                interest: balance - totalInvested
            })
        }

        setResults(data)
        setShowResults(true)
    }

    const totalInvested = results.length > 0 ? results[results.length - 1].invested : 0
    const totalAmount = results.length > 0 ? results[results.length - 1].total : 0
    const totalInterest = results.length > 0 ? results[results.length - 1].interest : 0

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calculadora de Juros Compostos</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Simule o crescimento do seu investimento ao longo do tempo</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {/* Form */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex flex-col">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Valor Inicial (R$)
                            </label>
                            <input
                                type="number"
                                value={initialAmount}
                                onChange={(e) => setInitialAmount(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Ex: 10000"
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Aporte Mensal (R$)
                            </label>
                            <input
                                type="number"
                                value={monthlyDeposit}
                                onChange={(e) => setMonthlyDeposit(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Ex: 500"
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Taxa Anual (%)
                            </label>
                            <input
                                type="number"
                                value={annualRate}
                                onChange={(e) => setAnnualRate(Number(e.target.value))}
                                step="0.1"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Ex: 10"
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Período (anos)
                            </label>
                            <input
                                type="number"
                                value={years}
                                onChange={(e) => setYears(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Ex: 10"
                            />
                        </div>
                    </div>

                    <button
                        onClick={calculate}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                        Calcular
                    </button>
                </div>

                {/* Results */}
                <div className="p-6">
                    {showResults ? (
                        <div>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Investido</p>
                                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-300 mt-1">
                                        {formatCurrency(totalInvested)}
                                    </p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">Total Acumulado</p>
                                    <p className="text-2xl font-bold text-green-900 dark:text-green-300 mt-1">
                                        {formatCurrency(totalAmount)}
                                    </p>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Juros Ganhos</p>
                                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-300 mt-1">
                                        {formatCurrency(totalInterest)}
                                    </p>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Ano
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Investido
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Total
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Juros
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {results.map((item) => (
                                            <tr key={item.year} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                    Ano {item.year}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-400">
                                                    {formatCurrency(item.invested)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600 dark:text-green-400">
                                                    {formatCurrency(item.total)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-blue-600 dark:text-blue-400">
                                                    {formatCurrency(item.interest)}
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
