'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Wallet,
    CreditCard,
    TrendingUp,
    Target,
    Settings,
    LogOut,
    Menu,
    X,
    Receipt,
    ArrowLeftRight,
    Shield,
    RefreshCw,
    LineChart,
    Calculator
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Contas Bancárias', href: '/dashboard/accounts', icon: Wallet },
    { name: 'Transações', href: '/dashboard/transactions', icon: Receipt },
    { name: 'Cartões de Crédito', href: '/dashboard/cards', icon: CreditCard },
    { name: 'Transferências', href: '/dashboard/transfers', icon: ArrowLeftRight },
    { name: 'Recorrências', href: '/dashboard/recurring', icon: RefreshCw },
    { name: 'Investimentos', href: '/dashboard/investments', icon: LineChart },
    { name: 'Metas', href: '/dashboard/goals', icon: Target },
    { name: 'Categorias', href: '/dashboard/categories', icon: TrendingUp },
    { name: 'Calculadoras', href: '/dashboard/calculators/first-million', icon: Calculator },
    { name: 'Configurações', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        window.location.href = '/'
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Sidebar Mobile */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
                    <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-gray-800">
                        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-xl font-bold text-blue-600">FinanPlus</span>
                            <button onClick={() => setSidebarOpen(false)}>
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <nav className="flex-1 space-y-1 px-2 py-4">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive
                                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-200'
                                            : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <item.icon className="mr-3 h-5 w-5" />
                                        {item.name}
                                    </Link>
                                )
                            })}
                        </nav>
                        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center px-2 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                            >
                                <LogOut className="mr-3 h-5 w-5" />
                                Sair
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar Desktop */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
                <div className="flex flex-col flex-grow bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                    <div className="flex h-16 items-center px-4 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xl font-bold text-blue-600">FinanPlus</span>
                    </div>
                    <nav className="flex-1 space-y-1 px-2 py-4">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive
                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-200'
                                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <item.icon className="mr-3 h-5 w-5" />
                                    {item.name}
                                </Link>
                            )
                        })}
                    </nav>
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center px-2 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                        >
                            <LogOut className="mr-3 h-5 w-5" />
                            Sair
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="lg:pl-64">
                {/* Header Mobile */}
                <div className="sticky top-0 z-10 flex h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 lg:hidden">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <div className="flex flex-1 justify-center items-center">
                        <span className="text-xl font-bold text-blue-600">FinanPlus</span>
                    </div>
                </div>

                {/* Page Content */}
                <main className="p-4 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
