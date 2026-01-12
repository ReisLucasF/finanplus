'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Erro ao fazer login')
                setLoading(false)
                return
            }

            // Redirecionar para onboarding ou dashboard
            if (data.user.onboardingCompleted) {
                router.push('/dashboard')
            } else {
                router.push('/onboarding')
            }
        } catch (err) {
            setError('Erro ao conectar com o servidor')
            setLoading(false)
        }
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    FinanPlus
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Entre na sua conta
                </p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="seu@email.com"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Senha
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="••••••••"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Entrando...' : 'Entrar'}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Não tem uma conta?{' '}
                    <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                        Cadastre-se
                    </Link>
                </p>
            </div>

            <div className="mt-4 text-center">
                <Link href="/" className="text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400">
                    ← Voltar para início
                </Link>
            </div>
        </div>
    )
}
