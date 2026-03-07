'use client'

import Link from 'next/link'
import { Calculator, TrendingUp, PiggyBank, Home, Target, Zap } from 'lucide-react'

const calculators = [
    {
        name: 'Primeiro Milhão',
        description: 'Descubra quanto tempo levará para alcançar seu primeiro milhão',
        href: '/dashboard/calculators/first-million',
        icon: Target,
        color: 'blue'
    },
    {
        name: 'Juros Compostos',
        description: 'Simule o crescimento do seu investimento ao longo do tempo',
        href: '/dashboard/calculators/compound-interest',
        icon: TrendingUp,
        color: 'green'
    },
    {
        name: 'Aposentadoria',
        description: 'Planeje sua aposentadoria e veja se está no caminho certo',
        href: '/dashboard/calculators/retirement',
        icon: PiggyBank,
        color: 'purple'
    },
    {
        name: 'Financiamento',
        description: 'Compare os sistemas Price e SAC para seu financiamento',
        href: '/dashboard/calculators/financing',
        icon: Home,
        color: 'orange'
    },
    {
        name: 'Independência Financeira',
        description: 'Descubra quando você poderá viver de renda',
        href: '/dashboard/calculators/financial-independence',
        icon: Zap,
        color: 'red'
    }
]

const colorClasses = {
    blue: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        icon: 'text-blue-600 dark:text-blue-400',
        hover: 'hover:border-blue-300 dark:hover:border-blue-700'
    },
    green: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        icon: 'text-green-600 dark:text-green-400',
        hover: 'hover:border-green-300 dark:hover:border-green-700'
    },
    purple: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        icon: 'text-purple-600 dark:text-purple-400',
        hover: 'hover:border-purple-300 dark:hover:border-purple-700'
    },
    orange: {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        icon: 'text-orange-600 dark:text-orange-400',
        hover: 'hover:border-orange-300 dark:hover:border-orange-700'
    },
    red: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        icon: 'text-red-600 dark:text-red-400',
        hover: 'hover:border-red-300 dark:hover:border-red-700'
    }
}

export default function CalculatorsPage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calculadoras Financeiras</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Ferramentas para planejar seu futuro financeiro</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {calculators.map((calc) => {
                    const Icon = calc.icon
                    const colors = colorClasses[calc.color as keyof typeof colorClasses]

                    return (
                        <Link
                            key={calc.href}
                            href={calc.href}
                            className={`block bg-white dark:bg-gray-800 rounded-lg shadow border-2 border-transparent ${colors.hover} transition-all hover:shadow-lg`}
                        >
                            <div className="p-6">
                                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${colors.bg} mb-4`}>
                                    <Icon className={`h-6 w-6 ${colors.icon}`} />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    {calc.name}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {calc.description}
                                </p>
                            </div>
                        </Link>
                    )
                })}
            </div>

            
            <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                    <Calculator className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                            Sobre as Calculadoras
                        </h3>
                        <p className="text-sm text-blue-800 dark:text-blue-400">
                            Estas calculadoras foram desenvolvidas para ajudá-lo a planejar melhor suas finanças.
                            Os resultados são estimativas baseadas nas informações fornecidas e não devem ser
                            considerados como aconselhamento financeiro profissional. Sempre consulte um
                            especialista antes de tomar decisões financeiras importantes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
