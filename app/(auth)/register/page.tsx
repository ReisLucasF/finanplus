'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

declare global {
    interface Window {
        google?: any;
    }
}

export default function RegisterPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [googleLoaded, setGoogleLoaded] = useState(false)

    const handleGoogleCallback = async (response: any) => {
        try {
            setLoading(true)
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: response.credential }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Erro ao registrar com Google')
                setLoading(false)
                return
            }

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

    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.onload = () => {
            setGoogleLoaded(true)
            // Renderizar botão automaticamente quando carregar
            if (window.google) {
                window.google.accounts.id.initialize({
                    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
                    callback: handleGoogleCallback,
                })
                window.google.accounts.id.renderButton(
                    document.getElementById('googleSignInButton'),
                    {
                        theme: 'outline',
                        size: 'large',
                        width: 368,
                        text: 'continue_with',
                        locale: 'pt-BR'
                    }
                )
            }
        }
        document.body.appendChild(script)

        return () => {
            const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
            if (existingScript) {
                document.body.removeChild(existingScript)
            }
        }
    }, [])

    const handleGoogleSignIn = () => {
        if (window.google) {
            window.google.accounts.id.prompt()
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('As senhas não coincidem')
            return
        }

        if (password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres')
            return
        }

        setLoading(true)

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Erro ao criar conta')
                setLoading(false)
                return
            }

            router.push('/onboarding')
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
                    Crie sua conta gratuitamente
                </p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nome completo
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="João Silva"
                    />
                </div>

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

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Confirmar senha
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                    {loading ? 'Criando conta...' : 'Criar conta'}
                </button>
            </form>

            <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Ou continue com</span>
                    </div>
                </div>

                <div id="googleSignInButton" className="mt-4 flex justify-center"></div>
            </div>

            <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Já tem uma conta?{' '}
                    <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                        Faça login
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
