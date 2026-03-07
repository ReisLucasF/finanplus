'use client'

import { useState } from 'react'

export default function FinancialIndependenceCalculator() {
    const [currentAge, setCurrentAge] = useState<number>(30)
    const [monthlyExpenses, setMonthlyExpenses] = useState<number>(5000)
    const [currentSavings, setCurrentSavings] = useState<number>(100000)
    const [monthlyIncome, setMonthlyIncome] = useState<number>(8000)
    const [savingsRate, setSavingsRate] = useState<number>(30)
    const [annualReturn, setAnnualReturn] = useState<number>(8)
    const [withdrawalRate, setWithdrawalRate] = useState<number>(4)
    const [showResults, setShowResults] = useState<boolean>(false)
    const [results, setResults] = useState({
        targetAmount: 0,
        yearsToFI: 0,
        ageAtFI: 0,
        totalSaved: 0,
        monthlyPassiveIncome: 0
    })

    const formatCurrency = (value: number): string => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
    }

    const calculate = () => {
        
        const yearlyExpenses = monthlyExpenses * 12
        const targetAmount = yearlyExpenses / (withdrawalRate / 100)

        
        const monthlySavings = monthlyIncome * (savingsRate / 100)

        
        const monthlyRate = Math.pow(1 + (annualReturn / 100), 1 / 12) - 1
        let balance = currentSavings
        let months = 0
        const maxMonths = 600 

        while (balance < targetAmount && months < maxMonths) {
            balance = balance * (1 + monthlyRate) + monthlySavings
            months++
        }

        const yearsToFI = months / 12
        const ageAtFI = currentAge + yearsToFI
        const monthlyPassiveIncome = (targetAmount * (withdrawalRate / 100)) / 12

        setResults({
            targetAmount,
            yearsToFI,
            ageAtFI,
            totalSaved: balance,
            monthlyPassiveIncome
        })
        setShowResults(true)
    }

    const monthlySavings = monthlyIncome * (savingsRate / 100)
    const isRealistic = results.yearsToFI < 40 && results.yearsToFI > 0

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calculadora de Independência Financeira</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Descubra quando você poderá viver de renda</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="space-y-6">
                        
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Situação Atual</h3>
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
                                        Patrimônio Atual (R$)
                                    </label>
                                    <input
                                        type="number"
                                        value={currentSavings}
                                        onChange={(e) => setCurrentSavings(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Receitas e Despesas</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex flex-col">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Renda Mensal (R$)
                                    </label>
                                    <input
                                        type="number"
                                        value={monthlyIncome}
                                        onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Gastos Mensais (R$)
                                    </label>
                                    <input
                                        type="number"
                                        value={monthlyExpenses}
                                        onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Taxa de Poupança (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={savingsRate}
                                        onChange={(e) => setSavingsRate(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Você poupa: {formatCurrency(monthlySavings)}/mês
                                    </p>
                                </div>
                            </div>
                        </div>

                        
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Premissas de Investimento</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Retorno Anual Esperado (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={annualReturn}
                                        onChange={(e) => setAnnualReturn(Number(e.target.value))}
                                        step="0.1"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Taxa de Retirada Segura (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={withdrawalRate}
                                        onChange={(e) => setWithdrawalRate(Number(e.target.value))}
                                        step="0.1"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Regra padrão: 4% ao ano
                                    </p>
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

                
                <div className="p-6">
                    {showResults ? (
                        <div className="space-y-6">
                            
                            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 text-center border border-blue-200 dark:border-blue-800">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Você alcançará a independência financeira em:</p>
                                <p className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                                    {results.yearsToFI.toFixed(1)} anos
                                </p>
                                <p className="text-lg text-gray-700 dark:text-gray-300">
                                    Aos {Math.round(results.ageAtFI)} anos de idade
                                </p>
                            </div>

                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">Valor Necessário (FI)</p>
                                    <p className="text-2xl font-bold text-green-900 dark:text-green-300 mt-1">
                                        {formatCurrency(results.targetAmount)}
                                    </p>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Renda Passiva Mensal</p>
                                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-300 mt-1">
                                        {formatCurrency(results.monthlyPassiveIncome)}
                                    </p>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Aporte Mensal</p>
                                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-300 mt-1">
                                        {formatCurrency(monthlySavings)}
                                    </p>
                                </div>
                            </div>

                            
                            <div className={`${isRealistic ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'} border rounded-lg p-6`}>
                                <h3 className={`text-lg font-semibold mb-3 ${isRealistic ? 'text-green-900 dark:text-green-300' : 'text-yellow-900 dark:text-yellow-300'}`}>
                                    {isRealistic ? 'Excelente planejamento!' : 'Atenção: Revise suas metas'}
                                </h3>
                                <div className="space-y-2 text-sm">
                                    {isRealistic ? (
                                        <>
                                            <p className="text-green-800 dark:text-green-400">
                                                • Você está no caminho certo para alcançar a independência financeira
                                            </p>
                                            <p className="text-green-800 dark:text-green-400">
                                                • Mantenha sua taxa de poupança de {savingsRate}% ({formatCurrency(monthlySavings)}/mês)
                                            </p>
                                            <p className="text-green-800 dark:text-green-400">
                                                • Com disciplina, você poderá viver de renda em {results.yearsToFI.toFixed(1)} anos
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-yellow-800 dark:text-yellow-400">
                                                • O prazo para independência financeira está muito longo
                                            </p>
                                            <p className="text-yellow-800 dark:text-yellow-400">
                                                • Considere aumentar sua taxa de poupança
                                            </p>
                                            <p className="text-yellow-800 dark:text-yellow-400">
                                                • Ou reduza seus gastos mensais para acelerar o processo
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Como funciona?</h4>
                                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                    <p>• <strong>Número FI:</strong> {formatCurrency(results.targetAmount)} = Gastos anuais ({formatCurrency(monthlyExpenses * 12)}) ÷ Taxa de retirada ({withdrawalRate}%)</p>
                                    <p>• <strong>Regra dos 4%:</strong> Você pode retirar 4% ao ano do seu patrimônio indefinidamente</p>
                                    <p>• <strong>Renda Passiva:</strong> {formatCurrency(results.monthlyPassiveIncome)}/mês = {withdrawalRate}% de {formatCurrency(results.targetAmount)} por ano</p>
                                    <p>• <strong>Anos até FI:</strong> Tempo necessário poupando {formatCurrency(monthlySavings)}/mês com retorno de {annualReturn}%/ano</p>
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
