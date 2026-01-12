'use client'

import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <div className="max-w-2xl mx-auto pt-20">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            Bem-vindo ao FinanPlus!
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Vamos configurar sua conta em alguns passos simples
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="text-center">
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                O sistema de onboarding será implementado em breve. Por enquanto, você será redirecionado para o dashboard.
                            </p>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
                            >
                                Ir para Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
