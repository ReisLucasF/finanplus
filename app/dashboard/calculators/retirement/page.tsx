'use client'

import { useState } from 'react'

export default function RetirementCalculator() {
    const [currentAge, setCurrentAge] = useState<number>(30)
    const [retirementAge, setRetirementAge] = useState<number>(60)
    const [currentSavings, setCurrentSavings] = useState<number>(50000)
    const [monthlyContribution, setMonthlyContribution] = useState<number>(1000)
    const [annualReturn, setAnnualReturn] = useState<number>(8)
    const [monthlyExpenseRetirement, setMonthlyExpenseRetirement] = useState<number>(5000)
    const [yearsInRetirement, setYearsInRetirement] = useState<number>(30)
    const [showResults, setShowResults] = useState<boolean>(false)
    const [results, setResults] = useState({
        totalAtRetirement: 0,
        totalContributed: 0,
        interestEarned: 0,
        monthlyIncome: 0,
        willLastYears: 0,
        surplus: 0
    })

    const formatCurrency = (value: number): string => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
    }

    const calculate = () => {
        if (retirementAge <= currentAge) {
            alert('A idade de aposentadoria deve ser maior que a idade atual.')
            return
        }

        // Calcular acumulação até a aposentadoria
        const monthsUntilRetirement = (retirementAge - currentAge) * 12
        const monthlyRate = Math.pow(1 + (annualReturn / 100), 1 / 12) - 1

        let balance = currentSavings
        let totalContributed = currentSavings

        for (let month = 1; month <= monthsUntilRetirement; month++) {
            balance = balance * (1 + monthlyRate) + monthlyContribution
            totalContributed += monthlyContribution
        }

        const interestEarned = balance - totalContributed

        // Calcular quanto durará na aposentadoria
        const monthlyIncomeFromSavings = balance / (yearsInRetirement * 12)

        // Simular retiradas mensais com rendimento
        let retirementBalance = balance
        let monthsLasted = 0
        const maxMonths = yearsInRetirement * 12

        for (let month = 1; month <= maxMonths; month++) {
            retirementBalance = retirementBalance * (1 + monthlyRate) - monthlyExpenseRetirement
            monthsLasted++

            if (retirementBalance <= 0) {
                break
            }
        }

        const yearsLasted = monthsLasted / 12

        setResults({
            totalAtRetirement: balance,
            totalContributed,
            interestEarned,
            monthlyIncome: monthlyIncomeFromSavings,
            willLastYears: yearsLasted,
            surplus: retirementBalance > 0 ? retirementBalance : 0
        })
        setShowResults(true)
    }

    const isSufficient = results.willLastYears >= yearsInRetirement

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calculadora de Aposentadoria</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Planeje sua aposentadoria e veja se está no caminho certo</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {/* Form */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="space-y-6">
                        {/* Dados Pessoais */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Dados Pessoais</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Idade Atual
                                    </label>
                                    <input
                                        type="number"
                                        value={currentAge}
                                        onChange={(e) => setCurrentAge(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Idade de Aposentadoria
                                    </label>
                                    <input
                                        type="number"
                                        value={retirementAge}
                                        onChange={(e) => setRetirementAge(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Investimentos */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Investimentos</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex flex-col">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Patrimônio Atual (R$)
                                    </label>
                                    <input
                                        type="number"
                                        value={currentSavings}
                                        onChange={(e) => setCurrentSavings(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Aporte Mensal (R$)
                                    </label>
                                    <input
                                        type="number"
                                        value={monthlyContribution}
                                        onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Rentabilidade Anual (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={annualReturn}
                                        onChange={(e) => setAnnualReturn(Number(e.target.value))}
                                        step="0.1"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Aposentadoria */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Na Aposentadoria</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Gasto Mensal Esperado (R$)
                                    </label>
                                    <input
                                        type="number"
                                        value={monthlyExpenseRetirement}
                                        onChange={(e) => setMonthlyExpenseRetirement(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Anos de Aposentadoria
                                    </label>
                                    <input
                                        type="number"
                                        value={yearsInRetirement}
                                        onChange={(e) => setYearsInRetirement(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={calculate}
                        className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                        Calcular
                    </button>
                </div>

                {/* Results */}
                <div className="p-6">
                    {showResults ? (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total na Aposentadoria</p>
                                    <p className="text-xl font-bold text-blue-900 dark:text-blue-300 mt-1">
                                        {formatCurrency(results.totalAtRetirement)}
                                    </p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">Total Investido</p>
                                    <p className="text-xl font-bold text-green-900 dark:text-green-300 mt-1">
                                        {formatCurrency(results.totalContributed)}
                                    </p>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Juros Acumulados</p>
                                    <p className="text-xl font-bold text-purple-900 dark:text-purple-300 mt-1">
                                        {formatCurrency(results.interestEarned)}
                                    </p>
                                </div>
                                <div className={`${isSufficient ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} rounded-lg p-4`}>
                                    <p className={`text-sm ${isSufficient ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} font-medium`}>
                                        Durará
                                    </p>
                                    <p className={`text-xl font-bold ${isSufficient ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-red-300'} mt-1`}>
                                        {results.willLastYears.toFixed(1)} anos
                                    </p>
                                </div>
                            </div>

                            {/* Analysis */}
                            <div className={`${isSufficient ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'} border rounded-lg p-6`}>
                                <h3 className={`text-lg font-semibold mb-3 ${isSufficient ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-red-300'}`}>
                                    {isSufficient ? 'Parabéns! Você está no caminho certo' : 'Atenção: Ajustes necessários'}
                                </h3>
                                <div className="space-y-2 text-sm">
                                    {isSufficient ? (
                                        <>
                                            <p className="text-green-800 dark:text-green-400">
                                                • Seu patrimônio durará {results.willLastYears.toFixed(1)} anos, cobrindo os {yearsInRetirement} anos planejados
                                            </p>
                                            {results.surplus > 0 && (
                                                <p className="text-green-800 dark:text-green-400">
                                                    • Você terá um patrimônio remanescente de {formatCurrency(results.surplus)}
                                                </p>
                                            )}
                                            <p className="text-green-800 dark:text-green-400">
                                                • Continue com seus aportes mensais de {formatCurrency(monthlyContribution)}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-red-800 dark:text-red-400">
                                                • Seu patrimônio durará apenas {results.willLastYears.toFixed(1)} anos dos {yearsInRetirement} anos planejados
                                            </p>
                                            <p className="text-red-800 dark:text-red-400">
                                                • Considere aumentar seus aportes mensais
                                            </p>
                                            <p className="text-red-800 dark:text-red-400">
                                                • Ou reduza os gastos mensais esperados na aposentadoria
                                            </p>
                                            <p className="text-red-800 dark:text-red-400">
                                                • Ou trabalhe por mais alguns anos antes de se aposentar
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Additional Info */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Informações Adicionais</h4>
                                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                    <p>• Tempo até aposentadoria: {retirementAge - currentAge} anos</p>
                                    <p>• Total de aportes mensais: {formatCurrency(monthlyContribution * (retirementAge - currentAge) * 12)}</p>
                                    <p>• Renda mensal passiva (sem render): {formatCurrency(results.monthlyIncome)}</p>
                                </div>
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
