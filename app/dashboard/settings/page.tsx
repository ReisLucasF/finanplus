'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings as SettingsIcon, User, Bell, Moon, Globe, DollarSign, Save, AlertCircle } from 'lucide-react'

interface Settings {
    displayName: string
    email: string
    name: string
    theme: 'LIGHT' | 'DARK'
    country: string
    currency: string
    monthlyLimit: number | null
}

export default function SettingsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [settings, setSettings] = useState<Settings>({
        displayName: '',
        email: '',
        name: '',
        theme: 'LIGHT',
        country: 'BR',
        currency: 'BRL',
        monthlyLimit: null,
    })

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const res = await fetch('/api/settings')
            if (!res.ok) {
                if (res.status === 401) {
                    router.push('/login')
                    return
                }
                throw new Error('Erro ao carregar configurações')
            }
            const data = await res.json()
            setSettings(data)
        } catch (error) {
            console.error('Erro ao carregar configurações:', error)
            setMessage({ type: 'error', text: 'Erro ao carregar configurações' })
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)

        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    displayName: settings.displayName || settings.name,
                    theme: settings.theme,
                    country: settings.country,
                    currency: settings.currency,
                    monthlyLimit: settings.monthlyLimit,
                }),
            })

            if (!res.ok) {
                throw new Error('Erro ao salvar configurações')
            }

            // Salvar tema no localStorage imediatamente
            localStorage.setItem('theme', settings.theme)

            // Aplicar tema imediatamente
            if (settings.theme === 'DARK') {
                document.documentElement.classList.add('dark')
            } else {
                document.documentElement.classList.remove('dark')
            }

            setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' })

            // Recarregar a página após um delay
            setTimeout(() => {
                window.location.reload()
            }, 1500)
        } catch (error) {
            console.error('Erro ao salvar:', error)
            setMessage({ type: 'error', text: 'Erro ao salvar configurações' })
        } finally {
            setSaving(false)
        }
    }

    const formatCurrency = (value: number): string => {
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    const handleCurrencyInput = (value: string): number | null => {
        if (value === '') return null
        // Remove tudo exceto números e vírgula
        const cleaned = value.replace(/[^\d,]/g, '')
        // Substitui vírgula por ponto
        const normalized = cleaned.replace(',', '.')
        const parsed = parseFloat(normalized)
        return isNaN(parsed) ? null : parsed
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Carregando configurações...</div>
            </div>
        )
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Personalize sua experiência</p>
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                    <AlertCircle className="h-5 w-5" />
                    {message.text}
                </div>
            )}

            <div className="space-y-6">
                {/* Perfil */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Perfil</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nome Completo
                            </label>
                            <input
                                type="text"
                                value={settings.name}
                                disabled
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Nome da conta (não pode ser alterado)
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nome de Exibição
                            </label>
                            <input
                                type="text"
                                value={settings.displayName || settings.name}
                                onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
                                placeholder="Como gostaria de ser chamado"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Este nome será exibido no dashboard
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={settings.email}
                                disabled
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Email da conta (não pode ser alterado)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Aparência */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Aparência</h2>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tema
                        </label>
                        <select
                            value={settings.theme}
                            onChange={(e) => setSettings({ ...settings, theme: e.target.value as 'LIGHT' | 'DARK' })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="LIGHT">Claro</option>
                            <option value="DARK">Escuro</option>
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Escolha entre tema claro ou escuro
                        </p>
                    </div>
                </div>

                {/* Regional */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Globe className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Regional e Moeda</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                País
                            </label>
                            <select
                                value={settings.country}
                                onChange={(e) => setSettings({ ...settings, country: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="BR">🇧🇷 Brasil</option>
                                <option value="US">🇺🇸 Estados Unidos</option>
                                <option value="PT">🇵🇹 Portugal</option>
                                <option value="ES">🇪🇸 Espanha</option>
                                <option value="AR">🇦🇷 Argentina</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Moeda
                            </label>
                            <select
                                value={settings.currency}
                                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="BRL">Real Brasileiro (R$)</option>
                                <option value="USD">Dólar Americano ($)</option>
                                <option value="EUR">Euro (€)</option>
                                <option value="GBP">Libra Esterlina (£)</option>
                                <option value="ARS">Peso Argentino ($)</option>
                            </select>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Afeta a formatação de valores no sistema
                            </p>
                        </div>
                    </div>
                </div>

                {/* Orçamento Mensal */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <DollarSign className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Orçamento Mensal</h2>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Limite Mensal de Gastos
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                            <input
                                type="text"
                                value={settings.monthlyLimit !== null ? formatCurrency(settings.monthlyLimit) : ''}
                                onChange={(e) => {
                                    const parsed = handleCurrencyInput(e.target.value)
                                    setSettings({ ...settings, monthlyLimit: parsed })
                                }}
                                placeholder="0,00"
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Valor máximo que você deseja gastar por mês. Deixe vazio para não ter limite.
                        </p>
                        {settings.monthlyLimit && settings.monthlyLimit > 0 && (
                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <p className="text-sm text-blue-800 dark:text-blue-400">
                                    💡 Este limite será usado nos cálculos de metas e alertas
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notificações */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notificações</h2>
                    </div>
                    <div className="space-y-3">
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                🚧 Sistema de notificações em desenvolvimento
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                Em breve você poderá configurar alertas personalizados para transações, metas e limites mensais
                            </p>
                        </div>
                    </div>
                </div>

                {/* Botão Salvar */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
                >
                    {saving ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Salvando...
                        </>
                    ) : (
                        <>
                            <Save className="h-5 w-5" />
                            Salvar Alterações
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
