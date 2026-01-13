'use client'

import { useState } from 'react'

type SystemType = 'PRICE' | 'SAC'

interface Installment {
    number: number
    payment: number
    principal: number
    interest: number
    balance: number
}

export default function FinancingCalculator() {
    const [amount, setAmount] = useState<number>(300000)
    const [downPayment, setDownPayment] = useState<number>(60000)
    const [annualRate, setAnnualRate] = useState<number>(10)
    const [months, setMonths] = useState<number>(360)
    const [system, setSystem] = useState<SystemType>('PRICE')
    const [installments, setInstallments] = useState<Installment[]>([])
    const [showResults, setShowResults] = useState<boolean>(false)

    const formatCurrency = (value: number): string => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
    }

    const calculatePRICE = (principal: number, monthlyRate: number, totalMonths: number): Installment[] => {
        const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
            (Math.pow(1 + monthlyRate, totalMonths) - 1)

        const result: Installment[] = []
        let balance = principal

        for (let i = 1; i <= totalMonths; i++) {
            const interest = balance * monthlyRate
            const principalPaid = payment - interest
            balance -= principalPaid

            result.push({
                number: i,
                payment: payment,
                principal: principalPaid,
                interest: interest,
                balance: Math.max(0, balance)
            })
        }

        return result
    }

    const calculateSAC = (principal: number, monthlyRate: number, totalMonths: number): Installment[] => {
        const principalPayment = principal / totalMonths
        const result: Installment[] = []
        let balance = principal

        for (let i = 1; i <= totalMonths; i++) {
            const interest = balance * monthlyRate
            const payment = principalPayment + interest
            balance -= principalPayment

            result.push({
                number: i,
                payment: payment,
                principal: principalPayment,
                interest: interest,
                balance: Math.max(0, balance)
            })
        }

        return result
    }

    const calculate = () => {
        if (amount <= downPayment) {
            alert('O valor da entrada deve ser menor que o valor total.')
            return
        }

        const financedAmount = amount - downPayment
        const monthlyRate = Math.pow(1 + (annualRate / 100), 1 / 12) - 1

        const result = system === 'PRICE'
            ? calculatePRICE(financedAmount, monthlyRate, months)
            : calculateSAC(financedAmount, monthlyRate, months)

        setInstallments(result)
        setShowResults(true)
    }

    const totalPaid = installments.reduce((sum, inst) => sum + inst.payment, 0)
    const totalInterest = installments.reduce((sum, inst) => sum + inst.interest, 0)
    const financedAmount = amount - downPayment
    const firstInstallment = installments.length > 0 ? installments[0].payment : 0
    const lastInstallment = installments.length > 0 ? installments[installments.length - 1].payment : 0

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calculadora de Financiamento</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Compare os sistemas Price e SAC para seu financiamento</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {/* Form */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex flex-col">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Valor Total (R$)
                            </label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Ex: 300000"
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Entrada (R$)
                            </label>
                            <input
                                type="number"
                                value={downPayment}
                                onChange={(e) => setDownPayment(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Ex: 60000"
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
                                Prazo (meses)
                            </label>
                            <input
                                type="number"
                                value={months}
                                onChange={(e) => setMonths(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Ex: 360"
                            />
                        </div>
                    </div>

                    {/* System Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Sistema de Amortização
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setSystem('PRICE')}
                                className={`p-4 rounded-lg border-2 transition-colors ${system === 'PRICE'
                                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                <div className="text-left">
                                    <p className="font-semibold text-gray-900 dark:text-white">Tabela PRICE</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Parcelas fixas do início ao fim
                                    </p>
                                </div>
                            </button>
                            <button
                                onClick={() => setSystem('SAC')}
                                className={`p-4 rounded-lg border-2 transition-colors ${system === 'SAC'
                                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                <div className="text-left">
                                    <p className="font-semibold text-gray-900 dark:text-white">SAC</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Parcelas decrescentes
                                    </p>
                                </div>
                            </button>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Valor Financiado</p>
                                    <p className="text-xl font-bold text-blue-900 dark:text-blue-300 mt-1">
                                        {formatCurrency(financedAmount)}
                                    </p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">Total Pago</p>
                                    <p className="text-xl font-bold text-green-900 dark:text-green-300 mt-1">
                                        {formatCurrency(totalPaid)}
                                    </p>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">Total de Juros</p>
                                    <p className="text-xl font-bold text-red-900 dark:text-red-300 mt-1">
                                        {formatCurrency(totalInterest)}
                                    </p>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                                        {system === 'PRICE' ? 'Parcela Fixa' : 'Primeira Parcela'}
                                    </p>
                                    <p className="text-xl font-bold text-purple-900 dark:text-purple-300 mt-1">
                                        {formatCurrency(firstInstallment)}
                                    </p>
                                </div>
                            </div>

                            {system === 'SAC' && (
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Última Parcela</p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(lastInstallment)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Economia vs PRICE</p>
                                            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                                                {formatCurrency(totalPaid - totalPaid)} {/* Precisa comparar com PRICE */}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Table - Only first 12 months */}
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                    Primeiras 12 Parcelas
                                </h3>
                                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    Nº
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    Parcela
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    Amortização
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    Juros
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    Saldo
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {installments.slice(0, 12).map((inst) => (
                                                <tr key={inst.number} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                        {inst.number}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-blue-600 dark:text-blue-400">
                                                        {formatCurrency(inst.payment)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-400">
                                                        {formatCurrency(inst.principal)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400">
                                                        {formatCurrency(inst.interest)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-400">
                                                        {formatCurrency(inst.balance)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
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
