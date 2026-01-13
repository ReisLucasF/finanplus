'use client'

import {
    LayoutDashboard,
    Wallet,
    CreditCard,
    TrendingUp,
    Target,
    Settings,
    Receipt,
    ArrowLeftRight,
    RefreshCw,
    LineChart,
    Calculator
} from 'lucide-react'
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import MobileHeader from './components/MobileHeader'
import { cn } from '@/lib/utils'

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Contas', href: '/dashboard/accounts', icon: Wallet },
    { name: 'Transações', href: '/dashboard/transactions', icon: Receipt },
    { name: 'Cartões', href: '/dashboard/cards', icon: CreditCard },
    { name: 'Transferências', href: '/dashboard/transfers', icon: ArrowLeftRight },
    { name: 'Recorrências', href: '/dashboard/recurring', icon: RefreshCw },
    { name: 'Investimentos', href: '/dashboard/investments', icon: LineChart },
    { name: 'Metas', href: '/dashboard/goals', icon: Target },
    { name: 'Categorias', href: '/dashboard/categories', icon: TrendingUp },
    { name: 'Calculadoras', href: '/dashboard/calculators', icon: Calculator },
    { name: 'Configurações', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [user, setUser] = useState<{ name?: string; email?: string } | null>(null)

    useEffect(() => {
        // Carregar estado collapsed do localStorage
        const savedCollapsed = localStorage.getItem('sidebarCollapsed')
        if (savedCollapsed !== null) {
            setSidebarCollapsed(savedCollapsed === 'true')
        }

        const loadUser = async () => {
            try {
                const res = await fetch('/api/auth/me')
                if (res.ok) {
                    const data = await res.json()
                    setUser(data.user)
                }
            } catch (error) {
                console.error('Erro ao carregar dados do usuário:', error)
            }
        }
        loadUser()
    }, [])

    const toggleSidebarCollapse = () => {
        const newCollapsed = !sidebarCollapsed
        setSidebarCollapsed(newCollapsed)
        localStorage.setItem('sidebarCollapsed', String(newCollapsed))
    }

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        window.location.href = '/'
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950/30 overflow-x-hidden">
            {/* Sidebar Mobile Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setSidebarOpen(false)}
                    />

                    {/* Sidebar */}
                    <div className="fixed inset-y-0 left-0 w-72 animate-in slide-in-from-left duration-300">
                        <div className="h-full bg-white shadow-2xl dark:bg-gray-800">
                            <Sidebar
                                navigation={navigation}
                                onLogout={handleLogout}
                                onClose={() => setSidebarOpen(false)}
                                user={user || undefined}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar Desktop */}
            <div className={cn(
                "hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300",
                sidebarCollapsed ? "lg:w-20" : "lg:w-72"
            )}>
                <div className="flex flex-col flex-grow bg-white shadow-xl dark:bg-gray-800">
                    <Sidebar
                        navigation={navigation}
                        onLogout={handleLogout}
                        user={user || undefined}
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={toggleSidebarCollapse}
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className={cn(
                "transition-all duration-300",
                sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"
            )}>
                {/* Mobile Header */}
                <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

                {/* Page Content */}
                <main className="min-h-screen p-4 lg:p-8">
                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
